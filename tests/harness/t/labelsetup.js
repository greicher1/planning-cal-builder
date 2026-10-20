// labelsetup -- bundle B of 20 Oct 2026 (LABELS-SETUP-PLAN.md): six label and setup changes, on synthetic
// fixtures only. Starts on tests/fixtures/halfdays.sptcal and opens the others through the real Load path
// (T.openViaFakePicker), the pilllabel leg's way: a fixture's own JSON, sometimes with one store changed.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=halfdays ./run.sh labelsetup 600
//
// halfdays, worked out by hand (the mvmenu leg's header has the same facts): US General, Season 2, ten
// episodes at 4.5 days with Episode 201 at 5 (45.5 days), shot from Mon 29 Jun 2026; Fri 3 Jul is a holiday.
//   201  29 Jun, 30 Jun, 1 Jul, 2 Jul, 6 Jul             202  7, 8, 9, 10 Jul + half of 13 Jul
//   203  the other half of 13 Jul, 14, 15, 16, 17 Jul    a two-week locked hiatus from Mon 21 Dec 2026
//
//   E  item 3, "Ep." only before numbers (and "Pilot, Ep. 102, 103" for a mixed list)
//   B  item 4, Blocks without an episode count; the old-file rule on blocks-noeps-v1.5.0.sptcal, a REAL
//      Save by the v1.5.0 release (t/mintblocksnoeps.js), whose Production was unscheduled there
//   L  item 5, the weekend just before the first shoot day ('lead')
//   H  item 7, header sizes 10-12 and the fixed-date token in the token list
//   F  item 8, France
//   C  item 9, Colour… and Number weeks on a hiatus band
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'labelsetup'}, W = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function txt(el){ return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function title(){ return (document.getElementById('show-title') || {}).value; }
  async function openText(text, name, expectTitle){
    var p = T.openViaFakePicker(null, name, {text: text, writes: W});
    // The unsaved-work question can come late; answer it whenever it shows, until the file is in.
    for(var g = 0; g < 200; g++){
      await T.sleep(100);
      if(/Load another calendar/.test(T.modalText())) T.clickModalButton('Load');
      if(expectTitle && title() === expectTitle) break;
      if(!expectTitle && g >= 40) break;
    }
    try { await p; } catch (e) {}
    await T.sleep(1200);
    await settle();
  }
  async function fixture(name){ return (await fetch('/tests/fixtures/' + name + '.sptcal')).text(); }
  async function saveNow(){
    var n = W.length;
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', code: 'KeyS', metaKey: true, ctrlKey: true, bubbles: true}));
    for(var i = 0; i < 60 && W.length === n; i++) await T.sleep(100);
    return W.length > n ? JSON.parse(W[W.length - 1].text) : null;
  }
  async function undo(){ document.getElementById('undo-btn').click(); await settle(); await T.sleep(200); }
  function meta(){ return txt(document.getElementById('meta-production')); }
  function readout(){ return txt(document.getElementById('prod-total-readout')); }
  // The header's principal-photography line, as the waterfall prints it.
  function ppLine(){
    var m = /Principal Photography ([\d.]+) \/ Wrap: ([\d.]+)/.exec(txt(document.getElementById('table-wrap')));
    return m ? m[1] + ' / ' + m[2] : null;
  }
  async function toSheet(){ if(!document.querySelector('#table-wrap table.sheet-table')){ document.getElementById('view-sheet-btn').click(); await settle(); } }
  async function toMonth(label){
    if(!document.querySelector('#table-wrap .mv-daygrid')){ document.getElementById('view-month-btn').click(); await settle(); }
    var want = Date.parse('1 ' + label);
    for(var i = 0; i < 40; i++){
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if(my === label) return settle();
      var btn = document.getElementById(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if(!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  // The month on screen as {iso: {cell, week, col, sunday}} (the mvmenu leg's arithmetic).
  function monthCells(){
    var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
    var m0 = new Date(Date.parse('1 ' + my + ' UTC'));
    var map = {};
    [].forEach.call(document.querySelectorAll('#table-wrap .mv-body > .mv-week'), function (wk) {
      var cells = wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell');
      var inIdx = [].findIndex.call(cells, function (c) { return !c.classList.contains('mv-out'); });
      if(inIdx < 0) return;
      var d = +txt(cells[inIdx].querySelector('.mv-daynum'));
      var sunday = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth(), d) - inIdx * 86400000;
      [].forEach.call(cells, function (c, i) {
        map[new Date(sunday + i * 86400000).toISOString().slice(0, 10)] = {cell: c, week: wk, col: i, sunday: sunday};
      });
    });
    return map;
  }
  // Production's pills in the month on screen: their first day, their text and their grey text.
  function prodPills(){
    var map = monthCells(), res = [];
    Object.keys(map).forEach(function (iso) {
      var m = map[iso];
      if(m.col !== 0) return;
      [].forEach.call(m.week.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
        var tagEl = p.querySelector('.mv-pill-block'), t = '';
        p.childNodes.forEach(function (n) { if(n !== tagEl) t += n.textContent; });
        res.push({from: new Date(m.sunday + (+p.style.gridColumnStart - 1) * 86400000).toISOString().slice(0, 10),
                  text: t.trim(), tag: tagEl ? txt(tagEl) : ''});
      });
    });
    return res.sort(function (a, b) { return a.from < b.from ? -1 : 1; });
  }
  // Production's pills over this month and the next n-1.
  async function pillsAhead(n){
    var res = [];
    for(var i = 0; i < n; i++){
      res = res.concat(prodPills());
      var nx = document.getElementById('mv-next');
      if(!nx || nx.disabled) break;
      nx.click(); await settle();
    }
    return res;
  }
  async function redo(){ document.getElementById('redo-btn').click(); await settle(); await T.sleep(200); }
  // The month view's all-phase hiatus bands on screen: [text, background].
  function monthBands(){ return [].map.call(document.querySelectorAll('#table-wrap .mv-hiatus-bar'), function (b) { return [txt(b), rgbHex(b.style.background || b.style.backgroundColor)]; }); }
  async function bringIntoView(el){
    var pp = document.querySelector('.preview-panel');
    var r = el.getBoundingClientRect(), q = pp ? pp.getBoundingClientRect() : {top: 0, bottom: innerHeight, height: innerHeight};
    if(pp && (r.top < q.top + 20 || r.bottom > q.bottom - 20)){
      pp.scrollTop += (r.top + r.height / 2) - (q.top + q.height / 2);
      await T.sleep(250);
    }
  }
  async function pointOn(iso, where){
    var m = monthCells()[iso];
    if(!m) throw new Error('no cell for ' + iso);
    await bringIntoView(m.cell);
    m = monthCells()[iso];
    var r = m.cell.getBoundingClientRect();
    return {x: Math.round(r.left + r.width / 2), y: where === 'num' ? Math.round(r.top + 8) : Math.round(r.top + r.height / 2), cell: m.cell};
  }
  // Hit-tested presses, as Chrome sends them (mvmenu's rclickAt / lclickAt).
  async function rclick(iso, where){
    var p = await pointOn(iso, where || 'mid'), el = document.elementFromPoint(p.x, p.y);
    var base = {bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 2, buttons: 2};
    el.dispatchEvent(new MouseEvent('mousedown', base));
    el.dispatchEvent(new MouseEvent('contextmenu', base));
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, {buttons: 0})));
    await T.sleep(100);
  }
  async function lclick(iso){
    var p = await pointOn(iso, 'num'), el = document.elementFromPoint(p.x, p.y);
    var base = {bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0, buttons: 1, detail: 1};
    el.dispatchEvent(new MouseEvent('mousedown', base));
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, {buttons: 0})));
    el.dispatchEvent(new MouseEvent('click', Object.assign({}, base, {buttons: 0})));
    await T.sleep(100);
  }
  function menuEl(){ return document.querySelector('.day-menu'); }
  function key(k){ document.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true})); }
  function closeMenu(){ if(menuEl()) key('Escape'); }
  function menuCtx(){ return txt(menuEl() && menuEl().querySelector('.day-menu-ctx')); }
  function shootLabel(){ var l = menuEl() && menuEl().querySelector('[data-section="shoot"] .day-menu-label'); return l ? txt(l) : null; }
  function shootRows(){
    var m = menuEl();
    return m ? [].map.call(m.querySelectorAll('[data-section="shoot"] .day-menu-item'), function (b) {
      return [b.getAttribute('data-ov'), txt(b.querySelector('.day-menu-text')).replace(txt(b.querySelector('small')), '').trim(), b.getAttribute('aria-checked')];
    }) : null;
  }
  function shootNotice(){ var n = menuEl() && menuEl().querySelector('[data-section="shoot"] .day-menu-notice'); return n ? txt(n) : ''; }
  function sectionIds(){ var m = menuEl(); return m ? [].map.call(m.querySelectorAll('[data-section]'), function (s) { return s.getAttribute('data-section'); }) : []; }
  function hiatusItems(){
    var s = menuEl() && menuEl().querySelector('[data-section="hiatus"]');
    return s ? [].map.call(s.querySelectorAll('.day-menu-item'), function (b) { return {id: b.getAttribute('data-item'), checked: b.getAttribute('aria-checked')}; }) : [];
  }
  function chooseIf(sel){ var b = menuEl() && menuEl().querySelector(sel); if(b){ b.click(); return true; } closeMenu(); return false; }
  // The shoot-day section's "Work this day" row, whatever its word.
  async function workDay(iso){ await lclick(iso); var ok = chooseIf('[data-section="shoot"] [data-item="ov-lead"], [data-section="shoot"] [data-item="ov-on"]'); await settle(); await T.sleep(200); return ok; }
  // The waterfall's Production label in the week of `mondayIso`.
  function sheetProd(mondayIso){
    var td = document.querySelector('#table-wrap td.sheet-phase-cell[data-week="' + mondayIso + '"][data-pkey="production"]');
    return td ? txt(td) : null;
  }
  function sheetHiatus(mondayIso){
    var td = document.querySelector('#table-wrap td.sheet-hiatus-cell[data-week="' + mondayIso + '"]:not([data-pkey])');
    return td ? {text: txt(td), bg: td.style.background || td.style.backgroundColor} : null;
  }
  function rgbHex(s){ var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s || ''); return m ? '#' + [m[1], m[2], m[3]].map(function (n) { return ('0' + (+n).toString(16)).slice(-2); }).join('').toUpperCase() : (s || '').toUpperCase(); }
  // Every element in the month body whose own text (no children) is `t`.
  function monthTextEls(t){
    return [].filter.call(document.querySelectorAll('#table-wrap .mv-body *'), function (el) {
      return [].some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim() === t; });
    });
  }
  async function dismissQuestion(label){
    for(var i = 0; i < 20; i++){ if(T.modalText()){ T.clickModalButton(label); await T.sleep(300); return true; } await T.sleep(50); }
    return false;
  }

  try {
    await T.appReady();
    await settle();
    await T.until(function () { return (document.getElementById('start-production') || {}).value === '2026-06-29'; }, 'the halfdays fixture', 150, 100);
    await T.sleep(800);
    var halfdays = await fixture('halfdays');
    var blocksTxt = await fixture('blocks');

    // ================================ E: item 3, "Ep." only before numbers ================================
    // E1: rename Episode 201 "Pilot" in its row, as a user types it. Its bar reads "Pilot"; 202's still "Ep. 202".
    var row201 = document.querySelector('#episode-rows .episode-row .ep-name');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(row201, 'Pilot');
    row201.dispatchEvent(new Event('input', {bubbles: true}));
    await T.sleep(400);
    await toMonth('July 2026');
    var e1 = prodPills();
    add('E1', '⭐ Episode 201 renamed "Pilot": its month bars read "Pilot", never "Ep. Pilot"; 202\'s bar still reads "Ep. 202"',
      e1.some(function (p) { return p.from === '2026-06-29' && p.text === 'Pilot'; }) && e1.some(function (p) { return p.text === 'Ep. 202'; })
        && !e1.some(function (p) { return /Ep\. Pilot/.test(p.text + p.tag); }),
      e1.slice(0, 6), '6/29 "Pilot", "Ep. 202"');
    // E1h: the day menu's header names it the same way (dayFacts reads unitLabelParts).
    await rclick('2026-07-01', 'mid');
    var e1h = menuCtx();
    closeMenu();
    add('E1h', 'The day menu on Wed 1 Jul names the episode "Pilot" in its header', /Shoot day 3 · Pilot · Production Week 1/.test(e1h), e1h, 'Shoot day 3 · Pilot · Production Week 1');

    // E2: labelled by WEEK (one bar per week, ruling 8's grey text lists the week's episodes), with 202 renamed.
    // Week of 6 Jul holds 201 (6 Jul) and 202 (7-10 Jul): "Ep. 201, Pilot". Week of 13 Jul holds 202 (half of
    // 13 Jul) and 203: "Pilot, Ep. 203" -- the owner's "Pilot, Ep. 102, 103" shape.
    var j2 = JSON.parse(halfdays);
    j2.episodeDefs[1].name = 'Pilot'; j2.episodeDefs[1].nameEdited = true; j2.mvProdLabel = 'week';
    j2.fields.byId['show-title'] = {value: 'E2 Week'};
    await openText(JSON.stringify(j2), 'e2.sptcal', 'E2 Week');
    await toMonth('July 2026');
    var e2 = prodPills();
    var tags2 = e2.map(function (p) { return p.tag; });
    add('E2', '⭐ Labelled by Week with Episode 202 renamed "Pilot": the week of 6 Jul reads "Ep. 201, Pilot" and the week of 13 Jul "Pilot, Ep. 203" (the owner\'s pick for a mixed list); no "Ep. Pilot" anywhere',
      tags2.indexOf('Ep. 201, Pilot') >= 0 && tags2.indexOf('Pilot, Ep. 203') >= 0 && !tags2.some(function (t) { return /Ep\. Pilot/.test(t); }),
      e2, '"Ep. 201, Pilot", "Pilot, Ep. 203"');
    // E2n: the same calendar with numbered names only reads exactly as before ("Ep. 201, 202").
    var j2n = JSON.parse(halfdays); j2n.mvProdLabel = 'week'; j2n.fields.byId['show-title'] = {value: 'E2 Numbers'};
    await openText(JSON.stringify(j2n), 'e2n.sptcal', 'E2 Numbers');
    await toMonth('July 2026');
    var tags2n = prodPills().map(function (p) { return p.tag; });
    add('E2n', 'Numbered episodes only: the same weeks read "Ep. 201, 202" and "Ep. 202, 203", "Ep." once per list as before',
      tags2n.indexOf('Ep. 201, 202') >= 0 && tags2n.indexOf('Ep. 202, 203') >= 0, tags2n, '"Ep. 201, 202", "Ep. 202, 203"');

    // E3: a Blocks calendar (blocks.sptcal: five blocks of 18 days, hand-arranged as 201-202 / 203-205 / 206 /
    // 207-208 / 209-210) with Episode 203 renamed. Block 2 holds Pilot, 204, 205: "Pilot, Ep. 204, 205".
    var j3 = JSON.parse(blocksTxt);
    j3.episodeDefs[2].name = 'Pilot'; j3.episodeDefs[2].nameEdited = true; j3.fields.byId['show-title'] = {value: 'E3 Blocks'};
    await openText(JSON.stringify(j3), 'e3.sptcal', 'E3 Blocks');
    var startB = (document.getElementById('start-production') || {}).value;
    var monthB = new Date(startB + 'T00:00:00Z').toLocaleString('en-GB', {month: 'long', year: 'numeric', timeZone: 'UTC'});
    await toMonth(monthB);
    var e3 = await pillsAhead(3);
    add('E3', 'A Blocks calendar with Episode 203 renamed "Pilot": Block 2\'s grey text ends "Pilot, Ep. 204, 205", Block 1\'s still "Ep. 201, 202"',
      e3.some(function (p) { return p.text === 'Block 2' && /· Pilot, Ep\. 204, 205$/.test(p.tag); })
        && e3.some(function (p) { return p.text === 'Block 1' && /· Ep\. 201, 202$/.test(p.tag); }) && !e3.some(function (p) { return /Ep\. Pilot/.test(p.tag); }),
      e3.filter(function (p) { return p.tag; }).slice(0, 6), 'Block 2 | … · Pilot, Ep. 204, 205');

    // ================================ B: item 4, Blocks without an episode count ================================
    var j4 = JSON.parse(blocksTxt); j4.fields.byId['show-title'] = {value: 'B Blocks'};
    await openText(JSON.stringify(j4), 'b.sptcal', 'B Blocks');
    await toSheet();
    var b0 = {meta: meta(), readout: readout(), pp: ppLine()};
    T.set('num-episodes', '');
    await settle(); await T.sleep(400);
    var b1 = {meta: meta(), readout: readout(), pp: ppLine(),
              warn: (function () { var w = document.getElementById('ep-panel-warn'); return w && w.style.display !== 'none' ? txt(w) : ''; })(),
              hint: txt(document.querySelector('#episode-rows .ep-hint')),
              optional: (function () { var l = document.querySelector('label[for="num-episodes"]'); var s = l && l.querySelector('.show-mode-blocks'); return s ? getComputedStyle(s).display : null; })()};
    add('B1', '⭐ blocks.sptcal with its episode count cleared: Production stays scheduled from its block days (the same meta line, readout and principal-photography line as with 10 episodes), with no "Complete Show Info" warning',
      !!b0.pp && b1.meta === b0.meta && b1.readout === b0.readout && b1.pp === b0.pp && b1.warn === '', {before: b0, after: b1}, 'unchanged dates');
    add('B1u', 'The label reads "Number of Episodes (optional)" in Blocks mode, and the block list says where episode names come from',
      b1.optional && b1.optional !== 'none' && /Number of Episodes in Show Info/.test(b1.hint), {optional: b1.optional, hint: b1.hint}, '(optional) shown; the no-episodes hint');
    await toMonth(new Date(startB + 'T00:00:00Z').toLocaleString('en-GB', {month: 'long', year: 'numeric', timeZone: 'UTC'}));
    var b2 = prodPills();
    add('B2', 'Its month bars still read "Block 1" …, and no grey text names an episode (the old list is kept for the count coming back, but not shown)',
      b2.length > 0 && b2.some(function (p) { return p.text === 'Block 1'; }) && !b2.some(function (p) { return /Ep\./.test(p.text + p.tag); }), b2.slice(0, 4), 'Block N, no Ep.');
    var s3 = await saveNow();
    add('B3', 'Save writes blocksEpisodesOptional: true (the new rule\'s marker) and an empty count',
      !!s3 && s3.blocksEpisodesOptional === true && s3.fields.byId['num-episodes'].value === '', s3 && {key: s3.blocksEpisodesOptional, numEp: s3.fields.byId['num-episodes']}, 'true, ""');
    var savedB3 = W[W.length - 1].text;
    var j3r = JSON.parse(savedB3); j3r.fields.byId['show-title'] = {value: 'B Reopened'};
    await openText(JSON.stringify(j3r), 'b3.sptcal', 'B Reopened');
    await toSheet();
    add('B3r', 'Reopened, that file schedules Production exactly as it was saved', meta() === b0.meta && ppLine() === b0.pp, {meta: meta(), pp: ppLine()}, b0.pp);

    // B4: the OLD file. blocks-noeps-v1.5.0 is a real Save by v1.5.0, where Production was unscheduled.
    var oldTxt = await fixture('blocks-noeps-v1.5.0');
    await openText(oldTxt, 'blocks-noeps-v1.5.0.sptcal', 'Blocks No Count');
    await toSheet();
    var b4 = {meta: meta(), readout: readout(), pp: ppLine(), cells: document.querySelectorAll('#table-wrap td.sheet-phase-cell[data-pkey="production"]').length,
              warn: txt(document.getElementById('ep-panel-warn')), title: title(), modal: T.modalText()};
    add('B4', '⭐ The v1.5.0 file (Blocks, no count) opens with its dates unmoved: Production unscheduled ("Enter a shooting day count…", "Set by Show Info", no Production cells), the warning still naming Number of Episodes',
      /Enter a shooting day count/.test(b4.meta) && /Set by Show Info/.test(b4.readout) && b4.cells === 0 && /Number of Episodes/.test(b4.warn), b4, 'unscheduled, as in v1.5.0');
    T.set('show-title', 'Blocks No Count edited');
    await settle(); await T.sleep(400);
    var s4 = await saveNow();
    add('B5', 'An edit outside Show Info (the title) leaves it on the old rule, and its Save carries no blocksEpisodesOptional',
      /Enter a shooting day count/.test(meta()) && !!s4 && !('blocksEpisodesOptional' in s4), {meta: meta(), key: s4 && ('blocksEpisodesOptional' in s4)}, 'unscheduled, no key');
    await T.sleep(700);
    T.set('days-per-block', '16');
    await settle(); await T.sleep(600);
    var b6 = {meta: meta(), readout: readout(), pp: ppLine()};
    add('B6', '⭐ Its next Show Info edit (Days per Block 15 → 16, the owner\'s "Next Show Info edit") puts it on the new rule: Production is scheduled from 3 × 16 = 48 block days',
      /48/.test(b6.readout) && !!b6.pp && !/Enter a shooting day count/.test(b6.meta), b6, '48 days, scheduled');
    await T.sleep(700);
    await undo();
    add('B6u', 'One undo puts back 15 days AND the old rule: Production unscheduled again',
      /Enter a shooting day count/.test(meta()) && (document.getElementById('days-per-block') || {}).value === '15', {meta: meta(), dpb: (document.getElementById('days-per-block') || {}).value}, 'unscheduled, 15');
    // B7: Episodes mode is unchanged -- there the count still drives the total.
    var j7 = JSON.parse(blocksTxt); j7.fields.byId['show-title'] = {value: 'B7 Episodes'}; j7.fields.byId['show-mode'] = {value: 'episodes'};
    j7.fields.byId['num-episodes'] = {value: ''};
    await openText(JSON.stringify(j7), 'b7.sptcal', 'B7 Episodes');
    await toSheet();
    add('B7', 'Episodes mode with no count is unchanged: Production waits for the count', /Set by Show Info/.test(readout()) && /Enter a shooting day count/.test(meta()), {readout: readout(), meta: meta()}, 'Set by Show Info');

    // ================================ L: item 5, the weekend just before ================================
    var jL = JSON.parse(halfdays); jL.fields.byId['show-title'] = {value: 'L Lead'};
    await openText(JSON.stringify(jL), 'l.sptcal', 'L Lead');
    await toSheet();
    var l0 = {pp: ppLine(), wk1: sheetProd('2026-06-29'), before: sheetProd('2026-06-22')};
    await toMonth('June 2026');
    await lclick('2026-06-27');
    var l1m = {label: shootLabel(), rows: shootRows()};
    var picked = chooseIf('[data-section="shoot"] [data-item="ov-lead"]');
    await settle(); await T.sleep(300);
    await toSheet();
    var l1 = {pp: ppLine(), wk1: sheetProd('2026-06-22'), wk2: sheetProd('2026-06-29')};
    add('L0', 'Control: halfdays shoots 6.29.26 to 9.1.26, Production wk 1 is the week of 29 Jun, and nothing the week before',
      l0.pp === '6.29.26 / 9.1.26' && l0.wk1 === 'Production wk 1' && l0.before === null, l0, '6.29.26 / 9.1.26');
    add('L1', 'Sat 27 Jun (the weekend just before) offers "Not a shoot day": Weekend — not shot ✓ · Work this day, written as "lead"',
      l1m.label === 'Not a shoot day' && eq(l1m.rows, [['', 'Weekend — not shot', 'true'], ['lead', 'Work this day', 'false']]), l1m, 'lead row');
    add('L2', '⭐ Work this day on Sat 27 Jun makes it the first shoot day: the shoot reads 6.27.26 to 8.31.26 (one weekday fewer at the end), and the weekend\'s week is Production wk 1, so 29 Jun\'s is wk 2 (the owner\'s "Yes, build it so")',
      picked && l1.pp === '6.27.26 / 8.31.26' && l1.wk1 === 'Production wk 1' && l1.wk2 === 'Production wk 2', l1, '6.27.26 / 8.31.26, wk 1 = 22 Jun');
    await toMonth('June 2026');
    await lclick('2026-06-27');
    var l2m = {label: shootLabel(), rows: shootRows(), ctx: menuCtx()};
    closeMenu();
    add('L2m', 'The day menu on 27 Jun now says "Shoot day 1", with Work this day checked',
      l2m.label === 'Shoot day 1' && eq(l2m.rows, [['', 'Weekend — not shot', 'false'], ['lead', 'Work this day', 'true']]) && /^Shoot day 1 /.test(l2m.ctx), l2m, 'Shoot day 1');
    await T.sleep(700);
    await undo();
    await toSheet();
    add('L3', 'One undo takes it back: 6.29.26 / 9.1.26, wk 1 the week of 29 Jun', ppLine() === '6.29.26 / 9.1.26' && sheetProd('2026-06-29') === 'Production wk 1', {pp: ppLine(), wk: sheetProd('2026-06-29')}, '6.29.26 / 9.1.26');
    // L4: Sunday alone, then both days: each day worked takes one weekday off the end.
    await toMonth('June 2026');
    await workDay('2026-06-28');
    await toSheet();
    var l4a = ppLine();
    await toMonth('June 2026');
    await workDay('2026-06-27');
    await toSheet();
    var l4b = ppLine();
    add('L4', 'Sun 28 Jun alone: 6.28.26 / 8.31.26; then Sat 27 Jun too: 6.27.26 / 8.28.26', l4a === '6.28.26 / 8.31.26' && l4b === '6.27.26 / 8.28.26', {sunday: l4a, both: l4b}, '6.28.26 / 8.31.26, 6.27.26 / 8.28.26');
    // L5: a mover carries it (audit M-4, by shoot-day number): Start Production here on Mon 13 Jul moves the
    // natural first day to 13 Jul, and both marks land on the weekend before it, 11-12 Jul.
    await toMonth('July 2026');
    var p13 = await pointOn('2026-07-13', 'mid');
    var pill13 = [].find.call(monthCells()['2026-07-13'].week.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) { return true; });
    var pr = pill13 && pill13.getBoundingClientRect();
    if(pr){
      var el13 = document.elementFromPoint(Math.round(p13.x), Math.round(pr.top + pr.height / 2));
      var b13 = {bubbles: true, cancelable: true, clientX: p13.x, clientY: Math.round(pr.top + pr.height / 2), button: 2, buttons: 2};
      el13.dispatchEvent(new MouseEvent('mousedown', b13)); el13.dispatchEvent(new MouseEvent('contextmenu', b13)); el13.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, b13, {buttons: 0})));
      await T.sleep(100);
    }
    var moved = chooseIf('[data-item="phase-start"]');
    await settle(); await T.sleep(400);
    await toSheet();
    var l5 = {start: (document.getElementById('start-production') || {}).value, pp: ppLine()};
    add('L5', '⭐ Start Production here on Mon 13 Jul (a mover) carries both marks to the weekend before it: the shoot reads 7.11.26 to …, two weekdays short of a 13 Jul start',
      moved && l5.start === '2026-07-13' && !!l5.pp && l5.pp.indexOf('7.11.26 / ') === 0, l5, 'start 13 Jul, first shoot day 11 Jul');
    // L6: an OLD 'on' on that weekend is inert (it would move the wrap with no edit), and the menu says so.
    var j6 = JSON.parse(halfdays); j6.fields.byId['show-title'] = {value: 'L6 Stale'}; j6.dayOverrides = {'2026-06-27': 'on'};
    await openText(JSON.stringify(j6), 'l6.sptcal', 'L6 Stale');
    await toSheet();
    var l6 = {pp: ppLine()};
    await toMonth('June 2026');
    await lclick('2026-06-27');
    l6.label = shootLabel(); l6.rows = shootRows(); l6.notice = shootNotice();
    var rewrote = chooseIf('[data-section="shoot"] [data-item="ov-lead"]');
    await settle(); await T.sleep(300);
    await toSheet();
    l6.after = ppLine();
    add('L6', '⭐ A stored "on" on Sat 27 Jun (saved before this build) stays INERT: the shoot still reads 6.29.26 / 9.1.26, and the menu shows it as stored but not in effect',
      l6.pp === '6.29.26 / 9.1.26' && l6.label === 'Not a shoot day' && /Stored “Work this day” — not in effect on this day/.test(l6.notice)
        && eq(l6.rows, [['', 'Weekend — not shot', 'false'], ['lead', 'Work this day', 'false']]), l6, 'inert, stale notice');
    add('L6w', 'Choosing Work this day there rewrites it as "lead", and then it counts: 6.27.26 / 8.31.26', rewrote && l6.after === '6.27.26 / 8.31.26', l6.after, '6.27.26 / 8.31.26');
    // L7: a 'lead' further back than the weekend just before is never reached.
    var j7l = JSON.parse(halfdays); j7l.fields.byId['show-title'] = {value: 'L7 Far'}; j7l.dayOverrides = {'2026-06-20': 'lead'};
    await openText(JSON.stringify(j7l), 'l7.sptcal', 'L7 Far');
    await toSheet();
    var l7 = {pp: ppLine()};
    await toMonth('June 2026');
    await lclick('2026-06-20');
    l7.sections = sectionIds();
    closeMenu();
    add('L7', 'A "lead" on Sat 20 Jun, a week before the weekend just before, is inert (6.29.26 / 9.1.26) and that day offers no shoot-day section',
      l7.pp === '6.29.26 / 9.1.26' && l7.sections.indexOf('shoot') < 0, l7, 'inert, no section');

    // ================================ H: item 7, the month header ================================
    var jH = JSON.parse(await fixture('mvheaderlegacy')); jH.fields.byId['show-title'] = {value: 'H Header'};
    await openText(JSON.stringify(jH), 'h.sptcal', 'H Header');
    var bar = document.querySelector('#table-wrap .hdr-fmt[data-mv="1"]');
    var sizes = bar ? [].map.call(bar.querySelectorAll('.hf-size option'), function (o) { return o.value; }) : null;
    add('H1', 'The month header\'s size list offers 10, 11 and 12 below 14 (the owner\'s "10"): Size, 10, 11, 12, 14 … 30',
      eq(sizes, ['', '10', '11', '12', '14', '16', '18', '20', '22', '26', '30']), sizes, 'Size, 10 … 30');
    var line = document.querySelector('#table-wrap .hdr-line.hdr-editable[data-mvhid="title"]');
    var hid = line && line.getAttribute('data-mvhid');
    if(line){ line.focus(); line.dispatchEvent(new FocusEvent('focusin', {bubbles: true})); }
    await T.sleep(200);
    var sel = bar && bar.querySelector('.hf-size');
    if(sel){ sel.value = '10'; sel.dispatchEvent(new Event('change', {bubbles: true})); }
    await settle(); await T.sleep(300);
    var line2 = hid && document.querySelector('#table-wrap .hdr-line[data-mvhid="' + hid + '"]');
    var fs = line2 ? getComputedStyle(line2).fontSize : null;
    add('H2', 'Choosing 10 sets the focused month header line (the title) to 10 px', hid === 'title' && fs === '10px', {hid: hid, fontSize: fs}, '10px');
    // H3: the fixed date in the shared token list (the header editor's rail), with its live preview.
    await toSheet();
    var stale = document.querySelector('.hdr-mode-pop'); if(stale) stale.remove();
    var modeBtn = document.getElementById('hdr-mode-btn');
    if(modeBtn) modeBtn.click();
    try { await T.until(function () { return !!document.querySelector('.hdr-mode-peek'); }, 'the mode popover', 40, 100); document.querySelector('.hdr-mode-peek').click(); } catch (e) {}
    try { await T.until(function () { return !!document.querySelector('.hde-overlay'); }, 'the header editor', 60, 100); } catch (e) {}
    await T.sleep(400);
    var now = new Date(), two = function (n) { return ('0' + n).slice(-2); };
    var iso = now.getFullYear() + '-' + two(now.getMonth() + 1) + '-' + two(now.getDate());
    var dot = (now.getMonth() + 1) + '.' + now.getDate() + '.' + String(now.getFullYear()).slice(2);
    var toks = [].map.call(document.querySelectorAll('.hde-overlay .hde-rail-list .hdr-token-item'), function (b) {
      return [txt(b.querySelector('.hdr-token-code')), txt(b.querySelector('.hdr-token-desc'))];
    });
    var tDate = toks.find(function (t) { return t[0] === '{date:' + iso + '}'; });
    var tRev = toks.find(function (t) { return t[0] === 'Revised as of {date:' + iso + '}'; });
    add('H3', '⭐ The token list offers {date:<today>} (a fixed date, previewed as ' + dot + ') and the snippet "Revised as of {date:<today>}"',
      !!tDate && tDate[1] === dot && !!tRev && tRev[1] === 'Revised as of ' + dot, {date: tDate, revised: tRev, count: toks.length}, '{date:' + iso + '} → ' + dot);
    var x = document.querySelector('.hde-overlay .hde-close, .hde-overlay [aria-label="Close"]'); if(x) x.click();
    key('Escape'); await T.sleep(300);
    if(document.querySelector('.hde-overlay')){ key('Escape'); await T.sleep(300); }

    // ================================ F: item 8, France ================================
    var jF = JSON.parse(halfdays); jF.fields.byId['show-title'] = {value: 'F France'};
    await openText(JSON.stringify(jF), 'f.sptcal', 'F France');
    var opt = document.querySelector('#union-place option[value="eu-france"]');
    T.set('union-place', 'eu-france');
    await dismissQuestion('Continue');
    await settle(); await T.sleep(500);
    var f1 = {opt: opt && txt(opt), group: opt && opt.parentNode.label, resolves: txt(document.getElementById('union-resolves')),
              locals: txt(document.getElementById('union-locals')), caveat: txt(document.getElementById('union-caveat'))};
    add('F1', '⭐ Location ▸ Europe ▸ France resolves to FR, the film agreement, and its caveat (Alsace-Moselle, Whit Monday on TV)',
      f1.opt === 'France' && f1.group === 'Europe' && f1.resolves === 'France → FR' && /IDCC 3097/.test(f1.locals)
        && /Alsace-Moselle .* adds Good Friday and 26 December/.test(f1.caveat) && /Whit Monday as the solidarity day/.test(f1.caveat), f1, 'France → FR');
    await toMonth('July 2026');
    await lclick('2026-07-14');
    var f2 = {label: shootLabel(), ctx: menuCtx()};
    closeMenu();
    await lclick('2026-07-03');
    var f3 = {label: shootLabel()};
    closeMenu();
    add('F2', 'Tue 14 Jul (Bastille Day) is not shot, and Fri 3 Jul (a US holiday only) is',
      f2.label === 'Not a shoot day' && /Bastille Day \(Fête nationale\)/.test(f2.ctx) && /^Shoot day \d+$/.test(f3.label || ''), {jul14: f2, jul3: f3}, '14 Jul off, 3 Jul shot');
    var sF = await saveNow();
    add('F3', 'Save writes union-place "eu-france"', !!sF && sF.fields.byId['union-place'].value === 'eu-france', sF && sF.fields.byId['union-place'], 'eu-france');

    // ================================ C: item 9, hiatus bands ================================
    var jC = JSON.parse(halfdays); jC.fields.byId['show-title'] = {value: 'C Hiatus'};
    await openText(JSON.stringify(jC), 'c.sptcal', 'C Hiatus');
    var row0 = document.querySelector('#hiatus-list .hiatus-entry');
    var box = row0 && row0.querySelector('.hiatus-num');
    var s0 = await saveNow();
    add('C0', 'Each hiatus row has a "Number weeks" box, unticked, with no id; an unticked row saves exactly the four keys it always had',
      !!box && !box.checked && !box.id && !!s0 && eq(Object.keys(s0.fields.hiatuses[0]).sort(), ['locked', 'name', 'start', 'weeks']),
      {box: !!box, checked: box && box.checked, keys: s0 && Object.keys(s0.fields.hiatuses[0])}, 'unticked; start, weeks, locked, name');
    await toSheet();
    var c0 = [sheetHiatus('2026-12-21'), sheetHiatus('2026-12-28')];
    await T.sleep(700);
    await toMonth('December 2026');
    await T.sleep(700);
    // ⚠️ A view switch is its own undo step (the offweek leg's note), so every undo below runs in the view
    // the action was taken in, and the waterfall is read only after a redo.
    // A title typed just before, and not yet banked (the 500 ms debounce): the item's LEADING undo push must
    // file it as its own step, so one undo takes back the item and keeps the title (mvmenu's idiom).
    T.set('show-title', 'C Typed 1');
    await rclick('2026-12-22', 'mid');
    var c1m = hiatusItems();
    var numbered = chooseIf('[data-section="hiatus"] [data-item^="band-num-"]');
    await settle(); await T.sleep(300);
    var c1month = monthBands();
    await T.sleep(700);
    await undo();
    var c1umonth = monthBands(), c1ubox = document.querySelector('#hiatus-list .hiatus-entry .hiatus-num').checked, c1utitle = title();
    await redo();
    await toSheet();
    var c1 = [sheetHiatus('2026-12-21'), sheetHiatus('2026-12-28')];
    add('C1', '⭐ Number weeks, from the day menu on 22 Dec, ticks the row\'s box and labels its bands "Hiatus Week 1" and "Hiatus Week 2" in the month view and the waterfall',
      numbered && c0[0].text === 'Hiatus' && c1[0].text === 'Hiatus Week 1' && c1[1].text === 'Hiatus Week 2'
        && document.querySelector('#hiatus-list .hiatus-entry .hiatus-num').checked
        && eq(c1month.map(function (b) { return b[0]; }), ['Hiatus Week 1', 'Hiatus Week 2']),
      {items: c1m, before: c0, after: c1, month: c1month}, 'Hiatus Week 1, Hiatus Week 2');
    add('C1u', 'One undo (in the month view) puts both bands back to "Hiatus" and unticks the box, keeping the title typed just before; redo ticks it again',
      eq(c1umonth.map(function (b) { return b[0]; }), ['Hiatus', 'Hiatus']) && !c1ubox && c1utitle === 'C Typed 1', {month: c1umonth, box: c1ubox, title: c1utitle}, 'Hiatus, unticked, title kept');
    // C2: Colour… paints every week of the hiatus, in both views.
    await T.sleep(700);
    await toMonth('December 2026');
    await T.sleep(700);
    T.set('show-title', 'C Typed 2');
    await rclick('2026-12-22', 'mid');
    chooseIf('[data-section="hiatus"] [data-item^="band-colour-"]');
    await T.sleep(200);
    var pop = document.querySelector('.phase-color-pop');
    var sw = pop ? [].map.call(pop.querySelectorAll('.pc-sw'), function (s) { return s.title; }) : [];
    var sel0 = pop ? [].findIndex.call(pop.querySelectorAll('.pc-sw'), function (s) { return s.classList.contains('selected'); }) : -2;
    var blue = pop && [].find.call(pop.querySelectorAll('.pc-sw'), function (s) { return s.title.toUpperCase() === '#0070C0'; });
    if(blue) blue.click();
    await settle(); await T.sleep(300);
    var c2month = monthBands();
    await T.sleep(700);
    await undo();
    var c3umonth = monthBands(), c3utitle = title();
    await redo();
    await toSheet();
    var c2 = [sheetHiatus('2026-12-21'), sheetHiatus('2026-12-28')];
    add('C2', '⭐ Colour… on 22 Dec opens the waterfall band editor\'s ten colours under the day, with red (the default) selected; picking #0070C0 paints BOTH weeks of the hiatus in the waterfall',
      eq(sw, ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0']) && sel0 === 1
        && rgbHex(c2[0].bg) === '#0070C0' && rgbHex(c2[1].bg) === '#0070C0' && !document.querySelector('.phase-color-pop'),
      {swatches: sw, selected: sel0, after: c2}, 'both #0070C0');
    add('C2m', 'The month view\'s bands, both weeks, are painted the same colour', c2month.length === 2 && c2month.every(function (b) { return b[1] === '#0070C0'; }), c2month, '#0070C0 ×2');
    add('C3u', 'One undo (in the month view) takes the colour off both weeks, keeping the title typed just before; redo puts it back',
      c3umonth.length === 2 && c3umonth.every(function (b) { return b[1] === '#FF0000'; }) && c3utitle === 'C Typed 2', {month: c3umonth, title: c3utitle}, 'red ×2, title kept');
    var sC = await saveNow();
    add('C3', 'Save holds the colour for both weeks in hiatusColors (the waterfall\'s own store)',
      !!sC && sC.hiatusColors['2026-12-21'] === '#0070C0' && sC.hiatusColors['2026-12-28'] === '#0070C0', sC && sC.hiatusColors, 'both weeks');
    // C4: named, unticked and ticked again in the sidebar, then saved and reopened.
    var r0 = document.querySelector('#hiatus-list .hiatus-entry');
    var nm = r0.querySelector('.hiatus-name');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(nm, 'Winter Break');
    nm.dispatchEvent(new Event('input', {bubbles: true}));
    await settle(); await T.sleep(300);
    var c4n = [sheetHiatus('2026-12-21').text, sheetHiatus('2026-12-28').text];
    document.querySelector('#hiatus-list .hiatus-entry .hiatus-num').click();
    await settle(); await T.sleep(300);
    var c4off = [sheetHiatus('2026-12-21').text, sheetHiatus('2026-12-28').text];
    document.querySelector('#hiatus-list .hiatus-entry .hiatus-num').click();
    await settle(); await T.sleep(300);
    var c4a = [sheetHiatus('2026-12-21').text, sheetHiatus('2026-12-28').text];
    var sC4 = await saveNow();
    var jC4 = JSON.parse(W[W.length - 1].text); jC4.fields.byId['show-title'] = {value: 'C4 Reopened'};
    await openText(JSON.stringify(jC4), 'c4.sptcal', 'C4 Reopened');
    await toSheet();
    var c4b = [sheetHiatus('2026-12-21').text, sheetHiatus('2026-12-28').text];
    add('C4', 'Named "Winter Break": "Winter Break Week 1/2"; the sidebar box unticked reads "Winter Break", ticked again numbered; Save writes numbered: true on that row only, and the reopened file reads the same',
      eq(c4n, ['Winter Break Week 1', 'Winter Break Week 2']) && eq(c4off, ['Winter Break', 'Winter Break']) && eq(c4a, c4n)
        && !!sC4 && sC4.fields.hiatuses[0].numbered === true && !('numbered' in sC4.fields.hiatuses[1])
        && eq(c4b, c4a) && document.querySelector('#hiatus-list .hiatus-entry .hiatus-num').checked,
      {named: c4n, unticked: c4off, ticked: c4a, saved: sC4 && sC4.fields.hiatuses.slice(0, 2), reopened: c4b}, 'Winter Break Week 1/2');

    out.health = T.appHealth();
    add('X0', 'No uncaught page errors', !(out.health.errors || []).length, out.health.errors, '[]');
  } catch (e) {
    out.error = String(e && e.stack || e);
    add('X', 'the leg ran to the end', false, out.error, 'no exception');
  }
  out.cases = cases;
  out.pass = cases.length > 0 && cases.every(function (c) { return c.pass; });
  T.done(out);
})(); });
