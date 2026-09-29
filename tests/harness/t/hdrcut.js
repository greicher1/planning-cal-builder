// hdrcut -- batch 3, step 3.2 (FIX-PLAN §5; audit M-9): Excel's header trimmer never cuts through a
// formatting code. A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=hdr-cut ./run.sh hdrcut 150
//
// Excel caps a header string at 255 characters IN TOTAL, codes included, and exportExcel trims to fit:
// first it drops trailing detail lines, then it shortens the longest line with "…". But once lines
// carry formatting, each one is `&<size>&"Calibri,<style>"&K<hex>` + its text, and the trimmer worked
// on those joined strings -- the left section is even pre-joined with "\n" -- so the shave could slice
// a code in half (the audit measured `unterminated &"font" at 59`), or shave the date away. The fix
// keeps {code, text} per line until assembly, shaves only text, and drops a line whose text reaches
// zero. hdr-cut.sptcal is a Manual header with five formatted lines, about 100 characters over.
//
// Read back through the page's own ExcelJS (the same library that wrote it), from the real export:
//   H1  the header is at most 255 characters
//   H2  every section line is a WHOLE code (or none) followed by plain text -- no half code anywhere
//   H3  the first line of every section survives: the date, the title and the headline stat
//   H4  every surviving line's code is exactly the code its own format produces
//   H5  ⭐ owner ruling (29 Sep 2026): DETAIL lines go first, the left block's too, so on hdr-cut the
//       header keeps exactly the date, the title and the headline stat, whole
//   M1  the budget meter's sentence says what the export actually did (its estimate mirrors the trim)
// ⚠️ hdr-cut's header is NINE lines, not the five its headerManual lists: Manual mode keeps the auto
// defaults for the lines it leaves blank (l2 = the version "v3", c3, r2, r3). That is where the
// meter's "about 541" comes from, so the line count is read from the header the screen draws.
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'hdrcut', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  function settle(label) {
    var last = -1, st = 0;
    return T.until(function () {
      var n = (document.getElementById('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 5;
    }, label, 200, 100);
  }
  // The line codes exportExcel writes: &<size>&"Calibri,<style>"&K<RRGGBB>.
  var CODE = /^&\d{1,3}&"Calibri,(Regular|Bold|Italic|Bold Italic)"&K[0-9A-F]{6}/;
  function sections(h) {
    // &L / &C / &R, each opened by the HSIZE prefix &B&12&"Calibri,Bold".
    var out = {}, re = /&([LCR])&B&12&"Calibri,Bold"/g, m, marks = [];
    while ((m = re.exec(h))) marks.push({ k: m[1], at: m.index, body: m.index + m[0].length });
    marks.forEach(function (mk, i) { out[mk.k] = h.slice(mk.body, i + 1 < marks.length ? marks[i + 1].at : h.length).split('\n'); });
    return out;
  }
  try {
    await T.appReady();
    await settle('the restored calendar to settle');
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table'); }, 'the waterfall', 200, 100);
    await settle('the waterfall to settle');

    // The meter, as the user sees it (the Headers card), and every line the screen's header draws.
    var meterEl = document.querySelector('.hdr-presets-budget');
    out.meter = meterEl ? (meterEl.textContent || '').trim() : null;
    out.screenLines = Array.from(document.querySelectorAll('#table-wrap .cal-header-bar .hdr-line[data-hid]'))
      .map(function (el) { return { id: el.getAttribute('data-hid'), text: (el.textContent || '').trim() }; })
      .filter(function (x) { return x.text; });

    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    var blob = await T.captureExport('export-btn', 'the .xlsx blob');
    var buf = await blob.arrayBuffer();
    out.xlsxB64 = T.b64(buf);
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    var h = String((wb.worksheets[0].headerFooter || {}).oddHeader || '');
    out.header = h;
    out.length = h.length;
    var secs = sections(h);
    out.sections = secs;

    kase('H1', 'the header is at most 255 characters (Excel refuses the file past that)', h.length > 0 && h.length <= 255, { length: h.length });
    var bad = [];
    ['L', 'C', 'R'].forEach(function (k) {
      (secs[k] || []).forEach(function (ln) {
        var rest = ln.replace(CODE, '');
        if (rest.indexOf('&') >= 0 || (ln.charAt(0) === '&' && !CODE.test(ln))) bad.push(k + ': ' + ln);
      });
    });
    kase('H2', 'every line is a WHOLE code followed by plain text -- no code is cut in half', bad.length === 0 && !!secs.L, { broken: bad });
    function text(ln) { return String(ln || '').replace(CODE, ''); }
    var first = { L: text((secs.L || [])[0]), C: text((secs.C || [])[0]), R: text((secs.R || [])[0]) };
    kase('H3', 'the first line of each section survives: the date, the title, the headline stat',
         /^9\.24\.26/.test(first.L) && /^The Midnight/.test(first.C) && /^16-Week/.test(first.R), { first: first });
    // H4: the code on each surviving line is the one its format produces. Left: left (bold, #C00000),
    // then l3 (italic); centre: c1 (14, bold, #0070C0), then c2 (italic); right: r1 (regular, #00B050).
    // Unformatted lines in a formatted section carry the default code: 12, bold, black.
    var EXPECT = { L: ['&12&"Calibri,Bold"&KC00000', '&12&"Calibri,Bold"&K000000', '&12&"Calibri,Bold Italic"&K000000'],
                   C: ['&14&"Calibri,Bold"&K0070C0', '&12&"Calibri,Bold Italic"&K000000', '&12&"Calibri,Bold"&K000000'],
                   R: ['&12&"Calibri,Regular"&K00B050', '&12&"Calibri,Bold"&K000000', '&12&"Calibri,Bold"&K000000'] };
    var wrong = [];
    ['L', 'C', 'R'].forEach(function (k) {
      (secs[k] || []).forEach(function (ln, i) {
        var m = ln.match(CODE);
        if (!m || m[0] !== EXPECT[k][i]) wrong.push(k + i + ': ' + (m ? m[0] : ln.slice(0, 40)));
      });
    });
    kase('H4', "every surviving line carries exactly its own format's code", wrong.length === 0, { wrong: wrong });
    var texts = { L: (secs.L || []).map(text), C: (secs.C || []).map(text), R: (secs.R || []).map(text) };
    kase('H5', 'detail lines went first, the left block\'s too: exactly the date, the title and the headline stat remain, whole',
         JSON.stringify(texts) === JSON.stringify({ L: ['9.24.26'], C: ['The Midnight Garden: A Limited Series'],
                                                    R: ['16-Week Production Span / 8-Day Shooting Schedule'] }), { texts: texts });
    // M1: the meter mirrors the trim. It must say the header is over, and name what the export did.
    var total = out.screenLines.length;
    var kept = (secs.L || []).length + (secs.C || []).length + (secs.R || []).length;
    var shortened = ['L', 'C', 'R'].reduce(function (n, k) { return n + (secs[k] || []).filter(function (ln) { return /…/.test(ln); }).length; }, 0);
    out.outcome = { lines: total, kept: kept, dropped: total - kept, shortened: shortened };
    var mm = (out.meter || '').match(/drops? (\d+) lines?/), ms = (out.meter || '').match(/shortens? (\d+)/);
    kase('M1', "the budget meter's sentence names what the export actually did (lines dropped, lines shortened)",
         total === 9 && !!out.meter && /too long/.test(out.meter) && !!mm && +mm[1] === total - kept &&
         (shortened === 0 ? !ms : (!!ms && +ms[1] === shortened)),
         { meter: out.meter, outcome: out.outcome });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'hdrcut threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
