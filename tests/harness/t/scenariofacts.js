// scenariofacts -- the key facts band above the scenario tabs, and the Location box in Show info
// (KEY-FACTS-PLAN.md; owner, 23 Oct 2026: "lets go for C").
//
//   HARNESS_PAGE=/dist/index.html ./run.sh scenariofacts 300
//
// Since the evening of 23 Oct 2026 each fact is a stat tile, its label over its value (owner, option D), so the leg
// reads tiles(), not one line of text.
//
// Driven as a user drives it: Load through openViaFakePicker's recording handle, the tabs, typed fields, ⌘Z, the
// Compare window, Save, Keep only. The file is tests/fixtures/scenarios-3.sptcal (synthetic): Scenario A (Elsewhere in
// the U.S., 10 episodes), 8 eps (the same, 8 episodes) and Toronto (8 episodes, Toronto, ON), Toronto on screen.
// Every tab opens its writers' room on 1/5/26 for 12 weeks and shoots from 6/29/26, so those three facts are shared.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  async function waitFor(fn, label){ await T.until(fn, label, 80, 100); }
  function band(){ return document.querySelector('.sc-band'); }
  // The band as the user reads it: one stat tile per fact, its label over its value (owner's option D, 23 Oct 2026).
  // {label: value}, a value's parts joined by " · " as drawn; and which of its values are dimmed.
  function tiles(){
    var t = {};
    [].slice.call((band() || document.createElement('div')).querySelectorAll('.sc-band-stat')).forEach(function(s){
      t[s.querySelector('.sc-band-lab').textContent] = [].slice.call(s.querySelectorAll('.sc-band-v')).map(function(v){ return v.textContent; }).join(' · ');
    });
    return t;
  }
  function wrTile(t){ return t[Object.keys(t).filter(function(k){ return /^Writer/.test(k); })[0]]; }
  function bandText(){ var t = tiles(); return Object.keys(t).length ? Object.keys(t).map(function(k){ return k + ' ' + t[k]; }).join(' | ') : null; }
  function bandFirst(){ var v = band() && band().querySelector('.sc-band-v'); return v ? v.textContent : null; }
  function dimmed(){ return band() ? [].slice.call(band().querySelectorAll('.sc-band-v.is-same')).map(function(e){ return e.textContent; }) : null; }
  function rect(el){ var r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height}; }
  function grid(){ return document.querySelector('#table-wrap > .sheet-scroll'); }
  function panel(){ return document.querySelector('main.preview-panel'); }
  function space(){ return getComputedStyle(document.documentElement).getPropertyValue('--sc-band-space').trim(); }
  function margin(){ return getComputedStyle(panel()).marginBottom; }
  function tab(name){ return [].slice.call(document.querySelectorAll('.sc-tab')).filter(function(t){ return t.textContent.trim() === name; })[0]; }
  function current(){ var t = document.querySelector('.sc-tab.is-current'); return t ? t.textContent.trim() : null; }
  function key(k, shift){ document.dispatchEvent(new KeyboardEvent('keydown', {key: k, metaKey: true, shiftKey: !!shift, bubbles: true})); }
  function compareRow(label){
    var tr = [].slice.call(document.querySelectorAll('.compare-dlg tbody tr')).filter(function(r){ return r.children[0].innerText.trim() === label; })[0];
    return tr ? [].slice.call(tr.children).slice(1).map(function(td){ return td.innerText.split('\n')[0].trim(); }) : null;
  }
  async function openCompare(){
    [].slice.call(document.querySelectorAll('.sc-strip button')).filter(function(b){ return b.textContent.trim() === 'Compare'; })[0].click();
    await waitFor(function(){ return !!document.querySelector('.compare-dlg .sc-compare-table'); }, 'the Compare window');
    await T.sleep(300);
  }
  async function closeCompare(){
    [].slice.call(document.querySelectorAll('.compare-dlg button')).filter(function(b){ return b.textContent.trim() === 'Done'; })[0].click();
    await T.sleep(500);
  }
  async function load(url, name, opts){
    var p = T.openViaFakePicker(url, name, opts || {});
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await p; await T.sleep(1500);
  }
  // The grid ends above the band, the band above the tabs, and the panel's room is the band's height + 8.
  function layoutOk(){
    var b = rect(band()), s = rect(document.querySelector('.sc-strip')), g = grid() ? rect(grid()) : null;
    return { gridClears: !g || g.bottom <= b.top - 7.5, bandAboveTabs: b.bottom <= s.top + 0.5,
             margin: margin(), expectMargin: (44 + Math.ceil(band().offsetHeight) + 8) + 'px', space: space(),
             grid: g && Math.round(g.bottom), band: [Math.round(b.top), Math.round(b.bottom)], strip: Math.round(s.top) };
  }
  try {
    // F1 -- one scenario: no band, and the panel keeps the strip's 44 px exactly as before.
    T.buildFixture(); await T.sleep(1200);
    await waitFor(function(){ return !!document.querySelector('.sc-strip'); }, 'the scenario strip');
    add('F1', 'with one scenario there is no band and the panel keeps its 44 px', !band() && margin() === '44px' && space() === '',
      {band: !!band(), margin: margin(), space: space()}, 'no band, 44px, no --sc-band-space');

    // F2 -- Load a three-scenario file: the band shows, and the calendar makes room for it.
    var writes = [];
    await load('/tests/fixtures/scenarios-3.sptcal', 'scenarios-3.sptcal', {writes: writes});
    await waitFor(function(){ return !!band(); }, 'the key facts band');
    var lay = layoutOk();
    add('F2', 'with three scenarios the band shows; the grid ends above it and it sits above the tabs',
      current() === 'Toronto' && lay.gridClears && lay.bandAboveTabs && lay.margin === lay.expectMargin,
      lay, 'grid bottom <= band top - 8, band bottom <= tabs top, margin = 44 + band + 8');

    // F3 -- the band's facts are Compare's own for the tab on screen.
    await waitFor(function(){ return (dimmed() || []).length > 0; }, 'the parked tabs probed after Load');
    var bt = bandText(), tl = tiles();
    await openCompare();
    var cLoc = compareRow('Location'), cEps = compareRow('Episodes'), cWr = compareRow('Writer’s Rm') || compareRow('Writer\'s Rm'),
        cFirst = compareRow('First shoot day'), cSpan = compareRow('Production span'), cWrap = compareRow('Wrap');
    await closeCompare();
    add('F3', 'each tile reads the tab on screen exactly as Compare\'s column for it does, its weeks in its own phase\'s tile',
      !!cLoc && tl.Location === cLoc[0] && tl.Location === 'Toronto' && tl.Episodes === cEps[0] &&
      !!cWr && wrTile(tl) === cWr[0].split(' ')[0] + ' · 12 wks' && tl.Production === cFirst[0] + ' · ' + cSpan[0] &&
      tl.Wrap === cWrap[0] && Object.keys(tl).join('|') === 'Location|Episodes|' + Object.keys(tl)[2] + '|Production|Wrap',
      {band: bt, compare: {loc: cLoc, eps: cEps, wr: cWr, first: cFirst, span: cSpan, wrap: cWrap}},
      'Location Toronto | Episodes 8 | Writer\'s Rm <its open> · 12 wks | Production <first> · <span> | Wrap <wrap>');

    // F4 -- dimmed means the same in every scenario: once the parked tabs are probed, the shared writers' room and
    // first shoot day are dimmed, the rest are not. A change in one tab undims it, and ⌘Z dims it again.
    var d0 = dimmed();
    T.set('weeks-writersRoom', '13'); await T.sleep(900);
    var d1 = dimmed(), bt1 = wrTile(tiles());
    key('z'); await T.sleep(900);
    var d2 = dimmed();
    add('F4', 'a fact the same in every scenario is dimmed; changing it in one tab undims it, ⌘Z dims it again',
      JSON.stringify(d0) === JSON.stringify(['1/5/26', '12 wks', '6/29/26']) && d1.indexOf('13 wks') < 0 && / · 13 wks$/.test(bt1 || '') &&
      JSON.stringify(d2) === JSON.stringify(d0),
      {before: d0, after: d1, band: bt1, undone: d2}, '[1/5/26, 12 wks, 6/29/26]; 13 wks not dimmed; back after ⌘Z');

    // F5 -- a flip shows the other tab's facts AT ONCE (not after the band's debounce), and is no edit.
    var statusBefore = (document.getElementById('save-status') || {}).textContent;
    tab('Scenario A').click();
    await T.sleep(30);
    var atOnce = bandFirst(), flipText = bandText(), flipTiles = tiles();
    await T.sleep(700);
    add('F5', 'a flip shows the other tab\'s facts at once and marks nothing unsaved',
      current() === 'Scenario A' && atOnce === 'U.S. (Area Standards)' && flipTiles.Location === 'U.S. (Area Standards)' && flipTiles.Episodes === '10' &&
      (document.getElementById('save-status') || {}).textContent === statusBefore,
      {current: current(), first30ms: atOnce, band: flipText, status: [statusBefore, (document.getElementById('save-status') || {}).textContent]},
      'Scenario A, "Location U.S. (Area Standards) | Episodes 10 | …" within 30 ms, status unchanged');

    // F6 -- the Location box: typed text wins in the band and in Compare; blank is the short region; ⌘Z undoes it.
    var locEl = document.getElementById('show-location');
    T.set('show-location', 'Winnipeg'); await T.sleep(900);
    var typedBand = bandFirst();
    await openCompare(); var typedCmp = compareRow('Location'); await closeCompare();
    key('z'); await T.sleep(900);
    var undoneLoc = locEl.value, undoneBand = bandFirst();
    add('F6', 'typed Location shows in the band and Compare; ⌘Z puts back the short region',
      !!locEl && typedBand === 'Winnipeg' && typedCmp && typedCmp[0] === 'Winnipeg' && undoneLoc === '' && undoneBand === 'U.S. (Area Standards)',
      {typed: [typedBand, typedCmp], undone: [undoneLoc, undoneBand]}, 'Winnipeg twice, then "" and U.S. (Area Standards)');

    // F7 -- saved per scenario, and a file without the key loads blank.
    T.set('show-location', 'Winnipeg'); await T.sleep(700);
    tab('Toronto').click(); await T.sleep(700);
    T.set('show-location', 'Hamilton'); await T.sleep(700);
    document.getElementById('save-file-btn').click(); await T.sleep(1200);
    var saved = writes.length ? JSON.parse(writes[writes.length - 1].text) : {};
    var tabsSaved = (saved.scenarios && saved.scenarios.tabs) || [];
    var aSaved = tabsSaved.filter(function(t){ return t.name === 'Scenario A'; })[0];
    // fields.byId holds {value} per id.
    var topLoc = ((saved.fields && saved.fields.byId && saved.fields.byId['show-location']) || {}).value;
    var aLoc = ((aSaved && aSaved.snapshot && aSaved.snapshot.fields && aSaved.snapshot.fields.byId['show-location']) || {}).value;
    // Load what was saved, then a file saved before the field existed.
    await load(null, 'saved.sptcal', {text: writes[writes.length - 1].text});
    await waitFor(function(){ return bandFirst() === 'Hamilton'; }, 'the saved file reloaded');
    var reloaded = [locEl.value, bandFirst()];
    tab('Scenario A').click(); await T.sleep(700);
    var reloadedA = [document.getElementById('show-location').value, bandFirst()];
    await load('/tests/fixtures/halfdays.sptcal', 'halfdays.sptcal');
    var oldFile = document.getElementById('show-location').value;
    add('F7', 'each scenario saves its own Location, reloads with it, and an older file loads with the box blank',
      topLoc === 'Hamilton' && aLoc === 'Winnipeg' && reloaded.join('|') === 'Hamilton|Hamilton' &&
      reloadedA.join('|') === 'Winnipeg|Winnipeg' && oldFile === '',
      {saved: {Toronto: topLoc, A: aLoc}, reloaded: reloaded, reloadedA: reloadedA, olderFile: oldFile},
      'Hamilton / Winnipeg saved and back; the older file blank');

    // F8 -- chrome only: the band is in #react-root (never #table-wrap or #print-root) and carries no id.
    await load('/tests/fixtures/scenarios-3.sptcal', 'scenarios-3.sptcal');
    await waitFor(function(){ return !!band(); }, 'the band again');
    var b8 = band();
    add('F8', 'the band lives in #react-root, outside the calendar and the print host, with no id anywhere in it',
      !!b8.closest('#react-root') && !b8.closest('#table-wrap') && !b8.closest('#print-root') && !b8.id && !b8.querySelector('[id]'),
      {inReactRoot: !!b8.closest('#react-root'), inTableWrap: !!b8.closest('#table-wrap'), ids: b8.querySelectorAll('[id]').length}, 'react-root only, no ids');

    // F9 -- a band too narrow for one line wraps (nothing cut off) and the calendar still clears it. The harness
    // window is wide, so the band is narrowed by hand the way a 1000 px window would, and then a flip re-renders it:
    // in the app a narrower band only ever comes from a window or panel resize, which re-renders the strip, and the
    // band measures itself on every render (a ResizeObserver alone is not delivered on a page that isn't painting).
    // (Since the band is centred and hugs its tiles, narrowing it means capping its max-width, which is what the
    // calendar's own width does in a narrow window.)
    var maxWas = b8.style.maxWidth, oneRow = b8.offsetHeight;
    b8.style.maxWidth = '330px';
    tab('8 eps').click(); await T.sleep(900);
    var wrapped = band().offsetHeight, clipped = band().scrollWidth > band().clientWidth, lay9 = layoutOk();
    b8.style.maxWidth = maxWas;
    tab('Toronto').click(); await T.sleep(900);

    // F12 -- centred over the CALENDAR (owner, option A; the window's centre, option B, read as off-centre because
    // the sidebar fills the window's left): the band's middle is the calendar area's middle, panel left + 28 to the
    // panel's content right - 28, and it hugs its tiles.
    var b12 = band().getBoundingClientRect(), pr = panel().getBoundingClientRect();
    var calLeft = pr.left + 28, calRight = pr.left + panel().clientLeft + panel().clientWidth - 28;
    var off = (b12.left + b12.right) / 2 - (calLeft + calRight) / 2;
    add('F12', 'the band hugs its tiles and is centred over the calendar area',
      Math.abs(off) <= 1 && b12.left >= calLeft - 0.5 && b12.right <= calRight + 0.5 && b12.width < calRight - calLeft - 40,
      {centreOffset: Math.round(off), band: [Math.round(b12.left), Math.round(b12.right)], calendar: [Math.round(calLeft), Math.round(calRight)]},
      'centre within 1 px of the calendar area\'s, inside it');
    add('F9', 'a narrow band wraps onto more lines, cuts nothing off, and the grid still ends above it',
      wrapped >= oneRow + 30 && !clipped && lay9.gridClears && lay9.margin === lay9.expectMargin,
      {oneRow: oneRow, height: wrapped, clipped: clipped, layout: lay9}, 'a second row of tiles, not clipped, grid clears');

    // F10 -- the month view: the band shows, and the panel (the month view's scroller) ends above it.
    document.getElementById('view-month-btn').click(); await T.sleep(1000);
    var p10 = rect(panel()), b10 = band() && rect(band());
    add('F10', 'in the month view the band shows and the month view\'s scroller ends above it',
      !!document.querySelector('#table-wrap .mv-body') && !!b10 && p10.bottom <= b10.top - 7.5,
      {panelBottom: Math.round(p10.bottom), bandTop: b10 && Math.round(b10.top)}, 'panel bottom <= band top - 8');
    document.getElementById('view-sheet-btn').click(); await T.sleep(800);

    // F11 -- Keep only: back to one scenario, the band goes and the panel's room with it.
    document.dispatchEvent(new CustomEvent('sptcal-scenario', {detail: {op: 'keep', id: (saved.scenarios || {}).current || 's3'}}));
    for(var g = 0; g < 30; g++){ await T.sleep(100); if(/Keep only/.test(T.modalText())){ T.clickModalButton('Keep only this one'); break; } }
    await T.sleep(900);
    add('F11', 'keeping one scenario removes the band and gives the calendar its room back',
      document.querySelectorAll('.sc-tab').length === 0 && !band() && margin() === '44px' && space() === '',
      {tabs: document.querySelectorAll('.sc-tab').length, band: !!band(), margin: margin(), space: space()}, 'no tabs, no band, 44px');
  } catch(e){
    add('ERR', 'the leg threw', false, String(e && e.stack || e), 'no error');
  }
  out.health = T.appHealth();
  out.cases = cases;
  out.pass = cases.filter(function(c){ return c.pass; }).length;
  out.fail = cases.filter(function(c){ return !c.pass; }).length;
  T.done(out);
})(); });
