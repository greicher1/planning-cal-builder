// filenamelist -- the Export PDF window's File name section (owner, 18 Nov 2026: "an easy to use system that lets you
// add/unadd parts of the file name", "drag and reorder", "manually edit the file name", "allow removing show title",
// "the list version with drag handles", "scenario name should not be adding by default", "the window size/position
// should not move/change size if i make a change to the file name"). Driven as a user does: the window taken over
// (T.pdfDialog('manual')), rows clicked, a handle dragged with pointer events, the box typed in.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=compare-send ./run.sh filenamelist 300
//
// tests/fixtures/compare-send.sptcal (synthetic): "Harbor Test", Season 3, Version "v2" (opens as 2, prints v2), the
// Writers' Room 1/5/26, three scenarios with "Scenario A" on screen, its Date Last Edited 10/1/26.
//   F1  the window opens on the default name, "Harbor Test S3 Planning Calendar v2 WRO 1.5.26 - a.o. 10.1.26", the rows
//       in that order, the scenario row unticked
//   F2  ticking the scenario row puts " - Scenario A" before the date; the window neither moves nor resizes
//   F3  dragging the date row's handle above the title moves it to the front of the name
//   F4  unticking the title takes it out of the name
//   F5  Export: the PDF downloads under exactly the name in the box; the picks and the order are stored on this
//       computer (sptcal.prefs fileNameOff / fileNameOrder)
//   F6  Export to Excel follows the same picks and order
//   F7  a name TYPED in the box names that one PDF (":" made "-"), and the next export is built from the parts again
//   F8  the window keeps its size and place while a long name is typed (it scrolls in the box)
//   F9  every part unticked: the name is "Planning Calendar"
//   F10 Cancel stores nothing
//   F11 Put all back, then Export: back to the default, and nothing left in the store
window.__T.memoryIDB();
window.__T.pdfDialog('manual');
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function qa(s, r){ return [].slice.call((r || document).querySelectorAll(s)); }
  function el(id){ return document.getElementById(id); }
  function box(){ return document.querySelector('.pdfdlg-name-input input'); }
  function rows(){ return qa('[data-namepart]').map(function(r){ return r.dataset.namepart + (r.getAttribute('aria-checked') === 'true' ? '' : '-'); }).join(' '); }
  function rect(){ var r = document.querySelector('.export-pdf-dlg .mantine-Modal-content').getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round).join(','); }
  function row(k){ return document.querySelector('[data-namepart="' + k + '"]'); }
  function prefs(){ try { return JSON.parse(localStorage.getItem('sptcal.prefs') || '{}'); } catch(_){ return {}; } }
  function typeInBox(v){
    var i = box(); i.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, v);
    i.dispatchEvent(new Event('input', {bubbles: true}));
  }
  // Drag a row by its six-dot handle onto the upper half of another row, with the pointer events a mouse sends.
  function dragAbove(k, target){
    var h = row(k).querySelector('[data-namehandle]').getBoundingClientRect(), t = row(target).getBoundingClientRect();
    var x0 = h.left + h.width / 2, y0 = h.top + h.height / 2, x1 = t.left + 40, y1 = t.top + 3;
    var opt = function(x, y, type){ return {bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 1, pointerType: 'mouse', isPrimary: true}; };
    row(k).querySelector('[data-namehandle]').dispatchEvent(new PointerEvent('pointerdown', opt(x0, y0, 'pointerdown')));
    [0.3, 0.6, 1].forEach(function(f){ document.dispatchEvent(new PointerEvent('pointermove', opt(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 'pointermove'))); });
    document.dispatchEvent(new PointerEvent('pointerup', opt(x1, y1, 'pointerup')));
    // The click a real drag ends with: it must be swallowed, not tick the row.
    row(k).dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, clientX: x1, clientY: y1}));
  }
  var downloads = [], realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){ if(this.download){ downloads.push(this.download); return; } return realClick.call(this); };
  async function openWindow(){
    await T.sleep(800);
    el('export-wf-pdf-btn').click();
    await T.until(function(){ return !!box(); }, 'the Export PDF window', 60, 100);
    await T.sleep(300);
  }
  async function press(which){
    var n = downloads.length;
    document.querySelector('[data-pdfdlg="' + which + '"]').click();
    if(which === 'export') await T.until(function(){ return downloads.length > n; }, 'the PDF download', 200, 100);
    await T.sleep(400);
    return downloads[downloads.length - 1];
  }
  async function excelName(){
    var n = downloads.length;
    await T.sleep(800);
    el('export-btn').click();
    await T.until(function(){ return downloads.length > n; }, 'the workbook download', 200, 100);
    return downloads[downloads.length - 1];
  }
  try {
    await T.appReady();
    await T.until(function(){ return qa('.sc-tab').length === 3 && qa('#table-wrap td.sheet-phase-cell').length > 0; }, 'the three scenarios and the grid', 200, 100);
    await T.sleep(1200);
    var def = 'Harbor Test S3 Planning Calendar v2 WRO 1.5.26 - a.o. 10.1.26';

    await openWindow();
    var r0 = rect();
    add('F1', 'the window opens on the default name, in the default order, the scenario unticked',
      box().value === def && rows() === 'title season words version wro scenario- date',
      {name: box().value, rows: rows()}, def + ' / title season words version wro scenario- date');

    row('scenario').click(); await T.sleep(300);
    var want2 = 'Harbor Test S3 Planning Calendar v2 WRO 1.5.26 - Scenario A - a.o. 10.1.26';
    add('F2', 'ticking the scenario row puts it before the date, set off by " - "; the window neither moves nor resizes',
      box().value === want2 && rect() === r0, {name: box().value, rect: rect(), opened: r0}, want2 + ' / ' + r0);

    dragAbove('date', 'title'); await T.sleep(300);
    var want3 = 'a.o. 10.1.26 - Harbor Test S3 Planning Calendar v2 WRO 1.5.26 - Scenario A';
    add('F3', 'dragging the date row by its handle above the title moves it to the front, and the drag ticks nothing',
      box().value === want3 && rows().split(' ')[0] === 'date' && row('date').getAttribute('aria-checked') === 'true' && rect() === r0,
      {name: box().value, rows: rows(), rect: rect()}, want3);

    row('title').click(); await T.sleep(300);
    var want4 = 'a.o. 10.1.26 - S3 Planning Calendar v2 WRO 1.5.26 - Scenario A';
    add('F4', 'unticking the show title takes it out of the name', box().value === want4 && rect() === r0, {name: box().value}, want4);

    var pdf5 = await press('export');
    var p5 = prefs();
    add('F5', 'Export: the PDF is named exactly as the box, and the picks and order are stored on this computer',
      pdf5 === want4 + '.pdf' && JSON.stringify(p5.fileNameOff) === '["title"]' &&
        JSON.stringify(p5.fileNameOrder) === '["date","title","season","words","version","wro","scenario"]',
      {pdf: pdf5, fileNameOff: p5.fileNameOff, fileNameOrder: p5.fileNameOrder}, want4 + '.pdf');

    var xl6 = await excelName();
    add('F6', 'Export to Excel follows the same picks and order', xl6 === want4 + '.xlsx', {xlsx: xl6}, want4 + '.xlsx');

    await openWindow();
    var r7 = rect();
    typeInBox('Harbor Test Studio Draft: For Review'); await T.sleep(300);
    var pdf7 = await press('export');
    var xl7 = await excelName();
    add('F7', 'a typed name names that one PDF (":" becomes "-"); the next export is built from the parts again',
      pdf7 === 'Harbor Test Studio Draft- For Review.pdf' && xl7 === want4 + '.xlsx',
      {pdf: pdf7, nextXlsx: xl7}, 'Harbor Test Studio Draft- For Review.pdf / ' + want4 + '.xlsx');

    await openWindow();
    var r8 = rect();
    typeInBox('Harbor Test S3 Planning Calendar v2 WRO 1.5.26 - Studio Notes Round Two With Network Feedback And The Long Version For Legal - a.o. 10.1.26');
    await T.sleep(300);
    var r8b = rect();
    typeInBox('X'); await T.sleep(300);
    add('F8', 'the window keeps its size and place while a long name and a short one are typed',
      r8b === r8 && rect() === r8 && r8 === r7, {opened: r8, long: r8b, short: rect(), before: r7}, 'one box throughout');

    qa('[data-namepart]').forEach(function(r){ if(r.getAttribute('aria-checked') === 'true') r.click(); });
    await T.sleep(300);
    add('F9', 'every part unticked: the name is the calendar\'s words alone', box().value === 'Planning Calendar', {name: box().value}, 'Planning Calendar');

    await press('cancel');
    var p10 = prefs();
    add('F10', 'Cancel stores nothing (the picks are still F5\'s)',
      JSON.stringify(p10.fileNameOff) === '["title"]', {fileNameOff: p10.fileNameOff}, '["title"]');

    await openWindow();
    document.querySelector('[data-pdfdlg="name-reset"]').click(); await T.sleep(300);
    var shown11 = box().value, rows11 = rows();
    var pdf11 = await press('export');
    var p11 = prefs();
    add('F11', 'Put all back returns to the default (scenario unticked, the default order); after Export nothing is left in the store',
      shown11 === def && rows11 === 'title season words version wro scenario- date' && pdf11 === def + '.pdf' &&
        !('fileNameOff' in p11) && !('fileNameOrder' in p11),
      {name: shown11, rows: rows11, pdf: pdf11, stored: {off: p11.fileNameOff, order: p11.fileNameOrder}}, def + '.pdf, nothing stored');
  } catch(e){
    add('ERR', 'the leg threw', false, String(e && e.stack || e), 'no error');
  } finally {
    HTMLAnchorElement.prototype.click = realClick;
  }
  out.health = T.appHealth();
  out.cases = cases;
  out.pass = cases.filter(function(c){ return c.pass; }).length;
  out.fail = cases.filter(function(c){ return !c.pass; }).length;
  T.done(out);
})(); });
