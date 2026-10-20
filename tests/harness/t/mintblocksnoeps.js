// mintblocksnoeps -- NOT a gate leg. Mints tests/fixtures/blocks-noeps-v1.5.0.sptcal: a REAL Save, made by
// the v1.5.0 release, of a Blocks calendar with NO episode count (LABELS-SETUP-PLAN.md item 4). In that build
// such a calendar has Production UNSCHEDULED ('Number of Episodes' was missing), and the labelsetup leg holds
// the new build to opening it with its dates unmoved (the owner's "Optional; old files keep dates").
//
//   HARNESS_PAGE=/releases/v1.5.0.html ./run.sh mintblocksnoeps 90
//   python3 -c "import json; a=json.load(open('mintblocksnoeps.json')); open('../fixtures/blocks-noeps-v1.5.0.sptcal','w').write(a['text'])"
//
// Synthetic, like every fixture here: the harness's reference calendar (T.buildFixture's phases), Season 2,
// Schedule by Blocks, 3 blocks of 15 days, and the episode fields never touched. Save goes through the real
// saveToFile() -> buildSavedData() path, with only the OS picker stood in for (mintfixture's handle).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.appReady();
    T.set('show-title', 'Blocks No Count');
    T.set('season-num', '2');
    T.set('union-place', 'us-general');
    T.set('show-mode', 'blocks');
    T.set('num-blocks', '3');
    T.set('days-per-block', '15');
    T.set('start-writersRoom', '2026-01-05'); T.set('weeks-writersRoom', '12');
    T.set('start-prePrep', '2026-04-06');     T.set('weeks-prePrep', '6');
    T.set('start-prodPrep', '2026-05-18');    T.set('weeks-prodPrep', '6');
    T.set('start-production', '2026-06-29');
    T.set('start-post', '2026-11-02');        T.set('weeks-post', '16');
    await T.until(function () { return document.querySelectorAll('#table-wrap table.sheet-table tbody tr').length > 10; }, 'the grid', 200, 100);
    await T.sleep(1500);
    out.prodMeta = ((document.getElementById('meta-production') || {}).textContent || '').trim();
    out.readout = ((document.getElementById('prod-total-readout') || {}).textContent || '').replace(/\s+/g, ' ').trim();
    out.prodCells = document.querySelectorAll('#table-wrap td[data-key="production"], #table-wrap td.sheet-phase-cell[data-pkey="production"]').length;
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
    out.keys = Object.keys(snap).length;
    out.hasKey = 'blocksEpisodesOptional' in snap;
    out.mode = snap.fields.byId['show-mode'].value;
    out.numEp = snap.fields.byId['num-episodes'].value;
    out.weeksProduction = snap.fields.byId['weeks-production'].value;
  } catch (e) { out.EX = String(e && e.stack || e); }
  T.done(out);
})(); });
