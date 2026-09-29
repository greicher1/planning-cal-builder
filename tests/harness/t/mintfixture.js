// mintfixture -- NOT a gate leg. Mints tests/fixtures/vX.Y.Z-saved.sptcal at a version cut, the way
// CLAUDE.md asks for it: a REAL save, produced by clicking Save in the BUILT app (never a file
// synthesised by hand, which only reproduces the author's assumptions).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh mintfixture 90
//   python3 -c "import json; a=json.load(open('mintfixture.json')); open('../fixtures/vX.Y.Z-saved.sptcal','w').write(a['text'])"
//
// The calendar is T.buildFixture() -- the harness's reference calendar, the same one the v1.3.0 fixture
// was cut from -- and Save goes through the real saveToFile() -> buildSavedData() path, with only the
// OS picker stood in for by a handle that records what is written.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    await T.sleep(1500);
    var written = [];
    var h = { name: 'saved.sptcal', kind: 'file',
      queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
      isSameEntry: async function(o){ return o === h; },
      getFile: async function(){ return new File([written.length ? written[written.length - 1] : ''], 'saved.sptcal', {lastModified: 1}); },
      createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ written.push(parts.join('')); } }; } };
    window.showSaveFilePicker = async function(){ return h; };
    document.getElementById('save-file-btn').click();
    await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
    var snap = JSON.parse(written[0]);
    out.text = written[0];
    out.bytes = written[0].length;
    out.version = snap.version;
    out.ids = Object.keys(snap.fields.byId).length;
    out.keys = Object.keys(snap).length;
    out.clipped = T.clippedCells().h.length;
  } catch (e) { out.EX = String(e && e.stack || e); }
  T.done(out);
})(); });
