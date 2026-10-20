// phasecolors -- five stronger phase colours, APPENDED to PHASE_COLOR_OPTIONS (owner ruling 5, 20 Oct 2026; "Set A,
// stronger" by picker). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh phasecolors 300
//
// ⛔ The array's ORDER is save format: phaseColorOverride[key] and customPhaseDefs[].colorIndex are indices into
// it. So C0 holds the first nine to their old values IN ORDER, and the new five to indices 9-13.
//
// THE CALENDAR (synthetic: made-up 2027 dates, no region):
//   custom1..custom5  "Green Test" .. "Peach Test", Mon 3/1/27 x 3 weeks each, picked colours 9..13
//   post              Post, Mon 3/1/27 x 3, recoloured Peach (13) through its own swatch -> phaseColorOverride
//   Prep row          recoloured Strong blue (10) -> phaseColorOverride.episodePrep
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'phasecolors', cases: [] };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
  }
  async function step(id, fn) {
    try { await fn(); }
    catch (e) { kase(id, id + ' threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) }); }
  }
  function $(id) { return document.getElementById(id); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function sorted(o) { var r = {}; Object.keys(o || {}).sort().forEach(function (k) { r[k] = o[k]; }); return r; }
  var OLD = ['#EDEDED', '#DEEBF7', '#E4DFEC', '#D5F0EE', '#FFF2CC', '#DAE3F3', '#D6DCE5', '#E2F0D9', '#FBE5D6'];
  var NEW = [{ c: '#92D050', t: '#1E4620', n: 'Bright green' }, { c: '#5B9BD5', t: '#0B2545', n: 'Strong blue' },
             { c: '#FF66CC', t: '#5C0A3E', n: 'Pink' }, { c: '#FFFF00', t: '#5C5200', n: 'Yellow' }, { c: '#F4B084', t: '#6B2E0C', n: 'Peach' }];
  var NAMES = ['Green Test', 'Blue Test', 'Pink Test', 'Yellow Test', 'Peach Test'];
  var KEYS = ['custom1', 'custom2', 'custom3', 'custom4', 'custom5'];
  function rgbOf(hex) { var n = parseInt(hex.slice(1), 16); return 'rgb(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')'; }
  function hexOfRgb(s) { var m = String(s).match(/\d+/g); return m ? '#' + m.slice(0, 3).map(function (v) { return ('0' + (+v).toString(16)).slice(-2); }).join('').toUpperCase() : null; }
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function view(mode) { $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await settle(); }
  async function toMonth(label) {
    if (!document.querySelector('#table-wrap .mv-daygrid')) await view('month');
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 40; i++) {
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if (my === label) return settle();
      var btn = $(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if (!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  function popSwatches() { return Array.from(document.querySelectorAll('.phase-color-pop .pc-sw')); }
  // Open a swatch's picker and pick colour `i` with a HIT-TESTED click on the picker's own square.
  async function pick(swatchId, i) {
    var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tab) tab.click();
    await T.sleep(100);
    var sw = $(swatchId);
    if (!sw) throw new Error('no swatch #' + swatchId);
    sw.scrollIntoView({ block: 'center' });
    await T.sleep(100);
    sw.click();
    await T.until(function () { return popSwatches().length > 0; }, 'the colour picker', 30, 100);
    var p = popSwatches()[i];
    if (!p) throw new Error('the picker has no colour ' + i + ' (it has ' + popSwatches().length + ')');
    var r = p.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== p) throw new Error('colour ' + i + ' is not on top at its centre');
    hit.click();
    await settle();
  }
  function cellOf(key, w) { return document.querySelector('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"][data-week="' + w + '"]'); }
  async function inflated(u8) {
    var s = '', all = '';
    for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (u8[en - 1] === 10 || u8[en - 1] === 13)) en--;
      try { all += await new Response(new Blob([u8.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'))).text() + '\n'; }
      catch (e) { /* not a Flate stream */ }
    }
    return all;
  }
  // A fill as each writer spells it: the waterfall's pdfRgb (four fixed decimals), the month writer's rgb()
  // (four decimals, trailing zeros dropped).
  function wfRg(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return (v / 255).toFixed(4); }).join(' ') + ' rg'; }
  function mvRg(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return String(Math.round(v / 255 * 10000) / 10000); }).join(' ') + ' rg'; }
  var written = [];
  var saveHandle = { name: 'phasecolors.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'phasecolors.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return written[written.length - 1];
  }
  var loads = 0;
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'phasecolors-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function wfColours() {
    return KEYS.concat(['post']).map(function (k) { var td = cellOf(k, '2027-03-08'); return td ? { bg: hexOfRgb(td.style.background || getComputedStyle(td).backgroundColor), ink: hexOfRgb(getComputedStyle(td).color) } : null; });
  }

  try {
    await T.appReady();
    T.set('show-title', 'Colour Test'); T.set('season-num', '2'); T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-post', '2027-03-01'); T.set('weeks-post', '3');
    T.set('start-production', '2027-05-03');
    for (var i = 0; i < KEYS.length; i++) {
      $('add-phase-btn').click(); await T.sleep(100);
      T.set('name-' + KEYS[i], NAMES[i]); T.set('start-' + KEYS[i], '2027-03-01'); T.set('weeks-' + KEYS[i], '3');
    }
    await settle();

    await step('C0', async function () {
      var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tab) tab.click();
      $('swatch-custom1').click();
      await T.until(function () { return popSwatches().length > 0; }, 'the colour picker', 30, 100);
      var got = popSwatches().map(function (s) { return { c: hexOfRgb(s.style.background || getComputedStyle(s).backgroundColor), n: s.title }; });
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));    // an outside press closes it
      await T.sleep(200);
      kase('C0', 'the picker offers 14 colours: the old nine first, IN ORDER (save format), then Bright green, Strong blue, Pink, Yellow, Peach',
           got.length === 14 && same(got.slice(0, 9).map(function (g) { return g.c; }), OLD) &&
           same(got.slice(9).map(function (g) { return g.c + ' ' + g.n; }), NEW.map(function (n) { return n.c + ' ' + n.n; })),
           { got: got });
    });

    await step('C1', async function () {
      for (var i = 0; i < KEYS.length; i++) await pick('swatch-' + KEYS[i], 9 + i);
      await pick('swatch-post', 13);
      var cols = wfColours(), sw = KEYS.map(function (k) { return hexOfRgb(($('swatch-' + k) || {}).style.background); });
      kase('C1', 'each new colour, picked by a hit-tested click, fills its phase\'s waterfall cells with BLACK text, and repaints its sidebar swatch',
           same(cols, NEW.map(function (n) { return { bg: n.c, ink: '#000000' }; }).concat([{ bg: '#F4B084', ink: '#000000' }])) &&
           same(sw, NEW.map(function (n) { return n.c; })), { cells: cols, swatches: sw });
    });

    await step('C2', async function () {
      await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await xb.arrayBuffer());
      var fills = {};
      wb.eachSheet(function (ws) { ws.eachRow(function (row) { row.eachCell(function (c) {
        var v = c.value; if (typeof v !== 'string') return;
        var f = c.fill && c.fill.fgColor && c.fill.fgColor.argb;
        var name = NAMES.concat(['Post']).filter(function (n) { return v.indexOf(n) === 0; })[0];
        if (name) (fills[name] = fills[name] || {})[f] = true;
      }); }); });
      var want = {}; NAMES.forEach(function (n, i) { want[n] = { ['FF' + NEW[i].c.slice(1)]: true }; }); want.Post = { FFF4B084: true };
      kase('C2', 'Excel: every cell of each phase carries exactly its new colour as its fill',
           same(sorted(fills), sorted(want)), { fills: fills });
    });

    await step('C3', async function () {
      var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
      var ops = await inflated(new Uint8Array(await pb.arrayBuffer()));
      var found = NEW.map(function (n) { return ops.indexOf(wfRg(n.c)) >= 0; });
      kase('C3', 'the waterfall PDF fills with all five new colours', found.every(Boolean), { found: found, want: NEW.map(function (n) { return wfRg(n.c); }) });
    });

    await step('C4', async function () {
      await toMonth('March 2027');
      var bars = KEYS.map(function (k) { var b = document.querySelector('#table-wrap .mv-pill[data-ph="' + k + '"]'); return b ? { bg: hexOfRgb(getComputedStyle(b).backgroundColor), ink: hexOfRgb(getComputedStyle(b).color) } : null; });
      kase('C4', 'the month view: each bar is its new colour, inked in that colour\'s own dark text',
           same(bars, NEW.map(function (n) { return { bg: n.c, ink: n.t }; })), { bars: bars });
    });

    await step('C5', async function () {
      await toMonth('March 2027');
      var rec = T.fakeSavePicker();
      try {
        await T.sleep(700);
        $('export-btn').click();
        await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
      } finally { rec.restore(); }
      var mf = rec.files.filter(function (f) { return f.closed; })[0];
      var ops = await inflated(mf.bytes);
      var found = NEW.map(function (n) { return ops.indexOf(mvRg(n.c)) >= 0 && ops.indexOf(mvRg(n.t)) >= 0; });
      kase('C5', 'the written month PDF fills with all five new colours and sets their text inks', found.every(Boolean),
           { found: found, want: NEW.map(function (n) { return mvRg(n.c) + ' / ' + mvRg(n.t); }) });
      await view('sheet');
    });

    var saved;
    await step('C6', async function () {
      // The Prep row shows in the month view only; its swatch is beside Production's.
      await view('month');
      await pick('swatch-episodePrep', 10);
      var prepSw = hexOfRgb(($('swatch-episodePrep') || {}).style.background);
      await view('sheet');
      saved = await save();
      var s = JSON.parse(saved);
      kase('C6', 'Save keeps the indices: custom phases 9-13 in colorIndex, Post\'s 13 and the Prep row\'s 10 in phaseColorOverride',
           same(s.customPhaseDefs.map(function (c) { return c.colorIndex; }), [9, 10, 11, 12, 13]) &&
           s.phaseColorOverride.post === 13 && s.phaseColorOverride.episodePrep === 10 && prepSw === '#5B9BD5',
           { colorIndex: s.customPhaseDefs.map(function (c) { return c.colorIndex; }), override: s.phaseColorOverride, prepSwatch: prepSw });
    });

    await step('C7', async function () {
      $('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
      await settle();
      await load(saved);
      var cols = wfColours();
      kase('C7', 'Load (after New) brings every new colour back: the five custom phases and Post',
           same(cols, NEW.map(function (n) { return { bg: n.c, ink: '#000000' }; }).concat([{ bg: '#F4B084', ink: '#000000' }])),
           { cells: cols });
    });

    await step('C8', async function () {
      // Ten custom phases on a new calendar: the tenth's default is Gray (index 0) as it always was, never a new colour.
      $('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
      await settle();
      for (var j = 0; j < 12; j++) { $('add-phase-btn').click(); await T.sleep(60); }
      T.set('show-title', 'Rotation Test');
      await settle();
      var idx = JSON.parse(await save()).customPhaseDefs.map(function (c) { return c.colorIndex; });
      kase('C8', 'a new custom phase\'s default colour still cycles through the first nine only (0-8, then 0 again)',
           same(idx, [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2]), { colorIndex: idx });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'phasecolors threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
