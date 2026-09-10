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

    out.insertBtnInAuto = !!document.querySelector('#table-wrap .hf-insert');

    // ---- 2. Auto -> Template -------------------------------------------------------------------
    await pick('Template');
    var tpl = modeState();
    out.tplLabel = tpl.label;
    out.tplTitleStarts = tpl.title.slice(0, 30);
    // ⛔ THIS ASSERTION WAS INVERTED ON 10 Sep 2026, AND THE OLD ONE WAS NOT WRONG -- IT RECORDED A
    // DECISION THE OWNER LATER CHANGED. It used to read "Template IS manual to the frozen gate, so
    // the lines must be contenteditable and the format toolbar must be present", which was an exact
    // description of what shipped on 8 Sep. The owner's instruction of 10 Sep 2026: "the app needs
    // to freeze editing the header when you're on template mode in the regular app view. It should
    // only be editable in the template editor screen. This means also remove the styling menu view
    // from there." So Template mode is now READ-ONLY here, and the frozen renderer gates on
    // `manualEdit = manual && !headerTemplates`.
    //
    // ⚠️ Manual mode is asserted UNCHANGED in section 5 below -- that is the half of this that
    // proves the frozen edit is inert rather than merely intended, because `manual && !false` is
    // only equal to `manual` if nothing else moved with it.
    out.tplEditableAttr = lineEl('c1').getAttribute('contenteditable');
    out.tplReadOnly = out.tplEditableAttr === null;
    out.tplHasEditableCls = lineEl('c1').classList.contains('hdr-editable');
    out.tplToolbarGone = !document.querySelector('#table-wrap .hdr-fmt');
    out.tplSpacerInstead = !!document.querySelector('#table-wrap .hdr-fmt-spacer');
    out.tplLockedHere = out.tplReadOnly && !out.tplHasEditableCls &&
                        out.tplToolbarGone && out.tplSpacerInstead;
    // ...and the read-only line still LEADS SOMEWHERE: clicking it opens the editor at that line,
    // because a header that looks clickable and does nothing is worse than one that does not.
    out.tplCursor = getComputedStyle(lineEl('c1')).cursor;
    (function(){ var o = document.querySelector('.hde-overlay'); if(o) o.remove(); })();
    lineEl('c2').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    out.tplIsTemplate = tpl.label === 'Header: Template';

    await T.until(function () { return !!document.querySelector('.hde-overlay'); },
                  'a header click to open the editor', 60, 100);
    var ov = document.querySelector('.hde-overlay');
    out.clickOpensEditor = !!ov;
    // ⭐ AT THE LINE YOU CLICKED, not always at c1 -- the click carried an intent and it survives.
    out.clickSelectsThatLine = !!(ov && ov.querySelector('.hde-line[data-hid="c2"].is-sel'));
    ov.querySelector('.hde-done').click();
    await T.until(function () { return !document.querySelector('.hde-overlay'); },
                  'the editor to close', 40, 100);

    // ---- 2b. ⭐ `hdrdefault` -- THE DRIFT GUARD FOR THE ONE DUPLICATED STATEMENT ----------------
    // DEFAULT_HEADER_TEMPLATE is the auto header written as templates, and Auto -> Template seeds
    // headerManual from it. So the nine lines showing NOW are that template RESOLVED, and the nine
    // captured a moment ago in Auto are computeHeaderDefaults()'s hand-coded output. They must be
    // identical, line for line. If they ever diverge, picking Template silently changes what the
    // header says -- which is the failure this assertion exists to make loud.
    out.tplLines = lines();
    out.defaultDiffs = Object.keys(out.autoLines).filter(function (hid) {
      return out.autoLines[hid] !== out.tplLines[hid];
    }).map(function (hid) { return hid + ': auto=' + JSON.stringify(out.autoLines[hid]) +
                                   ' tpl=' + JSON.stringify(out.tplLines[hid]); });
    out.defaultMatchesAuto = out.defaultDiffs.length === 0;

    // ---- 2c. ⛔ THE ANCHORED Insert ▾ PALETTE IS NOW UNREACHABLE, AND THAT IS A CONSEQUENCE ------
    // `.hf-insert` was only ever rendered when `!mv && headerTemplates` -- the waterfall header, in
    // Template mode. It lived INSIDE the format toolbar, and the owner's 10 Sep 2026 instruction
    // removed that toolbar from exactly that mode. So the button's own condition can no longer be
    // satisfied anywhere: Template is the only mode that would draw it and Template no longer draws
    // the bar that holds it.
    //
    // ⚠️ THE ~45 LINES THAT USED TO SIT HERE TESTED THAT PANEL and are deliberately gone rather
    // than left running against something no user can open. What they proved -- the palette must
    // not dead-end with nothing focused, and it must survive its own scroll -- was real work from
    // 9 Sep and is preserved in the README changelog and in HANDOFF §2b, not in a test of a dead
    // path. Token insertion is now the editor rail's job and `hdreditor` asserts it there
    // (railTokens / railLive / railFullyReadable).
    //
    // ⛔ THE PALETTE CODE ITSELF IS STILL PRESENT AND STILL REFERENCED -- buildHdrTokenList() backs
    // the editor's rail, and openHdrTokenPop()/.hdr-token-pop are what is now orphaned. Left in
    // place pending an owner decision; flagged, not silently deleted.
    out.insertBtnInTemplate = !!document.querySelector('#table-wrap .hf-insert');
    out.tokenPopUnreachable = !out.insertBtnInTemplate;
    // ---- 2c-ii. the tokens are reachable BEFORE committing to Template -------------------------
    // They are the reason to choose Template, so the mode menu's Template row offers a way in.
    //
    // ⚠️ THIS ROW CHANGED ON 9 Sep 2026 AND THIS SECTION CHANGED WITH IT. It used to open a
    // READ-ONLY copy of the token palette -- browse, do not touch. It now opens the header template
    // EDITOR, which shows the same tokens with the same live previews AND lets you use them, so a
    // look-but-do-not-touch list is strictly worse than the thing that replaced it. What this
    // section asserts is unchanged in substance: from Auto, before committing to anything, the row
    // exists and leads somewhere that shows you the tokens. The editor's own behaviour is the
    // hdreditor leg's job, not this one's.
    (function () { var p = document.querySelector('.hdr-mode-pop'); if (p) p.remove(); })();
    btn().click();
    await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); }, 'the mode popover', 40, 100);
    var peek = document.querySelector('.hdr-mode-peek');
    out.peekOffered = !!peek;
    out.peekLabel = peek ? (peek.textContent || '').trim() : null;
    if (peek) {
      peek.click();
      await T.until(function () { return !!document.querySelector('.hde-overlay'); }, 'the template editor', 60, 100);
      var ed = document.querySelector('.hde-overlay');
      out.peekTokens = ed.querySelectorAll('.hde-rail-list .hdr-token-item').length;
      // Closed the way a user closes it, so the editor's own teardown runs -- .remove() would leave
      // its document-level keydown listener behind and the rest of this leg would run under it.
      ed.querySelector('.hde-done').click();
      await T.until(function () { return !document.querySelector('.hde-overlay'); }, 'the editor to close', 40, 100);
    }
    out.peekWorks = out.peekOffered && out.peekTokens > 30 && !document.querySelector('.hde-overlay');
    // ---- 2d. ⛔ THE INSERT-AT-CARET TEST MOVED, IT WAS NOT DROPPED -------------------------------
    // ~55 lines here drove `.hf-insert` -> `.hdr-token-pop` -> click a token -> assert it landed at
    // the caret and resolved. All of it ran through the panel that 10 Sep 2026 made unreachable.
    // ⭐ THE COVERAGE MOVED TO `hdreditor`, WHICH IS WHERE TOKEN INSERTION NOW LIVES: the rail must
    // offer every phase under its CURRENT name, must offer the bracket snippets, and clicking an
    // entry must APPEND to the selected line rather than replace it. Deleting a test because its
    // button moved would have quietly retired three real assertions.

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
    // Emitted so the gate step can mint tests/fixtures/hdrtemplated.sptcal from a REAL
    // captureSnapshot() taken in TEMPLATE mode -- the restore-path fixture Step 6 owes, and the
    // counterpart to hdrmanualbraces.sptcal (same braces, flag false, must NOT resolve).
    out.templateSnapshot = snap;
    // And no body-level mode popover may be baked into a copy. ⚠️ PARSED, not regexed: the copy
    // legitimately contains the string "hdr-mode-pop" twice over -- in the inlined stylesheet, and
    // in the engine's own source -- so a text search reports a leak that is not one. A first cut did
    // exactly that. Ask the DOM how many ELEMENTS there are.
    var copyDoc = new DOMParser().parseFromString(html, 'text/html');
    out.popElementsInCopy = copyDoc.querySelectorAll('.hdr-mode-pop').length;
    out.popInCopy = out.popElementsInCopy > 0;

    // ---- 8. ⭐ TEMPLATE -> MANUAL BAKES, and the popover says so first --------------------------
    out.preBakeC4 = lines().c4;
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
    // ⚠️ Compared against what the line SHOWED just before the bake, not a literal: the palette
    // insert above changed that line, and a hardcoded expectation here broke the moment Step 3
    // landed. The claim is "the bake freezes what was on screen", so state it that way.
    out.bakeFroze = out.bakedC4 === out.preBakeC4;
    out.insertBtnInManual = !!document.querySelector('#table-wrap .hf-insert');
    // ⛔ WAS "offered in Template and nowhere else". As of 10 Sep 2026 it is offered NOWHERE on the
    // calendar: Template mode was the only mode that drew it, and Template mode no longer draws the
    // toolbar it sat in. Asserted as absent in all three modes so that a future change which
    // resurrects the button has to come here and say so on purpose.
    out.insertGoneEverywhere = !out.insertBtnInTemplate && !out.insertBtnInAuto && !out.insertBtnInManual;
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
               out.defaultMatchesAuto && out.insertGoneEverywhere && out.tokenPopUnreachable &&
                out.peekWorks &&
               out.tplIsTemplate && out.tplLockedHere &&
               out.clickOpensEditor && out.clickSelectsThatLine &&
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
