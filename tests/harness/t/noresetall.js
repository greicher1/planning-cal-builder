// noresetall -- Reset All is GONE from the header, and New does its job (owner ruling 3, relayed
// 30 Sep 2026; built after v1.4.1).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh noresetall 120
//
// Why it went: Reset All cleared the calendar but KEPT the file link, so the next Save -- or the
// 10-minute autosave -- wrote the blank calendar over the saved file, while its own confirm said the
// file on disk was "left untouched". New clears the link as well as the calendar, so it does the
// job without the trap. resetAll() itself stays: newFile() calls it.
//
// ⛔ The engine bound the button with an UNGUARDED document.getElementById('reset-btn')
// .addEventListener(...) at IIFE-evaluation time. Removing the button without the listener throws
// on null and kills the rest of the engine, so A1 (a clean boot + a rendered grid) is the mutation
// guard for that half.
//
//   A0  the app header has no Reset All button (no #reset-btn, no "Reset All" label)
//   A1  the engine booted with it gone: 0 console errors, and the reference calendar renders
//   A2  New still clears everything Reset All cleared: title, dates, a typed note, the Region
//   A3  no divider is left dangling at the end of the header
//   A4  the Help no longer points at Reset All or at a "Reset (bottom of the panel)" control
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function val(id){ var e = document.getElementById(id); return e ? e.value : null; }
  try {
    await T.appReady();
    await T.sleep(800);
    var hdr = document.querySelector('header.app-header');
    var labels = Array.prototype.map.call(hdr.querySelectorAll('button'), function (b) { return (b.textContent || '').trim(); });
    add('A0', 'the app header has no Reset All button',
      !document.getElementById('reset-btn') && labels.indexOf('Reset All') < 0,
      {resetBtn: !!document.getElementById('reset-btn'), headerButtons: labels}, 'no #reset-btn, no "Reset All"');

    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the reference grid', 100, 100);
    await T.sleep(1200);
    var errs = T.appHealth().errors;
    add('A1', 'the engine booted cleanly with the button gone, and the reference calendar renders',
      errs.length === 0 && document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10,
      {errors: errs.slice(0, 4), rows: document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length}, '0 errors; a grid');

    // Give it something to clear: a typed waterfall note, on top of the fixture's title/dates/Region.
    var noteWeek = (document.querySelector('td.sheet-note-cell[data-week]') || {dataset: {}}).dataset.week;
    if(!noteWeek) throw new Error('no note cell in the reference grid');
    await T.typeUserNote(noteWeek, 'Clear me');
    var before = {title: val('show-title'), prod: val('start-production'), place: val('union-place'),
                  note: /Clear me/.test((document.querySelector('td.sheet-note-cell[data-week="' + noteWeek + '"]') || {}).textContent || '')};
    var nb = document.getElementById('new-file-btn');
    if(!nb) throw new Error('no New button');
    nb.click();
    for(var i = 0; i < 30; i++){ await T.sleep(100); if(/Start a new blank calendar/.test(T.modalText())){ T.clickModalButton('Start new'); break; } }
    await T.sleep(1500);
    var after = {title: val('show-title'), prod: val('start-production'), place: val('union-place'),
                 empty: !!document.querySelector('#table-wrap .empty-state'),
                 note: /Clear me/.test((document.getElementById('table-wrap') || {}).textContent || '')};
    add('A2', 'New clears what Reset All cleared: the title, the dates, a typed note and the Region',
      before.title !== '' && before.prod !== '' && before.note && after.title === '' && after.prod === '' && after.place === '' && after.empty && !after.note,
      {before: before, after: after}, 'a blank calendar');

    var kids = Array.prototype.filter.call(document.querySelector('.app-toolbar').children, function (k) { return getComputedStyle(k).display !== 'none'; });
    var last = kids[kids.length - 1];
    add('A3', 'no divider is left dangling at the end of the header',
      !!last && !last.classList.contains('app-toolbar-div'),
      {last: last ? (last.id || last.className) : null}, 'the last control is a button');

    var help = (document.getElementById('help-overlay') || {}).textContent || '';
    add('A4', 'the Help no longer points at Reset All or at a "Reset (bottom of the panel)" control',
      !/Reset All/.test(help) && !/bottom of the panel/.test(help),
      {resetAll: /Reset All/.test(help), bottomOfPanel: /bottom of the panel/.test(help)}, 'neither');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'noresetall', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
