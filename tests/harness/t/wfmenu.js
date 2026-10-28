// wfmenu -- the waterfall's right-click menu (WATERFALL-CONTEXT-MENU-PLAN.md; rulings R1-R7, 22-23 Oct 2026).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=halfdays ./run.sh wfmenu 300
//
// ⛔ THE MENU IS LEAN BY RULING (owner, 23 Oct 2026: "we really dont need the swap collumn feature in the right
// click menu. We dont need an add notes button at all. right now the right click menu especially on phases is
// huge"). So every H-case asserts the EXACT item list for its kind of cell: an item that comes back (Swap column,
// Add note, Colour…, Show in Phases card, Expand cells, the holiday checkboxes) turns it red, as does an item that
// cannot act being shown greyed instead of left out (ruling R6). ⛔ Since 28 Oct 2026 with NO exception (owner, by
// picker: "Yes, waterfall too", after "remove options from the menu when they aren't accessible, rather than greying
// them out" for the month menu): Start / End and Cut · Copy · Clear, R6's greyed exceptions, are left out too, and
// case G0 fails on any greyed item in any waterfall menu the leg opens.
//
// tests/fixtures/halfdays.sptcal (synthetic), as the waterfall draws it:
//   Production  6/29/26 - 8/31/26 (10 rows); Notes: "Start Principal Photography 6/29/26" (week of 6/29) and
//               "Principal Photography Wraps 9/1/26" (week of 8/31, a TUESDAY's date); "Writer's Room Opens 1/5/26"
//   Post        Weeks, 16, from 11/2/26: 7 rows, the all-phase hiatus 12/21/26 (2 weeks, two band rows), 9 rows to 3/1/27
//   Localization Weeks, 8, from 3/1/27 to 4/19/27; Writer's Room Weeks, 12, from 1/5/26
//
// V  the way out (R4): Show this week / day in the month view, a view switch banking NO undo step, the rings
// H  what the menu offers on each kind of cell, exactly; where it gives the browser its own menu
// F  opening and closing it leaves fields.byId as it was
// P  Start / End <phase> this week, Add 1-week phase here, Add hiatus ▸ -- each ONE undo step
// N  the clipboard row (R1, R2) and Back to automatic text; a refused clipboard keeps the note
// M  a highlight of several cells: the menu acts on all of it; outside it, the cell is highlighted first
// S  Size (R3), shown only after a hand resize
// C  the close rules, the height cap, the keys, the Mac Ctrl guard
//
// ⛔ EVERY RIGHT-CLICK IS HIT-TESTED: dispatched on document.elementFromPoint() at the cell's centre (mvmenu's rule).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'wfmenu'};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.from((r || document).querySelectorAll(s)); }
  function txt(el){ return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function mid(el){ var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  function near(a, b, tol){ return Math.abs(a - b) <= (tol || 2); }
  async function settle(){ await T.sleep(450); }
  function bodyFocus(){ var a = document.activeElement; if(a && a !== document.body && a.blur) a.blur(); }
  function undoOn(){ var b = $('undo-btn'); return !b.disabled && b.getAttribute('data-disabled') !== 'true'; }
  async function undo(){ $('undo-btn').click(); await settle(); bodyFocus(); }
  async function redo(){ $('redo-btn').click(); await settle(); bodyFocus(); }
  function sheet(){ return $('view-sheet-btn').classList.contains('active'); }
  async function toSheet(){ if(!sheet()){ $('view-sheet-btn').click(); await settle(); } bodyFocus(); }

  // ---- the grid ----
  function W(sel){ var el = q('#table-wrap ' + sel); if(!el) throw new Error('no cell ' + sel); return el; }
  function phaseTd(key, wk){ return W('td.sheet-phase-cell[data-pkey="' + key + '"][data-week="' + wk + '"]:not(.sheet-hiatus-cell)'); }
  function noteTd(wk){ return W('td.sheet-note-cell[data-week="' + wk + '"]'); }
  function noteText(wk){ var t = q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); return t && t.classList.contains('has-note') ? txt(t) : ''; }
  function rows(key){ return qa('#table-wrap td.sheet-phase-cell[data-pkey="' + key + '"]:not(.sheet-hiatus-cell)').map(function (t) { return t.dataset.week; }).sort(); }
  function dateTd(wk){ var c = noteTd(wk); while(c && !c.classList.contains('sheet-date')) c = c.previousElementSibling; return c; }
  // The 2026 block's phase column in the week of 10/12/26: drawn empty (no class, no fill).
  function emptyTd(wk){ var d = dateTd(wk), c = d && d.nextElementSibling; return (c && !c.className) ? c : null; }
  function hiCount(){ return qa('#table-wrap .text-sel-cell').length; }

  // Centre the cell in the waterfall's own scroll box, then let every scroll event land BEFORE the menu opens: the
  // menu closes on a scroll outside it. ⚠️ Under --virtual-time-budget a scroll event is not dispatched on a timer
  // (it waits for a rendering step, like rAF), and one can arrive well after the scroll that caused it -- with a
  // fixed sleep it landed AFTER the right-click and closed the menu the leg was about to read, a different case each
  // run. (In a real browser nothing scrolls after a right-click: checked in the app pane on four kinds of cell.) So
  // the leg waits until no scroll has been seen anywhere for 300 ms.
  var lastScroll = 0;
  window.addEventListener('scroll', function () { lastScroll = performance.now(); }, true);
  async function quiet(){
    for(var i = 0; i < 60; i++){ if(performance.now() - lastScroll >= 300) return; await T.sleep(60); }
  }
  async function bring(el){
    var box = $('sheet-scroll-container'), b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    var head = q('#table-wrap thead th'), top = Math.max(b.top, head ? head.getBoundingClientRect().bottom : b.top);
    if(!(r.top >= top + 30 && r.bottom <= b.bottom - 40 && r.left >= b.left + 10 && r.right <= b.right - 30)){
      box.scrollTop += (r.top + r.height / 2) - (b.top + b.height / 2);
      box.scrollLeft += (r.left + r.width / 2) - (b.left + b.width / 2);
      lastScroll = performance.now();
    }
    await quiet();
  }
  // Diagnostics, kept: what happened between a right-click and the menu it opened closing (scroll, resize and blur
  // events with the scrolled box's position, and renders). A prevented right-click with no menu left is recorded in
  // out.lost; that is how the late, unmoved scroll events above were found.
  var evlog = [];
  function tag(t){ return t === window ? 'window' : t === document ? 'document' : t && t.nodeType === 1 ? (t.tagName + (t.id ? '#' + t.id : '') + '.' + String(t.className || '').split(' ')[0]) : String(t); }
  ['scroll', 'resize', 'blur'].forEach(function (ty) { window.addEventListener(ty, function (e) { var t = e.target; evlog.push(ty + ':' + tag(t) + (t && t.nodeType === 1 && ty === 'scroll' ? '[' + Math.round(t.scrollTop) + ',' + Math.round(t.scrollLeft) + ']' : '') + '@' + Math.round(performance.now())); }, true); });
  new MutationObserver(function (recs) { if(recs.some(function (r) { return r.target === $('table-wrap'); })) evlog.push('render@' + Math.round(performance.now())); }).observe($('table-wrap'), {childList: true, subtree: true});
  async function rc(el, opts){
    await bring(el);
    var bx = $('sheet-scroll-container');
    evlog = ['rc@' + Math.round(performance.now()) + ' box[' + Math.round(bx.scrollTop) + ',' + Math.round(bx.scrollLeft) + ']'];
    var p = mid(el), hit = document.elementFromPoint(p.x, p.y);
    var ev = new MouseEvent('contextmenu', Object.assign({bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 2, buttons: 2}, opts || {}));
    (hit || document.body).dispatchEvent(ev);
    var openNow = !!menuEl();
    await T.sleep(60);
    evlog.push('openNow:' + openNow);
    if(!menuEl() && ev.defaultPrevented) (out.lost = out.lost || []).push(evlog.slice());
    return {hit: hit, inCell: !!hit && (hit === el || el.contains(hit)), prevented: ev.defaultPrevented, log: evlog.slice(), open: !!menuEl()};
  }
  function menuEl(){ return q('.day-menu'); }
  function info(){
    var m = menuEl();
    if(!m) return null;
    var r = m.getBoundingClientRect();
    return {
      view: m.getAttribute('data-view'), week: m.getAttribute('data-week'), kind: m.getAttribute('data-kind'), ph: m.getAttribute('data-ph'),
      title: txt(q('.day-menu-date', m)), ctx: txt(q('.day-menu-ctx', m)),
      sections: qa('[data-section]', m).map(function (s) { return s.getAttribute('data-section'); }),
      items: qa('.day-menu-item', m).map(function (b) { return {id: b.getAttribute('data-item'), off: b.getAttribute('aria-disabled') === 'true', text: txt(q('.day-menu-text', b).firstChild), second: txt(q('small', b))}; }),
      notice: txt(q('.day-menu-notice', m)), strip: qa('.day-menu-strip .day-menu-item', m).length,
      ids: qa('[id]', m).length + (m.id ? 1 : 0), foot: !!q('.day-menu-foot', m),
      focus: document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-item'),
      inWindow: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
    };
  }
  function ids(i){ return i ? i.items.map(function (x) { return x.id; }) : null; }
  function item(i, id){ return (i && i.items.find(function (x) { return x.id === id; })) || {}; }
  function key(k, o){ (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', Object.assign({key: k, bubbles: true, cancelable: true}, o || {}))); }
  async function esc(){ key('Escape'); await T.sleep(80); bodyFocus(); }
  async function choose(id){ var b = menuEl() && q('[data-item="' + id + '"]', menuEl()); if(!b) throw new Error('no item ' + id); b.click(); await settle(); }
  function chip(){ return txt(q('#table-wrap .text-sel-chip')); }

  // ---- the highlight's own gesture (wfkeys' pe()) ----
  function pe(type, p, extra){
    var o = Object.assign({bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0,
      buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true}, extra || {});
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new PointerEvent(type, o));
    if(type === 'pointerup') t.dispatchEvent(new MouseEvent('click', o));
  }
  async function click(el, extra){ await bring(el); var p = mid(el); pe('pointerdown', p, extra); pe('pointerup', p, extra); await T.sleep(200); }

  // ---- the month view, for the way out (mvmenu's arithmetic: every cell dated from its row's Sunday) ----
  function monthCells(){
    var my = txt(q('#table-wrap .mv-monthyear'));
    var m0 = new Date(Date.parse('1 ' + my + ' UTC')), map = {};
    qa('#table-wrap .mv-body > .mv-week').forEach(function (wk) {
      var cells = wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell');
      var inIdx = [].findIndex.call(cells, function (c) { return !c.classList.contains('mv-out'); });
      if(inIdx < 0) return;
      var d = +txt(cells[inIdx].querySelector('.mv-daynum'));
      var sunday = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth(), d) - inIdx * 86400000;
      [].forEach.call(cells, function (c, i) { map[new Date(sunday + i * 86400000).toISOString().slice(0, 10)] = c; });
    });
    return map;
  }
  function rings(){ return qa('.day-menu-ring.is-flash').map(function (r) { var b = r.getBoundingClientRect(); return {l: b.left, t: b.top, r: b.right, b: b.bottom}; }); }
  function covers(ring, a, z){ var ra = a.getBoundingClientRect(), rz = z.getBoundingClientRect();
    return near(ring.l, ra.left) && near(ring.r, rz.right) && near(ring.t, Math.min(ra.top, rz.top)) && near(ring.b, Math.max(ra.bottom, rz.bottom)); }

  // ---- the saved file, through a fake linked handle (wfkeys' snap) ----
  var written = [];
  var saveHandle = { name: 'wfmenu.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'wfmenu.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function snap(){
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    bodyFocus();
    return JSON.parse(written[written.length - 1]);
  }

  // ---- the clipboard, stubbed (headless Chrome grants neither read nor write) ----
  var clipLog = [], clipMode = 'ok', clipText = '';
  try {
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {
      writeText: function (t) { clipLog.push(t); return clipMode === 'ok' ? Promise.resolve() : Promise.reject(new Error('NotAllowedError')); },
      readText: function () { return clipMode === 'ok' ? Promise.resolve(clipText) : Promise.reject(new Error('NotAllowedError')); },
    }});
  } catch (e) { out.clipStubError = String(e); }

  var PH5 = ['phase-start', 'phase-end', 'phase-week', 'hiatus', 'month'];
  var CLIP = ['cut', 'copy', 'paste', 'clear'];
  // Every waterfall menu (and submenu) the leg opens, as it was built, for G0: nothing in any may be greyed.
  var seenWf = [];
  var wfObs = new MutationObserver(function (recs) {
    recs.forEach(function (r) {
      [].forEach.call(r.addedNodes, function (m) {
        if(m.nodeType !== 1 || !m.classList.contains('day-menu')) return;
        var sub = m.classList.contains('day-menu-sub');
        if(!sub && m.getAttribute('data-view') !== 'sheet') return;
        seenWf.push({at: m.getAttribute('data-week') || m.getAttribute('data-day') || (sub ? 'sub' : '?'),
          greyed: [].filter.call(m.querySelectorAll('.day-menu-item'), function (b) { return b.getAttribute('aria-disabled') === 'true'; })
            .map(function (b) { return b.getAttribute('data-item'); })});
      });
    });
  });
  wfObs.observe(document.body, {childList: true});

  try {
    await T.appReady();
    await T.sleep(1500);
    await toSheet();
    await T.until(function () { return !!q('#table-wrap td.sheet-phase-cell[data-pkey="post"]'); }, 'the halfdays waterfall', 100, 100);
    out.platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform;
    var S0 = await snap();
    add('U0', 'The fixture: halfdays in the waterfall, Post 16 weeks from 11/2/26, nothing to undo after the load',
      sheet() && rows('post')[0] === '2026-11-02' && rows('post').slice(-1)[0] === '2027-03-01' && $('weeks-post').value === '16' && !undoOn(),
      {post: [rows('post')[0], rows('post').slice(-1)[0], $('weeks-post').value], undo: undoOn()}, '11/2/26 - 3/1/27, 16, no undo');

    // ---- V: the way out (ruling R4), first, while the undo stack is empty ----
    await rc(phaseTd('production', '2026-07-27'));
    var v1i = info();
    await choose('month');
    var mc = monthCells(), rg = rings();
    add('V1', 'Production, week of 7/27: "Show this week in the month view" lands on July 2026 with ONE ring over Mon 27 Jul - Sat 1 Aug (the month grid\'s row; Sunday 2 Aug is not in July\'s grid), and banks NO undo step',
      item(v1i, 'month').text === 'Show this week in the month view' && item(v1i, 'month').second === 'Week of Mon 27 Jul'
        && !sheet() && txt(q('#table-wrap .mv-monthyear')) === 'July 2026' && rg.length === 1 && covers(rg[0], mc['2026-07-27'], mc['2026-08-01']) && !undoOn(),
      {item: item(v1i, 'month'), month: txt(q('#table-wrap .mv-monthyear')), rings: rg, undo: undoOn()}, 'July 2026, one ring, no undo');
    await T.sleep(2000);
    add('V1b', 'The ring is gone a moment later; nothing was written into the month grid', !q('.day-menu-ring') && !q('#table-wrap .day-menu-ring'),
      qa('.day-menu-ring').length, 0);
    await toSheet();
    add('V1c', 'Switching back to the waterfall banked nothing either', !undoOn(), undoOn(), false);

    await rc(noteTd('2026-08-31'));
    var v2i = info();
    await choose('month');
    mc = monthCells(); rg = rings();
    add('V2', 'The wrap note (week of 8/31, dated Tue 9/1/26): "Show this day in the month view", Tue 1 Sep 2026; it lands on September 2026 with one ring over that day only, and no undo step',
      item(v2i, 'month').text === 'Show this day in the month view' && item(v2i, 'month').second === 'Tue 1 Sep 2026'
        && txt(q('#table-wrap .mv-monthyear')) === 'September 2026' && rg.length === 1 && covers(rg[0], mc['2026-09-01'], mc['2026-09-01']) && !undoOn(),
      {item: item(v2i, 'month'), month: txt(q('#table-wrap .mv-monthyear')), rings: rg}, 'September 2026, the 1st ringed');
    await toSheet();

    // ---- H: what each cell offers, exactly ----
    var h1 = await rc(phaseTd('post', '2027-01-11'));
    var i1 = info();
    add('H1', 'A Post week (1/11/27): hit-tested on the cell, prevented; the waterfall menu for that week, "Week of Mon 11 Jan 2027"; exactly Start / End Post this week, Add 1-week phase here, Add hiatus, Show this week -- no Swap, no Add note, no Colour…, no Show in Phases card, no Expand; none greyed; no footer, no id; focus on Start; inside the window; the cell is the highlight',
      h1.inCell && h1.prevented && i1 && i1.view === 'sheet' && i1.week === '2027-01-11' && i1.kind === 'phase' && i1.ph === 'post'
        && i1.title === 'Week of Mon 11 Jan 2027' && eq(ids(i1), PH5) && i1.items.every(function (x) { return !x.off; })
        && item(i1, 'phase-start').text === 'Start Post this week' && item(i1, 'phase-end').text === 'End Post this week'
        && !i1.foot && i1.ids === 0 && i1.focus === 'phase-start' && i1.inWindow && hiCount() === 1,
      {hit: h1.hit && h1.hit.className, prevented: h1.prevented, info: i1, hi: hiCount()}, PH5.join(', '));
    await esc();

    await rc(phaseTd('production', '2026-07-27'));
    var i2 = info();
    // ⛔ FLIPPED 28 Oct 2026: End Production this week was always greyed ("Its end comes from the shoot days", month
    // ruling Q3); now it is never offered (owner: left out, never greyed).
    var PH4S = ['phase-start', 'phase-week', 'hiatus', 'month'];
    add('H2', 'A Production week: Start offered, NO End (its end comes from the shoot days, so it is left out; greyed until 28 Oct 2026), nothing greyed',
      eq(ids(i2), PH4S) && i2.items.every(function (x) { return !x.off; }),
      i2 && i2.items, PH4S.join(', '));
    await esc();

    await rc(phaseTd('post', '2026-11-02'));
    var i3a = info(); await esc();
    await rc(phaseTd('post', '2027-03-01'));
    var i3b = info(); await esc();
    // ⛔ FLIPPED 28 Oct 2026: they were a greyed pair ("It already starts / ends this week", R6's exception).
    var PH4E = ['phase-end', 'phase-week', 'hiatus', 'month'];
    add('H3', 'Post\'s first week LEAVES OUT Start (End offered); its last LEAVES OUT End (Start offered); nothing greyed (a greyed pair until 28 Oct 2026)',
      eq(ids(i3a), PH4E) && eq(ids(i3b), PH4S) && i3a.items.concat(i3b.items).every(function (x) { return !x.off; }),
      {first: i3a && i3a.items, last: i3b && i3b.items}, 'first: ' + PH4E.join(', ') + '; last: ' + PH4S.join(', '));

    await rc(noteTd('2026-06-29'));
    var i4 = info();
    add('H4', 'An automatic note (6/29): the clipboard row of four, nothing greyed and no notice; no Back to automatic (it IS automatic, R6); Show this DAY (Mon 29 Jun 2026); focus opens BELOW the row, on Show this day',
      i4 && i4.kind === 'note' && eq(ids(i4), CLIP.concat(['month'])) && i4.strip === 4 && i4.items.every(function (x) { return !x.off; })
        && !i4.notice && item(i4, 'month').text === 'Show this day in the month view' && item(i4, 'month').second === 'Mon 29 Jun 2026' && i4.focus === 'month',
      i4, 'cut, copy, paste, clear, month');
    await esc();

    var h5x = await rc(noteTd('2026-07-06'));
    var i5 = info();
    // ⛔ FLIPPED 28 Oct 2026: Cut, Copy and Clear were greyed here with "The note is empty" under the row. Now they are
    // left out, and Paste alone is an ordinary row (one button would sit in a quarter of the four-wide strip), so focus
    // opens on it.
    add('H5', 'An empty Notes cell (7/6): EXACTLY Paste, as an ordinary row (no strip, no notice), and Show this WEEK; nothing greyed; focus on Paste',
      i5 && eq(ids(i5), ['paste', 'month']) && i5.strip === 0 && !i5.notice && i5.items.every(function (x) { return !x.off; })
        && item(i5, 'month').text === 'Show this week in the month view' && i5.focus === 'paste',
      i5 || h5x.log, 'paste, month');
    await esc();

    var h6 = await rc(W('td.sheet-hiatus-cell[data-week="2026-12-28"]'));
    var i6 = info();
    var i6ids = ids(i6) || [];
    add('H6', 'A hiatus band (12/28): Remove hiatus… (naming "Hiatus · 21 Dec – 3 Jan") and Show this week, nothing else -- no Lock, no rename (double-click does that), no clipboard row',
      i6 && i6.kind === 'band' && i6ids.length === 2 && /^band-remove-\d+$/.test(i6ids[0]) && i6ids[1] === 'month'
        && i6.items[0].text === 'Remove hiatus…' && i6.items[0].second === 'Hiatus · 21 Dec – 3 Jan',
      i6 || {hit: h6.hit && (h6.hit.tagName + '.' + h6.hit.className), prevented: h6.prevented, inCell: h6.inCell, log: h6.log, open: h6.open}, 'band-remove-N, month');
    await esc();

    await rc(dateTd('2026-07-06'));
    var i7 = info(); await esc();
    var eTd = emptyTd('2026-10-12');
    await rc(eTd);
    var i8 = info(); await esc();
    add('H7', 'A date (7/6/26) and an empty cell (week of 10/12/26): Add 1-week phase here, Add hiatus, Show this week (R5); the empty cell\'s header says "Nothing scheduled"; neither keeps the old highlight',
      i7 && i7.kind === 'date' && eq(ids(i7), ['phase-week', 'hiatus', 'month']) && !!eTd && i8 && i8.kind === 'empty'
        && eq(ids(i8), ['phase-week', 'hiatus', 'month']) && i8.ctx === 'Nothing scheduled' && i8.week === '2026-10-12' && hiCount() === 0,
      {date: i7, empty: i8, hi: hiCount()}, 'the two adds and the way out');

    var th = qa('#table-wrap table.sheet-table thead th').find(function (t) { return txt(t) === '2026'; });
    var h9a = await rc(th), m9a = !!menuEl();
    var h9b = await rc(phaseTd('post', '2027-01-11'), {shiftKey: true}), m9b = !!menuEl();
    var h9c = await rc(W('.hdr-line')), m9c = !!menuEl();
    add('H9', 'The browser keeps its own menu on a column heading (double-click edits it), with Shift held, and on the title block: not prevented, no menu',
      !h9a.prevented && !m9a && !h9b.prevented && !m9b && !h9c.prevented && !m9c,
      {heading: [h9a.prevented, m9a], shift: [h9b.prevented, m9b], title: [h9c.prevented, m9c]}, 'all false');

    // ---- F: the file ----
    var S1 = await snap();
    add('F1', 'Opening and closing the menu on every kind of cell left fields.byId exactly as it was, and wrote no new snapshot key',
      eq(S1.fields.byId, S0.fields.byId) && eq(Object.keys(S1).sort(), Object.keys(S0).sort()),
      {byId: eq(S1.fields.byId, S0.fields.byId), keys: eq(Object.keys(S1).sort(), Object.keys(S0).sort())}, 'identical');

    // ---- P: the phase week's items, ONE undo step each ----
    await rc(phaseTd('post', '2027-01-11'));
    await choose('phase-end');
    var p1 = {w: $('weeks-post').value, unit: $('unit-post').value, last: rows('post').slice(-1)[0], first: rows('post')[0], undo: undoOn()};
    await undo();
    var p1u = {w: $('weeks-post').value, last: rows('post').slice(-1)[0], undo: undoOn()};
    await redo();
    var p1r = {w: $('weeks-post').value, last: rows('post').slice(-1)[0]};
    await undo();
    add('P1', 'End Post this week (1/11/27): Post stays in Weeks and becomes 9 weeks (the two hiatus weeks stepped over), its start held, its last row 1/11/27; ONE undo step back to 16, redo forward',
      p1.w === '9' && p1.unit === 'weeks' && p1.last === '2027-01-11' && p1.first === '2026-11-02' && p1.undo
        && p1u.w === '16' && p1u.last === '2027-03-01' && !p1u.undo && p1r.w === '9' && p1r.last === '2027-01-11',
      {p1: p1, undone: p1u, redone: p1r}, '9 weeks, one step');

    await rc(phaseTd('post', '2027-01-11'));
    await choose('phase-start');
    var p2 = {start: $('start-post').value, w: $('weeks-post').value, first: rows('post')[0], undo: undoOn()};
    await undo();
    var p2u = {start: $('start-post').value, first: rows('post')[0], undo: undoOn()};
    add('P2', 'Start Post this week (1/11/27): a mover -- its start is 1/11/27 and its first row 1/11/27, its 16 weeks kept; ONE undo step',
      p2.start === '2027-01-11' && p2.w === '16' && p2.first === '2027-01-11' && p2.undo && p2u.start === '2026-11-02' && p2u.first === '2026-11-02' && !p2u.undo,
      {p2: p2, undone: p2u}, 'moved, one step');

    // A Dates phase takes the end handle's own rule: the LAST day of the week it can be drawn on.
    T.set('unit-localization', 'dates');
    await T.sleep(900);
    var p3pre = {unit: $('unit-localization').value, end: $('end-localization').value};
    await rc(phaseTd('localization', '2027-03-29'));
    await choose('phase-end');
    var p3 = {unit: $('unit-localization').value, end: $('end-localization').value, last: rows('localization').slice(-1)[0]};
    await undo();
    var p3u = {unit: $('unit-localization').value, end: $('end-localization').value};
    for(var u = 0; u < 6 && undoOn(); u++) await undo();
    add('P3', 'End Localization this week when it is a DATES phase (3/29/27): its end is Fri 4/2/27, the last weekday of that week, the unit stays Dates; ONE undo step puts the old end back',
      p3pre.unit === 'dates' && p3.unit === 'dates' && p3.end === '2027-04-02' && p3.last === '2027-03-29' && p3u.unit === 'dates' && p3u.end === p3pre.end
        && $('unit-localization').value === 'weeks',
      {pre: p3pre, after: p3, undone: p3u, finally: $('unit-localization').value}, '2027-04-02, one step');

    var nRows = qa('#custom-phase-rows .phase-row').length;
    await rc(emptyTd('2026-10-12'));
    await choose('phase-week');
    var newRow = qa('#custom-phase-rows .phase-row').slice(-1)[0], nk = newRow && newRow.dataset.key;
    var p4 = {rows: qa('#custom-phase-rows .phase-row').length, start: nk && $('start-' + nk).value, weeks: nk && $('weeks-' + nk).value,
              snap: nk && $('snap-' + nk).checked, drawn: nk ? rows(nk) : [], tab: (q('.side-tab-btn.active') || {dataset: {}}).dataset.tab, undo: undoOn()};
    await undo();
    add('P4', 'Add 1-week phase here (empty cell, week of 10/12/26): one new custom phase from Mon 10/12/26, 1 week, Snap to Mon on, drawn in that week; the sidebar on Phases; ONE undo step removes it',
      p4.rows === nRows + 1 && p4.start === '2026-10-12' && p4.weeks === '1' && p4.snap === true && eq(p4.drawn, ['2026-10-12']) && p4.tab === 'phases' && p4.undo
        && qa('#custom-phase-rows .phase-row').length === nRows && !undoOn(),
      p4, 'one 1-week phase, one step');

    var nH = qa('#hiatus-list .hiatus-entry').length;
    var h5 = await rc(phaseTd('post', '2026-11-09'));
    if(!menuEl()) throw new Error('P5: no menu; hit ' + (h5.hit && (h5.hit.tagName + '.' + h5.hit.className)) + ', prevented ' + h5.prevented + ', in cell ' + h5.inCell + ', log ' + JSON.stringify(h5.log));
    var mb = q('[data-item="hiatus"]', menuEl()); mb.click(); await T.sleep(150);
    var sub = q('.day-menu-sub'), subIds = sub ? qa('.day-menu-item', sub).map(function (b) { return b.getAttribute('data-item'); }) : null;
    q('[data-item="hiatus-all"]', sub).click(); await settle();
    var newH = qa('#hiatus-list .hiatus-entry').slice(-1)[0];
    var p5 = {n: qa('#hiatus-list .hiatus-entry').length, start: newH && q('.hiatus-start', newH).value, weeks: newH && q('.hiatus-weeks', newH).value,
              band: !!q('#table-wrap td.sheet-hiatus-cell[data-week="2026-11-09"]:not([data-pkey])'), sub: subIds, undo: undoOn()};
    await undo();
    add('P5', 'Add hiatus ▸ on a Post week (11/9/26): All phases and Post only; All phases adds a 2-week hiatus from Mon 11/9/26, drawn there; ONE undo step removes it',
      eq(p5.sub, ['hiatus-all', 'hiatus-post']) && p5.n === nH + 1 && p5.start === '2026-11-09' && p5.weeks === '2' && p5.band && p5.undo
        && qa('#hiatus-list .hiatus-entry').length === nH && !undoOn(),
      p5, 'a hiatus from 11/9/26, one step');

    // ---- N: the clipboard row and Back to automatic ----
    await rc(noteTd('2026-06-29'));
    await choose('clear');
    var n1 = {text: noteText('2026-06-29'), undo: undoOn()};
    var S2 = await snap();
    add('N1', 'Clear on the automatic note (6/29) empties the cell and stores the explicit clear, userNotes["2026-06-29"] = {text: ""} (R2); an undo step',
      n1.text === '' && n1.undo && eq((S2.userNotes || {})['2026-06-29'], {text: ''}),
      {n1: n1, stored: (S2.userNotes || {})['2026-06-29']}, '{text: ""}');

    await rc(noteTd('2026-06-29'));
    var n2i = info();
    await choose('note-auto');
    var n2 = {text: noteText('2026-06-29')};
    await undo();
    var n2u = noteText('2026-06-29');
    await undo();
    // The cleared cell is empty, so since 28 Oct 2026 its clipboard row is Paste alone (Cut, Copy and Clear left out).
    add('N2', 'Then the cleared cell offers Paste (alone: it is empty) and Back to automatic text ("Start Principal Photography 6/29/26"), before the way out; it brings the text back as ONE undo step (undo empties it again; one more undo, nothing left)',
      n2i && eq(ids(n2i), ['paste', 'note-auto', 'month']) && item(n2i, 'note-auto').second === 'Start Principal Photography 6/29/26'
        && n2.text === 'Start Principal Photography 6/29/26' && n2u === '' && noteText('2026-06-29') === 'Start Principal Photography 6/29/26' && !undoOn(),
      {menu: n2i && n2i.items, back: n2.text, undone: n2u, undo: undoOn()}, 'back, one step');

    clipMode = 'refuse'; clipLog = [];
    await rc(noteTd('2026-08-31'));
    await choose('cut');
    await T.sleep(200);
    var n3 = {text: noteText('2026-08-31'), undo: undoOn(), chip: chip(), tried: clipLog.length};
    add('N3', 'Cut with the clipboard refused KEEPS the note (the write comes before the clear) and says so on the grid; nothing banked',
      n3.text === 'Principal Photography Wraps 9/1/26' && !n3.undo && n3.chip === 'Couldn’t reach the clipboard, so nothing was cut' && n3.tried === 1,
      n3, 'kept');

    clipMode = 'ok'; clipLog = [];
    await rc(noteTd('2026-08-31'));
    await choose('cut');
    await T.sleep(200);
    var n4 = {text: noteText('2026-08-31'), log: clipLog.slice(), undo: undoOn()};
    await undo();
    add('N4', 'Cut writes Excel\'s text form ("…Wraps 9/1/26\\n") to the clipboard, then empties the cell; ONE undo step',
      eq(n4.log, ['Principal Photography Wraps 9/1/26\n']) && n4.text === '' && n4.undo && noteText('2026-08-31') === 'Principal Photography Wraps 9/1/26' && !undoOn(),
      n4, 'written, then cleared');

    clipLog = [];
    await rc(noteTd('2026-01-05'));
    await choose('copy');
    await T.sleep(150);
    add('N5', 'Copy writes the note\'s text and changes nothing', eq(clipLog, ['Writer\'s Room Opens 1/5/26\n']) && noteText('2026-01-05') === 'Writer\'s Room Opens 1/5/26' && !undoOn(),
      {log: clipLog, undo: undoOn()}, 'written');

    clipText = 'Table read';
    await rc(noteTd('2026-07-13'));
    await choose('paste');
    await T.sleep(200);
    var n6 = {text: noteText('2026-07-13'), undo: undoOn()};
    await undo();
    add('N6', 'Paste reads the clipboard into the empty Notes cell (7/13): "Table read"; ONE undo step', n6.text === 'Table read' && n6.undo && noteText('2026-07-13') === '' && !undoOn(),
      n6, 'pasted');

    clipMode = 'refuse';
    await rc(noteTd('2026-07-13'));
    await choose('paste');
    await T.sleep(200);
    var n7 = {text: noteText('2026-07-13'), chip: chip(), undo: undoOn()};
    clipMode = 'ok';
    add('N7', 'Paste with the clipboard refused says to press the paste key instead, and changes nothing',
      n7.text === '' && /^Paste needs clipboard access: press (⌘V|Ctrl\+V) instead$/.test(n7.chip) && !n7.undo, n7, 'said, unchanged');

    // ---- M: a highlight of several cells ----
    await toSheet();
    await click(noteTd('2026-01-05'));
    await click(noteTd('2026-06-29'), {metaKey: true});
    await click(noteTd('2026-08-31'), {metaKey: true});
    var m0 = hiCount();
    await rc(noteTd('2026-06-29'));
    var m1 = info();
    add('M1', 'Right-click inside a highlight of three notes acts on all of it: "3 cells highlighted", "Weeks of Mon 5 Jan – Mon 31 Aug", the clipboard row and the way out only; the highlight kept',
      m0 === 3 && m1 && m1.kind === 'many' && m1.title === '3 cells highlighted' && m1.ctx === 'Weeks of Mon 5 Jan – Mon 31 Aug'
        && eq(ids(m1), CLIP.concat(['month'])) && item(m1, 'month').text === 'Show this week in the month view' && hiCount() === 3,
      {before: m0, info: m1, after: hiCount()}, 'three, clipboard + way out');
    await choose('clear');
    var m2 = ['2026-01-05', '2026-06-29', '2026-08-31'].map(noteText);
    await undo();
    var m2u = ['2026-01-05', '2026-06-29', '2026-08-31'].map(noteText);
    add('M2', 'Clear there empties all three as ONE undo step', eq(m2, ['', '', '']) && m2u.every(Boolean) && !undoOn(), {cleared: m2, undone: m2u}, 'three emptied, one step');

    await click(noteTd('2026-01-05'));
    await click(noteTd('2026-06-29'), {metaKey: true});
    await rc(phaseTd('production', '2026-07-27'));
    var m3 = info();
    add('M3', 'Outside the highlight, the right-clicked cell becomes the highlight first (one cell), and the menu is that cell\'s', hiCount() === 1 && m3 && m3.kind === 'phase',
      {hi: hiCount(), kind: m3 && m3.kind}, '1, phase');
    await esc();

    // ---- S: Size, only after a hand resize (R3, R6) ----
    async function drag(sel, dx, dy){
      var h = q(sel); if(!h) throw new Error('no handle ' + sel);
      await bring(h);
      var r = h.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      h.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 9, button: 0, buttons: 1, isPrimary: true}));
      document.dispatchEvent(new PointerEvent('pointermove', {bubbles: true, clientX: x + dx, clientY: y + dy, pointerId: 9, buttons: 1, isPrimary: true}));
      document.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, clientX: x + dx, clientY: y + dy, pointerId: 9, isPrimary: true}));
      await T.sleep(900);
    }
    var tr = phaseTd('production', '2026-07-06').parentElement, rIdx = tr.dataset.row;
    var hDefault = Math.round(tr.getBoundingClientRect().height);
    await drag('#table-wrap .grid-resize.is-row[data-row="' + rIdx + '"]', 0, 16);
    var hDragged = Math.round(phaseTd('production', '2026-07-06').parentElement.getBoundingClientRect().height);
    await rc(phaseTd('production', '2026-07-06'));
    var s1 = info();
    await choose('size-row');
    var hReset = Math.round(phaseTd('production', '2026-07-06').parentElement.getBoundingClientRect().height);
    await undo();
    var hUndone = Math.round(phaseTd('production', '2026-07-06').parentElement.getBoundingClientRect().height);
    await undo();
    // A Production week: no End item since 28 Oct 2026 (H2).
    add('S1', 'After a row is dragged taller, its cells offer Reset row height in a Size section before the way out; it puts the row back as ONE undo step',
      hDragged > hDefault && s1 && eq(ids(s1), ['phase-start', 'phase-week', 'hiatus', 'size-row', 'month']) && s1.sections.indexOf('size') === s1.sections.length - 2
        && hReset === hDefault && hUndone === hDragged && !undoOn(),
      {default: hDefault, dragged: hDragged, reset: hReset, undone: hUndone, items: ids(s1), sections: s1 && s1.sections}, 'reset, one step');

    var col = q('#table-wrap col[data-ckey="y2026:notes"]'), wDefault = parseFloat(col.style.width);
    await drag('#table-wrap .grid-resize.is-col[data-ckey="y2026:notes"]', 40, 0);
    var wDragged = parseFloat(q('#table-wrap col[data-ckey="y2026:notes"]').style.width);
    await rc(noteTd('2026-07-06'));
    var s2 = info();
    await choose('size-col');
    var wReset = parseFloat(q('#table-wrap col[data-ckey="y2026:notes"]').style.width);
    await undo(); await undo();
    add('S2', 'After the 2026 Notes column is dragged wider, its cells offer Reset column width; it goes back to the automatic width',
      wDragged > wDefault && s2 && ids(s2).indexOf('size-col') === ids(s2).length - 2 && near(wReset, wDefault, 1) && !undoOn(),
      {default: wDefault, dragged: wDragged, reset: wReset, items: ids(s2)}, 'reset');
    await rc(phaseTd('production', '2026-07-06'));
    var s3 = info(); await esc();
    add('S3', 'With nothing resized, no Size section (left out, R6)', s3 && s3.sections.indexOf('size') < 0, s3 && s3.sections, 'no size');

    // ---- C: close rules, the cap, the keys, the Mac Ctrl guard ----
    await rc(phaseTd('post', '2027-01-11'));
    var cs0 = getComputedStyle(menuEl()), cs = {maxHeight: cs0.maxHeight, overflowY: cs0.overflowY, overscrollBehaviorY: cs0.overscrollBehaviorY};
    menuEl().dispatchEvent(new Event('scroll'));
    await T.sleep(60);
    var c1a = !!menuEl();
    $('sheet-scroll-container').dispatchEvent(new Event('scroll'));
    await T.sleep(60);
    var c1b = !!menuEl();
    // The real scroll, then its event at once (under virtual time Chrome would deliver it only at a later frame).
    $('sheet-scroll-container').scrollTop += 60;
    $('sheet-scroll-container').dispatchEvent(new Event('scroll'));
    await T.sleep(60);
    var c1c = !!menuEl();
    add('C1', 'Capped at the window\'s height and scrolling inside (max-height 100vh − 16 px, overflow-y auto, overscroll contained); a scroll inside the menu keeps it open, so does a scroll event that moved nothing (Chrome delivers late ones), and a real scroll of the grid closes it',
      near(parseFloat(cs.maxHeight), innerHeight - 16, 1) && cs.overflowY === 'auto' && cs.overscrollBehaviorY === 'contain' && c1a && c1b && !c1c,
      {maxHeight: cs.maxHeight, overflowY: cs.overflowY, overscroll: cs.overscrollBehaviorY, inside: c1a, unmoved: c1b, moved: c1c}, 'open, open, closed');
    await quiet();

    await rc(phaseTd('post', '2027-01-11'));
    var layer = q('#table-wrap .sheet-grid-wrap .text-sel-layer');
    var dot = document.createElement('div'); layer.appendChild(dot); await T.sleep(60);
    var c2a = !!menuEl();
    dot.remove();
    $('view-sheet-btn').click(); await T.sleep(300);
    var c2b = !!menuEl();
    add('C2', 'A repaint inside the grid\'s layers (the highlight, the phase selection) keeps it open; a render closes it',
      c2a && !c2b, {repaint: c2a, render: c2b}, 'open, then closed');
    bodyFocus();

    await rc(noteTd('2026-06-29'));
    var k = [info().focus];
    key('ArrowUp'); k.push(info().focus);
    key('ArrowLeft'); k.push(info().focus);
    key('ArrowLeft'); k.push(info().focus);
    key('ArrowRight'); k.push(info().focus);
    key('ArrowDown'); k.push(info().focus);
    key('Escape'); await T.sleep(60);
    add('C3', 'The keys: the menu opens below the clipboard row; ↑ enters the row, ← → move along it, ↓ leaves it; Esc closes',
      eq(k, ['month', 'clear', 'paste', 'copy', 'paste', 'month']) && !menuEl(), k, 'month, clear, paste, copy, paste, month');
    bodyFocus();

    if(/mac/i.test(out.platform || '')){
      await click(noteTd('2026-01-05'));
      await click(noteTd('2026-06-29'), {metaKey: true});
      var c4a = hiCount();
      await click(noteTd('2026-06-29'), {ctrlKey: true});
      var c4b = hiCount();
      add('C4', 'On a Mac, a Ctrl+click is the right-click: its press leaves the highlight alone (a ⌘-click would toggle the cell out)',
        c4a === 2 && c4b === 2, {before: c4a, after: c4b}, '2 and 2');
    } else add('C4', 'The Mac Ctrl guard (not a Mac: ' + out.platform + ')', true, out.platform, 'skipped');

    // ---- P6, last: a phase started mid-week keeps its weekday when it moves ----
    var snapEl = $('snap-writersRoom');
    snapEl.checked = false; snapEl.dispatchEvent(new Event('change', {bubbles: true}));
    T.set('start-writersRoom', '2026-01-07');
    await T.sleep(900);
    var p6pre = rows('writersRoom')[0];
    await rc(phaseTd('writersRoom', '2026-01-19'));
    await choose('phase-start');
    add('P6', 'Start Writer\'s Room this week (1/19/26) when it starts on a Wednesday (1/7/26, Snap off): it moves by whole weeks to Wed 1/21/26, its first row 1/19/26',
      p6pre === '2026-01-05' && $('start-writersRoom').value === '2026-01-21' && rows('writersRoom')[0] === '2026-01-19',
      {pre: p6pre, start: $('start-writersRoom').value, first: rows('writersRoom')[0]}, '2026-01-21');

    // G0: ⛔ the owner's rule (28 Oct 2026), over EVERY waterfall menu and submenu the leg opened, as each was built:
    // nothing greyed. A build that greys an item again, on any cell a case happens to open, turns this red.
    wfObs.disconnect();
    var g0 = {menus: seenWf.length, greyed: []};
    seenWf.forEach(function (m) { m.greyed.forEach(function (id) { g0.greyed.push(m.at + ':' + id); }); });
    add('G0', '⭐ Nothing is greyed in any waterfall menu or submenu the leg opened (owner, 28 Oct 2026: left out, never greyed)',
      g0.menus >= 20 && g0.greyed.length === 0, g0, 'none greyed, over 20+ menus');

    out.health = T.appHealth();
    add('E1', 'No uncaught page errors', !(out.health.errors || []).length, out.health.errors, '[]');
  } catch (e) {
    out.error = String(e && e.stack || e);
    add('X', 'the leg ran to the end', false, out.error, 'no exception');
  }
  out.cases = cases;
  out.pass = cases.length > 0 && cases.every(function (c) { return c.pass; });
  T.done(out);
})(); });
