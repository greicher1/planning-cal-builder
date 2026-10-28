// prepreptitle -- Pre Prep's DEFAULT name is "Pre-Prep" (owner, 28 Oct 2026: "Default name for Pre Prep should be
// "Pre-Prep""), and a calendar saved with the old default keeps it, word for word.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh prepreptitle 200
//
// Every calendar saved before the change stores "Pre Prep" in fields.byId['name-prePrep']. Read as a typed name,
// that would have drawn "Pre Prep wk N" (a typed name's template), not the "Pre Prep Wk N" the file always drew, so
// PHASES' prePrep carries the old name and template as `was`. lib.js's buildFixture types the old name for the
// same reason, which keeps every baseline cut from it byte-identical; this leg holds the new default.
//
//   N1  a new calendar: the name box reads "Pre-Prep" (value and placeholder), and so do its hiatus placeholder
//       and the Automatic notes row
//   N2  its waterfall cells read "Pre-Prep Wk 1..3"
//   N3  Save writes name-prePrep as "Pre-Prep"
//   N4  the old name typed: "Pre Prep Wk 1..3", exactly what the old default drew
//   N5  any other name typed: "<name> wk 1..3", as for every renamed phase
//   N6  a REAL v1.8.0 calendar: the name box reads "Pre Prep" and its cells "Pre Prep Wk N"; no "Pre-Prep" anywhere
//   N7  New: the name box is "Pre-Prep" again
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  async function settle(){ await T.sleep(900); }
  // Every Pre Prep cell in the waterfall, in order: the cells whose phase key is prePrep.
  function prepCells(){
    return Array.from(document.querySelectorAll('#table-wrap table.sheet-table td[data-pkey="prePrep"]'))
      .map(function (td) { return (td.textContent || '').trim(); }).filter(Boolean);
  }
  function autoNoteName(){ return (document.querySelector('[data-autonote-name="prePrep"]') || {}).textContent || ''; }
  function menuLabel(){ return (($('file-menu-label') || {}).textContent || '').trim(); }
  var written = [];
  var saveHandle = { name: 'prepreptitle.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'prepreptitle.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save(){
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return written[written.length - 1];
  }
  try {
    await T.appReady();
    await settle();
    var fresh = {value: $('name-prePrep').value, placeholder: $('name-prePrep').placeholder,
                 hiatus: ($('phiatus-name-prePrep') || {}).placeholder, autoNote: autoNoteName()};
    add('N1', 'a new calendar: the name box, its hiatus placeholder and the Automatic notes row read "Pre-Prep"',
      fresh.value === 'Pre-Prep' && fresh.placeholder === 'Pre-Prep' && fresh.hiatus === 'Pre-Prep Hiatus' && fresh.autoNote === 'Pre-Prep',
      fresh, 'Pre-Prep / Pre-Prep / Pre-Prep Hiatus / Pre-Prep');

    T.set('start-prePrep', '2026-04-06'); T.set('weeks-prePrep', '3');
    await T.until(function () { return prepCells().length === 3; }, 'three Pre-Prep cells', 100, 100);
    add('N2', 'its waterfall cells read "Pre-Prep Wk 1..3"', same(prepCells(), ['Pre-Prep Wk 1', 'Pre-Prep Wk 2', 'Pre-Prep Wk 3']),
      prepCells(), ['Pre-Prep Wk 1', 'Pre-Prep Wk 2', 'Pre-Prep Wk 3']);

    var snap = JSON.parse(await save());
    var savedName = ((snap.fields && snap.fields.byId && snap.fields.byId['name-prePrep']) || {}).value;
    add('N3', 'Save writes name-prePrep as "Pre-Prep"', savedName === 'Pre-Prep', savedName, 'Pre-Prep');

    T.set('name-prePrep', 'Pre Prep'); await settle();
    add('N4', 'the old name typed: "Pre Prep Wk 1..3", exactly what the old default drew (capital W)',
      same(prepCells(), ['Pre Prep Wk 1', 'Pre Prep Wk 2', 'Pre Prep Wk 3']), prepCells(), ['Pre Prep Wk 1', 'Pre Prep Wk 2', 'Pre Prep Wk 3']);

    T.set('name-prePrep', 'Pre Prep Team'); await settle();
    add('N5', 'any other name typed: "<name> wk N", as for every renamed phase',
      same(prepCells(), ['Pre Prep Team wk 1', 'Pre Prep Team wk 2', 'Pre Prep Team wk 3']), prepCells(), 'Pre Prep Team wk 1..3');

    var text = await (await fetch('/tests/fixtures/v1.8.0-saved.sptcal')).text();
    var stem = 'prepreptitle-load', p = T.openViaFakePicker('/x.sptcal', stem + '.sptcal', {text: text, writes: []});
    for(var i = 0; i < 40; i++){ await T.sleep(100); if(T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
    var old = {value: $('name-prePrep').value, cells: prepCells(), autoNote: autoNoteName(),
               hyphen: /Pre-Prep/.test(($('table-wrap') || {}).textContent || '')};
    add('N6', 'a REAL v1.8.0 calendar keeps "Pre Prep": the name box, the Automatic notes row and every cell ("Pre Prep Wk N"); no "Pre-Prep" in the grid',
      old.value === 'Pre Prep' && old.autoNote === 'Pre Prep' && old.cells.length > 0 &&
      old.cells.every(function (t) { return /^Pre Prep Wk \d+$/.test(t); }) && !old.hyphen,
      {value: old.value, autoNote: old.autoNote, cells: old.cells.slice(0, 4), count: old.cells.length, hyphen: old.hyphen},
      'Pre Prep, Pre Prep Wk N');

    $('new-file-btn').click();
    for(var j = 0; j < 30; j++){ await T.sleep(100); if(/Start a new blank calendar/.test(T.modalText())){ T.clickModalButton('Start new'); break; } }
    await settle();
    add('N7', 'New: the name box is "Pre-Prep" again', $('name-prePrep').value === 'Pre-Prep' && autoNoteName() === 'Pre-Prep',
      {value: $('name-prePrep').value, autoNote: autoNoteName()}, 'Pre-Prep');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'prepreptitle', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
