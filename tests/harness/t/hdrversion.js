// hdrversion -- a version number typed into Show Info lands in the header's bottom-left slot.
//
// The owner's ask, 1 Sep 2026: "a version number (lowercase 'v' then a number you input). I also
// want this version number thing to be part of the default header and be in the very bottom left
// side text box of the header. You should be able to type your version number into the 'Show Info'
// section and this should autopopulate into the header."
//
// So there are two claims to prove, and the second one is the expensive one to get wrong:
//
//   1. IT ARRIVES. Type 3 (or V3) and the l2 slot reads "v3" -- on screen, in the workbook's &L
//      section, and drawn in the direct PDF. Three consumers, one source (headerLine), so a leg
//      that checked only the screen would not notice the exports disagreeing.
//   2. ⭐ IT IS INERT WHEN EMPTY. l2 was '' before this feature. Every calendar ever saved has no
//      version, so an empty field must produce byte-for-byte what it produced before: no line on
//      screen, the &L section a bare date, nothing drawn in the PDF. versionLabel() returning a
//      bare "v" for an empty field is the failure mode -- it would put a stray line into all three
//      outputs of every existing calendar, and turn the gate's byte-identical compare red. That is
//      why "v" alone and "  " are both asserted to produce nothing.
//
// Also proved here, because both are contract rather than behaviour:
//   * the value is CAPTURED into a real saved calendar (fields.byId, read out of an actual
//     shareable-copy export -- not a synthesised snapshot);
//   * it survives a full captureSnapshot -> JSON -> applyStateSnapshot round trip, driven through
//     UNDO, which is the same pair of functions a Save/Load uses;
//   * it does NOT join showInfoStatus()'s completeness test. A calendar with no version number is a
//     complete calendar, and a version must never gate Production.
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. run.sh defaults to the root
// index.html, which is the frozen legacy v1.2.0 app and does NOT have this field -- so a default
// run tests a different program and reports "no #show-version".
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    T.buildFixture();
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 200, 100);
    // Let the row count settle before measuring anything: buildFixture() fires six phase inputs and
    // each one recomputes. Same wait the prefs leg uses, for the same reason.
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5;
    }, 'the row count to settle', 150, 100);
    out.health = T.appHealth();

    // ---- the field itself ---------------------------------------------------------------------
    var el = document.getElementById('show-version');
    out.fieldFound = !!el;
    if (!el) throw new Error('no #show-version -- is this the BUILD? run.sh defaults to /index.html');
    out.fieldTag = el.tagName + ':' + (el.type || '');
    // ⛔ NOT inside .prefs-card. The version IS calendar data and must travel inside a .sptcal, so
    // unlike a preference it MUST be swept by collectFieldValues(). Asserted so a future tidy-up
    // that moves the field cannot silently stop it being saved.
    out.insidePrefsCard = !!el.closest('.prefs-card');
    out.insideShowInfo = !!el.closest('[data-tab="show"]');

    // The engine's own dotted local M.D.YY, which is what the `left` line above l2 carries.
    var d = new Date();
    var todayStr = (d.getMonth() + 1) + '.' + d.getDate() + '.' + String(d.getFullYear()).slice(2);
    out.todayStr = todayStr;

    // ---- helpers ------------------------------------------------------------------------------
    // The l2 line as the user sees it: its text, and whether it is actually visible. An empty slot
    // is hidden by `.hdr-line.hdr-slot.hdr-empty:not(.hdr-editable){display:none}`, so text alone
    // is not the assertion -- a visible empty line would be a regression the text would not catch.
    function l2State() {
      var line = document.querySelector('#table-wrap .hdr-line[data-hid="l2"]');
      if (!line) return { found: false };
      return {
        found: true,
        text: (line.textContent || '').trim(),
        cls: line.className,
        empty: /\bhdr-empty\b/.test(line.className),
        display: getComputedStyle(line).display,
        visible: !!line.offsetParent && getComputedStyle(line).display !== 'none'
      };
    }
    // Excel writes ONE header string with &L / &C / &R sections; the version is the second line of
    // &L. Split on the section codes only (&B, &12, &K…, &"Calibri,Bold" all start with & too, and
    // none of them is &L/&C/&R), then strip the format codes to get the text a user would read.
    function excelSections(hdr) {
      var s = {};
      String(hdr || '').replace(/&([LCR])((?:(?!&[LCR])[\s\S])*)/g, function (_, k, v) { s[k] = v; return ''; });
      return s;
    }
    // Strip the &-codes to leave the text a user would read. ⚠️ THE DIGIT BOUND IS THE WHOLE
    // POINT, and getting it wrong cost a false failure: a plain /&\d+/ is greedy, so on
    // `&12&"Calibri,Bold"9.8.26` it matches `&129` once the font code has already been removed and
    // silently eats the first digit of the date -- reporting ".8.26" and calling a correct export
    // broken. That is the SAME misparse the engine's own HSIZE comment warns Excel makes. A size
    // code in this app is always followed immediately by a font-name code, so anchor on that.
    // One left-to-right pass, alternatives in the order Excel reads them.
    function stripCodes(sec) {
      return String(sec || '').replace(/&(?:"[^"]*"|K[0-9A-Fa-f]{6}|\d{1,3}(?=&")|[A-Z])/g, '');
    }
    async function excelL() {
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await xb.arrayBuffer());
      var raw = (wb.worksheets[0].headerFooter || {}).oddHeader || '';
      return { raw: raw, L: stripCodes(excelSections(raw).L) };
    }
    // The direct PDF writer draws ['left','l2'] as the left column, filtering empties. Pair every
    // Tj with the Tm before it to recover {x, y, text} -- the same extraction the stintexport leg
    // uses, which is the only way to say WHERE a string was drawn rather than merely that it exists.
    async function pdfOps() {
      var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
      var bytes = new Uint8Array(await pb.arrayBuffer());
      var latin = ''; for (var i = 0; i < bytes.length; i += 8192) latin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      var content = null, re = /stream\r?\n/g, m;
      while ((m = re.exec(latin))) {
        var start = m.index + m[0].length, end = latin.indexOf('endstream', start);
        if (end < 0) continue;
        // DecompressionStream refuses the newline every stream carries before `endstream`.
        while (end > start && (bytes[end - 1] === 10 || bytes[end - 1] === 13 || bytes[end - 1] === 32)) end--;
        try {
          var ds = new DecompressionStream('deflate');
          var w = ds.writable.getWriter(); w.write(bytes.subarray(start, end)); w.close();
          var u = new Uint8Array(await new Response(ds.readable).arrayBuffer()), s = '';
          for (var j = 0; j < u.length; j += 8192) s += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
          if (/\bTf\b/.test(s) && /\bTj\b/.test(s)) { content = s; break; }
        } catch (e) { /* font streams and the like */ }
      }
      var ops = [], x = 0, y = 0, tok = /1 0 0 1 ([\d.-]+) ([\d.-]+) Tm|\(((?:\\.|[^\\)])*)\)\s*Tj/g, t;
      while ((t = tok.exec(content || ''))) {
        if (t[1] !== undefined) { x = +t[1]; y = +t[2]; }
        else ops.push({ x: x, y: y, text: t[3].replace(/\\([()\\])/g, '$1') });
      }
      return ops;
    }
    var findOp = function (ops, txt) { return ops.filter(function (o) { return o.text === txt; })[0] || null; };
    // Every string drawn at the same x as the date, top down. The direct writer left-aligns the
    // ['left','l2'] column at one x, so this IS the left header column -- and counting it is a
    // stabler claim than hunting for a pattern: "the column gained exactly one line, and it says
    // v3". A pattern hunt over every Tj on the page would go red the day a calendar carries a
    // phase named VFX (HANDOFF §4: do not trust your own measurement harness).
    var leftCol = function (ops, dateOp) {
      if (!dateOp) return null;
      return ops.filter(function (o) { return Math.abs(o.x - dateOp.x) < 0.5; })
                .sort(function (a, b) { return b.y - a.y; })
                .map(function (o) { return o.text; });
    };

    // ---- 1. ⭐ INERT: no version typed, and nothing anywhere changes ---------------------------
    out.beforeL2 = l2State();
    out.inertScreen = out.beforeL2.found && out.beforeL2.text === '' &&
                      out.beforeL2.empty && !out.beforeL2.visible;
    var ex0 = await excelL();
    out.beforeExcelL = ex0.L;
    // The &L section is the bare date and nothing else -- byte-identical to what it was before l2
    // existed at all, which is what keeps the gate's Excel parts-diff green.
    out.inertExcel = ex0.L === todayStr;
    await T.sleep(900);                       // the export button's reClickGuard(600)
    var ops0 = await pdfOps();
    out.beforePdfOps = ops0.length;
    var dateOp0 = findOp(ops0, todayStr);
    out.beforePdfDate = !!dateOp0;
    out.beforePdfLeftCol = leftCol(ops0, dateOp0);
    // EXACTLY ONE string in that column, and it is the date -- not merely "the date is first".
    // Measured: the grid's own date cells are drawn at a different x, so nothing else lands here.
    out.inertPdf = !!dateOp0 && !!out.beforePdfLeftCol &&
                   out.beforePdfLeftCol.length === 1 && out.beforePdfLeftCol[0] === todayStr;

    // ---- 2. a bare "v" is still no version ----------------------------------------------------
    // The one input that would break inertness by accident: someone types v, then deletes the digit.
    T.set('show-version', 'v');
    await T.sleep(400);
    out.bareVL2 = l2State();
    out.bareVInert = out.bareVL2.text === '' && out.bareVL2.empty && !out.bareVL2.visible;
    T.set('show-version', '   ');
    await T.sleep(400);
    out.blankL2Text = l2State().text;
    out.blankInert = out.blankL2Text === '';

    // ---- 3. it arrives, and a leading V is normalised -----------------------------------------
    T.set('show-version', 'V3');
    await T.sleep(500);
    out.upperVText = l2State().text;          // must be v3, not V3 and not vV3
    T.set('show-version', '3');
    await T.sleep(500);
    var on = l2State();
    out.afterL2 = on;
    out.screenShowsVersion = on.text === 'v3' && !on.empty && on.visible;
    out.caseNormalised = out.upperVText === 'v3';

    // ---- 4. it reaches the workbook, as the second line of &L ---------------------------------
    await T.sleep(900);
    var ex1 = await excelL();
    out.afterExcelL = ex1.L;
    out.afterExcelRaw = ex1.raw.slice(0, 160);
    out.excelHasVersion = ex1.L === todayStr + '\n' + 'v3';
    // No per-line format codes anywhere in &L: nothing has been formatted, so the section must
    // still be the plain two-line string. hdrLineCode() only fires when a line carries a format.
    // ⚠️ Not "does the section contain a font code" -- HSIZE always prefixes it, so that test can
    // never pass. hdrLineCode() emits a PER-LINE code only when some line in the section is
    // formatted, and then every line gets one, so the tell is a SECOND font-name code.
    out.excelFontCodes = ((excelSections(ex1.raw).L || '').match(/&"Calibri/g) || []).length;
    out.excelNoFormatCodes = out.excelFontCodes === 1;

    // ---- 5. it reaches the direct PDF, drawn UNDER the date in the same left column -----------
    await T.sleep(900);
    var ops1 = await pdfOps();
    var dateOp = findOp(ops1, todayStr), verOp = findOp(ops1, 'v3');
    out.pdfDate = dateOp && { x: Math.round(dateOp.x), y: Math.round(dateOp.y) };
    out.pdfVersion = verOp && { x: Math.round(verOp.x), y: Math.round(verOp.y) };
    // Two lines in the left column: same x (both left-aligned in the same slot) and the version
    // BELOW the date. PDF y grows upward, so "below" is a smaller y.
    out.afterPdfLeftCol = leftCol(ops1, dateOp);
    // ⭐ The column gained EXACTLY ONE line and that line is the version -- asserted as a
    // difference against the empty run, so it needs no guess about where the header band ends.
    out.pdfGainedOneLine = !!out.beforePdfLeftCol && !!out.afterPdfLeftCol &&
      out.afterPdfLeftCol.length === out.beforePdfLeftCol.length + 1 &&
      out.afterPdfLeftCol[0] === todayStr && out.afterPdfLeftCol[1] === 'v3';
    out.pdfTwoLeftLines = !!dateOp && !!verOp &&
                          Math.abs(dateOp.x - verOp.x) < 0.5 && verOp.y < dateOp.y &&
                          out.pdfGainedOneLine;

    // ---- 6. it is CAPTURED into a real saved calendar ------------------------------------------
    // Read out of an actual shareable-copy export rather than a synthesised snapshot: the id is now
    // part of the file format, so this is the assertion that the format really carries it.
    await T.sleep(700);
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var mm = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    out.snapshotFound = !!mm;
    var snap = null;
    try { snap = JSON.parse((mm ? mm[1] : '').replace(/\\u003c/g, '<')); } catch (e) { out.snapParseErr = String(e.message); }
    var byId = snap && snap.fields && snap.fields.byId;
    out.snapVersion = byId && byId['show-version'] ? byId['show-version'].value : null;
    out.fieldIdCount = byId ? Object.keys(byId).length : -1;
    out.captured = out.snapVersion === '3';
    // The whole snapshot, so the gate step that mints tests/fixtures/hdrversion.sptcal has a REAL
    // captureSnapshot() output to write rather than a hand-built one (CLAUDE.md: test with real
    // files, not synthesised ones).
    out.snapshot = snap;

    // ---- 7. it survives captureSnapshot -> JSON -> applyStateSnapshot -------------------------
    // Driven through UNDO, which uses exactly the pair of functions a Save and a Load use. No
    // IndexedDB and no picker, so unlike the `restore` leg this is reliable in headless Chrome.
    T.set('show-version', '4');
    await T.sleep(1200);                      // let the undo push debounce settle
    var undoBtn = document.getElementById('undo-btn');
    out.undoFound = !!undoBtn;
    if (undoBtn) {
      undoBtn.click();
      await T.sleep(600);
      out.afterUndoField = (document.getElementById('show-version') || {}).value;
      out.afterUndoL2 = l2State().text;
      var redoBtn = document.getElementById('redo-btn');
      if (redoBtn) { redoBtn.click(); await T.sleep(600); }
      out.afterRedoField = (document.getElementById('show-version') || {}).value;
      out.afterRedoL2 = l2State().text;
      // The undo took the field back to 3 and the header with it; the redo returned both to 4.
      out.roundTrips = out.afterUndoField === '3' && out.afterUndoL2 === 'v3' &&
                       out.afterRedoField === '4' && out.afterRedoL2 === 'v4';
    }

    // ---- 8. clearing it hides the line again, everywhere ---------------------------------------
    T.set('show-version', '');
    await T.sleep(600);
    var off = l2State();
    out.clearedL2 = off;
    out.clearedScreen = off.text === '' && off.empty && !off.visible;
    await T.sleep(900);
    var ex2 = await excelL();
    out.clearedExcelL = ex2.L;
    // Back to the bare date, character for character -- so a calendar whose version is deleted
    // exports exactly what it exported before the field was ever typed into.
    out.clearedExcel = ex2.L === todayStr && ex2.L === out.beforeExcelL;

    // ---- 9. it is NOT part of Show Info's completeness test -----------------------------------
    // A version must never gate Production. showInfoStatus() tests season + days-per-episode +
    // episode count, and the note it writes must not have learned a fourth requirement.
    var note = document.getElementById('show-info-note');
    out.showInfoNote = note ? (note.textContent || '').trim().slice(0, 120) : null;
    out.notInCompleteness = !/version/i.test(out.showInfoNote || '');

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells();
    out.PASS = out.fieldFound && !out.insidePrefsCard && out.insideShowInfo &&
               out.inertScreen && out.inertExcel && out.inertPdf &&
               out.bareVInert && out.blankInert &&
               out.screenShowsVersion && out.caseNormalised &&
               out.excelHasVersion && out.excelNoFormatCodes && out.pdfTwoLeftLines &&
               out.captured && out.roundTrips &&
               out.clearedScreen && out.clearedExcel && out.notInCompleteness &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
    try { out.health = T.appHealth(); } catch (_) {}
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
