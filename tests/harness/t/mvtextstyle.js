// mvtextstyle -- the text style bar in the MONTH view (MONTH-TEXT-STYLE-PLAN.md; owner rulings R1-R4, N1-N3 and the M1 + M2
// sign-off, 27 Oct 2026): pick month text (a bar, a band, a note, a waterfall note, the month name, the weekday row) and
// style it; a click on a note picks it and a double-click, Enter or typing opens it (R1); styles are the month's own (R2).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh mvtextstyle 600                               LIVE: build, assert, mint
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvtextstyle ./run.sh mvtextstyle 400     RESTORE: the minted file
//   HARNESS_PAGE=/releases/v1.8.0.html HARNESS_STATE=mvtextstyle ./run.sh mvtextstyle 200   OLD: v1.8.0 opens it
//
// LIVE builds T.buildFixture() (Pre Prep from 4/6/26, Production 10 x 8 days from 6/29/26, Post from 11/2/26, the default
// Christmas hiatus from 12/21/26), switches Simultaneous Post on, gives Post its own hiatus the week of 11/16/26 and
// adds a day note on Wed 7/8/26 through the month editor. Then, in the month view:
//   B  the bar's month target: no id, colour greyed for a pill (N1), each kind's size list
//   G  picks: click, Cmd-click, Shift-click, Cmd+A, Escape, by point through the hiatus layer
//   D  R1: a click on a note opens nothing; double-click, Enter and typing open it, typing ADDS at the end
//   S  every kind styled at once (largest offered size, bold, italic, a colour, centre and right): shown on screen, no
//      row grown, nothing cut (each text's content box inside its bar's padding box)
//   U  one undo step per press
//   F  Save: mvTextStyles with one map per kind, `fmt` on the day note, no colour on a pill, no new fields.byId key
//   C  the outlines in no shareable copy
//   P  the written month PDF: every box where the unstyled one has it; the bold and regular programs, the slant, the
//      colours; and the outlines in neither month PDF
//   W  R2: the waterfall's grid, workbook and PDF identical to the same calendar's before any month style
//   K  a shift carries "Pre Prep Week 2"'s style and the band's; Reset notes clears the notes'; removing an episode
//      prunes its style; New clears every one
// RESTORE: the minted file draws every style; a hostile copy (tests/fixtures/mvtextstyle-bad.sptcal) loses exactly
// what the sanitizer must drop.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {cases: cases};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function el(id){ return document.getElementById(id); }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function monthLabel(){ return ((q('#table-wrap .mv-monthyear') || {}).textContent || '').trim(); }
  function monthIndex(label){ var m = /^(\w+) (\d{4})$/.exec(label || ''); return m ? (+m[2]) * 12 + MONTHS.indexOf(m[1]) : NaN; }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (el('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 200, 60);
  }
  async function goTo(label){
    var want = monthIndex(label);
    for(var g = 0; g < 40 && monthLabel() !== label; g++){
      el(monthIndex(monthLabel()) < want ? 'mv-next' : 'mv-prev').click();
      await T.sleep(150);
    }
    await settle();
    return monthLabel() === label;
  }
  function centre(e){ var r = e.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  // A real press and click at a text's centre (the highlight resolves the click BY POINT).
  async function click(e, mods){
    e.scrollIntoView({block: 'center', inline: 'nearest'}); await T.sleep(80);
    var p = centre(e), o = Object.assign({bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0, detail: 1}, mods || {});
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new MouseEvent('mousedown', o));
    t.dispatchEvent(new MouseEvent('mouseup', o));
    t.dispatchEvent(new MouseEvent('click', o));
    await T.sleep(200);
  }
  async function dbl(e){
    var p = centre(e), t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0, detail: 2}));
    await T.sleep(250);
  }
  function key(k, opts){ document.body.dispatchEvent(new KeyboardEvent('keydown', Object.assign({key: k, bubbles: true, cancelable: true}, opts || {}))); }
  function bar(){ return q('.view-toggle-row .style-bar-host .style-bar'); }
  function armed(){ return !!bar() && bar().classList.contains('has-target'); }
  function lit(cls){ return q(cls, bar()).classList.contains('is-on'); }
  async function press(cls){ q(cls, bar()).click(); await T.sleep(300); }
  async function size(v){ var s = q('.hf-size', bar()); s.value = String(v); s.dispatchEvent(new Event('change', {bubbles: true})); await T.sleep(300); }
  async function colour(hex){ var c = q('.hf-color', bar()); c.value = hex;
    c.dispatchEvent(new Event('input', {bubbles: true})); c.dispatchEvent(new Event('change', {bubbles: true})); await T.sleep(300); }
  async function align(a){ q('.hf-al-toggle', bar()).click(); await T.sleep(80); q('.hf-al-opt[data-align="' + a + '"]', bar()).click(); await T.sleep(300); }
  function sizes(){ return qa('option', q('.hf-size', bar())).map(function (o) { return o.value; }).filter(Boolean).join(','); }
  function boxes(){ return qa('body > .month-sel-box').length; }
  function editorOpen(){ return !!q('.mv-note-pop'); }
  function editorText(){ var t = q('.mv-note-pop textarea'); return t ? t.value : null; }
  async function closeEditor(){ var t = q('.mv-note-pop textarea'); if(t){ t.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})); await T.sleep(250); } }
  function look(e){ var cs = getComputedStyle(e); return {fs: cs.fontSize, w: cs.fontWeight, i: cs.fontStyle, c: cs.color, a: cs.textAlign, lh: cs.lineHeight, ring: cs.borderTopColor}; }
  function rows(){ return qa('#table-wrap .mv-body > .mv-week').map(function (w) { return Math.round(w.getBoundingClientRect().height * 100) / 100; }); }
  function frame(){ return [q('#table-wrap .mv-monthbar'), q('#table-wrap .mv-dowrow')].map(function (e) { return Math.round(e.getBoundingClientRect().height * 100) / 100; }); }
  // The texts of a month: the bars, the month name, the weekdays.
  function pill(re){ return qa('#table-wrap .mv-bars > .mv-pill').filter(function (p) { return re.test(p.textContent); })[0]; }
  function band(re){ return qa('#table-wrap .mv-bars > .mv-hiatus-bar').filter(function (p) { return re.test(p.textContent); })[0]; }
  function note(kind, re){ return qa('#table-wrap .mv-bars > .mv-note-block[data-note-kind="' + kind + '"]').filter(function (p) { return re.test(p.textContent); })[0]; }
  function simpost(){ return qa('#table-wrap .mv-bars > .mv-pill:not([data-ph])')[0]; }
  // §6 item 2's "0 clipped glyphs": every line a text is meant to show (a note: as many 13 px lines as its box holds)
  // has its content box (the font's ascent + descent, a superset of the ink) inside the bar's padding box.
  function cutPx(e){
    var r = e.getBoundingClientRect(), cs = getComputedStyle(e), top = r.top + parseFloat(cs.borderTopWidth), bot = r.bottom - parseFloat(cs.borderBottomWidth);
    var rects = [], rg = document.createRange();
    Array.prototype.forEach.call(e.childNodes, function (n) { if(n.nodeType === 3 && n.textContent.trim()){ rg.selectNodeContents(n); Array.prototype.push.apply(rects, Array.from(rg.getClientRects())); } });
    var tops = Array.from(new Set(rects.map(function (t) { return Math.round(t.top * 4) / 4; }))).sort(function (a, b) { return a - b; });
    var keep = tops.slice(0, e.classList.contains('mv-note-block') ? Math.max(1, Math.round((bot - top - 4) / 13)) : 1), worst = 0;
    rects.forEach(function (t) { if(keep.indexOf(Math.round(t.top * 4) / 4) >= 0) worst = Math.max(worst, top - t.top, t.bottom - bot); });
    return Math.round(worst * 100) / 100;
  }
  async function fieldIds(){ var s = await saveText(); return Object.keys(((JSON.parse(s).fields) || {}).byId || {}).length; }
  // The real Save, through a stand-in handle; returns the text written.
  async function saveText(){
    var written = [], h = { name: 'mvtextstyle.sptcal', kind: 'file',
      queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
      isSameEntry: async function(o){ return o === h; },
      getFile: async function(){ return new File([written.length ? written[written.length - 1] : ''], 'mvtextstyle.sptcal', {lastModified: 1}); },
      createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ written.push(parts.join('')); } }; } };
    var real = window.showSaveFilePicker;
    window.showSaveFilePicker = async function(){ return h; };
    try {
      // Save As every time: a new handle per call, so each write lands in this call's `written` (a plain Save would
      // write back to the FIRST call's handle once the calendar is linked to it).
      // Save As drops a second click inside 600 ms (reClickGuard), and its "Saved ✓" flash disables it a moment.
      await T.sleep(900);
      await T.until(function () { return !el('save-as-btn').disabled; }, 'Save As enabled', 60, 100);
      el('save-as-btn').click();
      await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
    } finally { window.showSaveFilePicker = real; }
    return written[written.length - 1];
  }
  // A PDF's content streams, inflated.
  async function pdfStreams(u8){
    var latin = ''; for(var i = 0; i < u8.length; i += 8192) latin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    var outS = [], re = /stream\r?\n/g, m;
    while((m = re.exec(latin))){
      var s0 = m.index + m[0].length, dict = latin.slice(latin.lastIndexOf('<<', m.index), m.index), L = /\/Length (\d+)/.exec(dict);
      if(!L || !/FlateDecode/.test(dict) || /FontFile|Length1/.test(dict)) continue;
      try {
        var ds = new Blob([u8.subarray(s0, s0 + (+L[1]))]).stream().pipeThrough(new DecompressionStream('deflate'));
        outS.push(await new Response(ds).text());
      } catch(e){ /* not a content stream */ }
    }
    return {latin: latin, streams: outS};
  }
  // A page's GEOMETRY with the text taken out: every path (rects, curves, lines) and paint, in order. Colour ops are left
  // out on purpose: the writer sets a fill colour only when it changes, so a coloured text legitimately re-emits the
  // next box's `rg` (graphics state), while the box itself is exactly where it was.
  function boxesOnly(s){
    return s.replace(/BT [\s\S]*? ET/g, '\n').split('\n').map(function (l) { return l.trim(); })
      .filter(function (l) { return /(?: re| m| l| c| v| y)$/.test(l) || /^(?:h|f\*?|B\*?|S|s|n|W\*? n|q|Q)$/.test(l) || / w$/.test(l); }).join('\n');
  }
  async function writerPdf(){
    var rec = T.fakeSavePicker();
    await T.sleep(1000);                 // the export button's re-click guard, after the previous export
    el('export-btn').click();
    try { await T.until(function () { return rec.files.length > 0 && rec.files[0].closed; }, 'the written month PDF', 300, 100); }
    finally { rec.restore(); }
    return rec.files[0].bytes;
  }
  // The print rollback's document (its #print-root at window.print()).
  async function printDoc(){
    T.monthPrintPath(true);
    var real = window.print, html = null;
    window.print = function () { html = el('print-root').innerHTML; };
    await T.sleep(1000);
    try { el('export-btn').click(); await T.until(function () { return html !== null; }, 'the print call', 200, 100); }
    finally { window.print = real; window.dispatchEvent(new Event('afterprint')); T.monthPrintPath(false); }
    return html;
  }
  // The parts of a .xlsx, unzipped (stored or deflated entries, read off the central directory).
  async function zipParts(blob){
    var u8 = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(u8.buffer), outP = {};
    var eocd = -1; for(var i = u8.length - 22; i >= 0; i--){ if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; } }
    var n = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true);
    for(var k = 0; k < n; k++){
      var method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      var name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
      var ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), data = u8.subarray(ds, ds + csize);
      outP[name] = method === 0 ? new TextDecoder().decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      p += 46 + nl + xl + cl;
    }
    return outP;
  }
  var st = new URLSearchParams(location.search).get('state');
  var OLD = /\/releases\//.test(location.pathname);
  try {
    await T.sleep(1200);
    if(OLD){
      // ---------------- OLD: an older build opens the minted file (§4: no SNAPSHOT_VERSION bump) ----------------
      el('view-month-btn').click(); await settle();
      await goTo('July 2026');
      var dn = note('day', /Crew lunch/);
      add('O1', 'v1.8.0 opens a calendar with month text styles: the title, the day note and the episode bars, no error',
        el('show-title').value === 'Test Show' && !!dn && qa('#table-wrap .mv-pill[data-ph="production"]').length > 0 && !(window.__ERR || []).length,
        {title: el('show-title').value, dayNote: !!dn, errors: (window.__ERR || []).slice(0, 3)}, 'opened');
      T.done(out); return;
    }
    if(!st){
      // ---------------- LIVE ----------------
      T.buildFixture(); await settle();
      var sp = el('simpost-enabled'); if(sp && !sp.checked){ sp.click(); await settle(); }
      var en = el('phiatus-en-post'); if(en && !en.checked){ en.click(); await T.sleep(200); }
      var sEl = el('phiatus-start-post'), wEl = el('phiatus-weeks-post');
      if(sEl){ T.set('phiatus-start-post', '2026-11-16'); }
      if(wEl){ T.set('phiatus-weeks-post', '1'); }
      await settle();
      el('view-month-btn').click(); await settle();
      await goTo('July 2026');
      // A day note on Wed 7/8, through the "+" and the editor (Ctrl+Enter saves).
      var plus = qa('#table-wrap .mv-note-add[data-note-day="2026-07-08"]')[0];
      if(plus){ plus.click(); await T.sleep(300); }
      var ta = q('.mv-note-pop textarea');
      if(ta){ ta.value = 'Crew lunch'; ta.dispatchEvent(new Event('input', {bubbles: true}));
        ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true})); await settle(); }
      add('A0', 'the calendar: a day note on 7/8, a waterfall note, an episode bar and Sim Post exist to style',
        !!note('day', /Crew lunch/) && !!note('wf', /Principal Photography/) && !!pill(/201/), {day: !!note('day', /Crew lunch/), wf: !!note('wf', /Principal/), ep: !!pill(/201/)}, 'all there');

      // The unstyled calendar, for every comparison below (R2, §6 items 2 and 3).
      var ids0 = await fieldIds();
      var txt0 = await saveText();
      el('view-sheet-btn').click(); await settle();
      var wfHtml0 = el('table-wrap').innerHTML;
      var xlsx0 = await zipParts(await T.captureExport('export-btn', 'the unstyled workbook'));
      var wfPdf0 = new Uint8Array(await (await T.captureExport('export-wf-pdf-btn', 'the unstyled waterfall PDF')).arrayBuffer());
      el('view-month-btn').click(); await settle();
      var mvPdf0 = await pdfStreams(await writerPdf());
      var shape0 = {};
      async function shapeOf(m){ await goTo(m); return {rows: rows(), frame: frame()}; }
      var SHAPE_MONTHS = ['April 2026', 'July 2026', 'November 2026', 'December 2026'];
      for(var mi = 0; mi < SHAPE_MONTHS.length; mi++) shape0[SHAPE_MONTHS[mi]] = await shapeOf(SHAPE_MONTHS[mi]);
      add('F0', 'an unstyled calendar saves NO mvTextStyles key and no `fmt`', txt0.indexOf('mvTextStyles') < 0 && txt0.indexOf('"fmt"') < 0, {mv: txt0.indexOf('mvTextStyles'), fmt: txt0.indexOf('"fmt"')}, 'absent');

      // ---------------- B + G: the target and the gestures ----------------
      await goTo('July 2026');
      var ep = pill(/201/), wfn = note('wf', /Principal Photography/), day = note('day', /Crew lunch/);
      await click(ep);
      var b1 = {armed: armed(), boxes: boxes(), bold: lit('.hf-b'), colorOff: q('.hf-color', bar()).disabled, sizes: sizes(),
                ids: qa('[id]', bar()).length, hl: q('.hf-swatch-hl', bar()).hidden};
      add('B1', "a click on an episode bar picks it: the bar armed, one outline (body-level), B lit (600), the colour greyed (N1), sizes 6-11, no highlight, no id on any control",
        b1.armed && b1.boxes >= 1 && b1.bold && b1.colorOff && b1.sizes === '6,7,8,9,10,11' && b1.ids === 0 && b1.hl, b1, 'armed, greyed, 6-11');
      await click(wfn, {metaKey: true});
      var g2 = {boxes: boxes(), colorOff: q('.hf-color', bar()).disabled, sizes: sizes()};
      await click(wfn, {shiftKey: true});
      var g3 = {boxes: boxes()};
      key('Escape'); await T.sleep(200);
      var g4 = {armed: armed(), boxes: boxes()};
      add('G1', 'Cmd-click adds the waterfall note (one more outline: the episode has one per week it crosses; colour back on, sizes 6-10, both kinds allow); Shift-click removes it; Escape clears',
        g2.boxes === b1.boxes + 1 && !g2.colorOff && g2.sizes === '6,7,8,9,10' && g3.boxes === b1.boxes && !g4.armed && g4.boxes === 0, {b1: b1.boxes, g2: g2, g3: g3, g4: g4}, 'one more, back, none');
      await click(day);
      var d1 = {editor: editorOpen(), boxes: boxes(), sizes: sizes(), bold: lit('.hf-b')};
      await dbl(note('day', /Crew lunch/));
      var d2 = {editor: editorOpen(), text: editorText()};
      await closeEditor();
      await click(note('day', /Crew lunch/));
      key('Enter'); await T.sleep(250);
      var d3 = {editor: editorOpen()};
      await closeEditor();
      await click(note('day', /Crew lunch/));
      key('x'); await T.sleep(250);
      var d4 = {editor: editorOpen(), text: editorText()};
      await closeEditor();
      add('D1', 'R1: a click on a day note picks it and opens NOTHING (B unlit: notes are 500, sizes 6-10); a double-click opens it; Enter opens it; typing "x" opens it with "x" ADDED at the end',
        !d1.editor && d1.boxes === 1 && d1.sizes === '6,7,8,9,10' && !d1.bold && d2.editor && d2.text === 'Crew lunch' && d3.editor
          && d4.editor && d4.text === 'Crew lunchx', {d1: d1, d2: d2, d3: d3, d4: d4}, 'pick, then open x3');
      await click(note('day', /Crew lunch/));
      key('a', {metaKey: true}); await T.sleep(250);
      var g5 = {boxes: boxes(), editor: editorOpen()};
      key('Escape'); await T.sleep(200);
      add('G2', 'Cmd+A over a pick picks every text in the month (bars, notes, the month name, seven weekdays); ⌘ shortcuts open no editor',
        g5.boxes >= 12 && !g5.editor, g5, '>= 12 outlines');
      await click(q('#table-wrap .mv-monthyear'));
      var g6 = {boxes: boxes(), sizes: sizes(), alignOff: q('.hf-al-toggle', bar()).disabled};
      await click(qa('#table-wrap .mv-dowrow > .mv-dow')[3]);
      var g7 = {boxes: boxes(), sizes: sizes()};
      key('Escape'); await T.sleep(150);
      add('G3', 'the month name picks (sizes 6-17, alignment greyed: it is centred between the arrows) and a weekday picks the whole row (seven outlines, sizes 6-11)',
        g6.boxes === 1 && g6.sizes === '6,7,8,9,10,11,12,13,14,15,16,17' && g6.alignOff && g7.boxes === 7 && g7.sizes === '6,7,8,9,10,11', {g6: g6, g7: g7}, 'month 6-17, dow x7');

      // ---------------- S: every kind styled at once ----------------
      var ink0 = {episode: look(pill(/201/)).c, ep2: pill(/202/) ? look(pill(/202/)).c : null};
      var styled = {};
      async function styleIt(label, e, steps){ if(!e){ styled[label] = null; return; } await click(e); for(var i = 0; i < steps.length; i++) await steps[i](); key('Escape'); await T.sleep(150); styled[label] = true; }
      await goTo('April 2026');
      await styleIt('phase', pill(/Pre Prep Week 2/), [function(){ return size(11); }, function(){ return press('.hf-b'); }, function(){ return press('.hf-b'); }, function(){ return press('.hf-i'); }, function(){ return align('right'); }]);
      await goTo('July 2026');
      await styleIt('episode', pill(/201/), [function(){ return size(11); }, function(){ return press('.hf-i'); }, function(){ return align('center'); }]);
      await styleIt('wfnote', note('wf', /Principal Photography/), [function(){ return size(10); }, function(){ return press('.hf-b'); }, function(){ return press('.hf-i'); }, function(){ return colour('#ffff00'); }, function(){ return align('right'); }]);
      await styleIt('daynote', note('day', /Crew lunch/), [function(){ return size(9); }, function(){ return press('.hf-b'); }, function(){ return press('.hf-i'); }, function(){ return colour('#00ffff'); }, function(){ return align('center'); }]);
      // N1 on a MIXED pick: the episode bar and the waterfall note picked together, a colour pressed. The note takes it;
      // the bar keeps its phase's ink, and no colour is stored on it.
      await click(pill(/201/)); await click(note('wf', /Principal Photography/), {metaKey: true});
      await colour('#ff00ff');
      var mixed = {ep: look(pill(/201/)).c, wf: look(note('wf', /Principal Photography/)).c};
      await colour('#ffff00');
      key('Escape'); await T.sleep(150);
      // A style pressed on and off again leaves NOTHING stored (not an empty object): Ep. 202's italic.
      if(pill(/202/)){ await click(pill(/202/)); await press('.hf-i'); await press('.hf-i'); key('Escape'); await T.sleep(150); }
      await styleIt('month', q('#table-wrap .mv-monthyear'), [function(){ return size(17); }, function(){ return press('.hf-i'); }, function(){ return colour('#c00000'); }]);
      await styleIt('dow', qa('#table-wrap .mv-dowrow > .mv-dow')[0], [function(){ return size(11); }, function(){ return press('.hf-b'); }, function(){ return press('.hf-i'); }, function(){ return colour('#0070c0'); }, function(){ return align('left'); }]);
      var spMonth = null;
      for(var sm = 0; sm < 8 && !spMonth; sm++){ if(simpost()) spMonth = monthLabel(); else { el('mv-next').click(); await settle(); } }
      await styleIt('simpost', simpost(), [function(){ return size(11); }, function(){ return press('.hf-b'); }, function(){ return press('.hf-b'); }, function(){ return press('.hf-i'); }]);
      await goTo('November 2026');
      await styleIt('phaseband', band(/Post Hiatus/), [function(){ return size(11); }, function(){ return press('.hf-b'); }, function(){ return press('.hf-b'); }, function(){ return colour('#ffff00'); }, function(){ return align('left'); }]);
      await goTo('December 2026');
      await styleIt('band', band(/Hiatus|Holiday/), [function(){ return size(11); }, function(){ return press('.hf-i'); }, function(){ return colour('#ffff00'); }, function(){ return align('right'); }]);
      // What the screen draws, month by month.
      var seen = {}, cuts = {}, shape1 = {};
      async function see(m, picks){ await goTo(m); shape1[m] = {rows: rows(), frame: frame()};
        Object.keys(picks).forEach(function (k) { var e = picks[k](); seen[k] = e ? look(e) : null; cuts[k] = e ? cutPx(e) : null; }); }
      await see('April 2026', {phase: function(){ return pill(/Pre Prep Week 2/); }});
      await see('July 2026', {episode: function(){ return pill(/201/); }, wfnote: function(){ return note('wf', /Principal Photography/); },
        daynote: function(){ return note('day', /Crew lunch/); }, month: function(){ return q('#table-wrap .mv-monthyear'); }, dow: function(){ return qa('#table-wrap .mv-dowrow > .mv-dow')[2]; }});
      await see('November 2026', {phaseband: function(){ return band(/Post Hiatus/); }});
      await see('December 2026', {band: function(){ return band(/Hiatus|Holiday/); }});
      if(spMonth){ await goTo(spMonth); seen.simpost = simpost() ? look(simpost()) : null; cuts.simpost = simpost() ? cutPx(simpost()) : null; }
      out.seen = seen; out.cuts = cuts; out.styled = styled;
      var S = seen;
      add('S1', 'each kind shows its style on screen: sizes with the line box held (bars 15 px, notes 13 px, month 25.5, weekdays 16.5), weights (B on a bar 700, off on the weekdays 400, on a note 700), italic, colours, alignment',
        !!S.phase && S.phase.fs === '11px' && S.phase.lh === '15px' && S.phase.w === '700' && S.phase.i === 'italic' && S.phase.a === 'right'
        && !!S.episode && S.episode.fs === '11px' && S.episode.i === 'italic' && S.episode.a === 'center' && S.episode.w === '600'
        && !!S.wfnote && S.wfnote.fs === '10px' && S.wfnote.lh === '13px' && S.wfnote.w === '700' && S.wfnote.c === 'rgb(255, 255, 0)' && S.wfnote.a === 'right'
        && !!S.daynote && S.daynote.fs === '9px' && S.daynote.lh === '13px' && S.daynote.w === '700' && S.daynote.c === 'rgb(0, 255, 255)' && S.daynote.a === 'center'
        && !!S.month && S.month.fs === '17px' && S.month.i === 'italic' && S.month.c === 'rgb(192, 0, 0)'
        && !!S.dow && S.dow.fs === '11px' && S.dow.w === '400' && S.dow.i === 'italic' && S.dow.c === 'rgb(0, 112, 192)' && S.dow.a === 'left'
        && !!S.simpost && S.simpost.fs === '11px' && S.simpost.w === '700' && S.simpost.i === 'italic'
        && !!S.phaseband && S.phaseband.c === 'rgb(255, 255, 0)' && S.phaseband.w === '700' && S.phaseband.a === 'left'
        && !!S.band && S.band.c === 'rgb(255, 255, 0)' && S.band.i === 'italic' && S.band.a === 'right', S, 'as styled');
      add('S2', "N1: every pill's text and ring keep the phase's own ink (the episode bar's colour is its unstyled ink, the ring in it too), and a colour pressed on a pick mixing the bar with a note colours the note alone",
        !!S.episode && S.episode.c === S.episode.ring && S.episode.c === ink0.episode && !!S.phase && S.phase.c === S.phase.ring && !!S.simpost && S.simpost.c === S.simpost.ring
          && mixed.ep === ink0.episode && mixed.wf === 'rgb(255, 0, 255)', {ep: S.episode, ph: S.phase, sp: S.simpost, ink0: ink0, mixed: mixed}, 'ring = ink = unstyled ink');
      var grew = Object.keys(shape0).filter(function (m) { return !eq(shape0[m], shape1[m]); });
      add('S3', 'R3: no week row, month bar or weekday row changed height in any month styled (April, July, November, December)',
        grew.length === 0, {grew: grew, before: shape0, after: shape1}, 'none');
      var cutList = Object.keys(cuts).filter(function (k) { return cuts[k] === null || cuts[k] > 0.01; });
      add('S4', '0 clipped: every styled text\'s content box (the font\'s ascent + descent) inside its bar\'s padding box, at the largest sizes offered',
        cutList.length === 0, cuts, 'all 0');

      // ---------------- U: one undo step per press ----------------
      await goTo('July 2026');
      await click(pill(/201/));
      await press('.hf-b');
      var u0 = look(pill(/201/)).w;
      el('undo-btn').click(); await settle();
      var u1 = look(pill(/201/));
      key('Escape'); await T.sleep(150);
      add('U1', 'one press is one undo step: B off on the episode bar (400), one Undo puts back 600 and keeps its italic and size 11',
        u0 === '400' && u1.w === '600' && u1.i === 'italic' && u1.fs === '11px', {pressed: u0, undone: u1}, '400, then 600');

      // ---------------- C: the outlines in no shareable copy ----------------
      await click(pill(/201/));
      var hadBoxes = boxes();
      // Export App With Data (#share-copy-btn) is in the Settings window; its 600 ms re-click guard wants a gap.
      await T.openSettings('prefs');
      await T.until(function () { return !!el('share-copy-btn'); }, 'the Export-App button', 80, 100);
      await T.sleep(900);
      var cap = T.captureDownload();
      el('share-copy-btn').click();
      await T.until(cap.peek, 'the shareable copy', 200, 100);
      var copyHtml = await cap.stop().text();
      await T.closeSettings();
      // ⚠️ The pattern is built at run time: srv.js injects this leg's source into the page, so a literal of it would
      // travel in the copy (inside this script) and be counted.
      var BOX_TAG = new RegExp('<div class="' + 'month' + '-sel-box', 'g');
      add('C1', 'a shareable copy exported while a pick is live carries no .month-sel-box', hadBoxes >= 1 && !(copyHtml.match(BOX_TAG) || []).length,
        {boxesLive: hadBoxes, inCopy: (copyHtml.match(BOX_TAG) || []).length}, 'none in the copy');

      // ---------------- P: both month PDFs ----------------
      var doc1 = await printDoc();
      var mvPdf1 = await pdfStreams(await writerPdf());
      key('Escape'); await T.sleep(150);
      var pages0 = mvPdf0.streams.filter(function (s) { return /\bre\b/.test(s); }), pages1 = mvPdf1.streams.filter(function (s) { return /\bre\b/.test(s); });
      var moved = pages1.map(function (s, i) { return boxesOnly(s) === boxesOnly(pages0[i] || '') ? null : i; }).filter(function (v) { return v !== null; });
      var all1 = mvPdf1.streams.join('\n');
      var firstDiff = null;
      if(moved.length){ var A = boxesOnly(pages0[moved[0]] || '').split('\n'), Bq = boxesOnly(pages1[moved[0]]).split('\n');
        for(var di = 0; di < Math.max(A.length, Bq.length); di++){ if(A[di] !== Bq[di]){ firstDiff = {page: moved[0], line: di, was: A[di], now: Bq[di], n0: A.length, n1: Bq.length}; break; } } }
      var p1 = {pages0: pages0.length, pages1: pages1.length, boxesMoved: moved, f700: /\/F700 /.test(all1), f400: /\/F400 /.test(all1),
                skew: / Tf 1 0 0\.25 1 /.test(all1), yellow: /\b1 1 0 rg\b/.test(all1), cyan: /\b0 1 1 rg\b/.test(all1), red: /\b0\.7529 0 0 rg\b/.test(all1),
                printBoxes: /month-sel-box/.test(doc1), printStyled: /font-style:italic/.test(doc1), firstDiff: firstDiff};   // #print-root's innerHTML: no script in it
      add('P1', 'the written month PDF: the same pages, every box, ring and line exactly where the unstyled file has it (text alone moved); the bold and regular programs, the italic slant and each colour in it',
        p1.pages0 > 0 && p1.pages0 === p1.pages1 && moved.length === 0 && p1.f700 && p1.f400 && p1.skew && p1.yellow && p1.cyan && p1.red, p1, 'boxes identical; F700, F400, 0.25 skew, colours');
      add('P2', 'the print rollback prints the styles (its document carries them) and no outline', p1.printStyled && !p1.printBoxes, p1, 'styled, no outline');

      // ---------------- W: R2, the waterfall untouched ----------------
      el('view-sheet-btn').click(); await settle();
      var wfHtml1 = el('table-wrap').innerHTML;
      var xlsx1 = await zipParts(await T.captureExport('export-btn', 'the styled workbook'));
      var wfPdf1 = new Uint8Array(await (await T.captureExport('export-wf-pdf-btn', 'the styled waterfall PDF')).arrayBuffer());
      var xDiff = Object.keys(xlsx0).filter(function (k) { return xlsx0[k] !== xlsx1[k] && !/docProps\/(core|app)\.xml/.test(k); });
      var pdfSame = wfPdf0.length === wfPdf1.length && wfPdf0.every(function (v, i) { return v === wfPdf1[i]; });
      add('W1', "R2: a month style never reaches the waterfall: its grid, every workbook part and its PDF identical to the same calendar's before any month style",
        wfHtml0 === wfHtml1 && xDiff.length === 0 && Object.keys(xlsx1).length === Object.keys(xlsx0).length && pdfSame,
        {grid: wfHtml0 === wfHtml1, partsDiffer: xDiff, parts: Object.keys(xlsx1).length, pdfSame: pdfSame}, 'identical');
      el('view-month-btn').click(); await settle();

      // ---------------- F: the file ----------------
      var text = await saveText(), saved = JSON.parse(text), mts = saved.mvTextStyles || {};
      var dayEntry = ((saved.dayNotes || {})['2026-07-08'] || [])[0] || {};
      var f1 = {kinds: Object.keys(mts).sort().join(','), fmt: dayEntry.fmt || null, ids: Object.keys((saved.fields || {}).byId || {}).length,
                pillColour: ['phase', 'episode', 'simpost'].some(function (k) { return Object.keys(mts[k] || {}).some(function (x) { return 'color' in mts[k][x]; }); }),
                phaseKeys: Object.keys(mts.phase || {}), frame: mts.frame || null, empty: /:\{\}/.test(JSON.stringify(mts)) || ((mts.episode || {}).ep2 !== undefined)};
      add('F1', 'Save writes mvTextStyles, one map per kind (band, episode, frame, phase, simpost, wfnote), "prePrep@2" for Pre Prep Week 2 (N2), `fmt` on the day note, no colour on a pill, no empty object (Ep. 202 pressed italic on and off: absent), and no new fields.byId key',
        f1.kinds === 'band,episode,frame,phase,simpost,wfnote' && f1.phaseKeys.indexOf('prePrep@2') >= 0 && !!f1.fmt && f1.fmt.size === 9 && f1.fmt.bold === true
          && !f1.pillColour && !f1.empty && !!f1.frame && !!f1.frame.month && !!f1.frame.dow && f1.ids === ids0, Object.assign({ids0: ids0}, f1), 'all kinds, ids unchanged');
      out.sptcal = T.b64(new TextEncoder().encode(text));

      // ---------------- K: movers, resets, prune, New ----------------
      el('shift-fwd-btn').click(); await settle();
      await goTo('April 2026');
      var k1a = pill(/Pre Prep Week 2/), k1 = k1a ? look(k1a) : null;
      await goTo('December 2026');
      var k1b = band(/Hiatus|Holiday/), k1c = k1b ? look(k1b) : null;
      add('K1', 'Shift All +1 wk: "Pre Prep Week 2" keeps its style on its new week (N2: keyed by the label\'s week), and the Christmas band keeps its own',
        !!k1 && k1.fs === '11px' && k1.i === 'italic' && !!k1c && k1c.c === 'rgb(255, 255, 0)', {phase: k1, band: k1c}, 'still styled');
      el('undo-btn').click(); await settle();
      await goTo('July 2026');
      el('tb-notes-reset-btn').click(); await settle();
      var k2t = JSON.parse(await saveText());
      add('K2', 'Reset Month Notes clears the waterfall notes\' month styles and the day notes (and their `fmt`), and nothing else',
        !(k2t.mvTextStyles || {}).wfnote && !(k2t.dayNotes || {})['2026-07-08'] && !!(k2t.mvTextStyles || {}).phase && !!(k2t.mvTextStyles || {}).band,
        {kinds: Object.keys(k2t.mvTextStyles || {})}, 'wfnote gone');
      el('undo-btn').click(); await settle();
      // The last episode's bars (Ep. 210) styled, then the episode count lowered to 9: its style goes with it.
      var ep10 = null;
      for(var em = 0; em < 6 && !ep10; em++){ ep10 = pill(/210/); if(!ep10){ el('mv-next').click(); await settle(); } }
      if(ep10){ await click(ep10); await press('.hf-i'); key('Escape'); await T.sleep(150); }
      var k3a = JSON.parse(await saveText()), had10 = !!((k3a.mvTextStyles || {}).episode || {}).ep10;
      T.set('num-episodes', '9'); await settle();
      for(var g = 0; g < 20 && /Removed|Continue/.test(T.modalText()); g++){ T.clickModalButton('Continue') || T.clickModalButton('OK'); await T.sleep(200); }
      var k3b = JSON.parse(await saveText());
      add('K3', 'removing an episode prunes its bars\' style (ep10 styled, then the count lowered to 9)',
        had10 && !((k3b.mvTextStyles || {}).episode || {}).ep10 && !!((k3b.mvTextStyles || {}).episode || {}).ep1, {had10: had10, after: Object.keys((k3b.mvTextStyles || {}).episode || {})}, 'ep10 gone');
      el('new-file-btn').click(); await T.sleep(500);
      for(var g2i = 0; g2i < 10 && T.modalText(); g2i++){ if(!(T.clickModalButton('Discard') || T.clickModalButton('New') || T.clickModalButton('Continue'))) break; await T.sleep(300); }
      await settle();
      var k4 = await saveText();
      add('K4', 'New clears every month style', k4.indexOf('mvTextStyles') < 0 && k4.indexOf('"fmt"') < 0, {mv: k4.indexOf('mvTextStyles')}, 'absent');
    } else if(st === 'mvtextstyle'){
      // ---------------- RESTORE: the minted file ----------------
      el('view-month-btn').click(); await settle();
      await goTo('July 2026');
      var r1 = {ep: pill(/201/) ? look(pill(/201/)) : null, day: note('day', /Crew lunch/) ? look(note('day', /Crew lunch/)) : null,
                month: look(q('#table-wrap .mv-monthyear')), dow: look(qa('#table-wrap .mv-dowrow > .mv-dow')[1])};
      add('R1', 'the minted file draws its month styles: the episode bar (11 px italic, centred), the day note (9 px bold, cyan), the month name, the weekday row',
        !!r1.ep && r1.ep.fs === '11px' && r1.ep.i === 'italic' && !!r1.day && r1.day.fs === '9px' && r1.day.c === 'rgb(0, 255, 255)'
          && r1.month.c === 'rgb(192, 0, 0)' && r1.dow.c === 'rgb(0, 112, 192)', r1, 'styled');
      var ownTxt = await (await fetch('/tests/fixtures/mvtextstyle.sptcal')).text(), back = await saveText();
      add('R2', 'a Save of the restored file writes the same mvTextStyles and the same day note `fmt`',
        eq(JSON.parse(back).mvTextStyles, JSON.parse(ownTxt).mvTextStyles) && eq(((JSON.parse(back).dayNotes || {})['2026-07-08'] || [])[0], ((JSON.parse(ownTxt).dayNotes || {})['2026-07-08'] || [])[0]),
        null, 'same');
      // A hostile copy: what the sanitizer must drop, and only that.
      var p = T.openViaFakePicker('/tests/fixtures/mvtextstyle-bad.sptcal', 'mvtextstyle-bad.sptcal');
      for(var gg = 0; gg < 40; gg++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
      await p; await T.sleep(1200); await settle();
      el('view-month-btn').click(); await settle();
      await goTo('July 2026');
      var hb = JSON.parse(await saveText()), hm = hb.mvTextStyles || {};
      var hd = ((hb.dayNotes || {})['2026-07-08'] || [])[0] || {};
      var h1 = {kinds: Object.keys(hm).sort(), epColour: !!(hm.episode && hm.episode.ep1 && hm.episode.ep1.color),
                epSize: hm.episode && hm.episode.ep1 && hm.episode.ep1.size, bandHl: !!(hm.band && Object.keys(hm.band).some(function (k) { return 'highlight' in hm.band[k]; })),
                frameBad: !!(hm.frame && hm.frame.nope), dayFmt: hd.fmt || null, epItalic: !!(hm.episode && hm.episode.ep1 && hm.episode.ep1.italic)};
      add('R3', 'a hostile file: an unknown kind, a colour on an episode bar (N1), size 12 on a bar, a highlight on a band, a bad frame key and size 11 on a day note are each dropped; everything valid beside them stays',
        h1.kinds.indexOf('bogus') < 0 && !h1.epColour && h1.epSize === undefined && h1.epItalic && !h1.bandHl && !h1.frameBad && !!h1.dayFmt && h1.dayFmt.size === undefined && h1.dayFmt.bold === true,
        h1, 'dropped, the rest kept');
      // A calendar with NO mvTextStyles, loaded over the styled one: nothing of the styled one stays (restore unconditionally).
      var p2 = T.openViaFakePicker('/tests/fixtures/mvnotes.sptcal', 'mvnotes.sptcal');
      for(var g3 = 0; g3 < 40; g3++){ await T.sleep(100); if(/Load another calendar/.test(T.modalText())){ T.clickModalButton('Load'); break; } }
      await p2; await T.sleep(1200); await settle();
      var plain = await saveText();
      add('R5', 'a calendar with no mvTextStyles loaded over a styled one keeps none of its styles (restored unconditionally)',
        plain.indexOf('mvTextStyles') < 0 && el('show-title').value !== 'Hostile Show', {mv: plain.indexOf('mvTextStyles'), title: el('show-title').value}, 'none');
    }
    out.errors = (window.__ERR || []).slice(0, 10);
    if(st === 'mvtextstyle'){
      // The hostile copy's six planted values are COUNTED: the sanitizer's own warning names exactly six, and nothing else.
      var warn = out.errors.filter(function (x) { return /value\(s\) in this calendar were not in a form the app writes/.test(x); });
      add('R4', 'the sanitizer counts what it dropped: "6 value(s) ... ignored" for the six planted, and no other message',
        warn.length === 1 && /\b6 value/.test(warn[0]), warn, 'one warning, 6');
      out.errors = out.errors.filter(function (x) { return warn.indexOf(x) < 0; });
    }
    add('Z', 'no console errors', !out.errors.length, out.errors, []);
  } catch (e) { out.EX = String(e && e.stack || e); }
  T.done(out);
})(); });
