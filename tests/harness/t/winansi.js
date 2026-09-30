// winansi -- batch 4, step 4.8 (FIX-PLAN §6; audit L-6): before the waterfall PDF is written, the
// app names every character it will print as "?". A gate.sh audit-fix leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh winansi 150
//
// The direct writer embeds Carlito subsetted to exactly what WinAnsiEncoding can address (ASCII,
// Latin-1 and the 0x80-0x9F smart-punctuation band), and frozen pdfEscape() writes "?" for anything
// else. A CJK title, an arrow or an emoji came out of the distributed PDF as "?", with no word, while
// the screen, Excel and the month PDF kept it. FIX-PLAN's default: warn and list the characters; no
// font rework. The fix walks the strings the writer draws, through the writer's own helpers, and
// asks frozen pdfEscape() for each character's verdict (sanctioned pattern 2).
//
// The calendar is synthetic and built through the real UI, region None: 4 episodes x 5 days from
// 7/6/26, and a custom phase from 7/20 for 5 weeks.
//   W0  truth guard (both builds): WinAnsi-only text -- a note "Café – “quoted” … €5" -- exports
//       with NO dialog, and its PDF run has no "?" in it
// Then characters outside WinAnsi go into each kind of text the writer draws: the show title
// ("Charset 日本"), a note on 7/13/26 ("Wrap → ✓"), the custom phase's name ("Łódź Unit") and a
// one-week hiatus from 8/10/26 named "Break 🎄".
//   W1  Export Waterfall to PDF opens a dialog, and no file is written yet. It lists each place with
//       its characters: the header, the 7/13/26 note, the phase "Łódź Unit" and the 8/10/26 hiatus
//   W2  Cancel writes nothing
//   W3  Export anyway writes the PDF, and the PDF really does print "?" where the dialog said
//   W4  the list names exactly those seven characters -- never é – “ ” … € or ó, which print fine
//   W5  Export to Excel shows no dialog, and the workbook keeps "Wrap → ✓" and "Charset 日本 S1"
//   E0  0 console errors
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'winansi', cases: [] };
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
  // The PDF's drawn strings, octal escapes decoded to their byte (so "?" is a real 0x3F).
  async function pdfRuns(blob) {
    var bytes = new Uint8Array(await blob.arrayBuffer()), s = '';
    for (var i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m, txt = '';
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (bytes[en - 1] === 10 || bytes[en - 1] === 13)) en--;   // DecompressionStream rejects trailing bytes
      try {
        var ds = new Blob([bytes.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        var t = await new Response(ds).text();
        if (t.indexOf(' Tj') >= 0) txt += t + '\n';
      } catch (e) { /* not a Flate stream */ }
    }
    var runs = [], rr = /\(((?:\\.|[^\\)])*)\) Tj/g, mm;
    while ((mm = rr.exec(txt))) {
      runs.push({ raw: mm[1], text: mm[1].replace(/\\([0-7]{3})/g, function (a, o) { return String.fromCharCode(parseInt(o, 8)); })
                                          .replace(/\\(.)/g, function (a, ch) { return ch; }) });
    }
    return runs;
  }
  // Click Export Waterfall to PDF and report what happened: a dialog, a file, or both.
  async function clickPdf(cap) {
    await T.sleep(800);                                   // clear the button's 600 ms re-click guard
    document.getElementById('export-wf-pdf-btn').click();
    var dialog = '', blob = null;
    for (var i = 0; i < 40; i++) {
      await T.sleep(100);
      dialog = T.modalText();
      blob = cap.peek();
      if (dialog || blob) break;
    }
    return { dialog: dialog, blob: blob };
  }
  // ⚠️ NOT T.modalText(): it collapses whitespace, and the list's lines are separated by the
  // newlines the dialog renders with pre-line. Read the modal's own innerText instead.
  function rawModal() {
    return Array.from(document.querySelectorAll('.mantine-Modal-content'))
      .map(function (d) { return d.innerText || ''; }).join('\n');
  }
  function bullets(text) {
    return String(text || '').split('\n').map(function (l) { return l.trim(); })
      .filter(function (l) { return l.indexOf('• ') === 0; });
  }
  try {
    await T.appReady();
    T.set('show-title', 'Charset Test');
    T.set('season-num', '1');
    T.set('num-episodes', '4');
    T.set('shoot-days-per-ep', '5');
    T.set('union-place', '');
    T.set('start-production', '2026-07-06');
    document.getElementById('add-phase-btn').click();
    await T.until(function () { return !!document.getElementById('name-custom1'); }, 'the custom phase row', 60, 100);
    T.set('name-custom1', 'Crew Unit');
    T.set('start-custom1', '2026-07-20');
    T.set('weeks-custom1', '5');
    document.getElementById('view-sheet-btn').click();
    await T.until(function () { return !!document.querySelector('#table-wrap table.sheet-table'); }, 'the waterfall', 200, 100);
    await settle('the calendar to settle');

    // W0 -- WinAnsi-only text exports with no dialog, and prints with no "?".
    await T.typeUserNote('2026-07-06', 'Café – “quoted” … €5');
    await settle('the WinAnsi note to settle');
    var cap0 = T.captureDownload();
    var r0 = await clickPdf(cap0);
    if (r0.dialog) { T.clickModalButton('Cancel'); await T.sleep(300); }
    if (!r0.blob) { await T.until(function () { return !!cap0.peek(); }, 'the W0 PDF', 100, 100).catch(function () {}); r0.blob = cap0.peek(); }
    cap0.stop();
    var runs0 = r0.blob ? await pdfRuns(r0.blob) : [];
    var noteRun0 = runs0.filter(function (r) { return r.text.indexOf('quoted') >= 0; })[0];
    kase('W0', 'truth guard: WinAnsi-only text (é – “ ” … €) exports with no dialog and no "?"',
         !r0.dialog && !!r0.blob && !!noteRun0 && noteRun0.text.indexOf('?') < 0,
         { dialog: r0.dialog.slice(0, 200), wrote: !!r0.blob, noteRun: noteRun0 ? noteRun0.raw : null });

    // Characters outside WinAnsi, in each kind of text the writer draws.
    T.set('show-title', 'Charset 日本');
    await T.typeUserNote('2026-07-13', 'Wrap → ✓');
    T.set('name-custom1', 'Łódź Unit');
    T.addHiatus('2026-08-10', 1);
    var rows = document.querySelectorAll('#hiatus-list .hiatus-entry');
    var nm = rows[rows.length - 1].querySelector('.hiatus-name');
    nm.value = 'Break 🎄';
    ['input', 'change'].forEach(function (t) { nm.dispatchEvent(new Event(t, { bubbles: true })); });
    await settle('the non-WinAnsi calendar to settle');
    out.screen = {
      c1: ((document.querySelector('#table-wrap .hdr-line[data-hid="c1"]') || {}).textContent || '').trim(),
      note: ((document.querySelector('#table-wrap td.sheet-note-cell[data-week="2026-07-13"]') || {}).textContent || '').trim(),
      band: Array.from(document.querySelectorAll('#table-wrap td.sheet-hiatus-cell')).map(function (td) { return (td.textContent || '').trim(); })
    };

    // W1 / W2 -- a dialog lists the places, nothing is written yet, and Cancel writes nothing.
    var cap1 = T.captureDownload();
    var r1 = await clickPdf(cap1);
    out.dialog1 = rawModal();
    var b1 = bullets(out.dialog1);
    out.bullets = b1;
    function hasLine(chars, where) {
      return b1.some(function (l) { return chars.every(function (c) { return l.indexOf(c) >= 0; }) && l.indexOf(where) >= 0; });
    }
    var placesOk = hasLine(['日', '本'], 'in the header') && hasLine(['→', '✓'], 'note for the week of 7/13/26') &&
                   hasLine(['Ł', 'ź'], 'Łódź Unit') && hasLine(['🎄'], '8/10/26');
    kase('W1', 'Export Waterfall to PDF names each place and its characters first, and writes nothing yet',
         !!r1.dialog && r1.dialog.indexOf('won’t print') >= 0 && !r1.blob && b1.length === 4 && placesOk,
         { wrote: !!r1.blob, bullets: b1, dialog: r1.dialog.slice(0, 400) });
    var cancelled = r1.dialog ? T.clickModalButton('Cancel') : false;
    await T.sleep(1500);
    kase('W2', 'Cancel writes no PDF', cancelled && !cap1.peek() && !T.modalText(), { clickedCancel: cancelled, wrote: !!cap1.peek() });
    cap1.stop();

    // W3 -- Export anyway writes it, and the PDF prints "?" exactly where the dialog said.
    var cap3 = T.captureDownload();
    var r3 = await clickPdf(cap3);
    var anyway = r3.dialog ? T.clickModalButton('Export anyway') : false;
    if (!r3.blob) { await T.until(function () { return !!cap3.peek(); }, 'the W3 PDF', 100, 100).catch(function () {}); }
    var blob3 = cap3.peek();
    cap3.stop();
    var runs3 = blob3 ? await pdfRuns(blob3) : [];
    function run(prefix) { var x = runs3.filter(function (r) { return r.text.indexOf(prefix) === 0; })[0]; return x ? x.text : null; }
    out.pdf = { title: run('Charset'), note: run('Wrap'), phase: run('?ód? Unit') || run('Ł'), hiatus: run('Break') };
    kase('W3', 'Export anyway writes the PDF, and it prints "?" where the dialog said',
         !!r3.dialog && anyway && !!blob3 && out.pdf.title === 'Charset ?? S1' && out.pdf.note === 'Wrap ? ?' &&
         out.pdf.phase === '?ód? Unit wk 1' && out.pdf.hiatus === 'Break ?',
         { dialogFirst: !!r3.dialog, clickedAnyway: anyway, wrote: !!blob3, pdf: out.pdf });

    // W4 -- exactly the seven characters, and never one that prints.
    var listed = [];
    b1.forEach(function (l) {
      var head = l.slice(2).split(' in the ')[0];     // every place description starts "in the
      head.split(' ').forEach(function (c) { if (c && listed.indexOf(c) < 0) listed.push(c); });
    });
    listed.sort();
    var want = ['日', '本', '→', '✓', 'Ł', 'ź', '🎄'].sort();
    var fine = ['é', '–', '“', '”', '…', '€', 'ó'];
    var wrongly = fine.filter(function (c) { return b1.some(function (l) { return l.slice(2).split(' in the ')[0].indexOf(c) >= 0; }); });
    kase('W4', 'the list is exactly the seven characters outside WinAnsi, and none that print (é – “ ” … € ó)',
         JSON.stringify(listed) === JSON.stringify(want) && wrongly.length === 0, { listed: listed, wrongly: wrongly });

    // W5 -- Excel keeps them, and asks nothing.
    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    await T.sleep(800);
    var capX = T.captureDownload();
    document.getElementById('export-btn').click();
    var xDialog = '';
    for (var i = 0; i < 60 && !capX.peek(); i++) { await T.sleep(100); xDialog = xDialog || T.modalText(); }
    var xblob = capX.peek();
    capX.stop();
    var keptNote = false, hdr = '';
    if (xblob) {
      var wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await xblob.arrayBuffer());
      var ws = wb.worksheets[0];
      hdr = String((ws.headerFooter || {}).oddHeader || '');
      ws.eachRow(function (row) {
        row.eachCell(function (c) {
          var v = c.value;
          var s = typeof v === 'string' ? v : (v && v.richText ? v.richText.map(function (t) { return t.text; }).join('') : '');
          if (s === 'Wrap → ✓') keptNote = true;
        });
      });
    }
    kase('W5', 'Export to Excel asks nothing, and the workbook keeps "Wrap → ✓" and "Charset 日本 S1"',
         !xDialog && !!xblob && keptNote && hdr.indexOf('Charset 日本 S1') >= 0, { dialog: xDialog.slice(0, 120), wrote: !!xblob, keptNote: keptNote });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'winansi threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
