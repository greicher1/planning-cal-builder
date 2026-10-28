// seasons -- two or more seasons ticked in Show info, named in every header (owner, 27 Oct 2026: "being able to select
// two or more seasons in the Show info input and having those seasons translate to the header"; picker: "Tick any
// seasons", "S3 & S4"). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh seasons 400
//
// Show info's Season is still the native #season-num, but its list is a dropdown with a checkbox per season
// (SeasonPop.jsx; owner, the same day: "keep the selector as a drop down menu with the checkboxes inside the drop
// down"). The select keeps the FIRST ticked season (the save format's season, which episode numbering reads) and reads
// "Seasons 3 & 4" with two ticked; the snapshot's `seasons` key holds every ticked season, written only with two or
// more. Header text only: "S3", "S3 & S4", "S3, S4 & S5", in the waterfall's title line, the month view's
// title, Excel, both PDFs and the {season} / {titleSeason} tokens.
//
// THE CALENDAR (synthetic: made-up 2027 dates, no region, so no holidays), titled "Seasons Test".
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'seasons', cases: [] };
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
  var TITLE = 'Seasons Test';
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function view(mode) { $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await settle(); }
  function sel() { return $('season-num'); }
  // What the closed field says: the selected option's text ("—", "Season 3", "Seasons 3 & 4").
  function shown() { var e = sel(); return e.selectedIndex >= 0 ? e.options[e.selectedIndex].text : ''; }
  function panel() { return document.querySelector('.season-pop'); }
  function rows() { return panel() ? Array.from(panel().querySelectorAll('[data-season]')) : []; }
  // ⚠️ HARNESS ONLY: after a Load through the fake picker, #file-menu is CLOSED (its button says aria-expanded="false")
  // but its dropdown is still drawn over the top of the sidebar, because its closing transition never completes in
  // headless Chrome (measured 27 Oct 2026: display block at 153,50 280x293). A user's window finishes it. That one case
  // is let through; anything else on top fails.
  function onTop(el) {
    var r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    var menuBtn = document.querySelector('.file-menu-btn');
    if (hit && hit !== el && !el.contains(hit) && hit.closest('#file-menu') && menuBtn && menuBtn.getAttribute('aria-expanded') === 'false') return el;
    return hit;
  }
  var lastDownPrevented = null;
  // A real press on the field, hit-tested: mousedown is what SeasonPop answers (and must preventDefault, which is
  // what keeps Chrome's own list shut).
  async function openPanel() {
    if (panel()) return;
    var e = sel(); e.scrollIntoView({ block: 'center' });
    var hit = onTop(e);
    if (hit !== e) throw new Error('the Season field is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    var r = e.getBoundingClientRect(), ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 10 });
    e.dispatchEvent(ev); lastDownPrevented = ev.defaultPrevented;
    await T.until(function () { return !!panel(); }, 'the Season dropdown', 30, 50);
  }
  function key(k) { var ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); sel().dispatchEvent(ev); return ev; }
  async function closePanel() {
    if (!panel()) return;
    key('Escape');
    await T.until(function () { return !panel(); }, 'the Season dropdown to close', 30, 50);
  }
  // The ticked seasons, as the dropdown shows them (opened and closed again if it was shut).
  async function ticked() {
    var was = !!panel();
    await openPanel();
    var t = rows().filter(function (r) { return r.getAttribute('aria-selected') === 'true'; }).map(function (r) { return +r.getAttribute('data-season'); });
    if (!was) await closePanel();
    return t;
  }
  // A real click on a row, hit-tested, then the dropdown is closed again the way a user leaves it.
  async function clickTick(n) {
    await openPanel();
    var row = panel().querySelector('[data-season="' + n + '"]');
    if (!row) throw new Error('no Season ' + n + ' row');
    var hit = onTop(row);
    if (!hit || !(hit === row || row.contains(hit))) throw new Error('the Season ' + n + ' row is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.click();
    await settle();
    await closePanel();
  }
  function wfLine(hid) { return txt(document.querySelector('#table-wrap .hdr-line[data-hid="' + hid + '"]')); }
  function epNames() { return Array.from(document.querySelectorAll('.ep-name')).map(function (e) { return e.value; }); }
  async function state() { return { ticks: await ticked(), select: sel().value, shown: shown(), c1: wfLine('c1'), ep: epNames()[0] || '' }; }
  async function pdfRuns(u8) {
    var s = '', runs = [];
    for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    var re = /stream\r?\n/g, m;
    while ((m = re.exec(s))) {
      var st = m.index + m[0].length, en = s.indexOf('endstream', st);
      if (en < 0) continue;
      while (en > st && (u8[en - 1] === 10 || u8[en - 1] === 13)) en--;   // DecompressionStream rejects the EOL
      try {
        var ds = new Blob([u8.subarray(st, en)]).stream().pipeThrough(new DecompressionStream('deflate'));
        var t = await new Response(ds).text(), tj = /\(((?:\\.|[^\\)])*)\) Tj/g, x;
        while ((x = tj.exec(t))) runs.push(x[1].replace(/\\(.)/g, '$1'));
      } catch (e) { /* not a Flate stream */ }
    }
    return runs;
  }
  // The written month PDF (the direct writer, through its real Save dialog), its text runs joined by spaces.
  async function monthPdfText() {
    await view('month');
    var rec = T.fakeSavePicker();
    try {
      await T.sleep(700);
      $('export-btn').click();
      await T.until(function () { return rec.files.some(function (f) { return f.closed; }); }, 'the month PDF write', 300, 100);
    } finally { rec.restore(); }
    var mf = rec.files.filter(function (f) { return f.closed; })[0];
    var runs = await pdfRuns(mf.bytes);
    await view('sheet');
    return runs.join(' ');
  }
  var written = [];
  var saveHandle = { name: 'seasons.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'seasons.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var last = written[written.length - 1];
    return typeof last === 'string' ? last : last.text;   // a loaded file's handle records {file, text}
  }
  var loads = 0;
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'seasons-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function idSet(snapText) { return Object.keys(JSON.parse(snapText).fields.byId).sort(); }
  function seasonOf(snapText) { var s = JSON.parse(snapText); return { byId: (s.fields.byId['season-num'] || {}).value, seasons: s.seasons }; }

  try {
    await T.appReady();
    T.set('show-title', TITLE);
    T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-writersRoom', '2027-01-04'); T.set('weeks-writersRoom', '8');
    T.set('start-prePrep', '2027-03-01'); T.set('weeks-prePrep', '4');
    T.set('start-prodPrep', '2027-03-29'); T.set('weeks-prodPrep', '5');
    T.set('start-production', '2027-05-03');
    T.set('start-post', '2027-07-05'); T.set('weeks-post', '12');
    T.set('start-localization', '2027-09-27'); T.set('weeks-localization', '4');
    await settle();

    await step('S1', async function () {
      var e = sel(), card = e && e.closest('section.card');
      var closed = { tag: e.tagName, display: getComputedStyle(e).display, label: txt(card && card.querySelector('label[for="season-num"]')),
                     shown: shown(), options: e.options.length, inputs: document.querySelectorAll('input[data-season]').length };
      await openPanel();
      var p = panel(), pr = p.getBoundingClientRect(), er = e.getBoundingClientRect();
      var names = rows().map(txt), on = rows().filter(function (r) { return r.getAttribute('aria-selected') === 'true'; }).length;
      var ids = Array.from(p.querySelectorAll('[id]')).map(function (x) { return x.id; });
      var fields = p.querySelectorAll('input, select, textarea').length;
      var place = { below: pr.top >= er.bottom - 1, left: Math.abs(pr.left - er.left) <= 1, wide: pr.width >= er.width - 1,
                    inView: pr.bottom <= window.innerHeight, inRoot: !!p.closest('#react-root'), boxes: p.querySelectorAll('.season-box').length };
      await closePanel();
      kase('S1', 'Show info keeps the native Season select (label "Season", showing "—", 11 options, swept into fields.byId); pressing it is preventDefault\'d and opens the dropdown instead: ten rows "Season 1"-"Season 10", each with a box, none ticked, no id and no form field inside, under the field, as wide, fully on screen, in #react-root; Escape closes it',
           closed.tag === 'SELECT' && closed.display !== 'none' && closed.label === 'Season' && closed.shown === '—' && closed.options === 11 &&
           closed.inputs === 0 && ('season-num' in T.formSignature()) && lastDownPrevented === true &&
           same(names, ['Season 1', 'Season 2', 'Season 3', 'Season 4', 'Season 5', 'Season 6', 'Season 7', 'Season 8', 'Season 9', 'Season 10']) &&
           on === 0 && ids.length === 0 && fields === 0 && place.below && place.left && place.wide && place.inView && place.inRoot && place.boxes === 10 && !panel(),
           { closed: closed, prevented: lastDownPrevented, names: names, ids: ids, fields: fields, place: place });
    });

    await step('S1b', async function () {
      sel().focus();
      var opener = key('ArrowDown');
      await T.until(function () { return !!panel(); }, 'the dropdown from the keyboard', 30, 50);
      var opened = { prevented: opener.defaultPrevented, value: sel().value, hi: txt(panel().querySelector('.sp-hi')) };
      key('ArrowDown'); key('ArrowDown'); await T.sleep(100);
      var hi3 = txt(panel().querySelector('.sp-hi'));
      key(' '); await settle();
      var on = { value: sel().value, shown: shown(), box: !!panel() && panel().querySelector('[data-season="3"]').getAttribute('aria-selected') };
      key(' '); await settle();
      var off = { value: sel().value, shown: shown() };
      key('Escape'); await T.sleep(200);
      kase('S1b', 'the keyboard: ArrowDown on the field opens the dropdown WITHOUT changing the value (highlight on Season 1); two ArrowDowns reach Season 3; Space ticks it ("Season 3") and Space again unticks it; Escape closes and the field keeps focus',
           opened.prevented && opened.value === '' && opened.hi === 'Season 1' && hi3 === 'Season 3' &&
           same(on, { value: '3', shown: 'Season 3', box: 'true' }) && same(off, { value: '', shown: '—' }) &&
           !panel() && document.activeElement === sel(), { opened: opened, hi3: hi3, on: on, off: off, closedNow: !panel() });
    });

    var saveOne;
    await step('S2', async function () {
      await clickTick(3);
      var s = await state();
      saveOne = await save();
      kase('S2', 'ticking Season 3: the hidden select takes "3", the title reads "Seasons Test S3", episodes number 301, and the file has no `seasons` key (one season saves as it always did)',
           same(s, { ticks: [3], select: '3', shown: 'Season 3', c1: TITLE + ' S3', ep: 'Episode 301' }) && same(seasonOf(saveOne), { byId: '3' }),
           { state: s, file: seasonOf(saveOne) });
    });

    var saveTwo;
    await step('S3', async function () {
      await clickTick(4);
      var s = await state();
      await view('month');
      var mv = txt(document.querySelector('#table-wrap .mv-title'));
      await view('sheet');
      saveTwo = await save();
      kase('S3', 'ticking Season 4 too: "Seasons Test S3 & S4" in the waterfall title and the month view\'s; the select keeps "3", so episodes still number 301; Save writes seasons [3,4] beside season-num "3", with the SAME field ids',
           same(s, { ticks: [3, 4], select: '3', shown: 'Seasons 3 & 4', c1: TITLE + ' S3 & S4', ep: 'Episode 301' }) &&
           mv === TITLE + ' S3 & S4 Full Prelim Production Calendar' &&
           same(seasonOf(saveTwo), { byId: '3', seasons: [3, 4] }) && same(idSet(saveTwo), idSet(saveOne)),
           { state: s, month: mv, file: seasonOf(saveTwo) });
    });

    await step('S4', async function () {
      await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await xb.arrayBuffer());
      var heads = [];   // exportExcel writes the title into the PAGE HEADER (&L / &C / &R sections), not a cell
      wb.eachSheet(function (ws) { heads.push((ws.headerFooter && ws.headerFooter.oddHeader) || ''); });
      var pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF blob');
      var wfPdf = (await pdfRuns(new Uint8Array(await pb.arrayBuffer()))).join(' ');
      var mvPdf = await monthPdfText();
      var hd = heads.join(' | ');
      kase('S4', 'the exports: Excel\'s page header, the waterfall PDF and the written month PDF all read "Seasons Test S3 & S4"',
           hd.indexOf(TITLE + ' S3 && S4') !== -1 && wfPdf.indexOf(TITLE + ' S3 & S4') !== -1 && /S3 & S4/.test(mvPdf),
           { excel: (hd.match(/.{0,40}Seasons.{0,40}/) || [hd.slice(0, 200)])[0], wfPdf: wfPdf.indexOf(TITLE + ' S3'), mvPdf: (mvPdf.match(/.{0,30}S3.{0,30}/) || [''])[0] });
    });

    // Frozen edit A1 (owner's picker, 27 Oct 2026): exportExcel writes a typed & as && (Excel's printed &) where it
    // used to delete it, and its 255-character shave never splits a pair. A title of 120 &s doubles to 240 header
    // characters, so the shave must cut it, and every cut point inside the run is tried by the loop's arithmetic.
    async function excelHeader() {
      var xb = await T.captureExport('export-btn', 'the .xlsx blob');
      var wb = new window.ExcelJS.Workbook(), heads = [];
      await wb.xlsx.load(await xb.arrayBuffer());
      wb.eachSheet(function (ws) { heads.push((ws.headerFooter && ws.headerFooter.oddHeader) || ''); });
      return heads[0] || '';
    }
    await step('S4b', async function () {
      T.set('show-title', 'Law & Order'); await settle();
      var law = await excelHeader();
      T.set('show-title', 'A' + new Array(121).join('&')); await settle();
      var long = await excelHeader();
      var cut = (long.match(/A&*…/) || [''])[0], amps = cut.replace(/[^&]/g, '').length;
      T.set('show-title', TITLE); await settle();
      kase('S4b', 'Excel keeps a typed &: "Law & Order" is written "Law && Order"; a title of 120 &s is shaved to fit 255 characters and the cut leaves an EVEN run of & before the ellipsis (no lone escape code)',
           law.indexOf('Law && Order S3 && S4') !== -1 && long.length <= 255 && cut !== '' && amps % 2 === 0,
           { law: (law.match(/Law.{0,24}/) || [''])[0], longLen: long.length, cutAmps: amps });
    });

    await step('S5', async function () {
      await clickTick(5);
      var three = await state();
      await clickTick(3);
      var noFirst = await state();
      kase('S5', 'three seasons read "S3, S4 & S5"; unticking Season 3 leaves "S4 & S5", and the select (and with it the episode numbers) moves to the first left, 401',
           same(three, { ticks: [3, 4, 5], select: '3', shown: 'Seasons 3, 4 & 5', c1: TITLE + ' S3, S4 & S5', ep: 'Episode 301' }) &&
           same(noFirst, { ticks: [4, 5], select: '4', shown: 'Seasons 4 & 5', c1: TITLE + ' S4 & S5', ep: 'Episode 401' }),
           { three: three, noFirst: noFirst });
    });

    await step('S6', async function () {
      $('undo-btn').click(); await settle();
      var undone = await state();
      $('redo-btn').click(); await settle();
      var redone = await state();
      kase('S6', 'ONE undo brings Season 3 back (ticks, select, title, episodes); redo takes it out again',
           same(undone, { ticks: [3, 4, 5], select: '3', shown: 'Seasons 3, 4 & 5', c1: TITLE + ' S3, S4 & S5', ep: 'Episode 301' }) &&
           same(redone, { ticks: [4, 5], select: '4', shown: 'Seasons 4 & 5', c1: TITLE + ' S4 & S5', ep: 'Episode 401' }),
           { undone: undone, redone: redone });
    });

    await step('S7', async function () {
      await load(saveTwo);
      var two = await state();
      await load(saveOne);
      var m5 = await state();
      kase('S7', 'Load: the two-season file opens with Seasons 3 and 4 ticked; the one-season file, loaded after it, opens with Season 3 alone (the M-5 trap: never the previous file\'s ticks)',
           same(two, { ticks: [3, 4], select: '3', shown: 'Seasons 3 & 4', c1: TITLE + ' S3 & S4', ep: 'Episode 301' }) &&
           same(m5, { ticks: [3], select: '3', shown: 'Season 3', c1: TITLE + ' S3', ep: 'Episode 301' }), { two: two, m5: m5 });
    });

    await step('S8', async function () {
      var s = JSON.parse(saveTwo);
      s.headerMode = 'manual'; s.headerTemplates = true;
      s.headerManual = { left: '', l2: '', l3: '', c1: '{titleSeason}', c2: 'Seasons: {season}', c3: '', c4: '', r1: '', r2: '', r3: '' };
      await load(JSON.stringify(s));
      kase('S8', 'Template mode: {titleSeason} reads "Seasons Test S3 & S4" and {season} reads "S3 & S4"',
           wfLine('c1') === TITLE + ' S3 & S4' && wfLine('c2') === 'Seasons: S3 & S4', { c1: wfLine('c1'), c2: wfLine('c2') });
    });

    await step('S9', async function () {
      var s = JSON.parse(saveOne);
      s.headerMode = 'auto'; delete s.headerTemplates; delete s.headerManual;
      s.seasons = [5, 2, 2, 11, 'x', 2.5];
      await load(JSON.stringify(s));
      var st = await state(), after = seasonOf(await save());
      var warn = (T.appHealth().errors || []).filter(function (e) { return /were not in a form the app writes/.test(e); });
      kase('S9', 'a file edited by hand (seasons [5, 2, 2, 11, "x", 2.5] beside season-num "3"): the four bad entries are dropped and counted (one warning, "4 value(s)"), the list wins as [2, 5], and the select takes 2, so the title and the saved file agree',
           same(st, { ticks: [2, 5], select: '2', shown: 'Seasons 2 & 5', c1: TITLE + ' S2 & S5', ep: st.ep }) && same(after, { byId: '2', seasons: [2, 5] }) &&
           warn.length === 1 && /\b4 value\(s\)/.test(warn[0]), { state: st, saved: after, warn: warn });
    });

    await step('S10', async function () {
      T.set('season-num', '6'); await settle();
      var s = await state();
      kase('S10', 'setting the select directly (as the harness and the old dropdown did) means ONE season: the boxes and the field follow it',
           same(s.ticks, [6]) && s.select === '6' && s.shown === 'Season 6' && s.c1 === TITLE + ' S6', { state: s });
    });

    await step('S11', async function () {
      var text = await (await fetch('/tests/fixtures/v1.8.0-saved.sptcal')).text();
      var want = (JSON.parse(text).fields.byId['season-num'] || {}).value || '';
      await load(text);
      var s = await state();
      kase('S11', 'a REAL v1.8.0 calendar opens with its one season ticked (' + (want || 'none') + ') and nothing else',
           same(s.ticks, want ? [+want] : []) && s.select === want && s.shown === (want ? 'Season ' + want : '—'), { want: want, state: s });
    });

    await step('S12', async function () {
      await clickTick(9);
      $('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
      await settle();
      var t = await ticked();
      kase('S12', 'New, after a calendar with two seasons ticked, starts with no tick and no season ("—")', same(t, []) && sel().value === '' && shown() === '—',
           { ticked: t, select: sel().value, shown: shown() });
    });

    // S9's warning is the sanitizer doing its job on a file built to be bad; S9 asserts it. Nothing else may appear.
    var errs = (T.appHealth().errors || []).filter(function (e) { return !/were not in a form the app writes/.test(e); });
    kase('E0', '0 console errors (beside S9\'s expected warning)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'seasons threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
