// exportnames -- every export's file name carries the season, the Date Last Edited and the Version, so a revised plan
// never downloads under yesterday's name (audit 2026-11 item 2.10: AUD2-025; decision D8 = c, default approved:
// title, season, Date Last Edited as yyyy-mm-dd, the Version when one is set; "Planning Calendar" and the scenario
// suffix stay, both ruled).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=compare-send ./run.sh exportnames 300
//
// tests/fixtures/compare-send.sptcal (synthetic): "Harbor Test", Season 3, Version v2, three scenarios, "Scenario A"
// on screen, each tab with its own Date Last Edited: A 10/1/26, "3-wk Xmas break" 10/5/26, "Var 9 long descriptive
// name" 10/3/26 (all at 12:00 UTC, so the same calendar day in any zone from UTC-11 to UTC+11).
// Before the fix (measured on 2089aa5's build) every name was "<title> Planning Calendar – <scenario>" and the like,
// whatever the plan held, so X1-X7 were red (X5: the revised plan took the old one's name).
//
//   X1  the waterfall PDF: "Harbor Test Planning Calendar S3 2026-10-01 v2 – Scenario A.pdf"
//   X2  the workbook:      "Harbor Test Planning Calendar S3 2026-10-01 v2 – Scenario A.xlsx"
//   X3  the month PDF:     "Harbor Test Month Calendar S3 2026-10-01 v2 – Scenario A.pdf"
//   X4  Compare's PDF and workbook: "Harbor Test Scenario Comparison S3 2026-10-05", the NEWEST tab's date, no Version
//   X5  an edit moves the date to today: a second waterfall PDF of the changed plan is named for it, unlike X1
//   X6  no season and no Version: "Harbor Test Planning Calendar <today> – Scenario A.xlsx"
//   X7  Help's example names the new shape
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
    var stem = 'Harbor Test Planning Calendar S3 2026-10-01 v2 – Scenario A';

    var pdf1 = await exportName('export-wf-pdf-btn');
    add('X1', 'the waterfall PDF carries the season, the Date Last Edited and the Version, then the scenario',
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
    var mStem = 'Harbor Test Month Calendar S3 2026-10-01 v2 – Scenario A';
    add('X3', 'the month PDF is named the same way', month === mStem + '.pdf', {name: month}, mStem + '.pdf');
    el('view-sheet-btn').click(); await settle();

    // X4 -- Compare.
    qa('.sc-strip button').filter(function(b){ return txt(b) === 'Compare'; })[0].click();
    await T.until(function(){ return !!document.querySelector('.compare-dlg .sc-compare-table'); }, 'the Compare window', 80, 100);
    await T.sleep(400);
    var cmpPdf = await downloadName(function(){ compareButton('Export PDF').click(); }, 'the comparison PDF');
    var cmpXl = await downloadName(function(){ compareButton('Export to Excel').click(); }, 'the comparison workbook');
    compareButton('Done').click(); await T.sleep(500);
    var cStem = 'Harbor Test Scenario Comparison S3 2026-10-05';
    add('X4', 'Compare\'s exports carry the season and the newest Date Last Edited of any tab (no Version: each tab has its own)',
      cmpPdf === cStem + '.pdf' && cmpXl === cStem + '.xlsx', {pdf: cmpPdf, xlsx: cmpXl}, cStem + '.pdf / .xlsx');

    // X5 -- a revised plan is named for its new date.
    T.set('start-production', '2026-07-06'); await settle();
    var pdf2 = await exportName('export-wf-pdf-btn');
    var want2 = 'Harbor Test Planning Calendar S3 ' + today + ' v2 – Scenario A.pdf';
    add('X5', 'after an edit the waterfall PDF takes today\'s date, so the revised plan never shares the old one\'s name',
      pdf2 === want2 && pdf2 !== pdf1, {first: pdf1, revised: pdf2}, want2);

    // X6 -- no season, no Version: neither leaves anything behind in the name.
    T.set('season-num', ''); T.set('show-version', ''); await settle();
    var xl3 = await exportName('export-btn');
    var want3 = 'Harbor Test Planning Calendar ' + today + ' – Scenario A.xlsx';
    add('X6', 'no season and no Version: neither is in the name, and nothing is left behind for them',
      xl3 === want3, {name: xl3}, want3);

    // X7 -- Help's example.
    var help = txt(el('help-body'));
    add('X7', 'Help\'s example names the new shape, not "Show Title - Season 1 Planning Calendar.xlsx"',
      help.indexOf('Show Title - Season 1 Planning Calendar.xlsx') === -1 && help.indexOf('Show Title Planning Calendar S1 2026-11-12 v3.xlsx') !== -1,
      {example: (/\(e\.g\.[^)]*\)/.exec(help) || [''])[0]}, 'Show Title Planning Calendar S1 2026-11-12 v3.xlsx');
  } catch(e){
    add('ERR', 'the leg threw', false, String(e && e.stack || e), 'no error');
  }
  out.health = T.appHealth();
  out.cases = cases;
  out.pass = cases.filter(function(c){ return c.pass; }).length;
  out.fail = cases.filter(function(c){ return !c.pass; }).length;
  T.done(out);
})(); });
