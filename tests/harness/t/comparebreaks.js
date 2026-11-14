// comparebreaks -- Compare shows the all-phase hiatuses, and its exports name their reference column for a reader
// (audit 2026-11 item 2.10: AUD2-023, AUD2-024; decision D8 = c, defaults approved).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=compare-send ./run.sh comparebreaks 300
//
// tests/fixtures/compare-send.sptcal (synthetic, "Harbor Test" S3, Version v2, U.S. Area Standards) holds three
// scenarios of one calendar, "Scenario A" on screen:
//   "Scenario A"                   two locked all-phase hiatuses, 12/21/26 and 12/20/27, two weeks each;
//   "3-wk Xmas break"              the same with the first one THREE weeks;
//   "Var 9 long descriptive name"  the same as A plus a two-week break mid-shoot, from 8/10/26.
// Before the fix (measured on 2089aa5's build), Compare had no row for a hiatus at all (B1-B3 red), the exported
// column read "On screen" over or beside its name (N1, N2 red), and a long name shrank to fit while the short ones
// kept their size (N4, N5 red).
//
//   B1  Compare has an "All-phase hiatus" row: each hiatus as "12/21/26 – 1/1/27, 2 wks", one per line
//   B2  its chips: "1st hiatus longer by 1 wk" beside the 3-week one, "1 more hiatus" beside the mid-shoot one
//   B3  Only differences keeps it; a phase's own hiatus is not in it (all-phase only, the approved default)
//   B4  both exports carry the row and its chips
//   B5  the key facts band is unchanged (no hiatus tile), and Save writes no new key
//   N1  the PDF labels its first column "Baseline: Scenario A", and "On screen" is nowhere in it
//   N2  the workbook labels it the same, and "on screen" is nowhere in it; Copy table too
//   N3  on screen the window still measures from the tab on screen and says "On screen" (ruling D3 kept)
//   N4  every column name in the PDF is set at ONE size, wrapping rather than shrinking (Var 9 on screen)
//   N5  ...and still at twelve columns, at 6 pt or more
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function qa(s, r){ return [].slice.call((r || document).querySelectorAll(s)); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function cur(){ var c = document.querySelector('.sc-tab.is-current'); return c ? txt(c) : ''; }
  // A row of the window by its label: per column, its value lines and its chips.
  function compareRow(label){
    var tr = qa('.compare-dlg tbody tr').filter(function(r){ return r.children[0].innerText.trim() === label; })[0];
    return tr ? [].slice.call(tr.children).slice(1).map(function(td){
      return {lines: qa('p', td).map(function(p){ return p.innerText; }).join('\n').split('\n').map(function(s){ return s.trim(); }).filter(Boolean),
              chips: qa('.mantine-Badge-root', td).map(txt)};
    }) : null;
  }
  function rowLabels(){ return qa('.compare-dlg tbody tr').map(function(r){ return r.children[0].innerText.trim(); }); }
  function heads(){ return qa('.compare-dlg thead th').slice(1).map(function(th){ return th.innerText.replace(/\s+/g, ' ').trim(); }); }
  async function openCompare(){
    qa('.sc-strip button').filter(function(b){ return txt(b) === 'Compare'; })[0].click();
    await T.until(function(){ return !!document.querySelector('.compare-dlg .sc-compare-table'); }, 'the Compare window', 80, 100);
    await T.sleep(400);
  }
  async function closeCompare(){
    qa('.compare-dlg button').filter(function(b){ return txt(b) === 'Done'; })[0].click();
    await T.sleep(500);
  }
  function button(label){ return qa('.compare-dlg button').filter(function(b){ return txt(b) === label; })[0]; }
  async function exportBlob(label){
    var cap = T.captureDownload();
    try { button(label).click(); await T.until(cap.peek, 'the comparison ' + label, 150, 100); }
    finally { cap.stop(); }
    return cap.peek();
  }
  // The PDF's text, run by run, with its size and position (the list writer's "BT /F<wt> <size> Tf 1 0 0 1 x y Tm").
  async function pdfText(blob){
    var u8 = new Uint8Array(await blob.arrayBuffer()), runs = [];
    (await T.pdfInflated(u8)).forEach(function(t){
      var re = /BT \/F(\d+) ([\d.]+) Tf 1 0 \S+ 1 ([\d.-]+) ([\d.-]+) Tm \(((?:\\.|[^\\)])*)\) Tj ET/g, m;
      while((m = re.exec(t))) runs.push({wt: m[1], size: +m[2], x: +m[3], y: +m[4], s: unescapePdf(m[5])});
    });
    return runs;
  }
  // A PDF string literal back to text: "\(" -> "(", and WinAnsi's octal escapes (\226 is the en dash).
  var WINANSI = {0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C', 0x94: '\u201D', 0x96: '\u2013', 0x97: '\u2014', 0x85: '\u2026'};
  function unescapePdf(s){
    return s.replace(/\\([0-7]{3})|\\(.)/g, function(_, oct, ch){
      if(ch !== undefined) return ch;
      var c = parseInt(oct, 8); return WINANSI[c] || String.fromCharCode(c);
    });
  }
  // The heading row's runs: after the show title, before the first row label.
  function headRuns(runs, title){
    var a = runs.findIndex(function(r){ return r.s === title; }), b = runs.findIndex(function(r){ return r.s === 'Episodes'; });
    return a >= 0 && b > a ? runs.slice(a + 1, b) : [];
  }
  // The heading text per column, its runs grouped by x (one column's lines share their left edge).
  function headTexts(hr){
    var cols = {};
    hr.forEach(function(r){ var k = Math.round(r.x); (cols[k] = cols[k] || []).push(r); });
    return Object.keys(cols).map(Number).sort(function(a, b){ return a - b; }).map(function(k){
      return cols[k].sort(function(p, q){ return q.y - p.y; }).map(function(r){ return r.s; }).join(' ');
    });
  }
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
  // Every piece of text in the workbook (shared strings and inline strings), XML entities undone.
  function xlsxText(parts){
    var s = Object.keys(parts).filter(function(k){ return /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(k); }).map(function(k){ return parts[k]; }).join('\n');
    var out = [], re = /<t(?: [^>]*)?>([\s\S]*?)<\/t>/g, m;
    while((m = re.exec(s))) out.push(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'));
    return out;
  }
  function bandTiles(){ return qa('.sc-band-stat').map(function(s){ return txt(s.querySelector('.sc-band-lab')); }); }
  async function rename(name){
    await T.until(function(){ return !!document.querySelector('.sc-tab-input'); }, 'the rename box', 60, 100);
    var inp = document.querySelector('.sc-tab-input'); inp.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, name);
    inp.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    await T.until(function(){ return cur() === name; }, 'the tab named ' + name, 60, 100);
  }
  function addBtn(){ return document.querySelector('.sc-strip [aria-label="Duplicate this scenario"]') ||
                            qa('.sc-strip button').filter(function(b){ return /Scenario/.test(b.textContent); })[0]; }
  try {
    await T.appReady();
    await T.until(function(){ return qa('.sc-tab').length === 3 && qa('#table-wrap td.sheet-phase-cell').length > 0; }, 'the three scenarios and the grid', 200, 100);
    await T.sleep(1500);
    var bandBefore = bandTiles();

    await openCompare();
    var labels = rowLabels(), hi = compareRow('All-phase hiatus'), cols = heads();
    out.window = {cols: cols, labels: labels, hiatus: hi};
    add('B1', 'Compare has an "All-phase hiatus" row naming each hiatus by its dates and length, one per line',
      !!hi && hi[0].lines.join(' / ') === '12/21/26 – 1/1/27, 2 wks / 12/20/27 – 12/31/27, 2 wks'
        && hi[1].lines.join(' / ') === '12/21/26 – 1/8/27, 3 wks / 12/20/27 – 12/31/27, 2 wks'
        && hi[2].lines.join(' / ') === '8/10/26 – 8/21/26, 2 wks / 12/21/26 – 1/1/27, 2 wks / 12/20/27 – 12/31/27, 2 wks'
        && labels.indexOf('All-phase hiatus') > labels.indexOf('Wrap') && labels.indexOf('All-phase hiatus') < labels.indexOf('Weeks, first phase to last'),
      {labels: labels, row: hi}, 'A: 12/21/26 – 1/1/27, 2 wks / 12/20/27 – 12/31/27, 2 wks; the 3-week one 1/8/27; Var 9 three lines; after Wrap');
    add('B2', 'the row\'s chips say what differs: "1st hiatus longer by 1 wk", "1 more hiatus"; the column on screen has none',
      !!hi && hi[0].chips.length === 0 && hi[1].chips.join('|') === '1st hiatus longer by 1 wk' && hi[2].chips.join('|') === '1 more hiatus',
      {chips: hi && hi.map(function(c){ return c.chips; })}, '[] | 1st hiatus longer by 1 wk | 1 more hiatus');
    add('N3', 'on screen the window still measures from the tab on screen and tags it "On screen" (ruling D3 kept)',
      cols.length === 3 && /^Scenario A\s*On screen$/.test(cols[0]) && cols[1] === '3-wk Xmas break',
      {cols: cols}, 'Scenario A On screen | 3-wk Xmas break | Var 9 long descriptive name');

    // B3 -- Only differences keeps it.
    qa('.compare-dlg .sc-compare-onlydiff p')[0].click(); await T.sleep(400);
    var diffLabels = rowLabels();
    add('B3', 'Only differences keeps the hiatus row',
      diffLabels.indexOf('All-phase hiatus') !== -1, {rows: diffLabels}, 'All-phase hiatus among the rows');
    qa('.compare-dlg .sc-compare-onlydiff p')[0].click(); await T.sleep(300);

    // B4 / N1 / N2 -- the exports.
    var pdf = await exportBlob('Export PDF');
    var runs = await pdfText(pdf), all = runs.map(function(r){ return r.s; });
    out.pdfs = {compare: T.b64(await pdf.arrayBuffer())};
    var hr = headRuns(runs, 'Harbor Test'), ht = headTexts(hr);
    out.pdfHead = {runs: hr, texts: ht};
    var xl = await exportBlob('Export to Excel');
    out.xlsx = T.b64(await xl.arrayBuffer());
    var xt = xlsxText(await zipParts(xl));
    out.xlsxText = xt;
    var clip = null, realW = navigator.clipboard && navigator.clipboard.writeText;
    try {
      if(!navigator.clipboard) Object.defineProperty(navigator, 'clipboard', {value: {}, configurable: true});
      navigator.clipboard.writeText = function(t){ clip = t; return Promise.resolve(); };
      button('Copy table').click(); await T.sleep(200);
    } finally { if(realW) navigator.clipboard.writeText = realW; }
    out.copy = clip;
    add('B4', 'both exports carry the hiatus row and its chips',
      all.indexOf('All-phase hiatus') !== -1 && all.indexOf('12/21/26 – 1/8/27, 3 wks') !== -1
        && all.indexOf('1st hiatus longer by 1 wk') !== -1 && all.indexOf('1 more hiatus') !== -1
        && xt.indexOf('All-phase hiatus') !== -1 && xt.some(function(s){ return s.indexOf('12/21/26 – 1/8/27, 3 wks') !== -1; })
        && xt.some(function(s){ return s.indexOf('1st hiatus longer by 1 wk') !== -1; })
        && !!clip && /All-phase hiatus\t12\/21\/26 – 1\/1\/27, 2 wks; 12\/20\/27 – 12\/31\/27, 2 wks\t/.test(clip),
      {pdf: all.filter(function(s){ return /hiatus|wks/.test(s); }), xlsx: xt.filter(function(s){ return /hiatus|wks/.test(s); }),
       copy: clip && clip.split('\n').filter(function(l){ return /^All-phase/.test(l); })[0]}, 'in the PDF, the workbook and Copy table');
    add('N1', 'the PDF labels the first column "Baseline: Scenario A" and never says "On screen"',
      ht.length === 3 && ht[0] === 'Baseline: Scenario A' && ht[1] === '3-wk Xmas break' && ht[2] === 'Var 9 long descriptive name'
        && !all.some(function(s){ return /on screen/i.test(s); }),
      {head: ht, onScreen: all.filter(function(s){ return /on screen/i.test(s); })}, 'Baseline: Scenario A | 3-wk Xmas break | Var 9 long descriptive name');
    add('N2', 'the workbook and Copy table label it "Baseline: Scenario A" and never say "on screen"',
      xt.join('').indexOf('Baseline: Scenario A') !== -1 && !xt.some(function(s){ return /on screen/i.test(s); })
        && !!clip && clip.split('\n')[0] === '\tBaseline: Scenario A\t3-wk Xmas break\tVar 9 long descriptive name',
      {xlsx: xt.filter(function(s){ return /Baseline|on screen|Scenario A/i.test(s); }), copyHead: clip && clip.split('\n')[0]},
      'Baseline: Scenario A, no "on screen"');
    await closeCompare();

    // B5 -- the band and the file are untouched by the row.
    var bandAfter = bandTiles();
    var rec = T.fakeSavePicker(), saved = null;
    try {
      await T.sleep(700);
      document.getElementById('save-as-btn').click();
      await T.until(function(){ return rec.files.length > 0 && rec.files[0].closed; }, 'the Save As write', 100, 100);
      saved = new TextDecoder().decode(rec.files[0].bytes);
    } finally { rec.restore(); }
    var fileObj = saved ? JSON.parse(saved) : {};
    var fixture = await (await fetch('/tests/fixtures/compare-send.sptcal')).json();
    var keysOf = function(o){ return Object.keys(o).sort().join(','); };
    add('B5', 'the key facts band has no hiatus tile and is unchanged by Compare, and Save writes exactly the fixture\'s keys',
      bandBefore.length > 0 && bandBefore.join('|') === bandAfter.join('|') && !bandBefore.some(function(l){ return /iatus|break/i.test(l); })
        && !!saved && keysOf(fileObj) === keysOf(fixture) && !/"breaks"|"facts"/.test(saved)
        && (fileObj.scenarios.tabs || []).every(function(t){ return Object.keys(t).every(function(k){ return /^(id|name|snapshot)$/.test(k); }); }),
      {band: bandBefore, bandAfter: bandAfter, keysSaved: keysOf(fileObj) === keysOf(fixture), stray: /"breaks"|"facts"/.test(saved || '')},
      'band the same, no hiatus tile; the file\'s keys the fixture\'s');

    // N4 -- with the long name on screen, every column name is set at one size.
    qa('.sc-tab').filter(function(t){ return txt(t) === 'Var 9 long descriptive name'; })[0].click();
    await T.until(function(){ return cur() === 'Var 9 long descriptive name'; }, 'Var 9 on screen', 60, 100);
    await T.sleep(1200);
    await openCompare();
    var pdf2 = await exportBlob('Export PDF');
    var runs2 = await pdfText(pdf2), hr2 = headRuns(runs2, 'Harbor Test'), ht2 = headTexts(hr2);
    var sizes2 = hr2.map(function(r){ return r.size; }).filter(function(v, i, a){ return a.indexOf(v) === i; });
    out.pdfs.compareVar = T.b64(await pdf2.arrayBuffer());
    add('N4', 'Var 9 on screen: "Baseline: Var 9 long descriptive name", and every column name at one size',
      ht2[0] === 'Baseline: Var 9 long descriptive name' && sizes2.length === 1 && ht2.length === 3,
      {head: ht2, sizes: sizes2}, 'one size for every name');
    await closeCompare();

    // N5 -- twelve columns: duplicate Var 9 nine times.
    for(var i = 0; i < 9; i++){
      addBtn().click(); await rename('Var ' + (i + 10) + ' long descriptive name');
      await T.sleep(300);
    }
    await T.sleep(1200);
    await openCompare();
    var pdf12 = await exportBlob('Export PDF');
    var runs12 = await pdfText(pdf12), hr12 = headRuns(runs12, 'Harbor Test'), ht12 = headTexts(hr12);
    var sizes12 = hr12.map(function(r){ return r.size; }).filter(function(v, i, a){ return a.indexOf(v) === i; });
    out.pdfs.compare12 = T.b64(await pdf12.arrayBuffer());
    add('N5', 'twelve columns: every name whole, at one size of 6 pt or more (wrapped, not shrunk)',
      ht12.length === 12 && ht12[0] === 'Baseline: Var 18 long descriptive name' && sizes12.length === 1 && sizes12[0] >= 6 - 0.001
        && ht12.slice(1).every(function(s){ return /^(Scenario A|3-wk Xmas break|Var \d+ long descriptive name)$/.test(s); }),
      {head: ht12, sizes: sizes12, pages: T.pdfPages(new Uint8Array(await pdf12.arrayBuffer()))}, '12 whole names, one size');
    await closeCompare();
  } catch(e){
    add('ERR', 'the leg threw', false, String(e && e.stack || e), 'no error');
  }
  out.health = T.appHealth();
  out.cases = cases;
  out.pass = cases.filter(function(c){ return c.pass; }).length;
  out.fail = cases.filter(function(c){ return !c.pass; }).length;
  T.done(out);
})(); });
