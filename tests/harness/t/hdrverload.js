// hdrverload -- a version number RESTORED from a saved calendar, with nobody typing anything.
//
// The companion to `hdrversion`, which types into the field. This one never touches it: the
// calendar arrives through the app's own restore path and the header has to be right on the first
// paint. `show-version`'s DOM id is part of the save-file format the moment it ships (CLAUDE.md,
// "fields.byId is keyed by DOM element id"), and this is the leg that says so.
//
// ⭐ SELF-CHECKING, so the same leg proves both directions. It reads the fixture's own snapshot out
// of #saved-state and asserts the app agrees with it:
//
//   * a fixture that CARRIES a version  -> the field holds it and l2 renders "v" + it;
//   * a fixture that carries NONE (every fixture written before this feature, which is all of them)
//     -> the field is EMPTY and the l2 slot is hidden, exactly as that calendar has always rendered.
//
// The second case is the one that matters for the rule in CLAUDE.md: a key the snapshot does not
// have must fall back to the DEFAULT, never to whatever is in memory. applyStateSnapshot() replays
// the SNAPSHOT's keys, so a field the snapshot never mentions would otherwise keep the previously
// open calendar's value -- which for a version number means printing someone else's v3 on this
// show's header. The guard that prevents it sits just above step 3 of applyStateSnapshot().
//
// ⚠️ ONE THING THIS LEG CANNOT PROVE, stated rather than left implied: the STALE case needs two
// files opened in sequence, and the second open has to go through the real picker -- the path that
// stalls on IndexedDB in headless Chrome (see the README's fresh-profile note, and the `restore`
// leg, which fails for exactly that reason). What is proved here is that a version-less snapshot
// restores to empty. The two-file case is proved by inspection of the guard, not by this harness.
//
// ⚠️ Run with a fixture and against the BUILD:
//     HARNESS_PAGE=/dist/index.html HARNESS_STATE=hdrversion  ./run.sh hdrverload 60
//     HARNESS_PAGE=/dist/index.html HARNESS_STATE=colswap-2col ./run.sh hdrverload 60
// srv.js substitutes tests/fixtures/<name>.sptcal into the page's own <script id="saved-state">
// block, so restoreSavedState() -> applyStateSnapshot() runs on load with no picker and no
// IndexedDB. Without HARNESS_STATE this leg has nothing to assert and says so.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {};
  try {
    // The fixture, as the page received it. Read from the DOM rather than re-fetched, so the
    // expectation and the app are looking at the same bytes.
    var stateEl = document.getElementById('saved-state');
    var raw = stateEl ? (stateEl.textContent || '').trim() : '';
    out.stateBytes = raw.length;
    var fixture = null;
    try { fixture = JSON.parse(raw); } catch (e) { out.stateParseErr = String(e.message); }
    out.stateApplied = !!(fixture && typeof fixture === 'object');
    if (!out.stateApplied) throw new Error('no saved state on the page -- run with HARNESS_STATE=<fixture>');

    var byId = (fixture.fields && fixture.fields.byId) || {};
    out.fixtureFieldIds = Object.keys(byId).length;
    out.fixtureHasKey = 'show-version' in byId;
    var fixtureValue = out.fixtureHasKey ? String(byId['show-version'].value || '') : '';
    out.fixtureVersion = fixtureValue;
    // versionLabel()'s rule, restated here on purpose: the leg must not import the app's own answer,
    // or a broken versionLabel would agree with itself. Owner decision H1 -- "v" plus the input with
    // a single leading v/V stripped, and an empty field is EMPTY, never a bare "v".
    var stripped = fixtureValue.trim().replace(/^[vV]/, '').trim();
    out.expectedLabel = stripped ? 'v' + stripped : '';

    await T.until(function () {
      return document.querySelectorAll('table.sheet-table tbody tr').length > 1;
    }, 'the restored grid to render', 200, 100);
    var last = -1, stable = 0;
    await T.until(function () {
      var n = document.querySelectorAll('table.sheet-table tbody tr').length;
      stable = (n === last) ? stable + 1 : 0; last = n; return stable >= 5;
    }, 'the row count to settle', 150, 100);
    out.health = T.appHealth();

    // ---- the field came back --------------------------------------------------------------------
    var el = document.getElementById('show-version');
    out.fieldFound = !!el;
    if (!el) throw new Error('no #show-version -- is this the BUILD? run.sh defaults to /index.html');
    out.fieldValue = String(el.value || '');
    out.fieldRestored = out.fieldValue === fixtureValue;

    // ---- and the header agrees with it ----------------------------------------------------------
    var line = document.querySelector('#table-wrap .hdr-line[data-hid="l2"]');
    out.l2Found = !!line;
    out.l2Text = line ? (line.textContent || '').trim() : null;
    out.l2Empty = line ? /\bhdr-empty\b/.test(line.className) : null;
    out.l2Visible = line ? (!!line.offsetParent && getComputedStyle(line).display !== 'none') : null;
    out.headerMatches = out.l2Text === out.expectedLabel;
    // An empty slot must be hidden and a filled one shown -- the text alone would not catch a
    // visible empty line, which is what .hdr-line.hdr-slot.hdr-empty exists to prevent.
    out.visibilityMatches = out.expectedLabel ? (out.l2Visible === true && out.l2Empty === false)
                                              : (out.l2Visible === false && out.l2Empty === true);

    // ---- the exports agree too, straight off the restore ----------------------------------------
    // Excel writes one header string with &L/&C/&R sections; the version is the second line of &L.
    // Split on the section codes only: &B, &12, &K… and &"Calibri,Bold" all begin with & and none
    // of them is &L/&C/&R.
    var d = new Date();
    var todayStr = (d.getMonth() + 1) + '.' + d.getDate() + '.' + String(d.getFullYear()).slice(2);
    out.todayStr = todayStr;
    var xb = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await xb.arrayBuffer());
    var hdr = (wb.worksheets[0].headerFooter || {}).oddHeader || '';
    var sections = {};
    String(hdr).replace(/&([LCR])((?:(?!&[LCR])[\s\S])*)/g, function (_, k, v) { sections[k] = v; return ''; });
    // ⚠️ The digit bound matters: a plain /&\d+/ is greedy and, once the font code is gone, eats
    // the first digit of the date out of `&12&"Calibri,Bold"9.8.26` -- the same misparse the
    // engine's HSIZE comment warns Excel makes. A size code here is always followed by a font-name
    // code, so anchor on that and strip in one left-to-right pass.
    out.excelL = String(sections.L || '').replace(/&(?:"[^"]*"|K[0-9A-Fa-f]{6}|\d{1,3}(?=&")|[A-Z])/g, '');
    out.excelMatches = out.excelL === (out.expectedLabel ? todayStr + '\n' + out.expectedLabel : todayStr);

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells();
    out.PASS = out.stateApplied && out.fieldFound && out.fieldRestored &&
               out.l2Found && out.headerMatches && out.visibilityMatches && out.excelMatches &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
    try { out.health = T.appHealth(); } catch (_) {}
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
