// hdrtemplate -- the template engine and the THREE header modes, end to end through the real app.
//
// HEADER-PRESETS-PLAN.md Step 2. This leg carries BOTH §7 item 5 (`hdrtemplate`) and §7 item 5b
// (`hdrmode`), deliberately as one leg rather than two: every leg costs its full timeout in
// wall-clock whether it needs it or not (run.sh waits the budget, then hard-kills), and the
// assertions are what matter, not the file count. The groups below are labelled so a failure still
// says which half broke.
//
// WHAT THE BROWSER PROVES THAT NODE CANNOT
//   prove-header-template.mjs fuzzes the resolver's grammar in isolation -- 73 cases, exhaustively,
//   because the function is pure. It cannot show that the resolved text actually REACHES the three
//   consumers, that the mode machine stores raw templates rather than values, or that the one
//   authorised frozen edit is inert. That is this leg.
//
// THE FOUR THINGS THAT WOULD BE EXPENSIVE TO GET WRONG
//   1. ⭐ H3b IS INERT. The mode button's label/title expression is the ONE frozen edit in this
//      whole plan, and the sign-off is conditional on it being byte-identical while headerTemplates
//      is false. Asserted directly: in Auto and in Manual the button reads exactly what it read
//      before the edit.
//   2. ⭐ RAW IN, RESOLVED OUT. headerManual holds TEMPLATES; the consumers receive TEXT. Get it
//      backwards and either a preset stamps one calendar's values onto every other one, or the
//      user's first click into a line destroys the token.
//   3. ⭐ __ctx MUST NOT REACH THE SAVE FORMAT. computeHeaderDefaults() hangs the token context on
//      its return value, and that value is assigned straight to headerManual in two places -- so a
//      plain property would be serialised into every saved calendar and every undo frame. It is
//      defined non-enumerable; this asserts the consequence rather than trusting the flag.
//   4. ⭐ MANUAL NEVER RESOLVES. A file written before this feature, whose header happens to
//      contain braces, must print those braces. That is decision H4, and it is what makes the
//      whole feature safe for calendars already in the wild.
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html. run.sh defaults to the root index.html,
// which is the frozen legacy v1.2.0 app and has none of this.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    T.buildFixture();
    T.set('show-version', '3');
    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the grid to render', 200, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5;
    }, 'the row count to settle', 150, 100);
    out.health = T.appHealth();

    // ---- helpers -------------------------------------------------------------------------------
    var btn = function () { return document.getElementById('hdr-mode-btn'); };
    var lineEl = function (hid) { return document.querySelector('#table-wrap .hdr-line[data-hid="' + hid + '"]'); };
    var lines = function () {
      var o = {};
      document.querySelectorAll('#table-wrap .hdr-line[data-hid]').forEach(function (l) {
        o[l.dataset.hid] = (l.textContent || '').trim();
      });
      return o;
    };
    var modeState = function () {
      var b = btn();
      return { label: (b.textContent || '').trim(), title: b.title, cls: b.className };
    };
    // Pick a mode through the REAL popover, the way a user does. ⚠️ Re-query after every render:
    // render() rewrites #table-wrap, so a button captured earlier is detached and clicking it
    // reaches nothing -- the "detached node's dispatchEvent" trap HANDOFF §4 records.
    async function pick(name) {
      var stale = document.querySelector('.hdr-mode-pop');
      if (stale) stale.remove();
      btn().click();
      await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); },
                    'the header mode popover', 40, 100);
      var row = null;
      document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice').forEach(function (r) {
        if ((r.querySelector('.hdr-mode-name').textContent || '') === name) row = r;
      });
      if (!row) throw new Error('no "' + name + '" row in the mode popover');
      row.click();
      await T.sleep(700);
    }
    // ⚠️ SETTLE, do not sleep-and-read. A commit re-renders, and reading the line straight after a
    // focusout can catch the node BEFORE the render replaces it -- which reports a raw template as
    // though resolution were broken. Cost a false diagnosis while this leg was being written.
    async function commit(hid, text) {
      var el = lineEl(hid);
      el.textContent = text;
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      var want = null;
      await T.until(function () {
        var now = lineEl(hid);
        if (!now) return false;
        var t = (now.textContent || '').trim();
        if (t === want) return true;         // stable for one poll
        want = t; return false;
      }, 'the committed line to settle', 40, 100);
    }

    // ---- 1. ⭐ H3b: the button in AUTO reads exactly what it read before the frozen edit --------
    var auto = modeState();
    out.autoLabel = auto.label;
    out.autoTitle = auto.title;
    out.autoLines = lines();
    out.h3bAutoInert = auto.label === 'Header: Auto' &&
      auto.title === 'Take over the header: snapshot the current values into editable lines';

    // ---- 2. Auto -> Template -------------------------------------------------------------------
    await pick('Template');
    var tpl = modeState();
    out.tplLabel = tpl.label;
    out.tplTitleStarts = tpl.title.slice(0, 30);
    // The frozen editability gate reads headerMode === 'manual', and Template IS manual to it --
    // so the lines must be contenteditable and the format toolbar must be present.
    out.tplEditable = lineEl('c1').getAttribute('contenteditable') === 'true';
    out.tplToolbar = !!document.querySelector('#table-wrap .hdr-fmt-bar, #table-wrap .hf-ctl');
    out.tplIsTemplate = tpl.label === 'Header: Template';

    // ---- 3. ⭐ RESOLUTION: tokens in, live data out, in all three consumers ---------------------
    await commit('c4', 'T={title} V={version} E={episodes}');
    out.c4Resolved = lines().c4;
    out.resolvesOnScreen = out.c4Resolved === 'T=Test Show V=v3 E=10';

    // Unknown tokens survive as typed, even in Template mode -- the rule that makes old text safe.
    await commit('c2', 'Draft {nope} {{escaped}}');
    out.c2Resolved = lines().c2;
    out.unknownSurvives = out.c2Resolved === 'Draft {nope} {escaped}';

    // A conditional group that cannot be satisfied collapses; one that can, renders.
    // ⚠️ NOT {post.open} -- T.buildFixture() dates all six phases, so every phase token resolves on
    // this fixture and the group would correctly render. A first cut asserted otherwise and reported
    // working code as broken. {date:} with an unparseable value is empty by construction, on any
    // calendar, which is what an empty-group test actually needs.
    await commit('c3', '[Opens {date:notadate}]');
    out.emptyGroup = lines().c3;
    await commit('c1', '{titleSeason}[ - {version}]');
    out.fullGroup = lines().c1;
    out.groupsWork = out.emptyGroup === '' && out.fullGroup === 'Test Show S2 - v3';

    // ---- 4. ⭐ THE COMPOUND TOKENS ARE A SECOND STATEMENT OF r1/r2/c3 -- the drift guard --------
    // buildHeaderCtx() re-derives those three composite lines. computeHeaderDefaults() stays
    // hand-coded, so the two can drift silently. Compare them on the SAME calendar: the auto values
    // captured in step 1 against what the tokens resolve to now.
    await commit('r1', '{production.summary}');
    await commit('r2', '{production.dates}');
    await commit('r3', '{writersRoom.line}');
    var res = lines();
    out.compound = { summary: res.r1, dates: res.r2, wrLine: res.r3 };
    out.compoundVsAuto = {
      summary: [res.r1, out.autoLines.r1],
      dates: [res.r2, out.autoLines.r2],
      wrLine: [res.r3, out.autoLines.c3],
    };
    out.noCompoundDrift = res.r1 === out.autoLines.r1 &&
                          res.r2 === out.autoLines.r2 &&
                          res.r3 === out.autoLines.c3;

    // ---- 5. ⭐ RAW ON FOCUS: an edit must not destroy the token ---------------------------------
    var c4 = lineEl('c4');
    c4.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await T.sleep(250);
    out.rawOnFocus = (lineEl('c4').textContent || '').trim();
    out.focusShowsRaw = out.rawOnFocus === 'T={title} V={version} E={episodes}';
    // And blurring puts the resolved text back, with the template intact.
    // ⚠️ THIS FOUND A REAL BUG. The focusout handler returned early when the text was unchanged --
    // correct for Manual, wrong for Template, because the focusin swap had already put the RAW form
    // on screen. Focus a template line, blur without typing, and `{version}` stayed visible until
    // something else re-rendered. The handler now re-renders (without marking dirty) in that case.
    lineEl('c4').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await T.sleep(500);
    out.afterBlur = lines().c4;
    out.blurRestoresResolved = out.afterBlur === 'T=Test Show V=v3 E=10';

    // ---- 6. ⭐ THE EXPORTS CARRY THE RESOLVED TEXT, NOT THE TEMPLATE ----------------------------
    var xb = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await xb.arrayBuffer());
    var hdr = (wb.worksheets[0].headerFooter || {}).oddHeader || '';
    var sections = {};
    String(hdr).replace(/&([LCR])((?:(?!&[LCR])[\s\S])*)/g, function (_, k, v) { sections[k] = v; return ''; });
    var strip = function (sec) {
      return String(sec || '').replace(/&(?:"[^"]*"|K[0-9A-Fa-f]{6}|\d{1,3}(?=&")|[A-Z])/g, '');
    };
    out.excelC = strip(sections.C);
    out.excelR = strip(sections.R);
    // ⚠️ NOT "no braces at all". c2 deliberately holds `Draft {nope} {{escaped}}`, and BOTH halves
    // are supposed to reach the exports with braces intact -- an unknown token renders as typed, and
    // {{ }} is an escape. A first cut asserted no braces anywhere and failed on correct output.
    // The real claim is narrower: no KNOWN token may survive unresolved.
    var KNOWN = ['{title}','{version}','{episodes}','{titleSeason}','{production.summary}',
                 '{production.dates}','{writersRoom.line}','{date:notadate}'];
    var unresolved = function (s) { return KNOWN.filter(function (k) { return String(s).indexOf(k) >= 0; }); };
    out.excelUnresolved = unresolved(out.excelC).concat(unresolved(out.excelR));
    out.excelHasNoUnresolved = out.excelUnresolved.length === 0;
    out.excelCarriesResolved = out.excelC.indexOf('Test Show S2 - v3') >= 0;

    await T.sleep(900);                        // the export button's reClickGuard(600)
    var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
    var bytes = new Uint8Array(await pb.arrayBuffer());
    var latin = ''; for (var i = 0; i < bytes.length; i += 8192) latin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    var content = null, re = /stream\r?\n/g, m;
    while ((m = re.exec(latin))) {
      var st = m.index + m[0].length, en = latin.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (bytes[en - 1] === 10 || bytes[en - 1] === 13 || bytes[en - 1] === 32)) en--;
      try {
        var ds = new DecompressionStream('deflate');
        var w = ds.writable.getWriter(); w.write(bytes.subarray(st, en)); w.close();
        var u = new Uint8Array(await new Response(ds.readable).arrayBuffer()), sTxt = '';
        for (var j = 0; j < u.length; j += 8192) sTxt += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
        if (/\bTf\b/.test(sTxt) && /\bTj\b/.test(sTxt)) { content = sTxt; break; }
      } catch (e) { /* font streams */ }
    }
    var drawn = [];
    var tok = /\(((?:\\.|[^\\)])*)\)\s*Tj/g, t2;
    while ((t2 = tok.exec(content || ''))) drawn.push(t2[1].replace(/\\([()\\])/g, '$1'));
    out.pdfDrewResolved = drawn.indexOf('Test Show S2 - v3') >= 0;
    // Same correction as the workbook above: an unknown token and an escape legitimately reach the
    // PDF with braces. What must never appear is a KNOWN token left unresolved.
    out.pdfUnresolved = drawn.filter(function (s) {
      return KNOWN.some(function (k) { return s.indexOf(k) >= 0; });
    });
    out.pdfHasNoUnresolved = out.pdfUnresolved.length === 0;

    // ---- 7. ⭐ THE STORE HOLDS RAW TEMPLATES, AND __ctx IS NOT IN THE FILE ----------------------
    await T.sleep(700);
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var mm = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    var snapText = mm ? mm[1].replace(/\\u003c/g, '<') : '';
    var snap = null;
    try { snap = JSON.parse(snapText); } catch (e) { out.snapParseErr = String(e.message); }
    out.snapHeaderMode = snap && snap.headerMode;
    out.snapHeaderTemplates = snap && snap.headerTemplates;
    out.snapRawC4 = snap && snap.headerManual && snap.headerManual.c4;
    out.storesRaw = out.snapRawC4 === 'T={title} V={version} E={episodes}';
    out.flagTravels = out.snapHeaderTemplates === true && out.snapHeaderMode === 'manual';
    // ⭐ The non-enumerable __ctx must be invisible to JSON.stringify, Object.assign and spread.
    out.ctxLeaked = snapText.indexOf('__ctx') >= 0;
    // And no body-level mode popover may be baked into a copy. ⚠️ PARSED, not regexed: the copy
    // legitimately contains the string "hdr-mode-pop" twice over -- in the inlined stylesheet, and
    // in the engine's own source -- so a text search reports a leak that is not one. A first cut did
    // exactly that. Ask the DOM how many ELEMENTS there are.
    var copyDoc = new DOMParser().parseFromString(html, 'text/html');
    out.popElementsInCopy = copyDoc.querySelectorAll('.hdr-mode-pop').length;
    out.popInCopy = out.popElementsInCopy > 0;

    // ---- 8. ⭐ TEMPLATE -> MANUAL BAKES, and the popover says so first --------------------------
    var stale2 = document.querySelector('.hdr-mode-pop');
    if (stale2) stale2.remove();
    btn().click();
    await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); }, 'the popover', 40, 100);
    var manualRow = null;
    document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice').forEach(function (r) {
      if ((r.querySelector('.hdr-mode-name').textContent || '') === 'Manual') manualRow = r;
    });
    var warnEl = manualRow && manualRow.querySelector('.hdr-mode-warn');
    out.bakeWarning = warnEl ? (warnEl.textContent || '').trim() : null;
    out.warnsBeforeBaking = !!out.bakeWarning;
    manualRow.click();
    await T.sleep(800);
    var man = modeState();
    out.manualLabel = man.label;
    out.manualTitle = man.title;
    // ⭐ H3b again: in MANUAL, with the flag false, the button is byte-identical to before the edit.
    out.h3bManualInert = man.label === 'Header: Manual' &&
      man.title === 'Discard manual header edits and return to auto-filled values';
    out.bakedC4 = lines().c4;
    out.bakeFroze = out.bakedC4 === 'T=Test Show V=v3 E=10';
    // The tokens are gone: focusing shows the baked text, not a template.
    lineEl('c4').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await T.sleep(250);
    out.manualFocusText = (lineEl('c4').textContent || '').trim();
    out.noSwapInManual = out.manualFocusText === out.bakedC4;

    // ---- 9. ⭐ MANUAL NEVER RESOLVES -- decision H4, and the reason old files are safe ----------
    await commit('c4', 'Draft {today} - {version} - {episodes}');
    out.manualBraces = lines().c4;
    out.manualPrintsBraces = out.manualBraces === 'Draft {today} - {version} - {episodes}';
    // Emitted so the gate step can mint tests/fixtures/hdrmanualbraces.sptcal from a REAL
    // captureSnapshot() rather than a hand-built one (CLAUDE.md: test with real files).
    await T.sleep(800);
    var cap2 = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap2.peek, 'the second shareable-copy blob', 200, 100);
    var html2 = await cap2.stop().text();
    var mm2 = html2.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    try { out.manualSnapshot = JSON.parse((mm2 ? mm2[1] : '').replace(/\\u003c/g, '<')); } catch (e) {}

    // ---- 10. ONE UNDO STEP PER TRANSITION -------------------------------------------------------
    await T.sleep(1200);                       // let the undo push debounce settle
    var undoBtn = document.getElementById('undo-btn');
    out.undoFound = !!undoBtn;
    if (undoBtn) {
      await pick('Auto');
      out.afterAuto = modeState().label;
      out.autoEmptiedStore = lines().c4 === '';       // -> Auto discards headerManual entirely
      undoBtn.click();
      await T.sleep(900);
      out.afterUndo = modeState().label;
      out.oneUndoStep = out.afterAuto === 'Header: Auto' && out.afterUndo === 'Header: Manual';
    }

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells();
    out.PASS = out.h3bAutoInert && out.h3bManualInert &&
               out.tplIsTemplate && out.tplEditable &&
               out.resolvesOnScreen && out.unknownSurvives && out.groupsWork && out.noCompoundDrift &&
               out.focusShowsRaw && out.blurRestoresResolved &&
               out.excelHasNoUnresolved && out.excelCarriesResolved &&
               out.pdfDrewResolved && out.pdfHasNoUnresolved &&
               out.storesRaw && out.flagTravels && !out.ctxLeaked && !out.popInCopy &&
               out.warnsBeforeBaking && out.bakeFroze && out.noSwapInManual &&
               out.manualPrintsBraces && out.oneUndoStep &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
    try { out.health = T.appHealth(); } catch (_) {}
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
