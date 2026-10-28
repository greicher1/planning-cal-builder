// wfnotecolors -- waterfall notes take every colour a month note can (owner, 28 Oct 2026: "add all the same note bg
// color options for notes in the waterfall as we currently have for notes in the month view"): No fill, the ten
// standard colours, four light tints and three greys. No fill needed frozen edits NF1 (exportExcel skips the note's
// fill) and NF2 (buildWaterfallPdf skips its rectangle), signed off by picker the same day. A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=wfkeys ./run.sh wfnotecolors 400
//
// tests/fixtures/wfkeys.sptcal (synthetic) carries the notes this leg recolours: 2026-08-10 "Cast fittings\nNetwork
// call" (default purple), 2026-09-14 "Blocker" (default purple), 2026-08-03 "Table read" (#FFC000), and an all-phase
// hiatus from 11/23/26 whose band keeps the standard ten.
//
//   K1  the waterfall note editor offers the month palette in two rows (the ten, then No fill, the tints, the greys),
//       each on one line, its current colour selected
//   K2  a hiatus band's editor keeps one row of the ten standard colours
//   K3  the month view's editor for a WATERFALL note offers the same two rows (it kept the ten until today)
//   S1  a tint draws as any colour: Pink #F7C1D9 with black ink
//   S2  No fill draws the note as its text alone: transparent, black ink; its editor reopens on No fill
//   U1  one undo step back to the default purple, one redo to No fill
//   X1  the workbook: the No fill note has NO fill and black ink; Pink and the fixture's orange fill as before (NF1)
//   P1  the waterfall PDF: one fill rectangle fewer than with the note purple, and no yellow (#FFFFFF00 misread) (NF2)
//   M1  the month view draws the No fill waterfall note as a day note's No fill: transparent, no border, black ink
//   M2  the written month PDF draws its text and no yellow fill
//   F1  Save writes noteColors {…: "#FFFFFF00"} and no new key or field id; Load brings it back with no repair warning
//   F2  a near miss ("#FFFFFF01", "transparent") is dropped on Load (the default purple), and counted
//   C1  copy and paste carries No fill to another week
//   E0  no console errors, apart from the one warning F2's values are meant to raise
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'wfnotecolors', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  }
  function byId(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function view(mode) {
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, 'the ' + mode + ' view', 100, 100);
    await settle();
  }
  async function toMonth(label) {
    if (!q('#table-wrap .mv-daygrid')) await view('month');
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 60; i++) {
      var my = txt(q('#table-wrap .mv-monthyear'));
      if (my === label) return settle();
      var btn = byId(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if (!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  var STD = ['Dark red', 'Red', 'Orange', 'Yellow', 'Light green', 'Green', 'Light blue', 'Blue', 'Dark blue', 'Purple'];
  var TINTS = ['No fill', 'Pink', 'Lavender', 'Peach', 'Pale blue', 'Light grey', 'Grey', 'Dark grey'];
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function noteStyle(wk) { var t = noteTd(wk); return t ? (t.getAttribute('style') || '') : ''; }
  function computed(el) { var s = el ? getComputedStyle(el) : null; return s ? { bg: s.backgroundColor, ink: s.color, border: s.borderTopColor } : null; }
  // The open editor's swatch rows, as titles; whether each row sits on one line; which swatch is selected.
  function rows(pop) { return pop ? qa('.note-color-row', pop).map(function (r) { return qa('.color-swatch', r).map(function (s) { return s.title; }); }) : null; }
  function oneLine(pop) { return !!pop && qa('.note-color-row', pop).every(function (r) { var t = qa('.color-swatch', r).map(function (s) { return Math.round(s.getBoundingClientRect().top); }); return t.every(function (y) { return y === t[0]; }); }); }
  function selected(pop) { var s = pop && q('.color-swatch.selected', pop); return s ? s.title : null; }
  async function openWf(wk) {
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(td); await T.sleep(300);
    var pop = q('.note-pop'); if (!pop) throw new Error('the note editor did not open on ' + wk);
    return pop;
  }
  async function commitWf(pop, name) {
    if (name) { var sw = q('.color-swatch[title="' + name + '"]', pop); if (!sw) throw new Error('no swatch ' + name); sw.click(); await T.sleep(100); }
    var ta = q('textarea', pop);
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await settle();
  }
  function escape(pop) { var ta = q('textarea', pop); if (ta) ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }

  // ---- the exports ------------------------------------------------------------------------------------------------
  async function exportAgain(id, label) { await T.sleep(700); return T.captureExport(id, label); }   // reClickGuard(600)
  async function workbook(label) {
    var b = await exportAgain('export-btn', label);
    var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await b.arrayBuffer());
    var ws = wb.worksheets[0], cells = {};
    ws.eachRow({ includeEmpty: false }, function (row) {
      row.eachCell({ includeEmpty: false }, function (c) {
        if (typeof c.value === 'string') cells[c.value] = { fill: c.fill ? JSON.stringify(c.fill) : null, argb: c.fill && c.fill.fgColor ? c.fill.fgColor.argb : null, ink: c.font && c.font.color ? c.font.color.argb : null };
      });
    });
    return cells;
  }
  async function inflate(u8) {
    var ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
    w.write(u8).catch(function () {}); w.close().catch(function () {});
    var r = ds.readable.getReader(), parts = [], n = 0;
    for (;;) { var x = await r.read(); if (x.done) break; parts.push(x.value); n += x.value.length; }
    var o = new Uint8Array(n), k = 0; parts.forEach(function (p) { o.set(p, k); k += p.length; });
    return new TextDecoder('latin1').decode(o);
  }
  // The waterfall PDF's page content (object 4, the writer's one content stream), its date stamp masked.
  async function wfPdf(label) {
    var blob = await exportAgain('export-wf-pdf-btn', label);
    var u8 = new Uint8Array(await blob.arrayBuffer()), s = '';
    for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    var L = +((s.match(/4 0 obj\s*<< \/Length (\d+)/) || [])[1] || 0);
    var a = s.indexOf('stream'), st = a + 6; if (s[st] === '\r') st++; if (s[st] === '\n') st++;
    var c = await inflate(u8.subarray(st, st + L));
    return c.replace(/\(\d{1,2}\.\d{1,2}\.\d{2}\) Tj/g, '(STAMP) Tj');
  }
  function count(s, re) { return (s.match(re) || []).length; }
  var YELLOW = /1\.0000 1\.0000 0\.0000 rg/g, FILLS = /rg [-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ re f/g;
  // The written month PDF: every Flate stream's text, decoded.
  async function monthPdfStreams() {
    T.monthPrintPath(false);
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      byId('export-btn').click();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
    } finally { rec.restore(); }
    var u8 = rec.files.filter(function (f) { return f.closed; })[0].bytes, s = '', all = [];
    for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (u8[en - 1] === 10 || u8[en - 1] === 13)) en--;
      try {
        var ds = new Blob([u8.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        all.push(await new Response(ds).text());
      } catch (e) { /* not a Flate stream */ }
    }
    return all.join('\n');
  }

  // ---- Save and Load through the real controls ----------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'wfnotecolors.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'wfnotecolors.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];
    return typeof w === 'string' ? w : w.text;
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'wfnotecolors-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function repairWarnings() { return (T.appHealth().errors || []).filter(function (e) { return /were not in a form the app writes/.test(String(e)); }).length; }
  function clip(type, data) {
    var dt = new DataTransfer();
    Object.keys(data || {}).forEach(function (t) { dt.setData(t, data[t]); });
    var ev = new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true });
    (document.activeElement || document.body).dispatchEvent(ev);
    return { text: dt.getData('text/plain'), rich: dt.getData('application/x-sptcal-notes') };
  }
  function mid(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  async function highlight(el) {
    el.scrollIntoView({ block: 'center', inline: 'nearest' }); await T.sleep(80);
    var p = mid(el), t = document.elementFromPoint(p.x, p.y) || document.body;
    ['pointerdown', 'pointerup'].forEach(function (type) {
      t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
        buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true }));
    });
    t.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0 }));
    await T.sleep(250);
    var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur();
  }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteTd('2026-09-14') && txt(noteTd('2026-09-14')) === 'Blocker'; }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var S0 = JSON.parse(await save());

    // ===== K1-K2: the waterfall's own editor ========================================================================
    await step('K1', async function () {
      var pop = await openWf('2026-09-14');
      var r = rows(pop), one = oneLine(pop), sel = selected(pop);
      escape(pop); await T.sleep(200);
      kase('K1', 'the waterfall note editor offers the month palette in two rows (the standard ten, then No fill, the tints, the greys), each on one line, the note\'s purple selected',
           same(r, [STD, TINTS]) && one && sel === 'Purple' && !q('.note-pop'), { rows: r, oneLine: one, selected: sel });
    });
    await step('K2', async function () {
      var band = q('#table-wrap td.sheet-hiatus-cell[data-week="2026-11-23"]'); if (!band) throw new Error('no hiatus band at 11/23/26');
      band.scrollIntoView({ block: 'center' }); await T.sleep(100);
      T.openCell(band); await T.sleep(300);
      var pop = q('.note-pop'), r = rows(pop);
      escape(pop); await T.sleep(200);
      kase('K2', 'a hiatus band\'s editor keeps one row of the ten standard colours (titled by hex), no No fill',
           !!r && r.length === 1 && r[0].length === 10 && r[0].indexOf('No fill') < 0 && r[0][0] === '#C00000', { rows: r });
    });

    // ===== S1-S2, U1: picking ====================================================================================
    await step('S1', async function () {
      await commitWf(await openWf('2026-09-14'), 'Pink');
      kase('S1', 'Pink draws as any colour does: background #F7C1D9 with black ink',
           /background:#F7C1D9; color:#000000/.test(noteStyle('2026-09-14')), { style: noteStyle('2026-09-14') });
    });
    await step('S2', async function () {
      await commitWf(await openWf('2026-08-10'), 'No fill');
      var c = computed(noteTd('2026-08-10')), st = noteStyle('2026-08-10');
      var pop = await openWf('2026-08-10'), sel = selected(pop);
      escape(pop); await T.sleep(200);
      kase('S2', 'No fill draws the note as its text alone (background:#FFFFFF00, transparent, black ink); its editor reopens on No fill',
           /background:#FFFFFF00; color:#000000/i.test(st) && !!c && c.bg === 'rgba(255, 255, 255, 0)' && c.ink === 'rgb(0, 0, 0)' && sel === 'No fill',
           { style: st, computed: c, reopensOn: sel });
    });
    await step('U1', async function () {
      await undo();
      var back = noteStyle('2026-08-10');
      await redo();
      var again = noteStyle('2026-08-10');
      kase('U1', 'one undo takes the note back to the default purple; one redo brings No fill back',
           /background:#7030A0/i.test(back) && /background:#FFFFFF00/i.test(again), { undone: back, redone: again });
    });

    // ===== X1, P1: the waterfall's writers =======================================================================
    await step('X1', async function () {
      var cells = await workbook('the workbook');
      var nf = cells['Cast fittings\nNetwork call'], pk = cells['Blocker'], tr = cells['Table read'];
      // ExcelJS reads a cell with no fill back as pattern "none" (the workbook's default fill), never as a colour.
      kase('X1', 'the workbook (NF1): the No fill note has no fill at all and black ink; Pink fills FFF7C1D9 and the fixture\'s orange FFFFC000 as before',
           !!nf && !nf.argb && (nf.fill === null || nf.fill === '{"type":"pattern","pattern":"none"}') && nf.ink === 'FF000000' && !!pk && pk.argb === 'FFF7C1D9' && !!tr && tr.argb === 'FFFFC000',
           { noFill: nf, pink: pk, tableRead: tr });
    });
    await step('P1', async function () {
      var a = await wfPdf('the waterfall PDF, No fill');
      await undo();                                       // the note back to purple
      var b = await wfPdf('the waterfall PDF, purple');
      await redo();
      var fa = count(a, FILLS), fb = count(b, FILLS), ya = count(a, YELLOW), yb = count(b, YELLOW);
      var txtA = a.indexOf('(Cast fittings) Tj') !== -1 && a.indexOf('(Network call) Tj') !== -1;
      kase('P1', 'the waterfall PDF (NF2): exactly one fill rectangle fewer than with the note purple, no yellow added, and the note\'s two lines drawn',
           fa === fb - 1 && ya === yb && txtA && /background:#FFFFFF00/i.test(noteStyle('2026-08-10')),
           { fillsNoFill: fa, fillsPurple: fb, yellowNoFill: ya, yellowPurple: yb, textDrawn: txtA });
    });

    // ===== C1: copy and paste carry it =============================================================================
    await step('C1', async function () {
      await highlight(noteTd('2026-08-10'));
      var c = clip('copy');
      await highlight(noteTd('2026-08-17'));
      clip('paste', { 'text/plain': c.text, 'application/x-sptcal-notes': c.rich });
      await settle();
      var st = noteStyle('2026-08-17');
      await undo();
      kase('C1', 'copy and paste carries No fill to another week (SPTCal\'s own clipboard data keeps it); undo takes the paste back',
           /FFFFFF00/i.test(c.rich) && /background:#FFFFFF00/i.test(st) && !(noteTd('2026-08-17') || {classList: {contains: function () { return true; }}}).classList.contains('has-note'),
           { rich: c.rich.slice(0, 160), pasted: st });
    });

    // ===== F1: the file ============================================================================================
    var savedText = null;
    await step('F1', async function () {
      savedText = await save();
      var s = JSON.parse(savedText);
      var keysSame = same(Object.keys(s).sort(), Object.keys(S0).sort()), idsSame = same(Object.keys(s.fields.byId).sort(), Object.keys(S0.fields.byId).sort());
      var w0 = repairWarnings();
      await load(savedText);
      var st = noteStyle('2026-08-10'), c = computed(noteTd('2026-08-10'));
      kase('F1', 'Save writes noteColors 2026-08-10 = "#FFFFFF00" and Pink, with no new key or field id; Load brings No fill back with no repair warning',
           s.noteColors['2026-08-10'] === '#FFFFFF00' && s.noteColors['2026-09-14'] === '#F7C1D9' && keysSame && idsSame
             && /background:#FFFFFF00/i.test(st) && !!c && c.bg === 'rgba(255, 255, 255, 0)' && repairWarnings() === w0,
           { noteColors: s.noteColors, keysSame: keysSame, idsSame: idsSame, style: st, warnings: repairWarnings() - w0 });
    });

    // ===== M1, M2: the month view and its PDF ======================================================================
    await step('M1', async function () {
      await toMonth('August 2026');
      var blk = q('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-week="2026-08-10"]');
      var st = blk ? blk.getAttribute('style') || '' : '', c = computed(blk);
      var pop = null, r = null, sel = null;
      if (blk) {
        blk.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, button: 0, detail: 2 }));
        await T.sleep(250);
        pop = q('.mv-note-pop'); r = rows(pop); sel = selected(pop);
        if (pop) { escape(pop); await T.sleep(200); }
      }
      kase('M1', 'the month view draws the No fill waterfall note as a day note\'s No fill (transparent, no border, black ink); its editor (K3) offers the same two rows, on No fill',
           /background:#FFFFFF00/i.test(st) && !!c && c.bg === 'rgba(255, 255, 255, 0)' && c.border === 'rgba(0, 0, 0, 0)' && c.ink === 'rgb(0, 0, 0)'
             && same(r, [STD, TINTS]) && sel === 'No fill' && oneLine(pop),
           { style: st, computed: c, rows: r, selected: sel });
      kase('K3', 'the month view\'s editor for a WATERFALL note offers the month palette (the ten standard colours only, before 28 Oct 2026)', same(r, [STD, TINTS]), { rows: r });
    });
    await step('M2', async function () {
      var all = await monthPdfStreams();
      var drawn = all.indexOf('Cast fittings') !== -1, yellow = /(^|[^\d.])1 1 0 rg/.test(all);
      kase('M2', 'the written month PDF draws the No fill note\'s text and no yellow fill', drawn && !yellow, { drawn: drawn, yellow: yellow });
    });

    // ===== F2: a near miss is not No fill ==========================================================================
    await step('F2', async function () {
      await view('sheet');
      var s = JSON.parse(savedText);
      s.noteColors['2026-08-10'] = '#FFFFFF01'; s.noteColors['2026-09-14'] = 'transparent';
      var w0 = repairWarnings();
      await load(JSON.stringify(s));
      var a = noteStyle('2026-08-10'), b = noteStyle('2026-09-14');
      kase('F2', 'a near miss ("#FFFFFF01", "transparent") is dropped on Load: both notes show the default purple, and the repair is reported',
           /background:#7030A0/i.test(a) && /background:#7030A0/i.test(b) && repairWarnings() > w0, { a: a, b: b, warnings: repairWarnings() - w0 });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (F2\'s repair warning aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'wfnotecolors threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
