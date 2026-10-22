// textstyle -- the text style bar (TEXT-STYLE-BAR-PLAN.md; owner rulings D1-D5 and the F1-F4 frozen-edit
// sign-off, 21 Oct 2026): one bar under the preview toolbar that styles any text in the waterfall -- what is
// highlighted in the grid (Excel's highlight, D2), a header line in any mode (D3) or view (D4), a side box's
// line -- and double-click / Enter / typing to open a note (D5).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=carry-rich ./run.sh textstyle 400
//
// tests/fixtures/carry-rich.sptcal: a one-year waterfall with a note (CARRY-NOTE), an all-phase hiatus band
// (CARRY-HIATUS, sized 13 in the note editor before the bar) and a Manual header. Sim Post is switched on here.
//
// B  the bar: in the toolbar row's host, above the calendar, no id, empty state; the in-calendar strip hidden
// G  the highlight: click, sweep, Cmd-click, Shift-click, Escape, Cmd+A; a header pick clears it
// S  styling one of every kind at once, and that no row grows and nothing new is cut sideways
// U  one undo step per press
// X  the workbook carries each style; P the PDF draws it (bold program, slant, colour)
// F  the file: textStyles saved, no new fields.byId key, a file without it restores nothing styled
// D  D5: a click opens nothing; double-click, Enter and typing open a note (typing adds at the end)
// H  header lines in the waterfall and the month view
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {test: 'textstyle'}, fails = [], checks = [];
  function check(c, w){ checks.push({what: w, ok: !!c}); if(!c) fails.push(w); return !!c; }
  function $(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function mid(el){ var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  function pe(type, p, extra){
    var o = Object.assign({bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
      buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true}, extra || {});
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new PointerEvent(type, o));
    if(type === 'pointerup') t.dispatchEvent(new MouseEvent('click', o));
  }
  async function click(el, extra){ el.scrollIntoView({block: 'nearest', inline: 'nearest'}); await T.sleep(60);
    var p = mid(el); pe('pointerdown', p, extra); pe('pointerup', p, extra); await T.sleep(200); }
  async function sweep(a, b){ var p = mid(a), r = mid(b); pe('pointerdown', p);
    for(var i = 1; i <= 8; i++){ pe('pointermove', {x: p.x + (r.x - p.x) * i / 8, y: p.y + (r.y - p.y) * i / 8}); await T.sleep(15); }
    pe('pointerup', r); await T.sleep(200); }
  function key(k, opts){ document.body.dispatchEvent(new KeyboardEvent('keydown', Object.assign({key: k, bubbles: true, cancelable: true}, opts || {}))); }
  async function settle(){ await T.sleep(350); }
  function bar(){ return q('.view-toggle-row .style-bar-host .style-bar'); }
  function armed(){ return !!bar() && bar().classList.contains('has-target'); }
  function lit(cls){ return q(cls, bar()).classList.contains('is-on'); }
  async function press(cls){ q(cls, bar()).click(); await settle(); }
  async function size(v){ var s = q('.hf-size', bar()); s.value = String(v); s.dispatchEvent(new Event('change', {bubbles: true})); await settle(); }
  async function colour(hex){ var c = q('.hf-color', bar()); c.value = hex;
    c.dispatchEvent(new Event('input', {bubbles: true})); c.dispatchEvent(new Event('change', {bubbles: true})); await settle(); }
  async function align(a){ q('.hf-al-toggle', bar()).click(); await T.sleep(80); q('.hf-al-opt[data-align="' + a + '"]', bar()).click(); await settle(); }
  function hiCount(){ return qa('#table-wrap .text-sel-layer .text-sel-cell, #table-wrap .text-sel-head .text-sel-cell').length; }
  function rowHeights(){ return qa('#table-wrap tbody tr').map(function(t){ return Math.round(t.getBoundingClientRect().height * 100) / 100; }); }
  function noteTd(){ return qa('#table-wrap td.sheet-note-cell.has-note').filter(function(t){ return /CARRY-NOTE/.test(t.textContent); })[0]; }
  function bandTd(){ return qa('#table-wrap td.sheet-hiatus-cell').filter(function(t){ return /CARRY-HIATUS/.test(t.textContent); })[0]; }
  function rowOf(td){ return td.parentElement; }
  function dateIn(tr){ return q('td.sheet-date', tr); }
  function phaseIn(tr){ return q('td.sheet-phase-cell[data-pkey]:not(.sheet-hiatus-cell)', tr); }
  function simTd(){ return qa('#table-wrap tbody td').filter(function(t){ return !t.className && /^background:#FFFF00/i.test(t.getAttribute('style') || ''); })[0]; }
  function notesTh(){ return qa('#table-wrap thead th').filter(function(t){ return (t.textContent || '').trim() === 'Notes'; })[0]; }
  function look(el){ var cs = getComputedStyle(el); return {w: cs.fontWeight, i: cs.fontStyle, c: cs.color, a: cs.textAlign, fs: cs.fontSize}; }
  function inner(td){ return td.querySelector('.cell-body, .phase-cell-label') || td; }
  var written = [];
  var saveHandle = { name: 'textstyle.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'textstyle.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save(){
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return written[written.length - 1];
  }
  var loads = 0;
  function menuLabel(){ return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text){
    var stem = 'textstyle-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for(var i = 0; i < 60; i++){ await T.sleep(100); if(T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded calendar', 100, 100);
    await T.sleep(800);
  }
  async function view(mode){
    $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, 'the ' + mode + ' view', 100, 100);
    await T.sleep(400);
  }
  async function pdfOps(blob){
    var bytes = new Uint8Array(await blob.arrayBuffer()), latin = '';
    for(var i = 0; i < bytes.length; i += 8192) latin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    var content = '', re = /stream\r?\n/g, m;
    while((m = re.exec(latin))){
      var s0 = m.index + m[0].length, en = latin.indexOf('endstream', s0);
      if(en < 0) continue;
      while(en > s0 && (bytes[en - 1] === 10 || bytes[en - 1] === 13 || bytes[en - 1] === 32)) en--;
      try {
        var ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
        w.write(bytes.subarray(s0, en)); w.close();
        var u = new Uint8Array(await new Response(ds.readable).arrayBuffer()), st = '';
        for(var j = 0; j < u.length; j += 8192) st += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
        if(/\bTf\b/.test(st) && /\bTj\b/.test(st)){ content = st; break; }
      } catch(e){}
    }
    return content.match(/BT [^]*?ET/g) || [];
  }
  try {
    await T.appReady();
    if(!q('#view-sheet-btn').classList.contains('active')) await view('sheet');
    // Sim Post on, so every kind of grid text is on the page.
    var sp = $('simpost-enabled'); if(sp && !sp.checked){ sp.click(); await T.sleep(900); }
    var savedBefore = await save();

    // ---- B: the bar ----------------------------------------------------------------------------------
    var b = bar(), tw = $('table-wrap');
    check(b && q('.view-toggle-row').nextElementSibling === tw, 'B0 the bar is in the toolbar row\'s host; .view-toggle-row -> #table-wrap stays the sibling pair');
    check(b && !qa('[id]', b).length, 'B1 no id anywhere in the bar');
    check(b && !armed() && /Highlight any text/.test(getComputedStyle(b, '::after').content), 'B2 nothing picked: dimmed, and it says how to start');
    check(b && b.getBoundingClientRect().bottom <= tw.getBoundingClientRect().top + 0.5, 'B3 above the calendar (' + Math.round(b.getBoundingClientRect().height) + 'px tall)');
    var strip = q('#table-wrap .hdr-tools .hdr-fmt');
    check(strip && getComputedStyle(strip).display === 'none', 'B4 Manual header: the in-calendar strip is in the page but hidden');

    // ---- G: the highlight ---------------------------------------------------------------------------
    var rows0 = rowHeights(), clip0 = T.clippedCells().h.length;
    var tr2 = qa('#table-wrap tbody tr')[2], tr6 = qa('#table-wrap tbody tr')[6];
    await click(dateIn(tr2));
    var opts = qa('.hf-size option', b).map(function(o){ return o.value; }).join(',');
    check(hiCount() === 1 && armed() && lit('.hf-b') && opts === ',6,7,8,9,10,11,12', 'G1 a click on a date highlights it; the bar arms, B lit (a date is bold); sizes 6-12 (' + opts + ')');
    await press('.hf-b');
    check(look(dateIn(qa('#table-wrap tbody tr')[2])).w === '400' && hiCount() === 1, 'G2 B unbolds that date only, and the highlight survives the render');
    await sweep(dateIn(qa('#table-wrap tbody tr')[2]), q('td.sheet-note-cell', qa('#table-wrap tbody tr')[6]));
    var swept = hiCount();
    check(swept >= 10, 'G3 a sweep from a date to a note four rows down highlights every cell in the rectangle (' + swept + ')');
    var extra = phaseIn(qa('#table-wrap tbody tr')[9]);
    await click(extra, {metaKey: true});
    check(hiCount() === swept + 1, 'G4 Cmd-click adds a cell');
    await click(phaseIn(qa('#table-wrap tbody tr')[9]), {metaKey: true});
    check(hiCount() === swept, 'G5 Cmd-click it again takes it out');
    await click(dateIn(qa('#table-wrap tbody tr')[3]));
    await click(q('td.sheet-note-cell', qa('#table-wrap tbody tr')[4]), {shiftKey: true});
    var shiftN = hiCount();
    check(shiftN >= 6 && shiftN < swept, 'G6 Shift-click extends from the last cell as a rectangle (' + shiftN + ')');
    key('a', {metaKey: true}); await settle();
    var all = hiCount();
    check(all > swept * 3, 'G7 Cmd+A over a highlight takes in the whole grid (' + all + ')');
    key('Escape'); await settle();
    check(hiCount() === 0 && !armed(), 'G8 Escape clears the highlight and the bar disarms');
    // One selection on screen: Cmd-clicks on phase cells also build the phase selection (its chip, the swap
    // knob); a plain click on a date then retires it, so the two never show at once.
    await click(phaseIn(qa('#table-wrap tbody tr')[12]), {metaKey: true});
    await click(phaseIn(qa('#table-wrap tbody tr')[13]), {metaKey: true});
    var chipBefore = !!q('#table-wrap .grid-sel-chip');
    await click(dateIn(qa('#table-wrap tbody tr')[2]));
    check(chipBefore && !q('#table-wrap .grid-sel-chip') && !q('#table-wrap .grid-sel-cell') && hiCount() === 1,
      'G9 a plain click on a date retires the phase selection (its chip and outline) and leaves one highlight');
    key('Escape'); await settle();

    // ---- S: one of every kind, styled at once ---------------------------------------------------------
    var nt = noteTd(), bd = bandTd(), sm = simTd(), th = notesTh();
    var tr1 = qa('#table-wrap tbody tr')[1];
    await click(dateIn(tr1));
    await click(phaseIn(tr1), {metaKey: true});
    if(sm) await click(sm, {metaKey: true});
    await click(nt, {metaKey: true});
    await click(bd, {metaKey: true});
    await click(th, {metaKey: true});
    var picked = hiCount();
    check(picked === (sm ? 6 : 5) && armed(), 'S0 Cmd-clicks build a mixed highlight of every kind (' + picked + (sm ? '' : ', no Sim Post cell found') + ')');
    check(q('.hf-b', b).classList.contains('is-mixed'), 'S1 a mixed highlight half-lights B (dates and headings bold, the rest not)');
    await press('.hf-b'); await press('.hf-i'); await colour('#ff0000'); await align('left'); await size(12);
    var k = { date: dateIn(qa('#table-wrap tbody tr')[1]), phase: phaseIn(qa('#table-wrap tbody tr')[1]), sim: simTd(), note: noteTd(), band: bandTd(), head: notesTh() };
    var looks = {};
    Object.keys(k).forEach(function(n){ if(k[n]) looks[n] = Object.assign(look(inner(k[n])), {cellAlign: getComputedStyle(k[n]).textAlign}); });
    out.looks = looks;
    var allOk = Object.keys(looks).every(function(n){ var l = looks[n];
      // Dates and headings are bold by default at 600 (the frozen CSS), which draws with the same bold face; a
      // bold that matches a kind's default is stored as nothing, so they stay at their own 600.
      return +l.w >= 600 && l.i === 'italic' && l.c === 'rgb(255, 0, 0)' && l.cellAlign === 'left' && l.fs === '12px'; });
    check(allOk, 'S2 every kind reads bold, italic, red, left-aligned, 12 px on screen');
    var rows1 = rowHeights();
    var grown = rows1.filter(function(h, i){ return Math.abs(h - rows0[i]) > 0.3; }).length;
    check(grown === 0, 'S3 no row changed height (' + grown + ' did)');
    var clip1 = T.clippedCells().h;
    check(clip1.length === clip0, 'S4 nothing new is cut short sideways (' + clip1.map(function(c){ return c.t; }).join(' | ') + ')');

    // ---- U: undo ------------------------------------------------------------------------------------
    $('undo-btn').click(); await settle();
    check(look(inner(noteTd())).fs !== '12px' && look(inner(noteTd())).i === 'italic', 'U1 one undo takes back the last press (size) and nothing before it');
    $('redo-btn').click(); await settle();
    check(look(inner(noteTd())).fs === '12px', 'U2 redo puts it back');

    // ---- X: the workbook ----------------------------------------------------------------------------
    await T.sleep(400);
    var xb = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await xb.arrayBuffer());
    var ws = wb.worksheets[0], found = {};
    ws.eachRow(function(row){ row.eachCell(function(c){
      var v = c.value; var s = (v && v.result) ? v.result : v;
      if(s === 'CARRY-NOTE') found.note = c; else if(s === 'CARRY-HIATUS') found.band = c; else if(s === 'Notes') found.head = c;
      else if(s === 'Simultaneous Post' || /^Simultaneous Post/.test(String(s))) found.sim = found.sim || c;
    }); });
    function xlOk(c){ return !!c && c.font && c.font.bold === true && c.font.italic === true && c.font.color && c.font.color.argb === 'FFFF0000' && c.alignment && c.alignment.horizontal === 'left'; }
    out.xl = {}; Object.keys(found).forEach(function(n){ var c = found[n]; out.xl[n] = {font: c.font, align: c.alignment && c.alignment.horizontal}; });
    check(xlOk(found.note) && found.note.font.size === 12, 'X1 the note\'s workbook cell: bold, italic, red, left, 12 pt');
    check(xlOk(found.band) && xlOk(found.head) && found.head.font.size === 12, 'X2 the band and the Notes heading carry the same');
    // Masters only: ExcelJS reports a merged range's other cells with the master's style (the band spans four).
    var italicCells = 0; ws.eachRow(function(row){ row.eachCell(function(c){
      if(c.isMerged && c.master && c.master.address !== c.address) return;
      if(c.font && c.font.italic) italicCells++; }); });
    check(italicCells === picked, 'X3 exactly the styled texts are italic in the workbook (' + italicCells + ' of ' + picked + ')');

    // ---- P: the PDF ---------------------------------------------------------------------------------
    await T.sleep(400);
    var ops = await pdfOps(await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob'));
    var noteOp = ops.filter(function(o){ return /\(CARRY-NOTE\) Tj/.test(o); })[0] || '';
    var headOp = ops.filter(function(o){ return /\(Notes\) Tj/.test(o); })[0] || '';
    out.noteOp = noteOp; out.headOp = headOp;
    check(/\/F2 /.test(noteOp) && / 0\.21 1 /.test(noteOp) && /1\.0000 0\.0000 0\.0000 rg/.test(noteOp), 'P1 the PDF draws the note in Carlito Bold, slanted, red');
    check(/\/F2 /.test(headOp) && / 0\.21 1 /.test(headOp), 'P2 and the Notes heading bold and slanted');
    var slanted = ops.filter(function(o){ return / 0\.21 1 /.test(o); }).length;
    out.slanted = slanted;
    check(slanted >= picked, 'P3 every styled text is slanted in the PDF (' + slanted + ', header lines included)');

    // ---- F: the file --------------------------------------------------------------------------------
    var savedText = await save(), snap = JSON.parse(savedText), snap0 = JSON.parse(savedBefore);
    var kinds = snap.textStyles ? Object.keys(snap.textStyles).sort().join(',') : '';
    out.textStyles = snap.textStyles;
    check(kinds === (sm ? 'date,heading,hiatus,note,phase,simpost' : 'date,heading,hiatus,note,phase'), 'F1 Save writes textStyles with one map per kind used (' + kinds + ')');
    check(!('textStyles' in snap0), 'F2 a calendar with nothing styled saves no textStyles key at all');
    var ids0 = Object.keys(snap0.fields.byId).sort().join(','), ids1 = Object.keys(snap.fields.byId).sort().join(',');
    check(ids0 === ids1, 'F3 fields.byId has exactly the ids it had (' + Object.keys(snap.fields.byId).length + ')');
    check(snap.noteFontSize && snap.noteFontSize['2027-10-11'] === 12 && !(snap.textStyles.note['2027-10-11'] || {}).size, 'F4 a note\'s size lives in noteFontSize, never in its text style');
    var bare = JSON.parse(savedText); delete bare.textStyles;
    await load(JSON.stringify(bare));
    check(look(inner(noteTd())).i !== 'italic' && look(dateIn(qa('#table-wrap tbody tr')[1])).i !== 'italic', 'F5 a file without textStyles opens with nothing styled (restored unconditionally)');
    await load(savedText);
    check(look(inner(noteTd())).i === 'italic' && look(inner(phaseIn(qa('#table-wrap tbody tr')[1]))).c === 'rgb(255, 0, 0)', 'F6 the saved file opens with its styles');

    // ---- D: D5 --------------------------------------------------------------------------------------
    await click(noteTd());
    check(!q('.note-pop') && hiCount() === 1, 'D1 a click on a note highlights it and opens nothing');
    T.openCell(noteTd()); await settle();
    check(!!q('.note-pop'), 'D2 a double-click opens its editor');
    key('Escape'); await settle();
    await click(noteTd());
    if(document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    key('Enter'); await settle();
    check(!!q('.note-pop'), 'D3 Enter on a highlighted note opens its editor');
    key('Escape'); await settle();
    await click(noteTd());
    if(document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    key('x'); await settle();
    var ta = q('.note-editor textarea');
    check(ta && ta.value === 'CARRY-NOTEx' && ta.selectionStart === ta.value.length, 'D4 typing opens it and ADDS the key at the end (' + (ta && ta.value) + ')');
    key('Escape'); await settle();
    check(/^CARRY-NOTE$/.test((noteTd().textContent || '').trim()), 'D5 Escape leaves the note as it was');
    await click(bandTd());
    T.openCell(bandTd()); await settle();
    check(!!q('.note-pop'), 'D6 a double-click opens a hiatus band\'s editor');
    key('Escape'); await settle();
    await click(phaseIn(qa('#table-wrap tbody tr')[1]));
    key('Enter'); await settle();
    check(!q('.note-pop'), 'D7 Enter on a highlighted phase cell opens no editor');

    // ---- H: header lines ----------------------------------------------------------------------------
    var c2 = q('#table-wrap .cal-header-bar .hdr-line[data-hid="c2"]') || q('#table-wrap .cal-header-bar .hdr-line[data-hid="c1"]');
    c2.click(); await settle();
    check(armed() && hiCount() === 0 && !q('.hf-swatch-hl', b).hidden, 'H1 a header line arms the bar, clears the grid highlight, and offers Highlight');
    var hopts = qa('.hf-size option', b).map(function(o){ return o.value; }).join(',');
    check(hopts === ',8,9,10,11,12,13,14,16,18,22', 'H2 a waterfall header line keeps its own size list (' + hopts + ')');
    await press('.hf-i');
    check(getComputedStyle(q('#table-wrap .cal-header-bar .hdr-line[data-hid="' + c2.dataset.hid + '"]')).fontStyle === 'italic', 'H3 I italicises that header line');
    await view('month');
    check(!armed(), 'H4 the Month view does not keep a waterfall header line as the target');
    var mt = q('#table-wrap .mv-header .hdr-line[data-mvhid]');
    if(mt){ mt.click(); await settle(); }
    var mopts = qa('.hf-size option', b).map(function(o){ return o.value; }).join(',');
    check(!!mt && armed() && mopts === ',10,11,12,14,16,18,20,22,26,30', 'H5 a month header line arms it with the month list (' + mopts + ')');
    await view('sheet');
  } catch(e){ out.EX = String(e && e.stack || e); }
  out.checks = checks;
  out.fails = fails;
  out.health = T.appHealth ? T.appHealth() : null;
  var errs = ((out.health || {}).errors || []);
  check(!errs.length, 'Z no console error or warning (' + errs.slice(0, 2).join(' | ') + ')');
  out.pass = fails.length === 0 && !out.EX;
  T.done(out);
})(); });
