// exportnames -- every export's file name carries the season beside the title, then the Date Last Edited and the
// Version, so a revised plan never downloads under yesterday's name (audit 2026-11 item 2.10: AUD2-025; decision D8 = c,
// default approved: title, season, Date Last Edited as yyyy-mm-dd, the Version when one is set; "Planning Calendar" and
// the scenario suffix stay, both ruled). ⭐ The season sits BESIDE THE TITLE since 16 Nov 2026 (owner-approved frozen
// edits S1b / S2b, the name line in exportExcel and exportWaterfallPdfDirect: exportFileName()).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=compare-send ./run.sh exportnames 300
//
// tests/fixtures/compare-send.sptcal (synthetic): "Harbor Test", Season 3, Version v2, three scenarios, "Scenario A"
// on screen, each tab with its own Date Last Edited: A 10/1/26, "3-wk Xmas break" 10/5/26, "Var 9 long descriptive
// name" 10/3/26 (all at 12:00 UTC, so the same calendar day in any zone from UTC-11 to UTC+11).
// Before audit 2.10 (measured on 2089aa5's build) every name was "<title> Planning Calendar – <scenario>" and the like,
// whatever the plan held, so X1-X7 were red (X5: the revised plan took the old one's name). ⚠️ RE-EXPECTED 16 Nov 2026
// for the season beside the title: on the v1.15.0 build ("Harbor Test Planning Calendar S3 2026-10-01 v2 – Scenario A")
// X1-X5, X7 and X8 are red; X6 has no season, so its name is the same either way.
//
//   X1  the waterfall PDF: "Harbor Test S3 Planning Calendar 2026-10-01 v2 – Scenario A.pdf"
//   X2  the workbook:      "Harbor Test S3 Planning Calendar 2026-10-01 v2 – Scenario A.xlsx"
//   X3  the month PDF:     "Harbor Test S3 Month Calendar 2026-10-01 v2 – Scenario A.pdf"
//   X4  Compare's PDF and workbook: "Harbor Test S3 Scenario Comparison 2026-10-05", the NEWEST tab's date, no Version
//   X5  an edit moves the date to today: a second waterfall PDF of the changed plan is named for it, unlike X1
//   X8  two seasons ticked (Season 3 and 4, through the Season dropdown): "Harbor Test S3 & S4 Planning Calendar
//       <today> v2 – Scenario A.xlsx", the header's own "S3 & S4" beside the title
//   X6  no season and no Version: "Harbor Test Planning Calendar <today> – Scenario A.xlsx"
//   X7  Help's example names the new shape, "Show Title S1 Planning Calendar 2026-11-12 v3.xlsx"
//   X9  ⭐ ADDED 16 Nov 2026 (WIN-5, owner's picker "Cut long titles"): a 200-character title is cut to 150 characters
//       at a word in the workbook's and the waterfall PDF's names (exportFileName() cuts what the frozen lines hand it)
//   X10 a title of exactly 150 characters is kept whole
//       X9 is red on a build without the cut (the whole 200 characters in both names); X10 is green either way.
//   ⭐ RE-EXPECTED 18 Nov 2026 (owner's picker, from the execs' ask): the Writers' Room Open date after the season,
//       "Harbor Test S3 WRO 1.5.26 Planning Calendar …", in X1-X3, X5, X6, X8-X10 and Help's example (X7); Compare (X4)
//       leaves it out, its tabs can open the room on different days. On v1.17.0 every one of those is red.
//   X11 a DD/MM calendar: "WRO 5.1.26", day first as its header
//   X12 no Writers' Room date: no "WRO" in the name
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function qa(s, r){ return [].slice.call((r || document).querySelectorAll(s)); }
  function txt(e){ return ((e && e.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function el(id){ return document.getElementById(id); }
  var now = new Date(), today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  // The name a download is given, without letting it download.
  async function downloadName(click, label){
    var name = null, realK = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function(){ if(this.download){ name = this.download; return; } return realK.call(this); };
    try { click(); await T.until(function(){ return name; }, label, 200, 100); }
    finally { HTMLAnchorElement.prototype.click = realK; }
    return name;
  }
  async function exportName(btnId){ await T.sleep(1000); return downloadName(function(){ el(btnId).click(); }, 'the #' + btnId + ' download'); }
  function compareButton(label){ return qa('.compare-dlg button').filter(function(b){ return txt(b) === label; })[0]; }
  async function settle(){ await T.sleep(1200); }
  try {
    await T.appReady();
    await T.until(function(){ return qa('.sc-tab').length === 3 && qa('#table-wrap td.sheet-phase-cell').length > 0; }, 'the three scenarios and the grid', 200, 100);
    await settle();
    var stem = 'Harbor Test S3 WRO 1.5.26 Planning Calendar 2026-10-01 v2 – Scenario A';

    var pdf1 = await exportName('export-wf-pdf-btn');
    add('X1', 'the waterfall PDF carries the season beside the title, then the Date Last Edited and the Version, then the scenario',
      pdf1 === stem + '.pdf', {name: pdf1}, stem + '.pdf');
    var xl1 = await exportName('export-btn');
    add('X2', 'the workbook is named the same way', xl1 === stem + '.xlsx', {name: xl1}, stem + '.xlsx');

    // X3 -- the month PDF, through the Save dialog.
    el('view-month-btn').click(); await settle();
    var rec = T.fakeSavePicker(), month = null;
    try {
      await T.sleep(1000);
      el('export-btn').click();
      await T.until(function(){ return rec.calls.length > 0; }, 'the month PDF Save dialog', 300, 100);
      month = rec.calls[0].suggestedName;
      await T.until(function(){ return rec.files.length > 0 && rec.files[0].closed; }, 'the month PDF write', 100, 100).catch(function(){});
    } finally { rec.restore(); }
    var mStem = 'Harbor Test S3 WRO 1.5.26 Month Calendar 2026-10-01 v2 – Scenario A';
    add('X3', 'the month PDF is named the same way', month === mStem + '.pdf', {name: month}, mStem + '.pdf');
    el('view-sheet-btn').click(); await settle();

    // X4 -- Compare.
    qa('.sc-strip button').filter(function(b){ return txt(b) === 'Compare'; })[0].click();
    await T.until(function(){ return !!document.querySelector('.compare-dlg .sc-compare-table'); }, 'the Compare window', 80, 100);
    await T.sleep(400);
    var cmpPdf = await downloadName(function(){ compareButton('Export PDF').click(); }, 'the comparison PDF');
    var cmpXl = await downloadName(function(){ compareButton('Export to Excel').click(); }, 'the comparison workbook');
    compareButton('Done').click(); await T.sleep(500);
    var cStem = 'Harbor Test S3 Scenario Comparison 2026-10-05';
    add('X4', 'Compare\'s exports carry the season beside the title and the newest Date Last Edited of any tab (no Version: each tab has its own)',
      cmpPdf === cStem + '.pdf' && cmpXl === cStem + '.xlsx', {pdf: cmpPdf, xlsx: cmpXl}, cStem + '.pdf / .xlsx');

    // X5 -- a revised plan is named for its new date.
    T.set('start-production', '2026-07-06'); await settle();
    var pdf2 = await exportName('export-wf-pdf-btn');
    var want2 = 'Harbor Test S3 WRO 1.5.26 Planning Calendar ' + today + ' v2 – Scenario A.pdf';
    add('X5', 'after an edit the waterfall PDF takes today\'s date, so the revised plan never shares the old one\'s name',
      pdf2 === want2 && pdf2 !== pdf1, {first: pdf1, revised: pdf2}, want2);

    // X8 -- two seasons: Season 4 ticked in the Season dropdown beside Season 3, as a user does (a press on the field
    // opens SeasonPop's list; a row's click ticks it). The name says "S3 & S4", the header's own, beside the title.
    var sel = el('season-num'), sr = sel.getBoundingClientRect();
    sel.scrollIntoView({block: 'center'}); sr = sel.getBoundingClientRect();
    sel.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true, clientX: sr.left + 10, clientY: sr.top + 10}));
    await T.until(function(){ return !!document.querySelector('.season-pop [data-season="4"]'); }, 'the Season dropdown', 30, 50);
    document.querySelector('.season-pop [data-season="4"]').click();
    await settle();
    sel.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
    await T.until(function(){ return !document.querySelector('.season-pop'); }, 'the Season dropdown to close', 30, 50).catch(function(){});
    await settle();
    var xl2 = await exportName('export-btn');
    var want8 = 'Harbor Test S3 & S4 WRO 1.5.26 Planning Calendar ' + today + ' v2 – Scenario A.xlsx';
    add('X8', 'two seasons ticked: the name carries "S3 & S4" beside the title, as the header does',
      xl2 === want8, {name: xl2, seasonShown: sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].text}, want8);

    // X6 -- no season, no Version: neither leaves anything behind in the name.
    T.set('season-num', ''); T.set('show-version', ''); await settle();
    var xl3 = await exportName('export-btn');
    var want3 = 'Harbor Test WRO 1.5.26 Planning Calendar ' + today + ' – Scenario A.xlsx';
    add('X6', 'no season and no Version: neither is in the name, and nothing is left behind for them',
      xl3 === want3, {name: xl3}, want3);

    // X9 / X10 -- a very long show title (audit 2026-11 WIN-5; owner's picker 16 Nov 2026, "Cut long titles"). The
    // workbook and the waterfall PDF are named by frozen lines that hand their safe title to exportFileName(), which
    // cuts it as every other name is cut: to 150 characters, back to the last space when one is in the last 30, never
    // ending in a space, dot or dash. The rule is written out again here, so the leg checks the names against the
    // ruling, not against the app's own helper.
    function cutTitle(t){
      if(t.length <= 150) return t;
      var c = t.slice(0, 150), sp = c.lastIndexOf(' ');
      if(sp >= 120) c = c.slice(0, sp);
      return c.replace(/[\s.,;:\u2013\u2014-]+$/, '');
    }
    var words = 'Harbor Test The Very Long Working Title Of The Limited Series As The Network Wrote It In The Deal Memo';
    var long = words; while(long.length < 200) long += ' ' + words;
    long = long.slice(0, 200).trim();
    T.set('show-title', long); await settle();
    var xl9 = await exportName('export-btn');
    var pdf9 = await exportName('export-wf-pdf-btn');
    var head9 = cutTitle(long), want9 = head9 + ' WRO 1.5.26 Planning Calendar ' + today + ' – Scenario A';
    add('X9', 'a 200-character title is cut to fit a file name (150 characters, at a word) in the workbook\'s and the waterfall PDF\'s names, and the rest of each name is whole',
      long.length === 200 && head9.length <= 150 && head9.length >= 120 && xl9 === want9 + '.xlsx' && pdf9 === want9 + '.pdf',
      {titleLength: long.length, cutLength: head9.length, xlsx: xl9, pdf: pdf9, xlsxLength: xl9 && xl9.length},
      want9 + '.xlsx / .pdf');
    var exact = long.slice(0, 150).replace(/\s+$/, '');
    while(exact.length < 150) exact += 'x';
    T.set('show-title', exact); await settle();
    var xl10 = await exportName('export-btn');
    var want10 = exact + ' WRO 1.5.26 Planning Calendar ' + today + ' – Scenario A.xlsx';
    add('X10', 'a title of exactly 150 characters is kept whole (no real calendar\'s name changes)',
      exact.length === 150 && xl10 === want10, {titleLength: exact.length, name: xl10}, want10);
    T.set('show-title', 'Harbor Test'); await settle();

    // X11 -- a DD/MM calendar writes the WRO date day first, as its header's "Writer's Room Opens" line does.
    T.set('wf-date-format', 'd/m/yy'); await settle();
    var xl11 = await exportName('export-btn');
    var want11 = 'Harbor Test WRO 5.1.26 Planning Calendar ' + today + ' – Scenario A.xlsx';
    add('X11', 'on a DD/MM calendar the WRO date is day first (5.1.26), as the header prints it',
      xl11 === want11, {name: xl11}, want11);
    T.set('wf-date-format', ''); await settle();

    // X12 -- no Writers' Room date: no "WRO" and nothing left behind for it.
    T.set('start-writersRoom', ''); await settle();
    var xl12 = await exportName('export-btn');
    var want12 = 'Harbor Test Planning Calendar ' + today + ' – Scenario A.xlsx';
    add('X12', 'no Writers\' Room date: the name has no WRO and no gap for it',
      xl12 === want12, {name: xl12}, want12);

    // X7 -- Help's example.
    var help = txt(el('help-body'));
    var examples = help.match(/\(e\.g\.[^)]*Planning Calendar[^)]*\)/g) || [];
    add('X7', 'Help\'s examples name the new shape, the season beside the title, and neither older one ("Show Title - Season 1 Planning Calendar.xlsx", "Show Title Planning Calendar S1 …")',
      help.indexOf('Show Title - Season 1 Planning Calendar.xlsx') === -1 && help.indexOf('Show Title Planning Calendar S1') === -1 &&
      examples.length >= 2 && examples.every(function(e){ return e.indexOf('Show Title S1 WRO 1.5.26 Planning Calendar 2026-11-12 v3.xlsx') !== -1; }),
      {examples: examples}, 'every example: Show Title S1 WRO 1.5.26 Planning Calendar 2026-11-12 v3.xlsx');
  } catch(e){
    add('ERR', 'the leg threw', false, String(e && e.stack || e), 'no error');
  }
  out.health = T.appHealth();
  out.cases = cases;
  out.pass = cases.filter(function(c){ return c.pass; }).length;
  out.fail = cases.filter(function(c){ return !c.pass; }).length;
  T.done(out);
})(); });
