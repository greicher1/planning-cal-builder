// hdreditor -- the header template EDITOR, and the third left slot it was built around.
//
// Owner request, 9 Sep 2026: a dedicated pop-up for BUILDING a header, with the live header as the
// editing surface, the same styling controls the manual header has, and three slots per column.
//
// ⭐ THE FOUR THINGS THAT WOULD BE EXPENSIVE TO GET WRONG:
//
//   l3Inert       -- l3 is THREE FROZEN EDITS (renderSpreadsheetView, exportExcel's lIds,
//                    buildWaterfallPdf's left column). The sign-off rests on the guarantee l2 and c4
//                    were given on 31 Aug: empty by default, so every calendar ever saved renders
//                    byte-for-byte as it did. gate.sh's PDF/Excel byte-compare is the other half of
//                    this; here we assert the slot exists on the calendar and is hidden while empty.
//   noIds         -- the panel is BODY-LEVEL, outside .prefs-card, where collectFieldValues()'s class
//                    exclusion does not reach, and it holds ten text inputs, two colour inputs, a
//                    select and a checkbox. One id on any of them and it is baked into every saved
//                    calendar, with an undo step per keystroke. Classes only.
//   notASecondRenderer -- everything on the canvas comes from buildHeaderCtx() +
//                    resolveHeaderTemplate(), the pair headerLine() uses. Asserted by editing in the
//                    panel and reading the result off the REAL header behind it: if the two ever
//                    disagreed, the panel would be lying about what prints.
//   c4KeptNotDropped -- going to three-per-column retires c4 from the OFFER, not from the FORMAT. A
//                    calendar already using it still shows it, still exports it, still restores it.
//                    Silently dropping a line from someone's header is the one thing the
//                    save-format contract forbids.
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    try { localStorage.removeItem('sptcal.prefs'); } catch (e) {}
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

    // ⚠️ RE-QUERY every node, every time. render() rewrites #table-wrap and paintHeaderEditor()
    // rebuilds the canvas, so anything captured before an edit is detached and clicking it reaches
    // nothing -- the trap HANDOFF §4 records, and it cost a confusing "the editor did not open"
    // while this leg was being written.
    var modeBtn = function () { return document.getElementById('hdr-mode-btn'); };
    var realLine = function (hid) { return document.querySelector('#table-wrap .hdr-line[data-hid="' + hid + '"]'); };
    var panel = function () { return document.querySelector('.hde-overlay'); };
    var el = function (sel) { return panel() ? panel().querySelector(sel) : null; };
    var line = function (hid) { return el('.hde-line[data-hid="' + hid + '"]'); };
    var tplInput = function (hid) { return el('.hde-tpl[data-hid="' + hid + '"]'); };
    var slotsOf = function () {
      return [].map.call(panel().querySelectorAll('.hde-line'), function (l) { return l.dataset.hid; });
    };

    async function openEditor() {
      var stale = document.querySelector('.hdr-mode-pop');
      if (stale) stale.remove();
      modeBtn().click();
      await T.until(function () { return !!document.querySelector('.hdr-mode-peek'); }, 'the mode popover', 40, 100);
      document.querySelector('.hdr-mode-peek').click();
      await T.until(function () { return !!panel(); }, 'the header editor', 60, 100);
      await T.sleep(400);
    }
    // ⚠️ SETTLE, do not sleep-and-read -- hdrtemplate's commit() learned this: a commit re-renders,
    // and reading straight after a focusout catches the node BEFORE the render replaces it, which
    // reports a raw template as though resolution were broken.
    async function settle(read) {
      var want = null;
      await T.until(function () {
        var t = read();
        if (t === want) return true;
        want = t; return false;
      }, 'the edit to settle', 40, 100);
      return read();
    }

    // ---- 1. ⭐ l3 EXISTS AND IS INERT ------------------------------------------------------------
    out.l3OnCalendar = !!realLine('l3');
    out.l3HiddenWhenEmpty = out.l3OnCalendar && getComputedStyle(realLine('l3')).display === 'none';
    out.l3Inert = out.l3OnCalendar && out.l3HiddenWhenEmpty;

    // ---- 2. the editor opens from AUTO, and switches to Template on the way in --------------------
    out.modeBeforeOpen = (modeBtn().textContent || '').trim();
    await openEditor();
    out.editorOpened = !!panel();
    out.modeAfterOpen = (modeBtn().textContent || '').trim();
    out.opensFromAuto = out.modeBeforeOpen === 'Header: Auto' && out.modeAfterOpen === 'Header: Template';

    // ---- 3. ⭐ THREE SLOTS PER COLUMN, and NOT ONE id --------------------------------------------
    out.canvasSlots = slotsOf();
    out.threePerColumn = JSON.stringify(out.canvasSlots) ===
      JSON.stringify(['left','l2','l3','c1','c2','c3','r1','r2','r3']);
    out.idsInPanel = [].map.call(panel().querySelectorAll('[id]'), function (n) { return n.id; });
    out.noIds = out.idsInPanel.length === 0;
    out.c4OfferedWhenUnused = out.canvasSlots.indexOf('c4') >= 0;   // must be false

    // ⭐ The DEFAULT template on a fully-filled calendar must fit Excel's 255-character header cap.
    // Measured here rather than assumed: this is the number a user sees before touching anything,
    // and l3 charges against the same budget. Read BEFORE any edit -- section 7 reads it again after
    // this leg has deliberately made the header long, so only this one says anything about defaults.
    out.budgetAtRest = (el('.hde-budget').textContent || '').trim();
    out.defaultFitsExcel = !/too long/.test(out.budgetAtRest);

    // ---- 4. the styling bar acts on the SELECTED line, and reaches the REAL header ---------------
    // ⚠️ The bar is LIVE from the moment the panel opens, not idle-until-clicked: openHeaderEditor()
    // seeds `selected: 'c1'`. That is deliberate -- a toolbar of controls that silently do nothing
    // until you guess you must click a line first is the dead end the Insert palette had. The
    // `is-idle` class exists for the case where nothing is selected at all, which the panel avoids;
    // it is recorded here rather than asserted, so a future change that DOES open idle shows up in
    // the JSON instead of silently passing.
    out.barIdleOnOpen = el('.hde-fmt').classList.contains('is-idle');
    out.barNamesOnOpen = (el('.hde-target').textContent || '').trim();
    out.barLiveOnOpen = !out.barIdleOnOpen && /Centre 1/.test(out.barNamesOnOpen);
    // ...and it FOLLOWS the selection rather than holding state of its own.
    line('r2').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await T.sleep(300);
    out.barAfterMove = (el('.hde-target').textContent || '').trim();
    out.barFollowsSelection = /Right 2/.test(out.barAfterMove);
    line('c1').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await T.sleep(300);
    out.barWoke = !el('.hde-fmt').classList.contains('is-idle');
    out.barNamesLine = (el('.hde-target').textContent || '').trim();
    out.barNamesRight = /Centre 1/.test(out.barNamesLine);
    el('.hde-b').click();
    await T.sleep(300);
    var sz = el('.hde-size');
    sz.value = '18';
    sz.dispatchEvent(new Event('change', { bubbles: true }));
    await T.sleep(400);
    out.canvasStyle = line('c1').getAttribute('style');
    // ⭐ The SAME string on the real header: one store (headerFormat), one renderer.
    out.realStyle = realLine('c1') ? realLine('c1').getAttribute('style') : null;
    // ⚠️ UPDATED 24 Sep 2026, NOT RELAXED: this used to require 'font-weight:700', which encoded the
    // owner-reported bug. c1 is bold BY DEFAULT (.hdr-line.hdr-title), and the builder's Bold used to
    // flip from the stored format, so this first click set bold:true on an already-bold line and
    // nothing visibly changed. It now flips from the rendered look (hdrLiveLook), so one click on the
    // bold title UN-bolds it -- 400. The contract this assertion exists for is unchanged and still
    // checked in full: one store, one renderer (canvas === real header), size applied, and the Bold
    // click's effect present on both.
    out.stylingReachesHeader = !!out.canvasStyle && out.canvasStyle === out.realStyle &&
                               out.canvasStyle.indexOf('font-size:18px') >= 0 &&
                               out.canvasStyle.indexOf('font-weight:400') >= 0;

    // ---- 5. ⭐ EDIT IN PLACE: raw on focus, resolved on blur, and it lands on the calendar --------
    // ⭐ REGRESSION, owner-reported 9 Sep 2026: "the font/size of the header text lines are changing
    // when you click into them". .hde-line.is-editing used to set font-family:monospace and
    // font-size:10.5px, so every line jumped as you moved between them -- in the one panel whose
    // whole purpose is showing what the header will look like. Measured, because this is invisible
    // in a screenshot taken a moment later and would creep back the next time someone wants the raw
    // template to "read as code".
    var typeOf = function (el) {
      var c = getComputedStyle(el);
      return c.fontFamily + '|' + c.fontSize + '|' + c.fontWeight + '|' + c.fontStyle;
    };
    out.typeBeforeFocus = typeOf(line('c1'));
    line('c1').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await T.sleep(350);
    out.typeAfterFocus = typeOf(line('c1'));
    out.focusDoesNotRestyle = out.typeBeforeFocus === out.typeAfterFocus;
    out.rawOnFocus = (line('c1').textContent || '').trim();
    out.showsRaw = out.rawOnFocus === '{titleSeason}';
    line('c1').textContent = '{titleSeason} - {version}';
    line('c1').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    out.canvasAfterEdit = await settle(function () { return (line('c1').textContent || '').trim(); });
    out.realAfterEdit = realLine('c1') ? (realLine('c1').textContent || '').trim() : null;
    out.notASecondRenderer = out.canvasAfterEdit === 'Test Show S2 - v3' &&
                             out.realAfterEdit === out.canvasAfterEdit;

    // ---- 6. ⭐ PLACEHOLDERS: a token with no data still shows a shape to lay out against ---------
    // ⚠️ buildFixture() fills EVERY phase, so no phase token is empty. Clear one deliberately --
    // otherwise this section asserts a placeholder against data that exists and passes vacuously.
    T.set('start-localization', '');
    await T.sleep(600);
    var l3f = tplInput('l3');
    l3f.focus();
    l3f.value = '{localization.open}';
    l3f.dispatchEvent(new Event('input', { bubbles: true }));
    await T.sleep(600);
    out.placeholderShown = (line('l3').textContent || '').trim();
    out.placeholderMarked = !!line('l3').querySelector('.hde-ph');
    out.footMentionsPlaceholders = /Dashed words/.test(el('.hde-stage-foot').textContent || '');
    out.footHiddenWhilePh = el('.hde-stage-foot').hidden;   // must be FALSE -- it has something to say
    // ...and it is EDITOR-ONLY: the real header prints nothing for a token with no data.
    out.realL3WhilePlaceheld = realLine('l3') ? (realLine('l3').textContent || '').trim() : null;
    // ⚠️ NOT display:none here, and that is correct. .hdr-line.hdr-slot.hdr-empty is hidden
    // :not(.hdr-editable) -- in Template mode the line IS editable, so an empty slot deliberately
    // shows a dashed outline you can click. The hidden case is section 1, in Auto. What matters here
    // is that it is still EMPTY: the placeholder is editor furniture and never reaches the header.
    out.realL3IsEmptySlot = !!realLine('l3') && realLine('l3').classList.contains('hdr-empty');
    el('.hde-phbox').click();                       // ⚠️ .hde-phbox, not .hde-ph -- see openHeaderEditor
    await T.sleep(500);
    out.withoutPlaceholders = (line('l3').textContent || '').trim();
    // ⭐ SILENCE IS THE POINT. The foot used to always say something -- it explained the dotted
    // empty-slot boxes, which already look like things you click. Owner removed that 9 Sep 2026, so
    // with no dashed word on screen the foot must say nothing AND take no space: an empty <p> keeps
    // its margin, which is why this asserts the measured height and not just the text.
    out.footTextWhenSilent = (el('.hde-stage-foot').textContent || '').trim();
    out.footHiddenWhenSilent = el('.hde-stage-foot').hidden;
    out.footHeightWhenSilent = Math.round(el('.hde-stage-foot').getBoundingClientRect().height);
    out.footCollapsesWhenSilent = out.footTextWhenSilent === '' && out.footHiddenWhenSilent === true &&
                                  out.footHeightWhenSilent === 0;
    out.placeholdersAreEditorOnly = out.placeholderShown === 'Localization Opens' &&
      out.placeholderMarked && out.footMentionsPlaceholders &&
      out.withoutPlaceholders === '' && out.realL3WhilePlaceheld === '' && out.realL3IsEmptySlot;

    // ---- 6b. ⭐ THE CHROME THE OWNER CUT STAYS CUT ------------------------------------------------
    // Three strings were removed on 9 Sep 2026 for saying the obvious next to the thing they
    // described. Asserted because deleted copy is the easiest thing in the world to reinstate by
    // reflex, and nothing else in the gate would notice.
    // ⚠️ LOCAL, not on `out`. The panel's full textContent is ~2 KB of token previews; putting it
    // in the result truncated the JSON and would have left gate.sh unable to parse the leg at all.
    // A result file is a report, not a DOM dump.
    var panelText = (panel().textContent || '');
    out.noLiveHeaderLabel = !/Live header/.test(panelText);
    out.noDottedBoxSentence = !/dotted box/.test(panelText);
    out.grammarText = (el('.hde-grammar').textContent || '').trim();
    // The rewrite leads with a worked example rather than the rule, and drops the {{ }} escape --
    // still supported, still proven by prove-header-template, just not worth a third of the only
    // sentence most people read.
    out.grammarLeadsWithExample = /^\[\{episodes\} Episodes\] prints/.test(out.grammarText);
    out.grammarDropsBraceEscape = !/literal brace/.test(out.grammarText);

    // ---- 7. the palette rail is the SHARED list, with live previews -------------------------------
    out.railTokens = panel().querySelectorAll('.hde-rail-list .hdr-token-item').length;
    out.railLive = panel().querySelectorAll('.hde-rail-list .hdr-token-desc.is-live').length;
    out.railShared = out.railTokens > 30 && out.railLive > 15;
    // ⭐ REGRESSION, owner-reported 9 Sep 2026: "the text is truncated in the insert section."
    // .hdr-token-desc truncates with an ellipsis, which is right for the ANCHORED popover and wrong
    // here -- showing a live value instead of a description is the whole point of the list, and half
    // a value is not one. The rail overrides it to wrap. ⚠️ Asserted by measurement, not by reading
    // the CSS: scrollWidth > clientWidth is the only thing that actually knows.
    out.railClipped = [].filter.call(panel().querySelectorAll('.hde-rail-list .hdr-token-desc'),
      function (d) { return d.scrollWidth > d.clientWidth + 1; })
      .map(function (d) { return (d.textContent || '').slice(0, 40); });
    out.railFullyReadable = out.railClipped.length === 0;
    // ...and the popover it shares a class with must STILL truncate, or this override leaked.
    out.railWidth = Math.round(panel().querySelector('.hde-rail').getBoundingClientRect().width);
    // ⭐ PORTED FROM hdrtemplate ON 10 Sep 2026, when the anchored Insert ▾ palette became
    // unreachable. These are the assertions that panel carried; the button moved, so the coverage
    // moved with it rather than being retired.
    out.railTokenList = [].map.call(panel().querySelectorAll('.hde-rail-list .hdr-token-code'),
                                    function (c) { return c.textContent; });
    // Every phase the calendar has, under its CURRENT name -- a renamed phase whose token still
    // reads by the old name is a token that silently resolves to nothing.
    out.railHasPhases = out.railTokenList.indexOf('{writersRoom.open}') >= 0 &&
                        out.railTokenList.indexOf('{production.close}') >= 0 &&
                        out.railTokenList.indexOf('{localization.weeks}') >= 0;
    // The bracket snippets, which are how the square-bracket grammar is discoverable at all.
    out.railHasSnippets = out.railTokenList.indexOf('{production.summary}') >= 0 &&
                          out.railTokenList.indexOf('[{episodes} Episodes]') >= 0;
    // ⭐ AND CLICKING ONE APPENDS TO THE SELECTED LINE rather than replacing it. c2 is selected and
    // holds 'Planning Calendar' from the Default template, so an append is visible AS an append --
    // the same reason hdrtemplate used c1 rather than an empty slot for this.
    line('c2').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await T.sleep(300);
    out.beforeInsert = tplInput('c2') ? tplInput('c2').value : null;
    var pick = null;
    panel().querySelectorAll('.hde-rail-list .hdr-token-item').forEach(function (b) {
      if ((b.querySelector('.hdr-token-code').textContent || '') === '{episodes}') pick = b;
    });
    out.railTokenFound = !!pick;
    if (pick) pick.click();
    await T.sleep(700);
    out.afterInsert = tplInput('c2') ? tplInput('c2').value : null;
    out.railInsertAppends = out.beforeInsert === 'Planning Calendar' &&
                            out.afterInsert === 'Planning Calendar{episodes}';
    // ...and it resolves on the canvas, which is the point of inserting it.
    out.afterInsertCanvas = (line('c2').textContent || '').trim();
    out.railInsertResolves = out.afterInsertCanvas === 'Planning Calendar10';

    out.budgetText = (el('.hde-budget').textContent || '').trim();
    out.budgetReads = /^Excel header: about \d+ of 255 characters/.test(out.budgetText);
    // This leg has bolded, resized and lengthened lines by now, so the budget SHOULD be over --
    // proving the warning fires, which the at-rest reading above proves is not simply always on.
    out.budgetWarnsWhenOver = /too long/.test(out.budgetText) &&
                              !!el('.hde-budget').classList.contains('is-over');

    // ---- 8. ⭐ c4 IS KEPT, NOT DROPPED ------------------------------------------------------------
    // Give this calendar a c4 the way a pre-existing one has it, then reopen: the editor must reveal
    // it rather than pretend it is not there.
    el('.hde-done').click();
    await T.sleep(400);
    out.doneCloses = !panel();
    out.c4OnCalendar = !!realLine('c4');
    realLine('c4').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await T.sleep(300);
    realLine('c4').textContent = 'A legacy fourth line';
    realLine('c4').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await settle(function () { return realLine('c4') ? (realLine('c4').textContent || '').trim() : null; });
    await openEditor();
    out.slotsWithC4 = slotsOf();
    out.c4NowShown = out.slotsWithC4.indexOf('c4') >= 0;
    out.c4Marked = !!(line('c4') && line('c4').classList.contains('is-legacy'));
    out.c4Value = tplInput('c4') ? tplInput('c4').value : null;
    out.c4Label = (function () {
      var i = tplInput('c4'), r = i && i.closest('.hde-row'), l = r && r.querySelector('.hde-rlabel');
      return l ? (l.textContent || '').trim() : null;
    })();
    out.c4KeptNotDropped = out.c4NowShown && out.c4Marked &&
                           out.c4Value === 'A legacy fourth line' && out.c4Label === '4*';

    // ---- 9. Escape closes it, and the header it built survives ------------------------------------
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await T.sleep(400);
    out.escapeCloses = !panel();
    out.headerSurvives = !!realLine('c1') && (realLine('c1').textContent || '').indexOf('Test Show S2 - v3') >= 0;

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells();
    out.PASS = out.l3Inert && out.editorOpened && out.opensFromAuto &&
               out.threePerColumn && out.noIds && !out.c4OfferedWhenUnused &&
               out.barLiveOnOpen && out.barFollowsSelection &&
               out.barWoke && out.barNamesRight && out.stylingReachesHeader &&
               out.showsRaw && out.focusDoesNotRestyle && out.notASecondRenderer &&
               out.placeholdersAreEditorOnly && out.footCollapsesWhenSilent &&
               out.noLiveHeaderLabel && out.noDottedBoxSentence &&
               out.grammarLeadsWithExample && out.grammarDropsBraceEscape &&
               out.railShared && out.railFullyReadable &&
               out.railHasPhases && out.railHasSnippets &&
               out.railInsertAppends && out.railInsertResolves &&
               out.budgetReads && out.defaultFitsExcel && out.budgetWarnsWhenOver &&
               out.doneCloses && out.c4OnCalendar && out.c4KeptNotDropped &&
               out.escapeCloses && out.headerSurvives &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
    try { out.health = T.appHealth(); } catch (_) {}
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
