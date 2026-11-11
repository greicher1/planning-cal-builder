// hdrcontrols -- the header controls leave the calendar (owner rulings 1, 4 and 5, relayed 30 Sep
// 2026, and the owner's picker the same evening: the measured FALLBACK placement, the labels).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=carry-rich ./run.sh hdrcontrols 170
//
// What moved, and where to:
// - The header MODE button joins the preview toolbar, after Rebuild From, keeping its mode word and
//   gaining a caret ("Header: Auto ▾" / "Header: Template ▾" / "Header: Manual ▾"). Its label and its
//   menu follow the ACTIVE view: the waterfall and the month header are independent.
// - The formatting strip (.hdr-fmt) stays above the header in MANUAL mode only, styled as an editor
//   toolbar -- grey fill, a bottom rule, a "Header" label drawn by CSS. In Auto and Template nothing
//   sits above the header.
// - The notes reset goes to the APP HEADER, where Reset All was (the measured fallback: two more
//   buttons in the toolbar wrap it below 1414 px). "Reset Notes" in the Waterfall clears waterfall
//   notes, their colours and sizes (the Month view shows them too); "Reset Month Notes" in the Month
//   view clears the month's own notes only. Neither touches hiatus bands or holidayView any more.
// - The hiatus reset moves to the sidebar's All-phase hiatus card, as "Reset holidays" sits in its.
// - The frozen renderers' originals (#hdr-mode-btn, #notes-reset-btn, #mv-hdr-mode-btn) are HIDDEN
//   by CSS, never deleted: no frozen function is edited. A click on a hidden original still works
//   (the hdr* legs use them) and anchors the menu under the visible toolbar button.
//
// carry-rich (a synthetic fixture) holds every store involved: the waterfall note "CARRY-NOTE" on
// 10/11/27 (green, 14 px), the day note "Test" on 1/12/28, two extra month lanes, the hand-renamed
// hiatus band "CARRY-HIATUS" on 12/20/27, and BOTH headers in Manual mode.
//
//   T0  the toolbar holds the Header button after Rebuild From, reading "Header: Manual ▾" (the file's
//       mode); the three originals are still in the page, hidden
//   T1  Manual: the strip above the header is RETIRED (owner, 21 Oct 2026, TEXT-STYLE-BAR-PLAN.md): it is
//       in the page but hidden, and the text style bar is shown in the toolbar row. Until 10 Nov 2026 it was a
//       grey, "Text"-labelled line spanning the row; since then it is its buttons in a well like the view toggle's
//       (owner, variation 27), with no label (stylebarplace holds its place)
//   T2  the button opens the mode menu UNDER IT (aria-expanded true), each of its four rows its name
//       alone (the descriptions were deleted, owner, 23 Oct 2026), a second click closes it; a
//       click on the hidden original opens the same menu under the toolbar button, not at 0,0; the
//       menu holds no id (UI-CONVENTIONS §10 gate 9)
//   T3  Auto (chosen from the toolbar menu): the label follows, and NOTHING sits above the header
//   T4  Template: the label follows, and still nothing above the header; the menu's Manual warning (shown only
//       in Template) wraps inside the 170 px menu
//   T5  the Month view: the button follows the MONTH header (Manual here, whatever the waterfall is);
//       the month strip is retired the same way (hidden); Auto from the toolbar leaves nothing above
//       the month header; back in the Waterfall the label is the waterfall's again
//   N0  the app header ends with a divider and "Reset Notes" (Waterfall) / "Reset Month Notes"
//       (Month), and each tooltip says what it clears. Since 6 Nov 2026 (owner: Reset Columns, "Add it") the
//       Waterfall's ends divider, Reset Notes, Reset Columns; since 11 Nov 2026 the Month view ends divider, Reset Month
//       Notes, Reset Bar Order, and Export PDF and both resets occupy the same boxes in both views (fixed slots)
//   N1  "Reset Month Notes" clears the day note; the waterfall note stays (in both views)
//   N2  "Reset Notes" clears the waterfall note and its colour; the hiatus band and a holiday's
//       Waterfall-note tick (holidayView) are left alone
//   N3  that reset is ONE undo step: Undo brings the note back
//   N4  the All-phase hiatus card ends with "Reset hiatus bands"; naming the row takes over the band typed by hand
//       (since 4 Nov 2026), and after the reset a NAMED hiatus row's band shows its name at once (update(), not
//       render()); the note stays
//   E0  0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function byId(id){ return document.getElementById(id); }
  function shown(el){ return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0; }
  function tbBtn(){ return byId('tb-hdr-mode-btn'); }
  // The label SPAN plus a caret check: a Mantine Button's textContent runs the two together.
  function tbLabel(){
    var b = tbBtn(); if(!b) return null;
    var l = b.querySelector('.mantine-Button-label');
    var txt = ((l || b).textContent || '').replace(/\s+/g, ' ').trim();
    return txt + (b.querySelector('.caret') ? ' ▾' : '');
  }
  function resetBtn(){ return byId('tb-notes-reset-btn'); }
  function pop(){ return document.querySelector('.hdr-mode-pop'); }
  // The menu's width, and whether any line in it runs past its row (the owner asked for a tighter menu once the
  // descriptions went, 23 Oct 2026; 170 px, so a long line has to wrap, never spill).
  function popFit(){
    var p = pop(); if(!p) return null;
    var spill = [].filter.call(p.querySelectorAll('.hdr-mode-choice'), function (r) {
      var rr = r.getBoundingClientRect();
      return r.scrollWidth > r.clientWidth + 1 || [].some.call(r.children, function (c) { return c.getBoundingClientRect().right > rr.right - 1; });
    }).map(function (r) { return (r.querySelector('.hdr-mode-name') || r).textContent; });
    return {width: Math.round(p.getBoundingClientRect().width), spill: spill};
  }
  async function choose(mode){
    var b = tbBtn(); if(!b) throw new Error('no toolbar Header button');
    if(!pop()) b.click();
    await T.until(function () { return !!pop(); }, 'the mode menu', 40, 100);
    var row = null;
    pop().querySelectorAll('.hdr-mode-choice').forEach(function (r) {
      if(((r.querySelector('.hdr-mode-name') || {}).textContent || '') === mode) row = r;
    });
    if(!row) throw new Error('no "' + mode + '" row in the mode menu');
    row.click();
    await T.sleep(700);
  }
  // Is there anything visible between the top of the scroll box / month card and its header?
  function gapAbove(containerSel, headerSel){
    var c = document.querySelector(containerSel), h = document.querySelector(headerSel);
    if(!c || !h) return null;
    var cs = getComputedStyle(c);
    var contentTop = c.getBoundingClientRect().top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
    return Math.round((h.getBoundingClientRect().top - contentTop) * 10) / 10;
  }
  function gray0(){
    var p = document.createElement('div'); p.style.background = 'var(--mantine-color-gray-0)';
    document.body.appendChild(p); var v = getComputedStyle(p).backgroundColor; p.remove(); return v;
  }
  function strip(sel){
    var f = document.querySelector(sel);
    if(!f) return null;
    var cs = getComputedStyle(f), before = getComputedStyle(f, '::before').content;
    var row = f.parentElement;
    return {shown: shown(f), bg: cs.backgroundColor, rule: cs.borderBottomWidth + ' ' + cs.borderBottomStyle,
            label: before, spans: Math.round(f.getBoundingClientRect().width) >= Math.round(row.getBoundingClientRect().width) - 20};
  }
  function noteCellText(week){ return ((document.querySelector('td.sheet-note-cell[data-week="' + week + '"]') || {}).textContent || '').trim(); }
  function noteCellBg(week){ var td = document.querySelector('td.sheet-note-cell[data-week="' + week + '"]'); return td ? td.style.background || td.style.backgroundColor : null; }
  function bandText(week){ return ((document.querySelector('td.sheet-hiatus-cell[data-week="' + week + '"]') || {}).textContent || '').trim(); }
  async function view(mode){
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!document.querySelector('#table-wrap .mv-daygrid') : !!document.querySelector('#table-wrap table.sheet-table'); }, 'the ' + mode + ' view', 100, 100);
    await T.sleep(500);
  }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function monthLabel(){ return ((document.querySelector('#table-wrap .mv-monthbar') || {}).textContent || '').replace(/[◀▶]/g, '').replace(/\s+/g, ' ').trim(); }
  function monthIndex(label){ var p = String(label || '').split(' '); return p.length === 2 ? (+p[1]) * 12 + MONTHS.indexOf(p[0]) : NaN; }
  async function goTo(label){
    var want = monthIndex(label);
    for(var g = 0; g < 60 && monthLabel() !== label; g++){
      var btn = byId(monthIndex(monthLabel()) < want ? 'mv-next' : 'mv-prev');
      if(!btn) break; btn.click(); await T.sleep(150);
    }
    if(monthLabel() !== label) throw new Error('could not page the month view to ' + label + ' (at ' + monthLabel() + ')');
  }
  function monthHas(text){ return (((byId('table-wrap') || {}).textContent) || '').indexOf(text) >= 0; }
  try {
    await T.appReady();
    await T.until(function () { return noteCellText('2027-10-11').indexOf('CARRY-NOTE') >= 0; }, 'carry-rich to load', 150, 100);
    await T.sleep(800);

    // ---- T0 ------------------------------------------------------------------------------------
    var tools = document.querySelector('.preview-tools'), b0 = tbBtn(), solve = byId('pop-solve-btn');
    var after = !!(b0 && solve && (solve.compareDocumentPosition(b0) & Node.DOCUMENT_POSITION_FOLLOWING));
    var orig = {hdr: !!byId('hdr-mode-btn'), reset: !!byId('notes-reset-btn'),
                hidden: !!byId('hdr-mode-btn') && getComputedStyle(byId('hdr-mode-btn')).display === 'none' && !!byId('notes-reset-btn') && getComputedStyle(byId('notes-reset-btn')).display === 'none'};
    add('T0', 'the toolbar holds the Header button after Rebuild From, reading "Header: Manual ▾"; the originals are in the page, hidden',
      !!b0 && !!tools && tools.contains(b0) && after && tbLabel() === 'Header: Manual ▾' && b0.classList.contains('is-manual') && orig.hdr && orig.reset && orig.hidden,
      {label: tbLabel(), inToolbar: !!(tools && b0 && tools.contains(b0)), afterRebuild: after, isManual: !!b0 && b0.classList.contains('is-manual'), originals: orig},
      'Header: Manual ▾, .is-manual; both originals present and display:none');

    // ---- T1 ------------------------------------------------------------------------------------
    var s1 = strip('#table-wrap .hdr-tools .hdr-fmt'), g0 = gray0(), sb = strip('.view-toggle-row .style-bar-host .style-bar');
    var vtBg = getComputedStyle(document.querySelector('.view-toggle')).backgroundColor;
    add('T1', 'Manual: the strip above the header is retired (in the page, hidden); the text style bar is shown in the toolbar row, a well like the view toggle',
      !!s1 && !s1.shown && !!sb && sb.shown && sb.bg === vtBg && sb.label === 'none',
      {strip: s1, styleBar: sb, viewToggleBg: vtBg}, 'strip hidden; bar shown, the view toggle\'s grey, no ::before label');

    // ---- T2 ------------------------------------------------------------------------------------
    b0.click();
    await T.until(function () { return !!pop(); }, 'the mode menu', 40, 100);
    var br = b0.getBoundingClientRect(), pr = pop().getBoundingClientRect();
    // Each row is its name alone: the owner deleted the line of description under each, 23 Oct 2026.
    var t2 = {popTop: Math.round(pr.top), btnBottom: Math.round(br.bottom), popLeft: Math.round(pr.left), btnLeft: Math.round(br.left),
              expanded: b0.getAttribute('aria-expanded'), ids: pop().querySelectorAll('[id]').length,
              rows: [].map.call(pop().querySelectorAll('.hdr-mode-choice'), function (r) { return (r.textContent || '').trim(); }),
              descs: pop().querySelectorAll('.hdr-mode-desc').length, fit: popFit()};
    b0.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
    b0.click();
    await T.sleep(400);
    t2.closedBySecondClick = !pop(); t2.expandedAfter = b0.getAttribute('aria-expanded');
    // The hidden original, the way the hdr* legs drive it: the menu opens under the TOOLBAR button.
    byId('hdr-mode-btn').click();
    await T.until(function () { return !!pop(); }, 'the mode menu from the hidden original', 40, 100);
    var pr2 = pop().getBoundingClientRect();
    t2.fromOriginalTop = Math.round(pr2.top); t2.fromOriginalLeft = Math.round(pr2.left);
    // The menu binds its outside-press listener one tick AFTER opening (so the click that opened it
    // cannot close it); press outside only once that tick has passed.
    await T.sleep(150);
    document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
    await T.sleep(300);
    t2.closedByOutside = !pop();
    add('T2', 'the button opens the mode menu under it, its four rows names alone (no description), the menu at most 180 px wide with nothing spilling out of a row; a second click closes it; a hidden original opens it under the button too; no id in the menu',
      Math.abs(t2.popTop - (t2.btnBottom + 5)) <= 2 && t2.popLeft <= t2.btnLeft + 2 && t2.expanded === 'true' && t2.ids === 0
        && t2.descs === 0 && t2.rows.length === 4 && t2.rows[0] === 'Auto' && t2.rows[2] === 'Manual' && t2.rows[3] === 'Off'
        && /^Template/.test(t2.rows[1]) && t2.fit.width <= 180 && t2.fit.spill.length === 0
        && t2.closedBySecondClick && t2.expandedAfter === 'false'
        && Math.abs(t2.fromOriginalTop - (t2.btnBottom + 5)) <= 2 && t2.fromOriginalLeft > 50 && t2.closedByOutside,
      t2, 'menu top = button bottom + 5; toggles; the original anchors to the button; 0 ids');

    // ---- T3 ------------------------------------------------------------------------------------
    await choose('Auto');
    var t3 = {label: tbLabel(), isManual: tbBtn().classList.contains('is-manual'), tools: Math.round(document.querySelector('#table-wrap .hdr-tools').getBoundingClientRect().height),
              gap: gapAbove('#table-wrap .sheet-scroll', '#table-wrap .cal-header-bar')};
    add('T3', 'Auto from the toolbar menu: the label follows, and nothing sits above the calendar header',
      t3.label === 'Header: Auto ▾' && !t3.isManual && t3.tools === 0 && t3.gap !== null && t3.gap <= 0.5,
      t3, 'Header: Auto ▾; the tools row 0 px; the header at the top of the scroll box');

    // ---- T4 ------------------------------------------------------------------------------------
    await choose('Template');
    var t4 = {label: tbLabel(), isManual: tbBtn().classList.contains('is-manual'), tools: Math.round(document.querySelector('#table-wrap .hdr-tools').getBoundingClientRect().height),
              gap: gapAbove('#table-wrap .sheet-scroll', '#table-wrap .cal-header-bar')};
    // In Template the Manual row carries its red warning, the longest line the menu ever holds: it wraps inside 170 px.
    tbBtn().click();
    await T.until(function () { return !!pop(); }, 'the mode menu in Template', 40, 100);
    t4.warn = !!pop().querySelector('.hdr-mode-warn'); t4.fit = popFit();
    await T.sleep(150);
    document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
    await T.sleep(300);
    add('T4', 'Template: the label follows, and still nothing sits above the header; the menu\'s Manual warning wraps inside the narrow menu',
      t4.label === 'Header: Template ▾' && t4.isManual && t4.tools === 0 && t4.gap !== null && t4.gap <= 0.5
        && t4.warn && t4.fit.width <= 180 && t4.fit.spill.length === 0 && !pop(),
      t4, 'Header: Template ▾ (the accent look); 0 px; warning shown, nothing spills');

    // ---- T5 ------------------------------------------------------------------------------------
    await view('month');
    var t5 = {label: tbLabel(), mvOrigHidden: !!byId('mv-hdr-mode-btn') && getComputedStyle(byId('mv-hdr-mode-btn')).display === 'none',
              strip: strip('#table-wrap .mv-tools .hdr-fmt')};
    await choose('Auto');
    t5.autoLabel = tbLabel();
    t5.mvTools = Math.round(document.querySelector('#table-wrap .mv-tools').getBoundingClientRect().height);
    t5.gap = gapAbove('#table-wrap .month-view', '#table-wrap .mv-header');
    await view('sheet');
    t5.backLabel = tbLabel();
    add('T5', 'Month view: the button follows the month header (Manual); its strip is retired (hidden); Auto leaves nothing above; the Waterfall keeps its own mode',
      t5.label === 'Header: Manual ▾' && t5.mvOrigHidden && !!t5.strip && !t5.strip.shown
        && t5.autoLabel === 'Header: Auto ▾' && t5.mvTools === 0 && t5.gap !== null && t5.gap <= 0.5 && t5.backLabel === 'Header: Template ▾',
      t5, 'Manual ▾ + hidden strip; Auto ▾ with 0 px above the month header; back to Template ▾');

    // ---- N0 ------------------------------------------------------------------------------------
    var bar = document.querySelector('.app-toolbar');
    var tail = function () {
      var kids = Array.prototype.filter.call(bar.children, function (k) { return getComputedStyle(k).display !== 'none'; });
      return kids.slice(-3).map(function (k) { return k.classList.contains('app-toolbar-div') ? 'div' : (k.id || k.className); });
    };
    // The fixed slots (owner, 11 Nov 2026: the header must not shift between the views): Export PDF, the notes reset and
    // the last button occupy the same box in both views.
    var slots = function (ids) { return ids.map(function (id) { var r = document.getElementById(id).getBoundingClientRect();
      return Math.round(r.left * 10) / 10 + '-' + Math.round(r.right * 10) / 10; }); };
    var rb = resetBtn();
    var n0 = {sheetSlots: slots(['export-wf-pdf-btn', 'tb-notes-reset-btn', 'tb-cols-reset-btn']), sheetTail: tail(), sheetLabel: rb ? rb.textContent.trim() : null, sheetTitle: rb ? rb.getAttribute('title') : null};
    await view('month');
    n0.monthTail = tail();
    n0.monthSlots = slots(['export-btn', 'tb-notes-reset-btn', 'tb-order-reset-btn']);
    n0.monthLabel = resetBtn() ? resetBtn().textContent.trim() : null;
    n0.monthTitle = resetBtn() ? resetBtn().getAttribute('title') : null;
    add('N0', 'the app header ends with a divider, the notes reset and Reset Columns (Waterfall) / Reset Bar Order (Month), labelled for the view, each tooltip saying what it clears, Export PDF and both resets in the same place in both views',
      JSON.stringify(n0.sheetTail) === JSON.stringify(['div', 'tb-notes-reset-btn', 'tb-cols-reset-btn'])
        && n0.sheetLabel === 'Reset Notes' && /Month view shows these notes too/.test(n0.sheetTitle || '')
        && JSON.stringify(n0.monthTail) === JSON.stringify(['div', 'tb-notes-reset-btn', 'tb-order-reset-btn'])
        && JSON.stringify(n0.sheetSlots) === JSON.stringify(n0.monthSlots)
        && n0.monthLabel === 'Reset Month Notes' && /Waterfall notes stay/.test(n0.monthTitle || ''),
      n0, 'divider + Reset Notes + Reset Columns / divider + Reset Month Notes + Reset Bar Order, the same slots');

    // ---- N1: the month's own reset, in the Month view --------------------------------------------
    await goTo('January 2028');
    var n1 = {dayBefore: monthHas('Test')};
    resetBtn().click();
    await T.sleep(900);
    n1.dayAfter = monthHas('Test');
    await goTo('October 2027');
    n1.wfInMonth = monthHas('CARRY-NOTE');
    await view('sheet');
    n1.wfInSheet = noteCellText('2027-10-11').indexOf('CARRY-NOTE') >= 0;
    add('N1', '"Reset Month Notes" clears the day note; the waterfall note stays, in both views',
      n1.dayBefore && !n1.dayAfter && n1.wfInMonth && n1.wfInSheet, n1, 'the day note gone; CARRY-NOTE kept');

    // ---- N2: the waterfall reset -------------------------------------------------------------------
    // Tick a holiday's Waterfall-note box first: that is holidayView, which this reset must no longer touch.
    var hv = document.querySelector('#holiday-vis-list .hv-cb[data-view="sheet"]:not(:checked):not(:disabled)');
    var hvHid = hv ? hv.dataset.hid : null;
    if(hv){ hv.click(); await T.sleep(500); }
    var n2 = {noteBefore: noteCellText('2027-10-11'), bgBefore: noteCellBg('2027-10-11'), bandBefore: bandText('2027-12-20')};
    resetBtn().click();
    await T.sleep(900);
    var hvNow = hvHid ? document.querySelector('#holiday-vis-list .hv-cb[data-view="sheet"][data-hid="' + hvHid + '"]') : null;
    n2.noteAfter = noteCellText('2027-10-11'); n2.bgAfter = noteCellBg('2027-10-11'); n2.bandAfter = bandText('2027-12-20');
    n2.holidayTickKept = !!hvNow && hvNow.checked;
    add('N2', '"Reset Notes" clears the waterfall note and its colour; the hiatus band and the holiday tick stay',
      /CARRY-NOTE/.test(n2.noteBefore) && !/CARRY-NOTE/.test(n2.noteAfter) && n2.bgAfter !== n2.bgBefore
        && n2.bandBefore === 'CARRY-HIATUS' && n2.bandAfter === 'CARRY-HIATUS' && n2.holidayTickKept,
      n2, 'note + colour gone; CARRY-HIATUS kept; the tick kept');

    // ---- N3: one undo step --------------------------------------------------------------------------
    await T.sleep(1200);   // let the debounced undo push settle
    byId('undo-btn').click();
    await T.sleep(1200);
    var n3 = {note: noteCellText('2027-10-11')};
    add('N3', 'the waterfall reset is ONE undo step: Undo brings the note back', /CARRY-NOTE/.test(n3.note), n3, 'CARRY-NOTE back');

    // ---- N4: the sidebar's hiatus reset --------------------------------------------------------------
    var card = byId('hiatus-list') ? byId('hiatus-list').closest('section.card') : null;
    var hb = byId('hiatus-reset-btn');
    var n4 = {inCard: !!(card && hb && card.contains(hb)), label: hb ? hb.textContent.trim() : null,
              last: !!(card && hb && card.lastElementChild && card.lastElementChild.contains(hb))};
    // Name the band's row. ⭐ Since 4 Nov 2026 the card's name takes over a week typed in the band itself (owner: an
    // all-phase hiatus is named on its card only; claimHiatusRowNames), so CARRY-HIATUS becomes the name at once.
    // Until then it stayed CARRY-HIATUS (a hand edit owned it) until the reset cleared it.
    n4.bandBefore = bandText('2027-12-20');
    var nameIn = document.querySelector('#hiatus-list .hiatus-entry .hiatus-name');
    if(!nameIn) throw new Error('no hiatus name field');
    // The row is engine-generated and has no id, so T.set cannot address it: write through the
    // prototype setter (as T.set does) and fire the same two events.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(nameIn, 'Winter Break');
    ['input', 'change'].forEach(function (t) { nameIn.dispatchEvent(new Event(t, {bubbles: true})); });
    await T.sleep(800);
    n4.bandNamed = bandText('2027-12-20');
    // The reset then keeps the named row's name on its bands at once (it runs update(), not render(): a render alone
    // would leave them reading "Hiatus" until the next edit).
    if(hb) hb.click();
    await T.sleep(900);
    n4.bandAfter = bandText('2027-12-20'); n4.band2 = bandText('2027-12-27');
    n4.noteKept = /CARRY-NOTE/.test(noteCellText('2027-10-11'));
    add('N4', 'the hiatus card ends with "Reset hiatus bands"; naming the row takes over the band typed CARRY-HIATUS, and after the reset both weeks show the row\'s name at once; the note stays',
      n4.inCard && n4.last && n4.label === 'Reset hiatus bands' && n4.bandBefore === 'CARRY-HIATUS' && n4.bandNamed === 'Winter Break'
        && n4.bandAfter === 'Winter Break' && n4.band2 === 'Winter Break' && n4.noteKept,
      n4, 'CARRY-HIATUS -> Winter Break (named) -> Winter Break on both weeks (reset); CARRY-NOTE kept');

    var errs = T.appHealth().errors;
    add('E0', '0 console errors', errs.length === 0, {errors: errs.slice(0, 5)}, 'none');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'hdrcontrols', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
