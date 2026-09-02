// stintcollide -- probe: does applyStintSwaps refuse a pair that would LOSE A CELL?
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid', 150, 100);
    var last=-1, stable=0;
    await T.until(function(){ var n=document.querySelectorAll('table.sheet-table tbody tr').length;
      stable=(n===last)?stable+1:0; last=n; return stable>=5; }, 'settle', 100, 100);
    var per = {};
    Array.prototype.forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function(td){
      (per[td.dataset.pkey]=per[td.dataset.pkey]||[]).push(td.dataset.week+'@'+td.dataset.own);
    });
    out.weekCounts = { writersRoom:(per.writersRoom||[]).length, post:(per.post||[]).length,
                       localization:(per.localization||[]).length };
    out.slots = {}; Object.keys(per).forEach(function(k){
      out.slots[k] = [...new Set(per[k].map(function(x){ return x.split('@')[1]; }))]; });
    out.colKeys = Array.prototype.map.call(document.querySelectorAll('table.sheet-table colgroup col'),
      function(c){ return c.dataset.ckey||'?'; }).join(',');
    // Writer's Rm 20 weeks, Post 4, Localization 4. Any shortfall means a cell was LOST.
    out.noCellLost = out.weekCounts.writersRoom===20 && out.weekCounts.post===4 &&
                     out.weekCounts.localization===4;
    // Refused, not half-applied: the natural order must still stand -- Writer's Rm at slot 0.
    out.refusedNotApplied = JSON.stringify(out.slots.writersRoom)==='["0"]' &&
                            JSON.stringify(out.slots.post)==='["1"]';
    out.colKeysOk = out.colKeys === 'y2026:date,y2026:s0,y2026:s1,y2026:notes';
    out.errors=(window.__ERR||[]).slice(0,6);
    out.PASS = out.noCellLost && out.refusedNotApplied && out.colKeysOk && out.errors.length===0;
  } catch(e){ out.EX = e && (e.message||String(e)); }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
