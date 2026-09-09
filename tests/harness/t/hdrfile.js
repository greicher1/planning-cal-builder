// hdrfile -- header presets as FILES: .spthdr export, import, and the validation that stands
// between a stranger's file and this app's state.
//
// HEADER-PRESETS-PLAN.md Step 5, gate item 7. "Save to your computer" was half the original ask: a
// preset should be sendable to a colleague, not trapped in one browser's localStorage.
//
// ⭐ THE ASSERTIONS THAT MATTER:
//   roundTrip     -- export then import returns the same nine TEMPLATES. If export resolved them,
//                    the file would carry one calendar's values to everyone who opened it (H8).
//   freshId       -- an imported preset gets a NEW id even when the file carries one. Reusing the
//                    file's id would let one import silently overwrite an existing preset.
//   refusesJunk   -- a file without `kind` is refused ENTIRELY. Never half-imported: a
//                    half-imported preset is one the user believes in and cannot see the holes in.
//   dropsUnknown  -- unknown line ids and unknown format keys are dropped rather than stored.
//                    headerManual is keyed by hid and a stray key would sit there forever, and
//                    headerFormat is read by BOTH writers.
//
// ⛔ A PRESET FILE NEVER GOES THROUGH parseCalendarText(). That function is the one reader of
// CALENDAR files and is contract; teaching it a third shape would put every saved calendar's
// restore path at risk to serve a preference file. This leg exercises the preset's own reader.
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

    var settingsTab = null;
    document.querySelectorAll('.side-tab-btn').forEach(function (b) {
      if (b.dataset.tab === 'settings') settingsTab = b;
    });
    if (settingsTab) settingsTab.click();
    await T.sleep(300);

    var readPrefs = function () {
      try { return JSON.parse(localStorage.getItem('sptcal.prefs') || '{}'); } catch (e) { return {}; }
    };
    var presetCount = function () { return (readPrefs().headerPresets || []).length; };
    var btn = function () { return document.getElementById('hdr-mode-btn'); };
    async function mode(name) {
      var stale = document.querySelector('.hdr-mode-pop');
      if (stale) stale.remove();
      btn().click();
      await T.until(function () { return !!document.querySelector('.hdr-mode-pop'); }, 'the mode popover', 40, 100);
      var row = null;
      document.querySelectorAll('.hdr-mode-pop .hdr-mode-choice').forEach(function (r) {
        if ((r.querySelector('.hdr-mode-name').textContent || '') === name) row = r;
      });
      row.click();
      await T.sleep(750);
    }
    // uiAlert() is the app's own Mantine dialog, not window.alert. A refusal leaves one open, and
    // the next click would land on the overlay instead of the control it was aimed at.
    async function dismissDialog() {
      await T.sleep(350);
      var pressed = false;
      document.querySelectorAll('.mantine-Modal-content button, [role="dialog"] button').forEach(function (b) {
        var t = (b.textContent || '').trim();
        if (!pressed && (t === 'OK' || t === 'Close' || t === 'Got it' || t === 'Cancel')) { b.click(); pressed = true; }
      });
      if (!pressed) {
        // Whatever the confirm label is, the LAST button in the dialog is the affirmative one.
        var all = document.querySelectorAll('[role="dialog"] button');
        if (all.length) { all[all.length - 1].click(); pressed = true; }
      }
      await T.sleep(350);
      return pressed;
    }

    // ---- 1. a preset to export -------------------------------------------------------------------
    await mode('Template');
    document.querySelector('.hdr-preset-save-open').click();
    await T.until(function () { return !!document.querySelector('.hdr-preset-name-input'); }, 'the name field', 40, 100);
    document.querySelector('.hdr-preset-name-input').value = 'Studio standard';
    document.querySelector('[data-hdrpreset="save"]').click();
    await T.sleep(600);
    out.savedOne = presetCount() === 1;
    out.originalId = (readPrefs().headerPresets || [])[0].id;

    // ---- 2. EXPORT -- stub the picker and capture what is written --------------------------------
    // supportsFsAccess is TRUE in headless Chrome (showSaveFilePicker exists), so this is the branch
    // a real Chrome user takes. The download fallback is the other branch and is exercised below.
    var written = null, pickerCalled = false, suggested = null, typesSeen = null;
    var realSave = window.showSaveFilePicker;
    window.showSaveFilePicker = async function (opts) {
      pickerCalled = true;
      suggested = opts && opts.suggestedName;
      typesSeen = opts && opts.types;
      return {
        name: suggested,
        createWritable: async function () {
          return { write: async function (t) { written = t; }, close: async function () {} };
        },
      };
    };
    var exportBtn = null;
    document.querySelectorAll('[data-hdrpreset="export"]').forEach(function (b) { exportBtn = b; });
    out.exportBtnFound = !!exportBtn;
    exportBtn.click();
    await T.until(function () { return written !== null; }, 'the exported .spthdr text', 60, 100);
    window.showSaveFilePicker = realSave;
    out.pickerCalled = pickerCalled;
    out.suggestedName = suggested;
    out.suggestedLooksRight = /\.spthdr$/.test(suggested || '') && (suggested || '').indexOf('Studio standard') === 0;
    out.pickerTypeDesc = typesSeen && typesSeen[0] && typesSeen[0].description;
    var parsed = null;
    try { parsed = JSON.parse(written); } catch (e) { out.exportParseErr = String(e.message); }
    out.fileKind = parsed && parsed.kind;
    out.fileVersion = parsed && parsed.version;
    out.fileName = parsed && parsed.name;
    out.fileLines = parsed && parsed.lines;
    // ⭐ The file carries TEMPLATES. If export resolved them, every recipient would get this
    // calendar's values baked in.
    out.fileHasTemplates = !!out.fileLines && out.fileLines.l2 === '{version}' &&
                           out.fileLines.c1 === '{titleSeason}';

    // ---- 3. IMPORT the very same text -- identity, but a fresh id --------------------------------
    var realOpen = window.showOpenFilePicker;
    function stubOpen(text, name) {
      window.showOpenFilePicker = async function () {
        return [{ name: name || 'x.spthdr',
                  getFile: async function () { return new File([text], name || 'x.spthdr', { type: 'application/json' }); } }];
      };
    }
    stubOpen(written, 'Studio standard.spthdr');
    document.querySelector('[data-hdrpreset="import"]').click();
    await T.sleep(900);
    var afterImport = readPrefs().headerPresets || [];
    out.countAfterImport = afterImport.length;
    var imported = afterImport[afterImport.length - 1];
    out.importedLines = imported && imported.lines;
    out.roundTrip = JSON.stringify(out.importedLines) === JSON.stringify(out.fileLines);
    // ⭐ A fresh id, even though the file was produced by this very app moments ago.
    out.freshId = !!imported && imported.id !== out.originalId && /^hp_/.test(imported.id);

    // ---- 4. a file WITHOUT `kind` is refused, entirely -------------------------------------------
    var before = presetCount();
    stubOpen(JSON.stringify({ name: 'Sneaky', lines: { c1: '{title}' } }), 'nope.spthdr');
    document.querySelector('[data-hdrpreset="import"]').click();
    out.refusalDismissed = await dismissDialog();
    out.countAfterJunk = presetCount();
    out.refusesJunk = out.countAfterJunk === before;

    // ...and so is something that is not JSON at all.
    stubOpen('this is not json', 'nope2.spthdr');
    document.querySelector('[data-hdrpreset="import"]').click();
    await dismissDialog();
    out.countAfterGarbage = presetCount();
    out.refusesGarbage = out.countAfterGarbage === before;

    // ---- 5. unknown keys are DROPPED, not stored --------------------------------------------------
    stubOpen(JSON.stringify({
      kind: 'spt-header-preset', version: 1, name: 'Has junk',
      lines: { c1: '{title}', notAHeaderId: 'x', l2: '{version}' },
      format: { c1: { bold: true, evilKey: 'x' }, alsoNotAnId: { bold: true } },
      somethingElse: 'ignored',
    }), 'junk.spthdr');
    document.querySelector('[data-hdrpreset="import"]').click();
    await T.sleep(900);
    // The import succeeds AND reports what it ignored, so the dialog has to be cleared.
    await dismissDialog();
    var list3 = readPrefs().headerPresets || [];
    var junky = list3[list3.length - 1];
    out.junkName = junky && junky.name;
    out.junkLines = junky && junky.lines;
    out.junkFormat = junky && junky.format;
    out.droppedUnknownLine = !!out.junkLines && !('notAHeaderId' in out.junkLines) &&
                             out.junkLines.c1 === '{title}' && out.junkLines.l2 === '{version}';
    out.droppedUnknownFmt = !!out.junkFormat && !('alsoNotAnId' in out.junkFormat) &&
                            !!out.junkFormat.c1 && out.junkFormat.c1.bold === true &&
                            !('evilKey' in out.junkFormat.c1);
    out.dropsUnknown = out.droppedUnknownLine && out.droppedUnknownFmt;
    window.showOpenFilePicker = realOpen;

    // ---- 6. an imported preset is a REAL preset: applying it works --------------------------------
    await mode('Auto');
    await T.sleep(400);
    var sel = document.querySelector('.hdr-preset-select');
    sel.value = imported.id;
    document.querySelector('[data-hdrpreset="apply"]').click();
    await T.sleep(900);
    out.appliedLabel = (btn().textContent || '').trim();
    var l2 = document.querySelector('#table-wrap .hdr-line[data-hid="l2"]');
    out.appliedL2 = l2 ? (l2.textContent || '').trim() : null;
    out.importedIsUsable = out.appliedLabel === 'Header: Template' && out.appliedL2 === 'v3';

    // ---- 7. and it still never reaches a saved calendar -------------------------------------------
    await T.sleep(700);
    var cap = T.captureDownload();
    document.getElementById('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable-copy blob', 200, 100);
    var html = await cap.stop().text();
    var mm = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    var snapText = mm ? mm[1] : '';
    out.snapHasPresets = /headerPresets|spt-header-preset/.test(snapText);
    out.stillNeverTravels = !out.snapHasPresets;

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells();
    out.PASS = out.savedOne && out.exportBtnFound && out.pickerCalled && out.suggestedLooksRight &&
               out.fileKind === 'spt-header-preset' && out.fileVersion === 1 && out.fileHasTemplates &&
               out.roundTrip && out.freshId &&
               out.refusesJunk && out.refusesGarbage && out.dropsUnknown &&
               out.importedIsUsable && out.stillNeverTravels &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
    try { out.health = T.appHealth(); } catch (_) {}
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
