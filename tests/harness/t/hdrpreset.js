// hdrpreset -- the header PRESET library: saving, applying, renaming, deleting, and the two rules
// that make presets safe to share a machine with.
//
// HEADER-PRESETS-PLAN.md Step 4, gate item 6.
//
// ⭐ THE TWO ASSERTIONS THAT MATTER MOST, both of which are about data going somewhere it must not:
//
//   storesTemplates  -- decision H8. A preset holds the nine TEMPLATES, never their resolved
//                       values. Save a header whose l2 says "v3" instead of "{version}" and that
//                       preset stamps v3 onto every calendar it is ever applied to. This is also
//                       why Save-as is DISABLED in Manual mode: Manual lines ARE literal values.
//   neverInSnapshot  -- a preset is a PREFERENCE. It lives in sptcal.prefs, per user and per
//                       machine, and must never enter captureSnapshot() -- otherwise it travels
//                       inside someone else's calendar. The mirror of the version field, which is
//                       calendar data and must travel. Getting either backwards is silent.
//
// And the quieter one, which is how a preference control breaks a save format: a preset control
// must add NO undo step and NO fields.byId entry. collectFieldValues() sweeps every id'd input in
// the document; the whole block is therefore plain elements with classes and no ids, inside
// .prefs-card, which the sweep skips as well. Belt and braces, on purpose.
//
// ⚠️ Run against the BUILD: HARNESS_PAGE=/dist/index.html.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    // A clean store, or a previous run's presets make every count below wrong.
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

    // The block lives in the Settings tab; open it so the controls are laid out.
    var settingsTab = null;
    document.querySelectorAll('.side-tab-btn').forEach(function (b) {
      if (b.dataset.tab === 'settings') settingsTab = b;
    });
    if (settingsTab) settingsTab.click();
    await T.sleep(300);

    var btn = function () { return document.getElementById('hdr-mode-btn'); };
    var sel = function () { return document.querySelector('.hdr-preset-select'); };
    var optionNames = function () {
      var s = sel();
      return s ? [].map.call(s.options, function (o) { return o.textContent; }) : [];
    };
    var lines = function () {
      var o = {};
      document.querySelectorAll('#table-wrap .hdr-line[data-hid]').forEach(function (l) {
        o[l.dataset.hid] = (l.textContent || '').trim();
      });
      return o;
    };
    var readPrefs = function () {
      try { return JSON.parse(localStorage.getItem('sptcal.prefs') || '{}'); } catch (e) { return {}; }
    };
    async function mode(name) {
      var stale = document.querySelector('.hdr-mode-pop');
      if (stale) stale.remove();
      btn().click();
      await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); }, 'the mode popover', 40, 100);
      var row = null;
      document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice').forEach(function (r) {
        if ((r.querySelector('.hdr-mode-name').textContent || '') === name) row = r;
      });
      if (!row) throw new Error('no "' + name + '" row');
      row.click();
      await T.sleep(750);
    }

    // ---- 1. the block, and its id hygiene ------------------------------------------------------
    out.blockFound = !!document.querySelector('.hdr-presets');
    out.insidePrefsCard = !!(document.querySelector('.hdr-presets') &&
                             document.querySelector('.hdr-presets').closest('.prefs-card'));
    // ⛔ NOT ONE id. A Mantine Modal would portal outside .prefs-card where the sweep's exclusion
    // does not reach, which is why the Save-as field is inline and every control here is plain.
    out.idsInBlock = [].map.call(document.querySelectorAll('.hdr-presets [id]'), function (n) { return n.id; });
    out.noIdsInBlock = out.idsInBlock.length === 0;
    // ---- 1b. ⭐ THE PRIMARY BUTTONS WEAR THE ACTIVE TAB'S GROUND -------------------------------
    // Owner, 9 Sep 2026, pointing at the Settings tab: "can we make primary buttons this same bg
    // color?" ⚠️ Asserted as EQUAL TO THE TAB, never against a hex. The whole point is that one
    // accent drives every primary affordance, so re-theming must move them together or fail here --
    // a hardcoded #D3DAE1 would pass while the two drifted apart, which is the bug it exists to
    // catch. .side-tab-btn.active and .hdr-preset-btn.is-primary read the same two tokens.
    var bgOf = function (el) { return el ? getComputedStyle(el).backgroundColor : null; };
    // ⚠️ MEASURE THE CLASS, NOT THE LIVE TAB. .side-tab-btn carries `transition: background .12s`,
    // so reading the real active tab returns rgba(0,0,0,0) whenever the read lands before the
    // transition has advanced -- which it did, both here and in a browser, and it looks exactly
    // like "the rule is not applying". An off-screen probe renders the same rule with no animation
    // in flight, so this asserts what .side-tab-btn.active IS rather than what one tab happens to
    // be part-way through becoming.
    var probe = document.createElement('button');
    probe.className = 'side-tab-btn active';
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;transition:none';
    document.body.appendChild(probe);
    out.activeTabBg = bgOf(probe);
    probe.remove();
    out.liveActiveTabBg = bgOf(document.querySelector('.side-tab-btn.active'));   // diagnostic only
    out.primaryBgs = [].map.call(document.querySelectorAll('.hdr-preset-btn.is-primary:not(:disabled)'),
                                 function (b) { return bgOf(b); });
    out.primaryCount = out.primaryBgs.length;
    out.primaryMatchesTab = out.primaryCount > 0 && !!out.activeTabBg &&
      out.activeTabBg !== 'rgba(0, 0, 0, 0)' &&
      out.primaryBgs.every(function (c) { return c === out.activeTabBg; });
    // ...and a SECONDARY one does not, or the ranking says nothing.
    out.importBg = bgOf(document.querySelector('.hdr-preset-import'));
    out.secondaryStaysPlain = out.importBg !== out.activeTabBg;

    // Default ships built in, first, and read-only -- no Rename/Delete row of its own.
    out.optionsAtBoot = optionNames();
    out.defaultFirst = out.optionsAtBoot[0] === 'Default';
    out.rowsAtBoot = document.querySelectorAll('.hdr-preset-row').length;
    out.defaultNotEditable = out.rowsAtBoot === 0;
    out.storeEmptyAtBoot = !('headerPresets' in readPrefs());

    // ---- 2. ⭐ H8: Save-as is refused in MANUAL, and says why -----------------------------------
    await mode('Manual');
    out.manualSaveDisabled = !!document.querySelector('.hdr-preset-save-open').disabled;
    // ⚠️ .hdr-presets-hint is THE SAVE-AS HINT ONLY. The Excel budget is .hdr-presets-budget; the
    // two shared this class until 9 Sep 2026, and this line then found whichever came first.
    var hintEl = document.querySelector('.hdr-presets-hint');
    out.manualHint = hintEl ? (hintEl.textContent || '').trim() : null;
    out.manualExplains = !!out.manualHint && /Template/.test(out.manualHint);

    // ---- 3. Save from TEMPLATE, and it must store RAW TEMPLATES --------------------------------
    // ⚠️ From AUTO, not from the Manual above: Manual -> Template deliberately keeps the literal
    // strings (they are valid templates with no tokens), so saving straight after that path would
    // legitimately store literals and prove nothing about H8. Auto -> Template seeds
    // DEFAULT_HEADER_TEMPLATE, which is the path a user takes to get tokens in the first place.
    await mode('Auto');
    await mode('Template');
    out.templateSaveEnabled = !document.querySelector('.hdr-preset-save-open').disabled;
    document.querySelector('.hdr-preset-save-open').click();
    await T.until(function () { return !!document.querySelector('.hdr-preset-name-input'); },
                  'the inline name field', 40, 100);
    document.querySelector('.hdr-preset-name-input').value = 'Studio standard';
    document.querySelector('[data-hdrpreset="save"]').click();
    await T.sleep(600);
    var storedA = readPrefs().headerPresets || [];
    out.savedCount = storedA.length;
    out.savedName = storedA[0] && storedA[0].name;
    out.savedLines = storedA[0] && storedA[0].lines;
    // ⭐ H8 itself: l2 is the token, not the rendered version.
    out.storesTemplates = !!out.savedLines &&
      out.savedLines.l2 === '{version}' &&
      out.savedLines.left === '{today}' &&
      out.savedLines.c1 === '{titleSeason}' &&
      out.savedLines.r3 === '[{episodes} Episodes]';
    // Ids are generated, never the name -- a rename must not orphan anything.
    out.savedId = storedA[0] && storedA[0].id;
    out.idGenerated = /^hp_/.test(out.savedId || '') && (out.savedId || '').indexOf('Studio') < 0;
    out.optionsAfterSave = optionNames();
    out.listGrew = out.optionsAfterSave.length === out.optionsAtBoot.length + 1;

    // ---- 4. a SECOND preset, distinct, so Apply has something to change to ----------------------
    await commitLine('c4', 'Cut {version} - {episodes} eps');
    document.querySelector('.hdr-preset-save-open').click();
    await T.until(function () { return !!document.querySelector('.hdr-preset-name-input'); }, 'the name field', 40, 100);
    document.querySelector('.hdr-preset-name-input').value = 'With a cut line';
    document.querySelector('[data-hdrpreset="save"]').click();
    await T.sleep(600);
    out.twoSaved = (readPrefs().headerPresets || []).length === 2;

    // ---- 5. ⭐ APPLY: a calendar edit, one undo step, all nine lines ----------------------------
    await mode('Auto');                                   // somewhere clearly different
    out.beforeApplyLabel = (btn().textContent || '').trim();
    await T.sleep(1200);                                  // let the undo debounce settle
    var s2 = sel();
    s2.value = storedA[0].id;                             // "Studio standard"
    document.querySelector('[data-hdrpreset="apply"]').click();
    await T.sleep(900);
    out.afterApplyLabel = (btn().textContent || '').trim();
    out.afterApplyLines = lines();
    // Applying puts the header into Template: the lines resolve rather than showing braces.
    out.applySwitchedMode = out.afterApplyLabel === 'Header: Template';
    out.applyResolved = out.afterApplyLines.l2 === 'v3' && out.afterApplyLines.c1 === 'Test Show S2';
    var undoBtn = document.getElementById('undo-btn');
    undoBtn.click();
    await T.sleep(900);
    out.afterUndoLabel = (btn().textContent || '').trim();
    // ONE step takes the whole apply back -- all nine lines and the mode with them.
    out.applyIsOneUndoStep = out.afterUndoLabel === 'Header: Auto';
    document.getElementById('redo-btn').click();
    await T.sleep(900);

    // ---- 6. ⭐ A PRESET NEVER TRAVELS IN A CALENDAR ---------------------------------------------
    await T.sleep(700);
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var mm = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    var snapText = mm ? mm[1].replace(/\\u003c/g, '<') : '';
    out.snapHasPresetKey = /headerPresets/.test(snapText);
    out.snapHasPresetName = /Studio standard/.test(snapText);
    var snap = null;
    try { snap = JSON.parse(snapText); } catch (e) {}
    out.fieldIdCount = snap && snap.fields && snap.fields.byId ? Object.keys(snap.fields.byId).length : -1;
    // No control in the block may have become a field.
    out.snapHasBlockField = /hdr-preset/.test(snapText);
    out.neverInSnapshot = !out.snapHasPresetKey && !out.snapHasPresetName && !out.snapHasBlockField;
    // The APPLIED header, on the other hand, MUST travel -- that is how a .sptcal renders on a
    // machine that does not own the preset.
    out.snapHeaderTemplates = snap && snap.headerTemplates;
    out.appliedHeaderTravels = out.snapHeaderTemplates === true &&
      !!(snap && snap.headerManual && snap.headerManual.l2 === '{version}');

    // ---- 7. rename keeps the id; delete of the last one removes the key -------------------------
    var rows = document.querySelectorAll('.hdr-preset-row');
    out.rowCount = rows.length;
    var renameBtn = null;
    rows[0].querySelectorAll('.hdr-preset-link').forEach(function (b) {
      if ((b.textContent || '') === 'Rename') renameBtn = b;
    });
    renameBtn.click();
    await T.until(function () { return !!document.querySelector('.hdr-preset-rename-input'); },
                  'the rename field', 40, 100);
    document.querySelector('.hdr-preset-rename-input').value = 'Renamed preset';
    var saveRename = null;
    document.querySelectorAll('.hdr-preset-row .hdr-preset-link').forEach(function (b) {
      if (b.dataset.hdrpreset === 'rename') saveRename = b;
    });
    saveRename.click();
    await T.sleep(500);
    var afterRename = readPrefs().headerPresets || [];
    out.renamedTo = afterRename[0] && afterRename[0].name;
    out.renameKeptId = afterRename[0] && afterRename[0].id === out.savedId;
    out.renameWorked = out.renamedTo === 'Renamed preset' && out.renameKeptId;

    // ---- 7b. ⭐ DELETING THE LAST PRESET REMOVES THE KEY -----------------------------------------
    // Same rule the gridlines preference follows: the store never holds an entry that means nothing,
    // so a later migration can read it without guessing which entries were deliberate. An empty
    // array would be such an entry.
    // ⚠️ Delete goes through uiConfirm(), so the dialog has to be answered. It is the app's own
    // Mantine dialog, not window.confirm -- find its confirm button and press it.
    async function deleteRow(i) {
      var rowsNow = document.querySelectorAll('.hdr-preset-row');
      if (!rowsNow[i]) return false;
      var del = null;
      rowsNow[i].querySelectorAll('.hdr-preset-link').forEach(function (b) {
        if (b.dataset.hdrpreset === 'delete') del = b;
      });
      if (!del) return false;
      del.click();
      await T.sleep(400);
      var confirmBtn = null;
      document.querySelectorAll('button').forEach(function (b) {
        if ((b.textContent || '').trim() === 'Delete' && !b.dataset.hdrpreset) confirmBtn = b;
      });
      if (confirmBtn) confirmBtn.click();
      await T.sleep(500);
      return true;
    }
    out.deletedFirst = await deleteRow(0);
    out.afterOneDelete = (readPrefs().headerPresets || []).length;
    out.deletedSecond = await deleteRow(0);
    var prefsAfter = readPrefs();
    out.keyGoneWhenEmpty = !('headerPresets' in prefsAfter);
    out.prefsAfterDelete = prefsAfter;
    out.rowsAfterDelete = document.querySelectorAll('.hdr-preset-row').length;
    out.optionsAfterDelete = optionNames();
    // Default survives every delete: it is built in, not stored.
    out.defaultSurvives = out.optionsAfterDelete.length === 1 && out.optionsAfterDelete[0] === 'Default';
    out.deleteClean = out.afterOneDelete === 1 && out.keyGoneWhenEmpty && out.defaultSurvives;

    // ---- 8. a preset edit is NOT a calendar edit -------------------------------------------------
    // Saving and renaming above must not have marked the file dirty or pushed an undo step beyond
    // the ONE the apply legitimately made. Measured on the undo button rather than on internals.
    out.undoStillEnabled = !document.getElementById('undo-btn').disabled;

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells();
    out.PASS = out.blockFound && out.insidePrefsCard && out.noIdsInBlock &&
               out.primaryMatchesTab && out.secondaryStaysPlain &&
               out.defaultFirst && out.defaultNotEditable && out.storeEmptyAtBoot &&
               out.manualSaveDisabled && out.manualExplains && out.templateSaveEnabled &&
               out.storesTemplates && out.idGenerated && out.listGrew && out.twoSaved &&
               out.applySwitchedMode && out.applyResolved && out.applyIsOneUndoStep &&
               out.neverInSnapshot && out.appliedHeaderTravels && out.renameWorked &&
               out.deleteClean &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);

    // A helper declared last on purpose: hoisted, and it keeps the flow above readable.
    async function commitLine(hid, text) {
      var el = document.querySelector('#table-wrap .hdr-line[data-hid="' + hid + '"]');
      el.textContent = text;
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await T.sleep(700);
    }
  } catch (e) {
    out.EX = e && (e.message || String(e));
    try { out.health = T.appHealth(); } catch (_) {}
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
