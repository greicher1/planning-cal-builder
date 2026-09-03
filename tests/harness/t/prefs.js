// prefs -- the user-preference store, its first tenant (grid lines in exports), and the rule that
// must never break: A PREFERENCE NEVER REACHES A SAVED CALENDAR.
//
// ⛔ THIS IS AN EXPORT SETTING (owner, 3 Sep 2026: "these gridline settings are about the pdf
// export, thats where it matters, not in the live app view"). So the PDF is what gets measured
// here, by reading the file back -- and the live editor is asserted UNCHANGED, which is the
// regression guard for that ruling.
//
// Four things, in order of how expensive they are to get wrong:
//   1. INERT WHEN UNSET -- the PDF carries no interior rules, which is what the reference exports
//      look like and what keeps the gate's byte-identical compare true.
//   2. IT REACHES THE PDF -- choosing Dashed puts interior lines into the file, in the right
//      colour. Asserted on the drawn operators, not on a variable.
//   3. ⭐ IT NEVER TRAVELS -- collectFieldValues() sweeps every id'd input in the document, so
//      without the .prefs-card exclusion the control is baked into every saved calendar and adds a
//      phantom undo step per change. Proved against a real exported copy.
//   4. THE EDITOR IS UNTOUCHED in both states.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    T.buildFixture();
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 200, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5;
    }, 'the row count to settle', 150, 100);

    // The PDF writer emits `<r> <g> <b> RG <w> w <x1> <y1> m <x2> <y2> l S` per line, with colour
    // components to 4dp (pdfRgb). #BFBFBF is 191/255 = 0.7490.
    var DASH_RG  = '0.7490 0.7490 0.7490 RG';   // #BFBFBF, the dashed colour
    var SOLID_RG = '0.8314 0.8314 0.8314 RG';   // #D4D4D4, the solid colour (212/255)
    async function pdfStream() {
      var blob = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
      var bytes = new Uint8Array(await blob.arrayBuffer());
      var latin = ''; for (var i = 0; i < bytes.length; i += 8192) latin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      var re = /stream\r?\n/g, m;
      while ((m = re.exec(latin))) {
        var start = m.index + m[0].length, end = latin.indexOf('endstream', start);
        if (end < 0) continue;
        // DecompressionStream refuses the newline every stream carries before `endstream`.
        while (end > start && (bytes[end - 1] === 10 || bytes[end - 1] === 13 || bytes[end - 1] === 32)) end--;
        try {
          var ds = new DecompressionStream('deflate');
          var w = ds.writable.getWriter(); w.write(bytes.subarray(start, end)); w.close();
          var u = new Uint8Array(await new Response(ds.readable).arrayBuffer()), t = '';
          for (var j = 0; j < u.length; j += 8192) t += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
          if (/\bTf\b/.test(t) && /\bTj\b/.test(t)) return t;
        } catch (e) { /* font streams and the like */ }
      }
      return '';
    }
    var strokes = function (s, rg) { return (s.match(new RegExp(rg.replace(/\./g, '\\.'), 'g')) || []).length; };
    // ⚠️ #BFBFBF is NOT unique to the interior rules -- a structural line already uses it, so an
    // unset export legitimately contains one. Compare the COUNTS across the two exports rather than
    // expecting zero: one interior rule per body row is what the setting adds.
    var cellStyle = function () {
      var td = document.querySelector('#table-wrap table.sheet-table tbody td');
      var cs = getComputedStyle(td);
      return cs.borderTopStyle + ' ' + cs.borderTopColor;
    };

    var sel = document.getElementById('pref-gridlines');
    out.controlFound = !!sel;
    if (!sel) throw new Error('no #pref-gridlines');
    out.insideExcludedCard = !!sel.closest('.prefs-card');
    out.optionValues = Array.prototype.map.call(sel.options, function (o) { return o.value; }).join(',');
    out.valueAtBoot = sel.value;   // 'none' IS the default; there is no separate Default entry
    out.storeAtBoot = (function () { try { return localStorage.getItem('sptcal.prefs'); } catch (e) { return 'THREW: ' + e.name; } })();

    // 1. Unset: no interior rules in the PDF at all.
    out.cellBefore = cellStyle();
    var pdfNone = await pdfStream();
    out.pdfNoneLen = pdfNone.length;
    out.pdfNoneInterior = strokes(pdfNone, DASH_RG);
    out.inertAtBoot = out.valueAtBoot === 'none' && out.storeAtBoot === null && out.pdfNoneInterior <= 1;

    // 2. Choose Dashed through the real change event; the PDF must gain interior lines.
    sel.value = 'dashed';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    // ⚠️ 900ms, not 200: the export button is wrapped in reClickGuard(600), so a second export
    // fired too soon is SWALLOWED and the test reads it as "no blob" on a perfectly good export.
    await T.sleep(900);
    out.storedAfter = (function () { try { return localStorage.getItem('sptcal.prefs'); } catch (e) { return 'THREW: ' + e.name; } })();
    out.persisted = /"gridlines"\s*:\s*"dashed"/.test(out.storedAfter || '') && /"version"\s*:\s*1/.test(out.storedAfter || '');
    var pdfDashed = await pdfStream();
    out.pdfDashedInterior = strokes(pdfDashed, DASH_RG);
    // One interior rule per body row: the fixture has ~50, so require a decisive jump rather than
    // any increase at all.
    out.reachesPdf = out.pdfDashedInterior >= out.pdfNoneInterior + 20;
    // ⭐ It must read as DASHED, not merely grey: the `d` operator with the 1.5/1 array the owner
    // chose, and reset to solid after each stroke -- or every later line on the page (the black
    // frame included) inherits it.
    out.dashOps = (pdfDashed.match(/\[1\.5 1\] 0 d/g) || []).length;
    out.dashResets = (pdfDashed.match(/\[\] 0 d/g) || []).length;
    out.reallyDashed = out.dashOps > 20 && out.dashOps === out.dashResets;
    // ⭐ VERTICALS: the writer drew none before this. Dashed strokes split into horizontal rules
    // (one per row) and column rules (one per internal boundary per year block).
    out.dashedVerticals = (pdfDashed.match(/\[1\.5 1\] 0 d [\d.]+ [\d.]+ [\d.]+ RG [\d.]+ w ([\d.]+) [\d.]+ m \1 /g) || []).length;
    out.hasVerticals = out.dashedVerticals > 0;

    // 2b. Solid: its own colour, and NO dash operator at all.
    await T.sleep(800);
    sel.value = 'solid';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await T.sleep(900);
    var pdfSolid = await pdfStream();
    out.pdfSolidInterior = strokes(pdfSolid, SOLID_RG);
    out.pdfSolidDashOps = (pdfSolid.match(/\[1\.5 1\] 0 d/g) || []).length;
    out.solidDistinct = out.pdfSolidInterior >= 20 && out.pdfSolidDashOps === 0;
    await T.sleep(800);
    sel.value = 'dashed';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await T.sleep(400);

    // 3. ⭐ Never travels: export a real shareable copy and read its snapshot.
    await T.sleep(700);                       // clear the export button's re-click guard again
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var mm = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    out.snapshotFound = !!mm;
    var snapText = mm ? mm[1] : '';
    out.snapHasPrefKey = /gridlines/.test(snapText);
    out.snapHasControlId = /pref-gridlines/.test(snapText);
    var snap = null;
    try { snap = JSON.parse(snapText.replace(/\\u003c/g, '<')); } catch (e) { out.snapParseErr = String(e.message); }
    out.fieldIdCount = snap && snap.fields && snap.fields.byId ? Object.keys(snap.fields.byId).length : -1;
    out.neverTravels = out.snapshotFound && !out.snapHasPrefKey && !out.snapHasControlId;

    // 4. ⭐ The LIVE EDITOR is untouched by the setting -- the owner's ruling, as a regression guard.
    out.cellAfter = cellStyle();
    out.editorUntouched = out.cellBefore === out.cellAfter && out.cellAfter === 'solid rgb(212, 212, 212)';
    out.noBodyClass = !/wf-grid-/.test(document.body.className);

    // 5. Back to None removes the key rather than storing 'none': absent and 'none' are the same
    //    output, so the store never holds an entry that changes nothing.
    sel.value = 'none';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await T.sleep(200);
    out.storedAfterReset = (function () { try { return localStorage.getItem('sptcal.prefs'); } catch (e) { return 'THREW'; } })();
    out.resetClean = !/gridlines/.test(out.storedAfterReset || '');

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells();
    out.PASS = out.controlFound && out.insideExcludedCard && out.optionValues === 'none,solid,dashed' &&
               out.inertAtBoot && out.persisted && out.reachesPdf && out.reallyDashed &&
               out.hasVerticals && out.solidDistinct && out.neverTravels &&
               out.editorUntouched && out.noBodyClass && out.resetClean &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
