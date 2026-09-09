// hdrexcel -- the Excel header budget, and what happens when a header is genuinely too long.
//
// HEADER-PRESETS-PLAN.md Step 6, gate item 8.
//
// THE PROBLEM THIS GUARDS. Excel rejects a header/footer string over 255 characters IN TOTAL, codes
// included, and it does not fail gracefully: the workbook still writes and still validates as XML,
// but Excel refuses it on open with "We found a problem with some content", which reads to a user as
// a corrupt file rather than a too-long header. A real calendar hit this at exactly 256 characters.
// exportExcel's trimmer therefore drops trailing lines to stay under -- so nothing breaks, and the
// user silently loses lines. Templates make long headers very easy to write, so the Preferences card
// shows the number.
//
// ⭐ WHAT THIS LEG IS REALLY FOR: estimateExcelHeaderLength() is a SECOND COPY of frozen arithmetic
// and it can drift from exportExcel, which is the thing that actually writes the file. So the claim
// under test is not "the estimate is exact" -- it is "a header the estimate calls near the limit
// still produces a workbook Excel accepts, and the trimmer drops the lines it is supposed to drop,
// in the order it is supposed to drop them".
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

    var btn = function () { return document.getElementById('hdr-mode-btn'); };
    var lineEl = function (hid) { return document.querySelector('#table-wrap .hdr-line[data-hid="' + hid + '"]'); };
    var meterText = function () {
      var els = document.querySelectorAll('.hdr-presets .hdr-presets-hint');
      var t = null;
      els.forEach(function (e) { if (/Excel header/.test(e.textContent || '')) t = (e.textContent || '').trim(); });
      return t;
    };
    var meterNumber = function () {
      var t = meterText();
      var m = t && t.match(/about (\d+) of (\d+)/);
      return m ? { total: +m[1], max: +m[2] } : null;
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
      row.click();
      await T.sleep(750);
    }
    async function commit(hid, text) {
      var el = lineEl(hid);
      el.textContent = text;
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await T.sleep(650);
    }
    // Read the workbook's header back out of a real export.
    async function oddHeader() {
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var buf = await xb.arrayBuffer();
      var wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      return { hdr: (wb.worksheets[0].headerFooter || {}).oddHeader || '', buf: buf, size: xb.size };
    }

    // ---- 1. the meter exists, and reads sanely on an ordinary header ---------------------------
    out.meterAtAuto = meterText();
    out.meterShowsNumber = !!meterNumber();
    // A default header is comfortably inside the limit; if this is already near 255 the fixture has
    // drifted and every conclusion below is about a different calendar.
    out.autoTotal = meterNumber() && meterNumber().total;
    out.autoUnderLimit = out.autoTotal > 0 && out.autoTotal < 240;

    // ---- 2. ⭐ AN HONESTLY OVERLONG HEADER -------------------------------------------------------
    // Long LITERAL text, not tokens: the point is the character count, and literals make the
    // expected string predictable so the trimmer's behaviour can be read off it.
    await mode('Template');
    var pad = function (label, n) {
      var s = label + ' ';
      while (s.length < n) s += 'x';
      return s.slice(0, n);
    };
    await commit('r1', pad('RIGHT-ONE', 60));
    await commit('r2', pad('RIGHT-TWO', 60));
    await commit('r3', pad('RIGHT-THREE', 60));
    await commit('c1', pad('CENTRE-ONE', 60));
    await commit('c2', pad('CENTRE-TWO', 60));
    await commit('c3', pad('CENTRE-THREE', 60));
    await T.sleep(500);
    var overMeter = meterNumber();
    out.overTotal = overMeter && overMeter.total;
    out.estimatorSaysOver = !!overMeter && overMeter.total >= 250;
    out.meterWarns = /too long/.test(meterText() || '');

    // ---- 3. ⭐ THE WORKBOOK IS STILL VALID, AND UNDER THE CAP ------------------------------------
    await T.sleep(900);
    var res = await oddHeader();
    out.xlsxLen = res.size;
    out.oddHeaderLen = res.hdr.length;
    out.oddHeaderUnderCap = res.hdr.length <= 255;
    // Handed to gate.sh so check-xlsx.sh -- which rejects a workbook the way Excel does, not the way
    // a parser does -- can be run on the real file.
    out.xlsx = T.b64(res.buf);

    // ---- 4. ⭐ THE TRIMMER DROPS THE RIGHT LINES, IN THE RIGHT ORDER -----------------------------
    // exportExcel gives up trailing DETAIL lines first: the right-hand stats before the centre's
    // subtitles, and a section's FIRST line is never dropped -- so the date, the title and the
    // headline stat always survive. Read that off the header string rather than trusting it.
    var sections = {};
    String(res.hdr).replace(/&([LCR])((?:(?!&[LCR])[\s\S])*)/g, function (_, k, v) { sections[k] = v; return ''; });
    var strip = function (sec) {
      return String(sec || '').replace(/&(?:"[^"]*"|K[0-9A-Fa-f]{6}|\d{1,3}(?=&")|[A-Z])/g, '');
    };
    var countLines = function (sec) {
      var t = strip(sec);
      return t ? t.split('\n').length : 0;
    };
    out.sectionLines = { L: countLines(sections.L), C: countLines(sections.C), R: countLines(sections.R) };
    out.centreText = strip(sections.C);
    out.rightText = strip(sections.R);
    // Something was dropped -- we asked for 3 centre + 3 right and cannot have kept them all.
    out.somethingDropped = (out.sectionLines.C + out.sectionLines.R) < 6;
    // Every section that had content keeps at least its first line.
    out.firstLinesKept = out.sectionLines.L >= 1 && out.sectionLines.C >= 1 && out.sectionLines.R >= 1;
    // The RIGHT section gives up its detail before the CENTRE gives up any -- the documented order.
    out.rightGivesUpFirst = out.sectionLines.R <= out.sectionLines.C;
    // And the survivors are the LEADING lines of each section, never a middle one.
    out.centreKeepsLead = out.centreText.indexOf('CENTRE-ONE') === 0;
    out.rightKeepsLead = out.rightText.indexOf('RIGHT-ONE') === 0;
    out.trimOrderIntact = out.somethingDropped && out.firstLinesKept &&
                          out.rightGivesUpFirst && out.centreKeepsLead && out.rightKeepsLead;

    // ---- 5. the estimate is in the right neighbourhood -------------------------------------------
    // ⚠️ NOT an equality. The estimate is of the UNTRIMMED header; the workbook carries the TRIMMED
    // one, so the two are different numbers by design. What must hold is that the estimate saw the
    // problem: it must exceed the cap when the real assembly did too.
    out.estimateExceededCap = out.overTotal > 255;
    out.realHeaderWasTrimmed = out.oddHeaderLen <= 255 && out.somethingDropped;
    out.estimateAgreesDirectionally = out.estimateExceededCap && out.realHeaderWasTrimmed;

    out.errors = (window.__ERR || []).slice(0, 6);
    out.clipped = T.clippedCells();
    out.PASS = out.meterShowsNumber && out.autoUnderLimit &&
               out.estimatorSaysOver && out.meterWarns &&
               out.oddHeaderUnderCap && out.trimOrderIntact && out.estimateAgreesDirectionally &&
               out.errors.length === 0 && !(out.clipped && out.clipped.h && out.clipped.h.length);
  } catch (e) {
    out.EX = e && (e.message || String(e));
    try { out.health = T.appHealth(); } catch (_) {}
  }
  document.getElementById('R').textContent = JSON.stringify(out, null, 1);
})(); });
