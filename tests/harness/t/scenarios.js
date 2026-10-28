// scenarios -- several calendars in one file, switched by the tabs under the calendar, compared in one window
// (SCENARIOS-PLAN.md; owner rulings D1-D6 and the 22-23 Oct 2026 follow-ups).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh scenarios 300
//
// Everything is driven the way a user drives it: the strip's buttons and tabs, the rename box, the Compare window's
// chips and export buttons, and Save / Load through openViaFakePicker's recording handle. Nothing reaches into the
// engine. The calendar is tests/fixtures/halfdays.sptcal (synthetic): 10 episodes of 4.5 days from 29 Jun 2026.
//
// Writes scenarios.sptcal (the three-scenario file it saved: the source of tests/fixtures/scenarios-3.sptcal),
// scenarios.xlsx and scenarios.compare.pdf (Compare's two exports).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function tabs(){ return [].slice.call(document.querySelectorAll('.sc-tab')).map(function(t){
    return (t.classList.contains('is-current') ? '*' : '') + (t.querySelector('input') ? '[editing]' : t.textContent.trim()); }).join(' | '); }
  function tab(name){ return [].slice.call(document.querySelectorAll('.sc-tab')).filter(function(t){ return t.textContent.trim() === name; })[0]; }
  function eps(){ return document.getElementById('num-episodes').value; }
  function header(){ return [].slice.call(document.querySelectorAll('#table-wrap .cal-header-bar .hdr-line, #table-wrap .mv-header .hdr-line'))
    .map(function(e){ return e.textContent.trim(); }).filter(Boolean).join(' / '); }
  function wrapIn(h){ var m = /Wrap: ([\d.]+)/.exec(h); return m ? m[1] : null; }
  async function waitFor(fn, label){ await T.until(fn, label, 60, 100); }
  async function answerAnyModal(){
    for(var g = 0; g < 10; g++){
      var m = document.querySelector('.mantine-Modal-content:not(.compare-dlg .mantine-Modal-content)');
      if(m && !m.closest('.compare-dlg')){
        var bs = [].slice.call(m.querySelectorAll('button')).filter(function(b){ return !/Cancel/i.test(b.textContent) && b.textContent.trim(); });
        if(bs.length){ bs[bs.length - 1].click(); await T.sleep(400); return m.innerText; }
      }
      await T.sleep(100);
    }
    return '';
  }
  async function rename(text){
    await waitFor(function(){ return !!document.querySelector('.sc-tab-input'); }, 'the rename box');
    var inp = document.querySelector('.sc-tab-input');
    inp.focus();
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(inp, text);
    inp.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    await T.sleep(300);
  }
  function addBtn(){ return document.querySelector('.sc-strip [aria-label="Duplicate this scenario"]') ||
                            [].slice.call(document.querySelectorAll('.sc-strip button')).filter(function(b){ return /Scenario/.test(b.textContent); })[0]; }
  async function clickTab(name){ tab(name).click(); await T.sleep(700); }
  async function save(){ document.getElementById('save-file-btn').click(); await T.sleep(900); }
  function compareCols(){ return [].slice.call(document.querySelectorAll('.compare-dlg thead th')).map(function(t){ return t.innerText.split('\n')[0].trim(); }).filter(Boolean); }
  function compareRow(label){
    var tr = [].slice.call(document.querySelectorAll('.compare-dlg tbody tr')).filter(function(r){ return r.children[0].innerText.trim() === label; })[0];
    return tr ? [].slice.call(tr.children).slice(1).map(function(td){ return td.innerText.replace(/\s+/g, ' ').trim(); }) : null;
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
  try {
    var writes = [];
    var p = T.openViaFakePicker('/tests/fixtures/halfdays.sptcal', 'halfdays.sptcal', {writes: writes});
    for(var g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await p; await T.sleep(1500);
    await waitFor(function(){ return !!document.querySelector('.sc-strip'); }, 'the scenario strip');

    // S0 -- one scenario: the strip holds "+ Scenario" alone, and Save writes a plain version-1 file.
    add('S0', 'with one scenario the strip is a single "+ Scenario" button', document.querySelectorAll('.sc-tab').length === 0 && /Scenario/.test(document.querySelector('.sc-strip').innerText),
      {strip: document.querySelector('.sc-strip').innerText}, '"Scenario", no tabs');
    T.set('show-version', '3'); await T.sleep(700);
    await save();
    var one = writes.length ? JSON.parse(writes[writes.length - 1].text) : {};
    add('S1', 'a one-scenario Save is an ordinary file: version 1, no scenarios key', writes.length === 1 && one.version === 1 && !('scenarios' in one),
      {writes: writes.length, version: one.version, hasScenarios: 'scenarios' in one}, '1 write, version 1, no scenarios');

    // S2 -- three scenarios, made from the strip: "+", a name typed, an edit in each copy.
    addBtn().click(); await T.sleep(600);
    await rename('8 eps');
    T.set('num-episodes', '8'); await T.sleep(900);
    var wrap8 = wrapIn(header());
    addBtn().click(); await T.sleep(600);
    await rename('Toronto');
    T.set('union-place', 'ca-toronto'); await T.sleep(500);
    var regionModal = await answerAnyModal();
    await T.sleep(700);
    var wrapTor = wrapIn(header());
    add('S2', 'three tabs, the last made current with its typed name', tabs() === 'Scenario A | 8 eps | *Toronto' && eps() === '8' && document.getElementById('union-place').value === 'ca-toronto',
      {tabs: tabs(), eps: eps(), place: document.getElementById('union-place').value, regionModal: regionModal.slice(0, 80)}, 'Scenario A | 8 eps | *Toronto, 8 episodes, ca-toronto');

    // S3 -- switching keeps the view and changes the calendar; each tab kept its own edits.
    await clickTab('Scenario A');
    var wrapA = wrapIn(header());
    var aEps = eps();
    await clickTab('8 eps');
    add('S3', 'each tab is its own calendar: A has 10 episodes, 8 eps has 8, each with its own wrap',
      aEps === '10' && eps() === '8' && wrapIn(header()) === wrap8 && wrapA && wrapA !== wrap8 && wrapTor && wrapTor !== wrap8,
      {A: [aEps, wrapA], eps8: [eps(), wrapIn(header())], toronto: wrapTor}, 'A 10, 8 eps 8, three different wraps');

    // S4 -- undo stays in its tab: in 8 eps it takes the 8 back to 10 (and redo puts it back); in A, ⌘Z undoes A's
    // OWN last edit, the Version set before the first copy was made, and leaves its 10 episodes alone.
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', metaKey: true, bubbles: true})); await T.sleep(800);
    var undone = eps();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', metaKey: true, shiftKey: true, bubbles: true})); await T.sleep(800);
    var redone = eps();
    await clickTab('Scenario A');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', metaKey: true, bubbles: true})); await T.sleep(800);
    var aEpsUndo = eps(), aVerUndo = document.getElementById('show-version').value;
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', metaKey: true, shiftKey: true, bubbles: true})); await T.sleep(800);
    add('S4', 'undo and redo act on the tab on screen only, each tab with its own history',
      undone === '10' && redone === '8' && aEpsUndo === '10' && aVerUndo === '' && document.getElementById('show-version').value === '3',
      {undone: undone, redone: redone, A: {eps: aEpsUndo, versionAfterUndo: aVerUndo, versionAfterRedo: document.getElementById('show-version').value}},
      '8 eps: 10 then 8; A: its Version undone and redone, 10 episodes throughout');

    // S5 -- the month view: a switch keeps the view and the month on screen.
    document.getElementById('view-month-btn').click(); await T.sleep(900);
    var monthBefore = (document.querySelector('#table-wrap .mv-monthyear') || {}).textContent;
    await clickTab('Toronto');
    var monthAfter = (document.querySelector('#table-wrap .mv-monthyear') || {}).textContent;
    add('S5', 'in the month view a switch stays in the month view on the same month', !!document.querySelector('#table-wrap .mv-body') && monthBefore && monthBefore === monthAfter,
      {before: monthBefore, after: monthAfter, month: !!document.querySelector('#table-wrap .mv-body')}, 'the same month, still the month view');
    document.getElementById('view-sheet-btn').click(); await T.sleep(900);

    // S6 -- Ctrl+Page Up / Down flip, as in Excel.
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageUp', ctrlKey: true, bubbles: true})); await T.sleep(800);
    var up = tabs();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageDown', ctrlKey: true, bubbles: true})); await T.sleep(800);
    add('S6', 'Ctrl+Page Up and Ctrl+Page Down flip to the previous and next tab', up === 'Scenario A | *8 eps | Toronto' && tabs() === 'Scenario A | 8 eps | *Toronto',
      {afterUp: up, afterDown: tabs()}, '8 eps, then Toronto');

    // S7 -- Save writes the container: version 2, the tab on screen at the top level, the others as snapshots.
    await save();
    var f = JSON.parse(writes[writes.length - 1].text);
    var sc = f.scenarios || {};
    var parked = (sc.tabs || []).filter(function(t){ return t.snapshot; });
    add('S7', 'Save writes version 2 with three tabs; the current one is the top level, the others version-1 snapshots',
      f.version === 2 && (sc.tabs || []).length === 3 && f.fields.byId['union-place'].value === 'ca-toronto' && parked.length === 2 &&
      parked.every(function(t){ return t.snapshot.version === 1 && t.snapshot.fields && t.snapshot.fields.byId; }) &&
      (sc.tabs || []).map(function(t){ return t.name; }).join('|') === 'Scenario A|8 eps|Toronto',
      {version: f.version, tabs: (sc.tabs || []).map(function(t){ return t.name + (t.snapshot ? '' : '*'); }), place: f.fields.byId['union-place'].value},
      'version 2; Scenario A | 8 eps | Toronto*; ca-toronto');
    out.sptcal = btoa(unescape(encodeURIComponent(writes[writes.length - 1].text)));

    // S8 -- Load it back into a fresh calendar: the tabs, their names, the current one, and each tab's own calendar.
    var saved = writes[writes.length - 1].text;
    var p2 = T.openViaFakePicker('/tests/fixtures/halfdays.sptcal', 'three.sptcal', {text: saved, writes: writes});
    for(g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
    await p2; await T.sleep(1500);
    var loadedTabs = tabs(), loadedPlace = document.getElementById('union-place').value;
    // Compare BEFORE visiting any tab: the parked tabs are probed, and the calendar on screen must not move.
    var gridBefore = JSON.stringify(T.gridSignature()), formBefore = JSON.stringify(T.formSignature());
    await openCompare();
    var cols = compareCols(), cmpEps = compareRow('Episodes'), cmpWrap = compareRow('Wrap'), cmpLoc = compareRow('Location');
    var chips = document.querySelectorAll('.compare-dlg .mantine-Chip-root').length;
    await closeCompare();
    var gridAfter = JSON.stringify(T.gridSignature()), formAfter = JSON.stringify(T.formSignature());
    add('S8', 'Load brings back the three tabs, Toronto on screen', loadedTabs === 'Scenario A | 8 eps | *Toronto' && loadedPlace === 'ca-toronto',
      {tabs: loadedTabs, place: loadedPlace}, 'Scenario A | 8 eps | *Toronto, ca-toronto');
    add('S9', 'Compare on a freshly loaded file: Toronto first, every column filled by probing the parked tabs',
      cols.join('|') === 'Toronto|Scenario A|8 eps' && chips === 2 && cmpEps && cmpEps[0] === '8' && /^10/.test(cmpEps[1]) && cmpEps[2] === '8' &&
      // Location reads the Region SHORTENED since KEY-FACTS-PLAN.md §3.3: "Toronto", and "U.S. (Area Standards)" for
      // "Elsewhere in the U.S. — Area Standards" (the one entry with its own `short`).
      cmpLoc && cmpLoc[0] === 'Toronto' && cmpLoc[1] === 'U.S. (Area Standards)',
      {cols: cols, chips: chips, episodes: cmpEps, wrap: cmpWrap, location: cmpLoc}, 'Toronto | Scenario A | 8 eps; 8, 10 (+2), 8');
    add('S10', 'probing the parked tabs leaves the calendar on screen exactly as it was', gridBefore === gridAfter && formBefore === formAfter,
      {gridSame: gridBefore === gridAfter, formSame: formBefore === formAfter}, 'grid and fields unchanged');
    // ...and the values Compare probed are each tab's own header, once that tab is on screen.
    await clickTab('Scenario A'); var hA = wrapIn(header());
    await clickTab('8 eps'); var h8 = wrapIn(header());
    await clickTab('Toronto'); var hT = wrapIn(header());
    var toSlash = function(d){ if(!d) return null; var q = d.split('.'); return q[0] + '/' + q[1] + '/' + q[2]; };
    add('S11', 'each Compare wrap is the wrap that tab\'s own header prints', !!cmpWrap &&
      cmpWrap[0].indexOf(toSlash(hT)) === 0 && cmpWrap[1].indexOf(toSlash(hA)) === 0 && cmpWrap[2].indexOf(toSlash(h8)) === 0,
      {compare: cmpWrap, headers: {Toronto: hT, A: hA, eps8: h8}}, 'the same three dates');

    // S12 -- the chips drop and restore a column.
    await openCompare();
    var chipA = [].slice.call(document.querySelectorAll('.compare-dlg .mantine-Chip-root')).filter(function(c){ return c.innerText.trim() === 'Scenario A'; })[0];
    chipA.querySelector('input').click(); await T.sleep(300);
    var colsLess = compareCols();
    chipA = [].slice.call(document.querySelectorAll('.compare-dlg .mantine-Chip-root')).filter(function(c){ return c.innerText.trim() === 'Scenario A'; })[0];
    chipA.querySelector('input').click(); await T.sleep(300);
    add('S12', 'unticking a chip drops its column, ticking it brings it back', colsLess.join('|') === 'Toronto|8 eps' && compareCols().join('|') === 'Toronto|Scenario A|8 eps',
      {unticked: colsLess, ticked: compareCols()}, 'Toronto | 8 eps, then all three');

    // S13 -- the two exports, as shown.
    var cap = T.captureDownload();
    [].slice.call(document.querySelectorAll('.compare-dlg button')).filter(function(b){ return b.textContent.trim() === 'Export to Excel'; })[0].click();
    await T.until(cap.peek, 'the comparison workbook', 100, 100);
    var xlsx = cap.stop();
    var cap2 = T.captureDownload();
    [].slice.call(document.querySelectorAll('.compare-dlg button')).filter(function(b){ return b.textContent.trim() === 'Export PDF'; })[0].click();
    await T.until(cap2.peek, 'the comparison PDF', 150, 100);
    var pdf = cap2.stop();
    var pdfHead = pdf ? new Uint8Array(await pdf.slice(0, 5).arrayBuffer()) : [];
    add('S13', 'Export to Excel and Export PDF each write a file', !!xlsx && xlsx.size > 3000 && !!pdf && String.fromCharCode.apply(null, pdfHead) === '%PDF-',
      {xlsx: xlsx && xlsx.size, pdf: pdf && pdf.size}, 'an .xlsx and a %PDF-');
    if(xlsx) out.xlsx = T.b64(await xlsx.arrayBuffer());
    if(pdf) out.pdfs = {compare: T.b64(await pdf.arrayBuffer())};
    await closeCompare();

    // S16 -- the exports say which scenario they are (ruling D6): the waterfall's Excel names Toronto, the tab on screen.
    function exportName(btnId){
      var name = null, realC = URL.createObjectURL, realK = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = function(b){ return realC.call(URL, b); };
      HTMLAnchorElement.prototype.click = function(){ if(this.download){ name = this.download; return; } return realK.call(this); };
      document.getElementById(btnId).click();
      return T.until(function(){ return name; }, 'the ' + btnId + ' download', 150, 100).then(function(){
        URL.createObjectURL = realC; HTMLAnchorElement.prototype.click = realK; return name; });
    }
    var xlName3 = await exportName('export-btn');
    add('S16', 'with scenarios, the Excel export is named after the scenario on screen', /Planning Calendar \u2013 Toronto\.xlsx$/.test(xlName3 || ''),
      {name: xlName3}, '"… Planning Calendar – Toronto.xlsx"');

    // S14 -- Delete asks, then the tab goes; Keep only leaves one tab, and Save is a plain file again.
    document.dispatchEvent(new CustomEvent('sptcal-scenario', {detail: {op: 'delete', id: (sc.tabs[0] || {}).id}}));
    await T.sleep(400);
    var delQ = T.modalText(); T.clickModalButton('Delete'); await T.sleep(600);
    var afterDel = tabs();
    document.dispatchEvent(new CustomEvent('sptcal-scenario', {detail: {op: 'keep', id: (sc.tabs[2] || {}).id}}));
    await T.sleep(400);
    T.clickModalButton('Keep only this one'); await T.sleep(800);
    await save();
    var last = JSON.parse(writes[writes.length - 1].text);
    add('S14', 'Delete asks and removes the tab; Keep only leaves one, and the file is version 1 again',
      /Delete .Scenario A/.test(delQ) && afterDel === '8 eps | *Toronto' && document.querySelectorAll('.sc-tab').length === 0 &&
      last.version === 1 && !('scenarios' in last) && last.fields.byId['union-place'].value === 'ca-toronto',
      {question: delQ.slice(0, 60), afterDelete: afterDel, tabsLeft: document.querySelectorAll('.sc-tab').length, version: last.version, scenarios: 'scenarios' in last},
      'asked; 8 eps | *Toronto; then one calendar, version 1');

    // S17 -- one scenario again: the export's name is exactly what it always was.
    var xlName1 = await exportName('export-btn');
    add('S17', 'with one scenario the Excel export keeps its old name', /Planning Calendar\.xlsx$/.test(xlName1 || '') && !/\u2013/.test(xlName1 || ''),
      {name: xlName1}, '"… Planning Calendar.xlsx"');

    // S15 -- a damaged or too-new scenarios file is refused WHOLE and the calendar on screen stays.
    var base = JSON.parse(saved);
    function variant(fn){ var o = JSON.parse(JSON.stringify(base)); fn(o); return JSON.stringify(o); }
    var crafted = {
      tooMany: variant(function(o){ var t = o.scenarios.tabs[0]; for(var i = 0; i < 49; i++) o.scenarios.tabs.push({id: 's' + (100 + i), name: 'x', snapshot: t.snapshot}); }),
      dupId: variant(function(o){ o.scenarios.tabs[1].id = o.scenarios.tabs[0].id; }),
      noCurrent: variant(function(o){ o.scenarios.current = 's999'; }),
      badSnap: variant(function(o){ o.scenarios.tabs[0].snapshot = {nope: 1}; }),
      newer: variant(function(o){ o.version = 3; }),
    };
    var refusals = {};
    var titleBefore = document.getElementById('show-title').value;
    for(var k in crafted){
      var pk = T.openViaFakePicker('/tests/fixtures/halfdays.sptcal', k + '.sptcal', {text: crafted[k]});
      for(g = 0; g < 40; g++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
      await pk; await T.sleep(700);
      refusals[k] = T.modalText().replace(/\s+/g, ' ').slice(0, 70);
      T.clickModalButton('OK'); await T.sleep(300);
    }
    add('S15', 'damaged scenarios files are refused whole, a newer one with the newer-version message, and nothing changes',
      /damaged/.test(refusals.tooMany) && /damaged/.test(refusals.dupId) && /damaged/.test(refusals.noCurrent) && /damaged/.test(refusals.badSnap) &&
      /newer version/.test(refusals.newer) && document.getElementById('show-title').value === titleBefore && document.querySelectorAll('.sc-tab').length === 0,
      refusals, 'four "damaged", one "newer version", the calendar unchanged');

    // S18-S21 -- the owner's notes on the window (23 Oct 2026). Toronto, alone again, loses its Localization; a copy
    // of it, US, moves to Elsewhere in the U.S. and is the tab on screen, so US is the first column and Toronto the
    // second. Same 36.5 shoot days, so the wrap moves by holidays alone.
    T.set('start-localization', ''); await T.sleep(700);
    addBtn().click(); await T.sleep(600);
    await rename('US');
    T.set('union-place', 'us-general'); await T.sleep(500);
    await answerAnyModal(); await T.sleep(700);
    await openCompare();
    var rowsAll = [].slice.call(document.querySelectorAll('.compare-dlg tbody tr')).map(function(r){ return r.children[0].innerText.trim(); });
    var usWrap = compareRow('Wrap'), usFirst = compareRow('First shoot day');
    add('S18', 'a phase neither column has gets no row (Localization), and the others all stay',
      rowsAll.indexOf('Localization') === -1 && rowsAll.indexOf('Post') !== -1 && rowsAll.indexOf('Wrap') !== -1,
      {rows: rowsAll}, 'no Localization row; Post and Wrap still there');
    // S19 -- a date that moved says Pushed or Pulled (owner: "lets use pushed and pulled instead of + and -"), with
    // the holidays behind it as a count in a second chip, never their names ("lets not name the specific holidays").
    // Toronto loses Canada Day and Civic Holiday, US loses Independence Day (Observed): one more for Toronto.
    add('S19', 'Toronto\'s wrap reads "Pushed 1 day" and "+1 holiday", names no holiday; the column on screen and the unmoved first day carry no chip',
      !!usWrap && usWrap[1] === '8/20/26 Pushed 1 day +1 holiday' && !/Pushed|Pulled|holiday/.test(usWrap[0]) &&
      !!usFirst && !/Pushed|Pulled|holiday/.test(usFirst.join(' ')),
      {wrap: usWrap, first: usFirst}, '8/19/26 | 8/20/26 Pushed 1 day +1 holiday');
    // S20 -- Only differences keeps the rows that differ, and the exports take the table as shown.
    var seen = null, grab = function(e){ seen = e.detail; e.stopImmediatePropagation(); };
    document.addEventListener('sptcal-compare-export', grab, true);
    [].slice.call(document.querySelectorAll('.compare-dlg .sc-compare-onlydiff p'))[0].click(); await T.sleep(400);
    var rowsDiff = [].slice.call(document.querySelectorAll('.compare-dlg tbody tr')).map(function(r){ return r.children[0].innerText.trim(); });
    [].slice.call(document.querySelectorAll('.compare-dlg button')).filter(function(b){ return b.textContent.trim() === 'Export PDF'; })[0].click();
    await T.sleep(300);
    document.removeEventListener('sptcal-compare-export', grab, true);
    var mRows = seen && seen.model ? seen.model.rows.map(function(r){ return r.label; }) : null;
    var mWrap = seen && seen.model ? seen.model.rows.filter(function(r){ return r.label === 'Wrap'; })[0] : null;
    add('S20', 'Only differences leaves the rows that differ, and the export gets exactly those, holidays included',
      rowsDiff.join('|') === 'Location|Wrap' && !!mRows && mRows.join('|') === rowsDiff.join('|') && !!mWrap &&
      mWrap.cells[1].delta === 'Pushed 1 day' && mWrap.cells[1].holidays === '+1 holiday',
      {rows: rowsDiff, exported: mRows, wrap: mWrap && mWrap.cells[1]}, 'Location | Wrap, both on screen and in the export');
    [].slice.call(document.querySelectorAll('.compare-dlg .sc-compare-onlydiff p'))[0].click(); await T.sleep(300);
    await closeCompare();
    // S21 -- a phase only ONE column has keeps its row: that is a difference, not an empty phase.
    T.set('start-localization', '2027-03-01'); await T.sleep(700);
    await openCompare();
    var loc = compareRow('Localization');
    add('S21', 'a phase only one scenario has keeps its row, a dash in the other',
      !!loc && /^3\/1\/27/.test(loc[0]) && loc[1] === '—', {localization: loc}, '3/1/27 – … | —');
    await closeCompare();
  } catch(e){
    add('ERR', 'the leg threw', false, String(e && e.stack || e), 'no error');
  }
  out.health = T.appHealth();
  out.cases = cases;
  out.pass = cases.filter(function(c){ return c.pass; }).length;
  out.fail = cases.filter(function(c){ return !c.pass; }).length;
  T.done(out);
})(); });
