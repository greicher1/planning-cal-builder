// autonoterename -- an automatic note is RENAMED and stays automatic (owner, 30 Oct 2026: "Auto notes are labelled as
// "Auto Note" in the popup when you go to edit it and allow you to edit the name of it, without affecting its date and
// ability to move automatically"), and DELETING one switches it off instead of blanking its week
// (AUTO-NOTE-RENAME-PLAN.md, seven rulings by picker, 30 Oct - 2 Nov 2026). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=autonoterename ./run.sh autonoterename 500
//
// tests/fixtures/autonoterename.sptcal (synthetic, US Area Standards): Writer's Room from 1/5/26, Production from
// 6/29/26 (wraps 10/20/26), Post from 11/2/26 with "Post Begins" ticked on. The 11/2/26 week's note is typed text that
// carries the automatic line word for word ("Post Begins 11/2/26" + "Post kickoff 11/3/26"). Labor Day and
// Independence Day (Observed) are switched on for the waterfall, so the 6/29/26 week holds an automatic note AND a
// holiday.
//
//   S1  ON SCREEN an automatic note carries the ↻ mark and a holiday the ⚑ mark (frozen edit NS1), a typed line none
//   S2  no marked note overflows its box in any month (one the symbol would push past three lines goes without it)
//   S3  the print rollback renders no symbol (the month-PDF writer is held byte for byte by gate 13)
//   S4  narrowed, a holiday the symbol would push past three lines goes without it, and no text is cut off
//   A1  Start Principal Photography opens the AUTO NOTE editor: "6/29/26 · Auto Note", its name alone, a placeholder
//       saying clearing deletes it, a Delete Auto-Note button, the week's purple selected
//   A2  renamed "First Day of Shoot": the month view, the waterfall cell (beside the holiday) and the file follow, and
//       no waterfall note is written (it stays automatic)
//   A3  it moves with the schedule: Production from 7/6/26 puts "First Day of Shoot 7/6/26" in that week, and back
//   A4  red picked on it colours it alone in the month view (frozen edit H1); the holiday beside it stays purple
//   X1  the workbook prints the new name
//   M1  the written month PDF draws the new name and the red
//   O1  renaming "Post Begins" rewrites it inside the typed note that carries it, which keeps its own line
//   F1  Save writes autoNoteNames and autoNoteColors (sorted, keyed by kind) and nothing else new; Load brings both
//       back, and a file without them shows neither
//   F2  a bad name or colour in a file is dropped on Load, and the repair is reported
//   W1  renaming Writer's Room Opens in the WATERFALL's editor renames the note and the cell stays automatic
//   W2  taking "Post Starts" out of its waterfall cell deletes the note (Post Begins switched off), the typed line stays
//   D0  Delete Auto-Note on the wrap: gone from both views, switched off, and no week blank
//   D1  clearing an Auto Note's text deletes it the same way, its name with it
//   D2  Delete on the waterfall cell holding the start AND the holiday: the cell empties, the note is switched off,
//       the holiday is hidden from the waterfall only (still in the month view, still a day off), no week blank
//   U1  one undo puts the whole cell back; redo empties it again
//   P1  a note pasted over that cell replaces both lines the same way, and is the week's typed note
//   R1  Reset Notes clears the typed notes and leaves the Automatic notes switches alone
//   G1  a month-view drag out and back changes nothing; one to another day makes the note typed text there and
//       switches it off, so moving Production brings no second copy
//   E0  no console errors, apart from the one warning F2's values are meant to raise
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'autonoterename', cases: [] };
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
  // The month view's waterfall-kind blocks on a day, as text, and one of them by its text.
  function lines(day) { return qa('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="' + day + '"]').map(txt); }
  function block(day, re) { return qa('#table-wrap .mv-note-block[data-note-kind="wf"][data-note-day="' + day + '"]').filter(function (b) { return re.test(txt(b)); })[0] || null; }
  function bg(el) { return el ? getComputedStyle(el).backgroundColor : null; }
  async function openMv(day, re) {
    var b = block(day, re); if (!b) throw new Error('no block matching ' + re + ' on ' + day);
    b.scrollIntoView({ block: 'center' }); await T.sleep(100);
    b = block(day, re);
    b.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, button: 0, detail: 2 }));
    await T.until(function () { return !!byId('mv-note-pop'); }, 'the month note editor', 40, 50);
    return byId('mv-note-pop');
  }
  async function commitMv(pop, value, key, swatch) {
    var ta = q('textarea', pop);
    if (swatch) { var sw = q('.color-swatch[title="' + swatch + '"]', pop); if (!sw) throw new Error('no swatch ' + swatch); sw.click(); await T.sleep(100); }
    if (value !== undefined) { ta.value = value; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    ta.dispatchEvent(new KeyboardEvent('keydown', key === 'Tab' ? { key: 'Tab', bubbles: true, cancelable: true } : { key: 'Enter', bubbles: true, cancelable: true }));
    await settle();
  }
  function holidayRow(re) { return qa('#holiday-vis-list .hv-label').filter(function (e) { return re.test(e.title || ''); })[0] || null; }
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellText(wk) { var t = noteTd(wk); return t ? ((t.querySelector('.cell-body') || t).innerText || '').replace(/\s*\n\s*/g, '\n').trim() : null; }
  async function undo() { byId('undo-btn').click(); await settle(); }
  async function redo() { byId('redo-btn').click(); await settle(); }

  // ---- Save and Load through the real controls ----------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'autonoterename.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'autonoterename.sptcal', { lastModified: 1 }); },
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
    var stem = 'autonoterename-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  function repairWarnings() { return (T.appHealth().errors || []).filter(function (e) { return /were not in a form the app writes/.test(String(e)); }).length; }
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

  var PURPLE = 'rgb(112, 48, 160)', RED = 'rgb(255, 0, 0)';
  var IND = 'independence-day-observed@2026';
  function mid(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function pe(type, p) {
    var o = { bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
      buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true };
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new PointerEvent(type, o));
    if (type === 'pointerup') t.dispatchEvent(new MouseEvent('click', o));
  }
  function bodyFocus() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  async function pick(el) { el.scrollIntoView({ block: 'center', inline: 'nearest' }); await T.sleep(80); var p = mid(el); pe('pointerdown', p); pe('pointerup', p); await T.sleep(250); bodyFocus(); }
  function press(k) { (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
  function pasteText(text) {
    var dt = new DataTransfer(); dt.setData('text/plain', text);
    (document.activeElement || document.body).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }
  async function wfEdit(wk, fn) {
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(noteTd(wk)); await T.sleep(300);
    var pop = q('.note-pop'); if (!pop) throw new Error('the waterfall note editor did not open on ' + wk);
    var ta = q('textarea', pop);
    ta.value = fn(ta.value);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await settle();
  }
  async function setField(id, value) {
    var el = byId(id); el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  }
  function un(s, wk) { return !!(s.userNotes && Object.prototype.hasOwnProperty.call(s.userNotes, wk)); }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!q('#table-wrap table.sheet-table') || !!q('#table-wrap .mv-daygrid'); }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var S0 = JSON.parse(await save());

    // ===== S1-S2: the note symbol, on screen only (frozen edit NS1) =================================================
    function markOf(b) { return !b ? null : b.classList.contains('mv-note-mark-auto') ? 'auto' : b.classList.contains('mv-note-mark-holiday') ? 'holiday' : '-'; }
    await step('S1', async function () {
      await toMonth('July 2026');
      var start = block('2026-06-29', /^Start Principal Photography/), hol = block('2026-07-04', /^Independence Day 7/);
      var cs = start ? { pad: getComputedStyle(start).paddingLeft } : {}, b4 = start ? getComputedStyle(start, '::before') : null;
      var be = b4 ? { width: b4.width, mask: b4.webkitMaskImage || b4.maskImage || '' } : {};
      await toMonth('November 2026');
      var post = block('2026-11-02', /^Post Begins/), typed = block('2026-11-03', /^Post kickoff/);
      kase('S1', 'on screen an automatic note carries the ↻ mark and a holiday the ⚑ mark, a typed line none; the symbol is an 8px mask in 10px of extra left padding',
           markOf(start) === 'auto' && markOf(hol) === 'holiday' && markOf(post) === 'auto' && markOf(typed) === '-'
             && cs.pad === '14px' && be.width === '8px' && /svg/.test(be.mask),
           { start: markOf(start), holiday: markOf(hol), post: markOf(post), typed: markOf(typed), pad: cs.pad, symbol: be.width });
    });
    // Cut off = the TEXT ends below the inside of its box. (Every one-lane note hides its own 2 px of bottom padding,
    // marked or not, so scrollHeight against clientHeight is no test.)
    function textClipped(b) {
      var r = document.createRange(); r.selectNodeContents(b);
      var tr = r.getBoundingClientRect(), br = b.getBoundingClientRect();
      return tr.bottom > br.bottom - 1 + 0.5;
    }
    await step('S2', async function () {
      var bad = [], marked = 0, plain = 0, plainBad = [];
      var months = ['January 2026', 'June 2026', 'July 2026', 'September 2026', 'October 2026', 'November 2026'];
      for (var i = 0; i < months.length; i++) {
        await toMonth(months[i]);
        qa('#table-wrap .mv-note-block').forEach(function (b) {
          var m = b.classList.contains('mv-note-mark');
          if (m) marked++; else plain++;
          if (textClipped(b)) (m ? bad : plainBad).push(months[i] + ': ' + txt(b));
        });
      }
      kase('S2', 'no marked note has its text cut off in any month shown (one the symbol would push past three lines goes without it); nor does any unmarked one',
           marked >= 5 && plain >= 1 && bad.length === 0 && plainBad.length === 0, { marked: marked, plain: plain, cut: bad, plainCut: plainBad });
    });
    await step('S3', async function () {
      T.monthPrintPath(true);
      var printed = false, marks = -1;
      var realPrint = window.print;
      window.print = function () { printed = true; marks = document.querySelectorAll('#print-root .mv-note-mark').length; };
      try {
        byId('export-btn').click();
        await T.until(function () { return printed; }, 'the print path\'s print call', 100, 100);
      } finally { window.print = realPrint; T.monthPrintPath(false); window.dispatchEvent(new Event('afterprint')); await settle(); }
      kase('S3', 'the print rollback renders no symbol (the month PDF writer is held byte for byte by gate 13)', printed && marks === 0, { printed: printed, marks: marks });
    });

    // S4 makes the case S2 cannot meet at this window's width: the calendar narrowed until "Independence Day (Observed)
    // 7/3/26" fills its three lines, so the symbol's room would push it onto a fourth (the browser pane showed it, 88 px
    // days). It must go without its symbol, and nothing anywhere may be cut off.
    await step('S4', async function () {
      var tw = byId('table-wrap'), w0 = tw.style.width;
      var r = null, cut = null;
      try {
        tw.style.width = '640px';
        await view('sheet'); await view('month'); await toMonth('July 2026');
        var obs = block('2026-07-03', /^Independence Day \(Observed\)/), hol = block('2026-07-04', /^Independence Day 7/);
        r = { observed: markOf(obs), observedCut: obs ? textClipped(obs) : null, day: obs && obs.clientWidth, jul4: markOf(hol) };
        cut = qa('#table-wrap .mv-note-block').filter(textClipped).map(txt);
      } finally {
        tw.style.width = w0;
        await view('sheet'); await view('month');
      }
      kase('S4', 'narrowed, a holiday the symbol would push past three lines is drawn without it, a shorter one keeps its ⚑, and no text is cut off',
           r.observed === '-' && r.observedCut === false && r.jul4 === 'holiday' && cut.length === 0, { narrow: r, cut: cut });
    });

    // ===== A1-A4: rename and colour Start Principal Photography in the month view ==================================
    await step('A1', async function () {
      await toMonth('June 2026');
      var pop = await openMv('2026-06-29', /^Start Principal Photography/);
      var ta = q('textarea', pop), sel = q('.color-swatch.selected', pop), del = q('.note-pop-delete', pop);
      kase('A1', 'Start Principal Photography opens the Auto Note editor: "6/29/26 · Auto Note", its name alone, a placeholder saying clearing deletes it, a Delete Auto-Note button, the week\'s purple selected',
           txt(q('.mv-note-pop-day', pop)) === '6/29/26 · Auto Note' && ta.value === 'Start Principal Photography'
             && /delete/i.test(ta.placeholder) && !!del && txt(del) === 'Delete Auto-Note' && !!sel && sel.title === 'Purple',
           { heading: txt(q('.mv-note-pop-day', pop)), text: ta.value, placeholder: ta.placeholder, button: del && txt(del), selected: sel && sel.title });
      await commitMv(pop, 'First Day of Shoot');
    });
    await step('A2', async function () {
      var m = lines('2026-06-29'), s = JSON.parse(await save());
      await view('sheet');
      var c = cellText('2026-06-29');
      kase('A2', 'renamed: the month view, the waterfall cell (beside the holiday) and the file follow, and no waterfall note is written',
           same(m, ['First Day of Shoot 6/29/26']) && c === 'First Day of Shoot 6/29/26\nIndependence Day (Observed) 7/3/26'
             && same(s.autoNoteNames, { principalStart: 'First Day of Shoot' }) && !un(s, '2026-06-29'),
           { month: m, cell: c, names: s.autoNoteNames, userNote: s.userNotes && s.userNotes['2026-06-29'] });
    });
    await step('A3', async function () {
      await setField('start-production', '2026-07-06');
      var moved = { jul6: cellText('2026-07-06'), jun29: cellText('2026-06-29') };
      await setField('start-production', '2026-06-29');
      var back = cellText('2026-06-29');
      kase('A3', 'it moves with the schedule: Production from 7/6/26 puts "First Day of Shoot 7/6/26" in that week, and back',
           /^First Day of Shoot 7\/6\/26/.test(moved.jul6 || '') && !/First Day/.test(moved.jun29 || '')
             && back === 'First Day of Shoot 6/29/26\nIndependence Day (Observed) 7/3/26', { moved: moved, back: back });
    });
    await step('A4', async function () {
      await toMonth('June 2026');
      var pop = await openMv('2026-06-29', /^First Day of Shoot/);
      await commitMv(pop, undefined, 'Enter', 'Red');
      await toMonth('July 2026');
      var start = block('2026-06-29', /^First Day of Shoot/), hol = block('2026-07-03', /^Independence Day/);
      kase('A4', 'red colours the automatic note alone (frozen edit H1); the holiday in its week stays purple',
           bg(start) === RED && bg(hol) === PURPLE, { start: bg(start), holiday: bg(hol) });
    });

    // ===== X1, M1: the writers ======================================================================================
    await step('X1', async function () {
      await view('sheet');
      await T.sleep(700);
      var b = await T.captureExport('export-btn', 'the workbook');
      var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await b.arrayBuffer());
      var found = [];
      wb.worksheets[0].eachRow({ includeEmpty: false }, function (row) {
        row.eachCell({ includeEmpty: false }, function (c) { if (typeof c.value === 'string' && /Photography|First Day/.test(c.value)) found.push(c.value); });
      });
      kase('X1', 'the workbook prints the new name', found.some(function (v) { return /First Day of Shoot 6\/29\/26/.test(v); })
           && !found.some(function (v) { return /Start Principal Photography/.test(v); }), { found: found });
    });
    await step('M1', async function () {
      await view('month');
      var all = await monthPdfStreams();
      kase('M1', 'the written month PDF draws the new name and the red',
           all.indexOf('First Day of Shoot') !== -1 && /(^|[^\d.])1 0 0 rg/.test(all), { name: all.indexOf('First Day of Shoot') !== -1, red: /(^|[^\d.])1 0 0 rg/.test(all) });
    });

    // ===== O1: a rename reaches the typed note that carries the line ===============================================
    await step('O1', async function () {
      await toMonth('November 2026');
      var pop = await openMv('2026-11-02', /^Post Begins/);
      var head = txt(q('.mv-note-pop-day', pop));
      await commitMv(pop, 'Post Starts');
      var s = JSON.parse(await save());
      await view('sheet');
      var c = cellText('2026-11-02');
      kase('O1', 'renaming "Post Begins" rewrites it inside the typed note that carries it, which keeps its own line',
           head === '11/2/26 · Auto Note' && c === 'Post Starts 11/2/26\nPost kickoff 11/3/26'
             && s.userNotes['2026-11-02'].text === 'Post Starts 11/2/26\nPost kickoff 11/3/26' && s.autoNoteNames.postStart === 'Post Starts',
           { heading: head, cell: c, userNote: s.userNotes['2026-11-02'], names: s.autoNoteNames });
    });

    // ===== F1-F2: the file ==========================================================================================
    var savedText = null;
    await step('F1', async function () {
      savedText = await save();
      var s = JSON.parse(savedText);
      var added = Object.keys(s).filter(function (k) { return !(k in S0); }).sort();
      var idsSame = same(Object.keys(s.fields.byId).sort(), Object.keys(S0.fields.byId).sort());
      var w0 = repairWarnings();
      await load(JSON.stringify(S0));
      await view('sheet');
      var plain = cellText('2026-06-29');
      await load(savedText);
      await view('sheet');
      var back = cellText('2026-06-29');
      kase('F1', 'Save writes autoNoteNames and autoNoteColors, keyed by kind, and nothing else new; Load brings both back (and a file without them shows neither)',
           same(added, ['autoNoteColors', 'autoNoteNames']) && JSON.stringify(s.autoNoteNames) === JSON.stringify({ postStart: 'Post Starts', principalStart: 'First Day of Shoot' })
             && same(s.autoNoteColors, { principalStart: '#FF0000' }) && idsSame
             && plain === 'Start Principal Photography 6/29/26\nIndependence Day (Observed) 7/3/26'
             && back === 'First Day of Shoot 6/29/26\nIndependence Day (Observed) 7/3/26' && repairWarnings() === w0,
           { added: added, names: s.autoNoteNames, colors: s.autoNoteColors, idsSame: idsSame, withoutKeys: plain, loaded: back, warnings: repairWarnings() - w0 });
    });
    await step('F2', async function () {
      var s = JSON.parse(savedText);
      s.autoNoteNames.principalWrap = 42; s.autoNoteColors.postStart = 'red';
      var w0 = repairWarnings();
      await load(JSON.stringify(s));
      var s2 = JSON.parse(await save());
      kase('F2', 'a name that is not text and a colour that is not one are dropped on Load (the good ones kept), and the repair is reported',
           JSON.stringify(s2.autoNoteNames) === JSON.stringify({ postStart: 'Post Starts', principalStart: 'First Day of Shoot' })
             && same(s2.autoNoteColors, { principalStart: '#FF0000' }) && repairWarnings() > w0,
           { names: s2.autoNoteNames, colors: s2.autoNoteColors, warnings: repairWarnings() - w0 });
      await load(savedText);
    });

    // ===== W1-W2: the waterfall's own editor ========================================================================
    await step('W1', async function () {
      await view('sheet');
      var before = cellText('2026-01-05');
      await wfEdit('2026-01-05', function (v) { return v.replace("Writer's Room Opens 1/5/26", 'Room Opens 1/5/26'); });
      var after = cellText('2026-01-05'), s = JSON.parse(await save());
      kase('W1', 'renaming Writer\'s Room Opens in the waterfall\'s editor renames the note, and the cell stays automatic',
           before === "Writer's Room Opens 1/5/26" && after === 'Room Opens 1/5/26' && !un(s, '2026-01-05') && s.autoNoteNames.writersRoomOpens === 'Room Opens',
           { before: before, after: after, userNote: s.userNotes && s.userNotes['2026-01-05'], names: s.autoNoteNames });
    });
    await step('W2', async function () {
      await wfEdit('2026-11-02', function (v) { return v.split('\n').filter(function (l) { return !/^Post Starts/.test(l.trim()); }).join('\n'); });
      var c = cellText('2026-11-02'), s = JSON.parse(await save());
      kase('W2', 'taking "Post Starts" out of its waterfall cell deletes the note (Post Begins switched off, its name gone), and the typed line stays',
           c === 'Post kickoff 11/3/26' && !('autoNotesOn' in s) && !('postStart' in (s.autoNoteNames || {}))
             && s.userNotes['2026-11-02'].text === 'Post kickoff 11/3/26',
           { cell: c, autoNotesOn: s.autoNotesOn, names: s.autoNoteNames, userNote: s.userNotes['2026-11-02'] });
    });

    // ===== D0-D2: deleting ==========================================================================================
    await step('D0', async function () {
      await toMonth('October 2026');
      var pop = await openMv('2026-10-20', /^Principal Photography Wraps/);
      q('.note-pop-delete', pop).click();
      await settle();
      var m = lines('2026-10-20'), s = JSON.parse(await save());
      await view('sheet');
      var c = cellText('2026-10-19');
      kase('D0', 'Delete Auto-Note on the wrap: gone from both views, switched off, and no week blank',
           !byId('mv-note-pop') && same(m, []) && (c === '' || c === '+') && s.autoNotesOff && s.autoNotesOff.principalWrap === true && !un(s, '2026-10-19'),
           { month: m, cell: c, autoNotesOff: s.autoNotesOff, userNote: s.userNotes && s.userNotes['2026-10-19'] });
    });
    await step('D1', async function () {
      await toMonth('January 2026');
      var pop = await openMv('2026-01-05', /^Room Opens/);
      await commitMv(pop, '');
      var m = lines('2026-01-05'), s = JSON.parse(await save());
      kase('D1', 'clearing an Auto Note\'s text deletes it the same way, its name with it',
           same(m, []) && s.autoNotesOff.writersRoomOpens === true && !('writersRoomOpens' in (s.autoNoteNames || {})) && !un(s, '2026-01-05'),
           { month: m, autoNotesOff: s.autoNotesOff, names: s.autoNoteNames, userNote: s.userNotes && s.userNotes['2026-01-05'] });
    });
    var wrapBefore = null;
    await step('D2', async function () {
      await view('sheet');
      wrapBefore = JSON.parse(await save()).fields.byId;
      await pick(noteTd('2026-06-29'));
      press('Delete'); await settle();
      var c = cellText('2026-06-29'), s = JSON.parse(await save());
      await toMonth('July 2026');
      var m = { jun29: lines('2026-06-29'), jul3: lines('2026-07-03') };
      kase('D2', 'Delete on the cell holding the start AND a holiday: it empties, the note is switched off, the holiday is hidden from the waterfall only (still in the month view, still a day off), no week blank',
           (c === '' || c === '+') && s.autoNotesOff.principalStart === true && !('principalStart' in (s.autoNoteNames || {})) && !('autoNoteColors' in s)
             && s.holidayView[IND] && s.holidayView[IND].sheet === false && !un(s, '2026-06-29') && !Object.keys(s.holidayOff || {}).length
             && same(m.jun29, []) && same(m.jul3, ['Independence Day (Observed) 7/3/26']),
           { cell: c, autoNotesOff: s.autoNotesOff, names: s.autoNoteNames, colors: s.autoNoteColors, holiday: s.holidayView[IND], userNote: s.userNotes && s.userNotes['2026-06-29'], holidayOff: s.holidayOff, month: m });
    });
    await step('U1', async function () {
      await view('sheet');
      bodyFocus();
      await undo();
      var a = cellText('2026-06-29');
      await redo();
      var b = cellText('2026-06-29');
      kase('U1', 'one undo puts the whole cell back (name and both lines); redo empties it again',
           a === 'First Day of Shoot 6/29/26\nIndependence Day (Observed) 7/3/26' && (b === '' || b === '+'), { undone: a, redone: b });
      await undo();
    });
    await step('P1', async function () {
      await pick(noteTd('2026-06-29'));
      pasteText('Shoot day one'); await settle();
      var c = cellText('2026-06-29'), s = JSON.parse(await save());
      kase('P1', 'a note pasted over the cell replaces both lines the same way, and is the week\'s typed note',
           c === 'Shoot day one' && s.autoNotesOff.principalStart === true && s.holidayView[IND].sheet === false
             && JSON.stringify(s.userNotes['2026-06-29']) === JSON.stringify({ text: 'Shoot day one' }),
           { cell: c, autoNotesOff: s.autoNotesOff, holiday: s.holidayView[IND], userNote: s.userNotes['2026-06-29'] });
    });
    await step('R1', async function () {
      byId('tb-notes-reset-btn').click();
      await settle();
      var s = JSON.parse(await save());
      var c = { jun29: cellText('2026-06-29'), oct19: cellText('2026-10-19'), nov2: cellText('2026-11-02') };
      kase('R1', 'Reset Notes clears the typed notes and leaves the Automatic notes switches alone',
           !Object.keys(s.userNotes || {}).length && s.autoNotesOff.principalStart === true && s.autoNotesOff.principalWrap === true
             && (c.jun29 === '' || c.jun29 === '+') && (c.oct19 === '' || c.oct19 === '+') && (c.nov2 === '' || c.nov2 === '+'),
           { userNotes: s.userNotes, autoNotesOff: s.autoNotesOff, cells: c });
    });

    // ===== G1-G2: the month view's note drag =======================================================================
    // Press on a note, move the pointer through days (each a day's "+" cell, re-found every step: the grid redraws
    // live), and let go.
    async function dragNote(day, re, via) {
      var b = block(day, re); if (!b) throw new Error('no block matching ' + re + ' on ' + day);
      b.scrollIntoView({ block: 'center' }); await T.sleep(150);
      b = block(day, re);
      var at = mid(b);
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, button: 0, buttons: 1 }));
      for (var i = 0; i < via.length; i++) {
        var t = q('#table-wrap .mv-note-add[data-note-day="' + via[i] + '"]'); if (!t) throw new Error('no day cell for ' + via[i]);
        var to = mid(t);
        for (var k = 1; k <= 5; k++) {
          window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, buttons: 1, clientX: at.x + (to.x - at.x) * k / 5, clientY: at.y + (to.y - at.y) * k / 5 }));
          await T.sleep(60);
        }
        at = to;
      }
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: at.x, clientY: at.y }));
      await settle();
    }
    await step('G1', async function () {
      await load(JSON.stringify(S0));
      await toMonth('June 2026');
      await dragNote('2026-06-29', /^Start Principal Photography/, ['2026-07-01', '2026-06-29']);
      var s0 = JSON.parse(await save()), back = lines('2026-06-29');
      await dragNote('2026-06-29', /^Start Principal Photography/, ['2026-07-01']);
      var s = JSON.parse(await save()), m = lines('2026-07-01');
      await setField('start-production', '2026-07-06');
      await toMonth('July 2026');
      var jul6 = lines('2026-07-06');
      kase('G1', 'a drag out and back changes nothing; an automatic note dragged to another day becomes typed text there and is switched off, so moving Production brings no second copy',
           same(back, ['Start Principal Photography 6/29/26']) && !('autoNotesOff' in s0)
             && same(m, ['Start Principal Photography 7/1/26']) && s.autoNotesOff && s.autoNotesOff.principalStart === true
             && /^Start Principal Photography 7\/1\/26/.test(((s.userNotes || {})['2026-06-29'] || {}).text || '')
             && !jul6.some(function (l) { return /Principal Photography/.test(l); }),
           { outAndBack: back, offAfterOutAndBack: s0.autoNotesOff, jul1: m, autoNotesOff: s.autoNotesOff, userNote: (s.userNotes || {})['2026-06-29'], jul6: jul6 });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (F2\'s repair warning aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'autonoterename threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
