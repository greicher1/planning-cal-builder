// dayfirstin -- a DAY-FIRST calendar READS typed and pasted dates day first (November 2026 audit, Batch 2 item 2.4:
// AUD2-066; the owner's decision D3 (a), 13 Nov 2026: "typed or pasted dates are read day first too"). From the audit's
// repro legs audit-vr10-dmyin / audit-r2a-dmy / audit-m2-pastedmy. Before, on DD/MM a waterfall line "Table read
// 17/7/26" sat on its week's Monday in the month view and the month PDF, the Day list stamped "8/27/26" beside a
// 24/8/2026 Date column, and Paste notes put 06/07/2026 on 7 June.
//   W1-W5  typed waterfall lines on their own day in the month view (W3: a line written month first is still read inside
//          its week; W4: a four-digit year is read too and the note is on its day (since 17 Nov 2026, notedates: a date
//          typed at the end of a one-line note is its Day, as if picked, owner's picker "Pin it"; it sat on Monday before); W5: edited in the month
//          editor, it stays on its day)
//   D1     the waterfall editor's Day list offers, stamps and places day first
//   P1-P2  Paste notes reads day first, says so in its hint, and previews day first
//   F1-F3  the SAME calendar back on MM/DD/YY reads exactly as it always did (the month-first control)
//   K1     the month PDF exports with no error
//   E0     no console error, no native alert
try{var o=JSON.parse(localStorage.getItem('sptcal.prefs')||'{}')||{};delete o.hiatusRipple;localStorage.setItem('sptcal.prefs',JSON.stringify(o));}catch(e){}
var T = window.__T, cases = [];
T.memoryIDB();
window.__alerts = []; window.alert = function (m) { window.__alerts.push(String(m)); };
window.addEventListener('load', function () { (async function () {
  var out = {cases: cases};
  function add(id, title, pass, observed, expected) { cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  async function settled() { var last = '', same = 0; for (var i = 0; i < 80 && same < 3; i++) { await T.sleep(100); var s = (byId('table-wrap') || {}).innerHTML || ''; if (s.length && s === last) same++; else { same = 0; last = s; } } }
  async function view(mode) {
    var on = mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); if (on) return;
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, mode, 100, 100); await settled();
  }
  async function toMonth(label) {
    await view('month'); var want = Date.parse('1 ' + label);
    for (var i = 0; i < 60; i++) { var my = txt(q('#table-wrap .mv-monthyear')); if (my === label) return settled();
      byId(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev').click(); await T.sleep(150); }
    throw new Error('never reached ' + label);
  }
  var RE = /Table read|Fitting|Wrap drinks|Cast dinner|Sound mix|Network call| P$/;
  function mvNotes() { return qa('#table-wrap .mv-note-block[data-note-day]').map(function (b) { return b.getAttribute('data-note-day') + ' | ' + txt(b); }).filter(function (s) { return RE.test(s); }); }
  async function census(months) { var r = []; for (var i = 0; i < months.length; i++) { await toMonth(months[i]); r = r.concat(mvNotes()); } await view('sheet'); return Array.from(new Set(r)).sort(); }
  function has(list, s) { return list.indexOf(s) >= 0; }
  async function paste(lines) {
    await view('month');
    await T.openSettings('prefs'); await T.sleep(300);
    var btn = qa('button').filter(function (b) { return /^Paste notes/.test(txt(b)) && b.offsetWidth; })[0];
    if (!btn) throw new Error('no Paste notes button');
    btn.click(); await T.until(function () { return q('.paste-notes-overlay textarea'); }, 'paste box', 40, 100);
    var r = {hint: txt(q('.paste-notes-overlay .paste-notes-hint')), placeholder: q('.paste-notes-overlay textarea').getAttribute('placeholder')};
    var pt = q('.paste-notes-overlay textarea');
    pt.value = lines.join('\n'); pt.dispatchEvent(new Event('input', {bubbles: true})); await T.sleep(300);
    r.preview = qa('.paste-notes-overlay .paste-row').map(txt);
    q('.paste-notes-add').click(); await T.sleep(700);
    try { T.closeSettings(); } catch (e) {}
    await settled();
    return r;
  }
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return q('table.sheet-table'); }, 'grid'); await settled();
    T.pickSelect('wf-date-format', 'd/m/yyyy'); await settled();
    out.dateCells = qa('#table-wrap td.sheet-date').map(txt).slice(0, 2);
    var lines = [['2026-07-13', 'Table read 17/7/26'], ['2026-07-27', 'Fitting 29/7/26'], ['2026-08-10', 'Wrap drinks 12/8/26'],
                 ['2026-08-03', 'Cast dinner 8/6/26'], ['2026-08-17', 'Sound mix 18/8/2026']];
    for (var i = 0; i < lines.length; i++) { await T.typeUserNote(lines[i][0], lines[i][1]); await settled(); }
    // The Day list, on a fresh week.
    var td = q('#table-wrap td.sheet-note-cell[data-week="2026-08-24"]'); T.openCell(td); await T.sleep(400);
    var pop = q('.note-pop'), ds = pop && q('.note-day-select', pop);
    out.dayOpts = ds ? Array.from(ds.options).map(function (o) { return o.value + '=' + o.text; }) : 'no day select';
    if (ds) { var ta = q('textarea', pop); ta.value = 'Network call'; ta.dispatchEvent(new Event('input', {bubbles: true}));
      ds.value = '2026-08-27'; ds.dispatchEvent(new Event('change', {bubbles: true})); out.stamped = ta.value;
      ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ctrlKey: true, bubbles: true})); await settled(); }
    out.cell824 = txt(q('#table-wrap td.sheet-note-cell[data-week="2026-08-24"]'));
    var dm = await census(['July 2026', 'August 2026']);
    out.dm = dm;
    add('W1', 'Table read 17/7/26 is drawn on Fri 17 Jul', has(dm, '2026-07-17 | Table read 17/7/26'), dm, '2026-07-17');
    add('W2', 'Fitting 29/7/26 on Wed 29 Jul, Wrap drinks 12/8/26 on Wed 12 Aug',
      has(dm, '2026-07-29 | Fitting 29/7/26') && has(dm, '2026-08-12 | Wrap drinks 12/8/26'), dm, '2026-07-29, 2026-08-12');
    add('W3', 'a line written month first (Cast dinner 8/6/26) is still read inside its week: Thu 6 Aug', has(dm, '2026-08-06 | Cast dinner 8/6/26'), dm, '2026-08-06');
    add('W4', 'a four-digit year (Sound mix 18/8/2026) is read too: the one-line note takes it as its Day and sits on Tue 18 Aug (it sat on Monday until 17 Nov 2026)', has(dm, '2026-08-18 | Sound mix 18/8/2026'), dm, '2026-08-18');
    add('D1', 'the Day list offers and stamps day first, and the stamped line is drawn on its day',
      Array.isArray(out.dayOpts) && out.dayOpts.indexOf('2026-08-27=Thu 27/8/26') >= 0 && out.stamped === 'Network call 27/8/26' &&
      out.cell824 === 'Network call 27/8/26' && has(dm, '2026-08-27 | Network call 27/8/26'),
      {opts: out.dayOpts, stamped: out.stamped, cell: out.cell824}, 'Thu 27/8/26; Network call 27/8/26 on 2026-08-27');

    // W5: edited in the month editor, the line stays on the day its date names.
    await toMonth('July 2026');
    var blk = qa('#table-wrap .mv-note-block[data-note-day="2026-07-17"]').filter(function (b) { return /Table read/.test(txt(b)); })[0];
    var w5 = null;
    if (blk) {
      blk.scrollIntoView({block: 'center'}); await T.sleep(80); blk.click(); await T.sleep(300);
      var mp = byId('mv-note-pop'), mta = mp && q('textarea', mp);
      if (mta) {
        mta.value = 'Table read (cast) 17/7/26'; mta.dispatchEvent(new Event('input', {bubbles: true}));
        mta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true})); await settled();
      }
      w5 = mvNotes().filter(function (s) { return /Table read/.test(s); });
    }
    await view('sheet');
    var c713 = txt(q('#table-wrap td.sheet-note-cell[data-week="2026-07-13"]'));
    add('W5', 'edited in the month editor, "Table read (cast) 17/7/26" stays on 17 Jul and the waterfall cell follows',
      !!w5 && w5.length === 1 && w5[0] === '2026-07-17 | Table read (cast) 17/7/26' && c713 === 'Table read (cast) 17/7/26',
      {month: w5, cell: c713}, '2026-07-17 | Table read (cast) 17/7/26');

    // P: Paste notes on the day-first calendar.
    var pr = await paste(['06/07/2026\tTable read P', '03/08/2026\tNetwork notes due P', '13/07/2026\tCast dinner P']);
    out.paste = pr;
    var pdm = await census(['July 2026', 'August 2026']);
    out.pasteDm = pdm;
    add('P1', 'pasted 06/07/2026, 03/08/2026 and 13/07/2026 land on 6 Jul, 3 Aug and 13 Jul (none refused)',
      has(pdm, '2026-07-06 | Table read P') && has(pdm, '2026-08-03 | Network notes due P') && has(pdm, '2026-07-13 | Cast dinner P') &&
      !pr.preview.some(function (l) { return /can’t read/.test(l); }),
      {where: pdm.filter(function (s) { return / P$/.test(s); }), preview: pr.preview}, '2026-07-06, 2026-08-03, 2026-07-13');
    add('P2', 'its hint, placeholder and preview read day first',
      /Dates as 20\/10\/26 or 2026-10-20/.test(pr.hint) && /^20\/10\/26, Table read/.test(pr.placeholder) &&
      pr.preview.some(function (l) { return /Mon 6\/7\/26/.test(l); }),
      {hint: pr.hint, placeholder: pr.placeholder, preview: pr.preview}, 'Dates as 20/10/26; Mon 6/7/26');

    // F: the same calendar back on MM/DD/YY reads as it always did.
    T.pickSelect('wf-date-format', ''); await settled();
    var mf = await census(['July 2026', 'August 2026']);
    out.mf = mf;
    // ⚠️ Re-expected 17 Nov 2026 (notedates, owner's picker "Pin it"): Wrap drinks was typed on DD/MM as a one-line note, so
    // its date is its Day, and back on MM/DD (where 12/8/26 is no day of its week) it stays on the 12 Aug it was typed for,
    // as a picked day always has. It went back to Monday before.
    add('F1', 'back on MM/DD/YY a one-line note typed day first (Wrap drinks 12/8/26) stays on the 12 Aug it was typed for (its Day); Cast dinner on 6 Aug; Network call on its pin',
      has(mf, '2026-08-12 | Wrap drinks 12/8/26') && has(mf, '2026-08-06 | Cast dinner 8/6/26') && has(mf, '2026-08-27 | Network call 27/8/26'),
      mf, 'Wrap drinks on 2026-08-12, Cast dinner on 2026-08-06, Network call on its pin 2026-08-27');
    await T.typeUserNote('2026-09-07', 'Mix 9/10/26'); await settled();
    var pf = await paste(['06/07/2026\tSpotting MF', '12/07/2026\tDelivery MF']);
    out.mf2 = {paste: pf};
    var RE2 = /Mix|MF/;
    var mf2b = []; for (var lab of ['June 2026', 'September 2026', 'December 2026']) { await toMonth(lab); mf2b = mf2b.concat(qa('#table-wrap .mv-note-block[data-note-day]').map(function (b) { return b.getAttribute('data-note-day') + ' | ' + txt(b); }).filter(function (s) { return RE2.test(s); })); }
    await view('sheet');
    out.mf2.where = mf2b;
    add('F2', 'month first: "Mix 9/10/26" on Thu 10 Sep; pasted 06/07/2026 on 7 Jun and 12/07/2026 on 7 Dec',
      has(mf2b, '2026-09-10 | Mix 9/10/26') && has(mf2b, '2026-06-07 | Spotting MF') && has(mf2b, '2026-12-07 | Delivery MF'),
      mf2b, 'as always');
    add('F3', 'month first: the paste hint and placeholder read 10/20/26, as always',
      /Dates as 10\/20\/26 or 2026-10-20/.test(pf.hint) && /^10\/20\/26, Table read/.test(pf.placeholder) && /10\/23\/26, Network/.test(pf.placeholder),
      {hint: pf.hint, placeholder: pf.placeholder}, 'Dates as 10/20/26');

    // K: the month PDF, on the day-first calendar.
    T.pickSelect('wf-date-format', 'd/m/yy'); await settled();
    await view('month');
    var rec = T.fakeSavePicker(), ok = false;
    try { await T.sleep(700); byId('export-btn').click();
      await T.until(function () { if (/character/i.test(T.modalText())) T.clickModalButton('Export'); return rec.files.some(function (f) { return f.closed; }); }, 'month pdf', 300, 100);
      ok = true;
    } finally { rec.restore(); }
    var mfile = rec.files.filter(function (f) { return f.closed; })[0];
    var bytes = mfile && (mfile.bytes.buffer ? new Uint8Array(mfile.bytes.buffer) : new Uint8Array(mfile.bytes));
    var runs = bytes ? await T.pdfRuns((T.pdfUnmark(bytes) || {}).writer || bytes) : [];
    out.mpdf = runs.filter(function (s) { return RE.test(s) || /Principal|Photography/.test(s); }).slice(0, 14);
    add('K1', 'the month PDF exports, its lines written day first',
      ok && runs.some(function (s) { return /Table read \(cast\) 17\/7\/26/.test(s); }) && runs.some(function (s) { return /\b29\/6\/26$/.test(s); }) && !runs.some(function (s) { return /\b6\/29\/26$/.test(s); }),
      out.mpdf, 'Table read (cast) 17/7/26; Start Principal Photography 29/6/26 (wrapped: its date run ends 29/6/26), never 6/29/26');

    add('E0', 'no console errors, no native alert', T.appHealth().errors.length === 0 && window.__alerts.length === 0,
        {errors: T.appHealth().errors, alerts: window.__alerts, modal: T.modalText()}, 'none');
  } catch (e) { add('EX', 'the leg threw', false, String(e && e.stack || e).slice(0, 500), 'no exception'); }
  T.done(out);
})(); });
