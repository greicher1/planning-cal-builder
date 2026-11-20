// notelook -- the note editors' look A2 (owner, 4 Nov 2026: "yes A2, but its an "Auto-Note""; mockups/note-editor-look.html,
// card note-editor-overhaul, PHASE-LINKED-NOTES-PLAN.md §4.4), with the waterfall editor's per-line Hide list folded in
// (WATERFALL-NOTE-EDITOR-PLAN.md R3(a)) and the owner's later rulings kept: the one action button at the top right
// (10 Nov 2026), no keys line on a typed note (12 Nov 2026), "Enter to save · Esc to cancel" left on the month view's
// holiday and Auto-Note editors (12 Nov 2026, "No, leave it").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=autonoterename ./run.sh notelook 300
//
// tests/fixtures/autonoterename.sptcal (synthetic, US Area Standards): 6/29/26 holds "Start Principal Photography" and
// "Independence Day (Observed)"; 9/7/26 Labor Day alone; 10/19/26 the wrap alone; 11/2/26 a TYPED note ("Post Begins
// 11/2/26" plus "Post kickoff 11/3/26"); 8/3/26 nothing.
//
//   W1  a typed cell: the heading is "Note" then "Week of 11/2/26", Delete Note at the top right; under the text box ONE
//       list in A2's order (Day, Stays with, Colour, Show in month view, then "In this cell"), name left, value right;
//       Colour names the colour and shows all 18 swatches, ten then eight, on one grid; a foot with Save and no keys line
//   W2  a swatch renames the Colour row at once; Save saves the text and the colour and closes the editor
//   W3  one automatic note: "Auto-Note" then its day "Tue 10/20/26", Hide Auto-Note at the top right, what saving does
//       right under the box, then only Colour (Day, Stays with and the switch hidden, D4/D5)
//   W4  one holiday: "Holiday", "Mon 9/7/26", Hide Holiday, only Colour
//   W5  a cell of automatic lines: "In this cell" is the list's last row, its Hides at the right; typing a line brings
//       Day, Stays with and the switch back IN A2's ORDER, above Colour
//   W6  no id in either editor; opening and pressing Esc saves nothing
//   W7  the heading editor is a .note-pop too, and keeps its own look (not A2)
//   M1  month view, an automatic note: "Auto-Note" then "Mon 6/29/26", Hide Auto-Note at the top right, the line under the
//       box, Colour, and a foot of "Enter to save · Esc to cancel" and Save
//   M2  a holiday: "Holiday" then "Fri 7/3/26", no button, Colour, the same foot
//   M3  a waterfall line: "Waterfall line" then "Tue 11/3/26", Delete Note; Stays with, Colour, Show in waterfall; Save only
//   M4  a "+": "Note"; a swatch renames Colour; Save adds the note and closes the editor
//   S1  focused, the selects draw no outline or ring and Stays with ends above its hint, in both editors (owner, 16 Nov
//       2026: "why do these boxes show up"); red before (a 2 px outline 1 px outside the select, through the hint)
//   E0  no console errors
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'notelook', cases: [] };
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
  function shown(el) { return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0; }
  function rect(el) { var r = el.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; }
  async function settle() {
    await T.sleep(700);
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
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellText(wk) {
    var t = noteTd(wk); if (!t) return null;
    var x = ((t.querySelector('.cell-body') || t).innerText || '').replace(/\s*\n\s*/g, '\n').trim();
    return x === '+' ? '' : x;
  }
  function esc() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
  // A click where the control is drawn (hit-tested), with the mousedown the editors listen for.
  async function press(el) {
    el.scrollIntoView({ block: 'nearest' }); await T.sleep(60);
    var r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== el && !(hit && el.contains(hit))) throw new Error('not on top: ' + (el.className || el.tagName) + ' (got ' + (hit && (hit.className || hit.tagName)) + ')');
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.click();
  }

  // ---- the waterfall's note editor ----
  function pop() { return q('.note-pop'); }
  async function openEditor(wk) {
    if (!q('#table-wrap table.sheet-table')) await view('sheet');
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(noteTd(wk));
    await T.until(function () { return !!pop(); }, 'the note editor on ' + wk, 40, 50);
    await T.sleep(60);
    return pop();
  }
  async function closeEditor() { esc(); await T.until(function () { return !pop(); }, 'the editor to close', 40, 50); await T.sleep(100); }
  function setBox(p, text) { var ta = q('textarea', p); ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }

  // What an A2 editor shows, top to bottom. `rows`: the names of the list's rows that are drawn, in order.
  function look(p) {
    var head = q('.note-pop-head', p), heading = q('.note-pop-heading', p), btn = q('.note-pop-head .note-pop-delete', p);
    var ta = q('textarea', p), list = q('.note-list', p), foot = q('.note-pop-foot', p), save = q('.note-pop-save', p);
    var hint = q('.note-pop-hint, .mv-note-pop-hint', p);
    var rows = list ? qa(':scope > .note-item', list).filter(shown).map(function (r) {
      var n = q('.note-row-name, .note-view-label, .wf-note-items-head', r); return txt(n);
    }) : null;
    var colour = q('.note-colour-item', p), sw = colour ? qa('.note-color-row', colour) : [];
    var swRows = sw.map(function (r) { return qa('.color-swatch', r).length; });
    var oneLine = sw.every(function (r) { var t = qa('.color-swatch', r).map(function (s) { return Math.round(s.getBoundingClientRect().top); }); return t.every(function (y) { return y === t[0]; }); });
    // The second row's swatches sit under the first row's (one grid of ten columns).
    var aligned = sw.length === 2 && qa('.color-swatch', sw[1]).every(function (s, i) {
      var a = qa('.color-swatch', sw[0])[i]; return !!a && Math.abs(a.getBoundingClientRect().left - s.getBoundingClientRect().left) < 0.5;
    });
    var pr = rect(p);
    return {
      a2: p.classList.contains('note-a2'), width: pr.w,
      name: txt(q('.note-pop-title', heading)), when: txt(q('.note-pop-when', heading)),
      button: btn ? txt(btn) : '',
      // the button is the heading row's last element, at its right edge, on the heading's line
      btnTopRight: !btn || (head.lastElementChild === btn && Math.abs(rect(btn).r - (pr.r - 14)) <= 9 && rect(btn).t - pr.t < 30),
      hint: hint && shown(hint) ? txt(hint) : '',
      hintUnderBox: !hint || !shown(hint) || (rect(hint).t >= rect(ta).b && (!list || rect(hint).b <= rect(list).t + 1)),
      listUnderBox: !!list && rect(list).t >= rect(ta).b,
      rows: rows,
      colourName: colour ? txt(q('.note-colour-name', colour)) : null,
      swRows: swRows, swOneLine: oneLine, swAligned: aligned, swSize: sw.length ? rect(q('.color-swatch', sw[0])).w : 0,
      foot: foot ? { keys: txt(q('.note-pop-keys', foot)), save: save ? txt(save) : null, last: p.lastElementChild === foot,
                     saveRight: !!save && Math.abs(rect(save).r - (pr.r - 14)) <= 2 } : null
    };
  }

  // The list's selects (Day, Stays with), focused one at a time (owner, 16 Nov 2026: "why do these boxes show up"):
  // none draws an outline or a ring, because Chrome counts a MOUSE click on a <select> as :focus-visible, and the Stays
  // with select's own box ends above the hint tucked under its row. Focus goes back to the text box after.
  function selFacts(p) {
    var sels = qa('.note-list .note-line select', p).filter(shown).map(function (s) {
      s.focus(); var cs = getComputedStyle(s);
      return { name: txt(q('.note-row-name', s.closest('.note-line'))), focused: document.activeElement === s && s.matches(':focus'),
               outline: cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) === 0, ring: cs.boxShadow === 'none' };
    });
    var lsel = q('.note-link-select', p), lhint = q('.note-link-hint', p);
    var hintShown = !!lhint && shown(lhint) && txt(lhint) !== '';
    var gap = hintShown && lsel ? lhint.getBoundingClientRect().top - lsel.getBoundingClientRect().bottom : null;
    var ta = q('textarea', p); if (ta) ta.focus();
    return { sels: sels, hint: hintShown ? txt(lhint) : '', gap: gap === null ? null : Math.round(gap * 100) / 100 };
  }
  function selFactsOk(f, names) {
    return same(f.sels.map(function (s) { return s.name; }), names)
      && f.sels.every(function (s) { return s.focused && s.outline && s.ring; }) && f.hint !== '' && f.gap !== null && f.gap >= 0;
  }

  // ---- Save and Load through the real controls ----
  var written = [];
  var saveHandle = { name: 'notelook.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'notelook.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];
    return JSON.parse(typeof w === 'string' ? w : w.text);
  }
  function stripStamp(s) { var c = JSON.parse(JSON.stringify(s)); delete c.lastEdited; return c; }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!q('#table-wrap table.sheet-table') || !!q('#table-wrap .mv-daygrid'); }, 'the fixture', 200, 100);
    await settle();
    await view('sheet');
    var S0 = await save();

    await step('W1', async function () {
      var f = look(await openEditor('2026-11-02'));
      await closeEditor();
      kase('W1', 'a typed cell: "Note" then "Week of 11/2/26", Delete Note at the top right; ONE list under the box in A2\'s order (Day, Stays with, Colour, Show in month view, In this cell); Colour named, 18 swatches ten then eight on one grid; a foot with Save, no keys line; 272 px',
           f.a2 && f.width === 272 && f.name === 'Note' && f.when === 'Week of 11/2/26' && f.button === 'Delete Note' && f.btnTopRight
             && f.hint === '' && f.listUnderBox
             && same(f.rows, ['Day', 'Stays with', 'Color', 'Show in month view', 'In this cell'])
             && f.colourName === 'Purple' && same(f.swRows, [10, 8]) && f.swOneLine && f.swAligned && f.swSize === 18
             && same(f.foot, { keys: '', save: 'Save', last: true, saveRight: true }),
           f);
    });

    await step('W2', async function () {
      var p = await openEditor('2026-08-03');
      setBox(p, 'Table read');
      await press(q('.color-swatch[title="Green"]', p));
      var named = txt(q('.note-colour-name', p)), still = !!pop();
      await press(q('.note-pop-save', p));
      await settle();
      var c = cellText('2026-08-03'), td = noteTd('2026-08-03'), bg = td ? getComputedStyle(td).backgroundColor : null;
      var s = await save();
      kase('W2', 'a swatch renames the Colour row at once (the editor stays open); Save saves the text and the colour, and closes the editor',
           named === 'Green' && still && !pop() && c === 'Table read' && bg === 'rgb(0, 176, 80)'
             && s.userNotes['2026-08-03'] && s.userNotes['2026-08-03'].text === 'Table read' && (s.noteColors || {})['2026-08-03'] === '#00B050',
           { named: named, open: still, closed: !pop(), cell: c, bg: bg, note: s.userNotes['2026-08-03'], colour: (s.noteColors || {})['2026-08-03'] });
      byId('undo-btn').click(); await settle();
    });

    await step('W3', async function () {
      var f = look(await openEditor('2026-10-19'));
      await closeEditor();
      kase('W3', 'one automatic note: "Auto-Note" then "Tue 10/20/26", Hide Auto-Note at the top right, what saving does right under the box, then only Colour; Save in the foot',
           f.a2 && f.name === 'Auto-Note' && f.when === 'Tue 10/20/26' && f.button === 'Hide Auto-Note' && f.btnTopRight
             && f.hint === 'Renames it wherever it shows. Its date follows the schedule.' && f.hintUnderBox
             && same(f.rows, ['Color']) && same(f.foot, { keys: '', save: 'Save', last: true, saveRight: true }),
           f);
    });

    await step('W4', async function () {
      var f = look(await openEditor('2026-09-07'));
      await closeEditor();
      kase('W4', 'one holiday: "Holiday" then "Mon 9/7/26", Hide Holiday at the top right, its line under the box, only Colour',
           f.a2 && f.name === 'Holiday' && f.when === 'Mon 9/7/26' && f.button === 'Hide Holiday' && f.btnTopRight
             && f.hint === 'Renames this holiday wherever it shows.' && f.hintUnderBox && same(f.rows, ['Color']),
           f);
    });

    await step('W5', async function () {
      var p = await openEditor('2026-06-29');
      var a = look(p);
      var items = qa('.wf-note-item', p).map(function (r) {
        var b = q('.wf-note-hide', r); return txt(q('.wf-note-item-name', r)) + (b && txt(b) === 'Hide' && Math.abs(rect(b).r - rect(r).r) <= 9 ? ' [Hide]' : '');
      });
      var was = q('textarea', p).value;
      setBox(p, was + '\nTable read');
      var b = look(p);
      setBox(p, was);                                    // Esc keeps a changed box (AUD2-040): put it back first
      await closeEditor();
      kase('W5', 'a cell of automatic lines: Colour then "In this cell" (its Hides at the right), no button; a typed line brings Day, Stays with and the switch back in A2\'s order, above Colour',
           a.name === 'Note' && a.when === 'Week of 6/29/26' && a.button === '' && same(a.rows, ['Color', 'In this cell'])
             && same(items, ['Start Principal Photography [Hide]', 'Independence Day (Observed) [Hide]'])
             && same(b.rows, ['Day', 'Stays with', 'Color', 'Show in month view', 'In this cell']),
           { before: a.rows, items: items, after: b.rows, name: a.name, when: a.when, button: a.button });
    });

    await step('W6', async function () {
      var p = await openEditor('2026-11-02');
      var ids = qa('[id]', p).map(function (e) { return e.id; });
      await closeEditor();
      var s = await save();
      var a = stripStamp(s), b0 = stripStamp(S0);
      var diff = Object.keys(Object.assign({}, a, b0)).filter(function (k) { return !same(a[k], b0[k]); })
        .map(function (k) { return k + ': ' + JSON.stringify(b0[k]).slice(0, 160) + ' -> ' + JSON.stringify(a[k]).slice(0, 160); });
      kase('W6', 'no id on any control in the waterfall editor; opening it and pressing Esc saves nothing',
           ids.length === 0 && diff.length === 0, { ids: ids, diff: diff });
    });

    await step('W7', async function () {
      var th = qa('#table-wrap thead th').filter(function (t) { return txt(t) === 'Notes'; })[0];
      if (!th) throw new Error('no Notes heading');
      th.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      var r = th.getBoundingClientRect();
      th.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2) }));
      await T.until(function () { return !!q('.hdrrow-pop'); }, 'the heading editor', 30, 100);
      var hp = q('.hdrrow-pop'), f = { a2: hp.classList.contains('note-a2'), width: rect(hp).w, title: txt(q('.note-pop-title', hp)), save: !!q('.note-pop-save', hp) };
      esc(); await T.until(function () { return !q('.hdrrow-pop'); }, 'the heading editor to close', 30, 100);
      kase('W7', 'the heading editor (a .note-pop too) keeps its own look: not A2, 248 px, its own title, no Save',
           !f.a2 && f.width === 248 && /^Heading/.test(f.title) && !f.save, f);
    });

    // ---- the month view's note editors ----
    function mvPop() { return byId('mv-note-pop'); }
    function block(day, re) { return qa('#table-wrap .mv-note-block[data-note-day="' + day + '"]').filter(function (b) { return re.test(txt(b)); })[0] || null; }
    async function openMv(month, day, re) {
      await toMonth(month);
      var b = block(day, re); if (!b) throw new Error('no block matching ' + re + ' on ' + day);
      b.scrollIntoView({ block: 'center' }); await T.sleep(100);
      block(day, re).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, button: 0, detail: 2 }));
      await T.until(function () { return !!mvPop(); }, 'the month note editor', 40, 50);
      await T.sleep(60);
      return mvPop();
    }
    async function closeMv() {
      q('textarea', mvPop()).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await T.until(function () { return !mvPop(); }, 'the month editor to close', 40, 50); await T.sleep(100);
    }

    await step('M1', async function () {
      var p = await openMv('June 2026', '2026-06-29', /Start Principal/);
      var f = look(p), head = txt(q('.mv-note-pop-day', p));
      await closeMv();
      kase('M1', 'month view, an automatic note: "Auto-Note" then "Mon 6/29/26" (the heading still .mv-note-pop-day), Hide Auto-Note at the top right, what saving does under the box, Colour, then "Enter to save · Esc to cancel" and Save',
           f.a2 && f.width === 272 && f.name === 'Auto-Note' && f.when === 'Mon 6/29/26' && head === 'Auto-Note Mon 6/29/26'
             && f.button === 'Hide Auto-Note' && f.btnTopRight
             && f.hint === 'Renames it wherever it shows. Its date follows the schedule. Color is for the month view.' && f.hintUnderBox
             && same(f.rows, ['Color']) && f.colourName === 'Purple' && same(f.swRows, [10, 8]) && f.swAligned
             && same(f.foot, { keys: 'Enter to save · Esc to cancel', save: 'Save', last: true, saveRight: true }),
           f);
    });

    await step('M2', async function () {
      var p = await openMv('July 2026', '2026-07-03', /Independence/);
      var f = look(p);
      await closeMv();
      kase('M2', 'a holiday: "Holiday" then "Fri 7/3/26", no button, its line under the box, Colour, the same foot',
           f.a2 && f.name === 'Holiday' && f.when === 'Fri 7/3/26' && f.button === ''
             && f.hint === 'Renames this holiday wherever it shows. Color is for the month view.' && same(f.rows, ['Color'])
             && same(f.foot, { keys: 'Enter to save · Esc to cancel', save: 'Save', last: true, saveRight: true }),
           f);
    });

    await step('M3', async function () {
      var p = await openMv('November 2026', '2026-11-03', /kickoff/);
      var f = look(p);
      await closeMv();
      kase('M3', 'a waterfall line: "Waterfall line" then "Tue 11/3/26", Delete Note at the top right; Stays with, Colour, Show in waterfall; Save, no keys line',
           f.a2 && f.name === 'Waterfall line' && f.when === 'Tue 11/3/26' && f.button === 'Delete Note' && f.btnTopRight
             && f.hint === '' && same(f.rows, ['Stays with', 'Color', 'Show in waterfall'])
             && same(f.foot, { keys: '', save: 'Save', last: true, saveRight: true }),
           f);
    });

    await step('M4', async function () {
      await toMonth('November 2026');
      var plus = q('#table-wrap .mv-note-add[data-note-day="2026-11-11"]');
      if (!plus) throw new Error('no + on 11/11/26');
      plus.scrollIntoView({ block: 'center' }); await T.sleep(100);
      q('#table-wrap .mv-note-add[data-note-day="2026-11-11"]').click();
      await T.until(function () { return !!mvPop(); }, 'the month note editor on a +', 40, 50);
      var p = mvPop(), f = look(p);
      var ta = q('textarea', p); ta.value = 'Crew lunch'; ta.dispatchEvent(new Event('input', { bubbles: true }));
      await press(q('.color-swatch[title="Light blue"]', p));
      var named = txt(q('.note-colour-name', p));
      await press(q('.note-pop-save', p));
      await settle();
      var b = block('2026-11-11', /Crew lunch/), bg = b ? getComputedStyle(b).backgroundColor : null;
      kase('M4', 'a "+": "Note" then "Wed 11/11/26", no button; a swatch renames Colour at once; Save adds the note in its colour and closes the editor',
           f.name === 'Note' && f.when === 'Wed 11/11/26' && f.button === '' && f.rows.indexOf('Color') >= 0 && f.rows[f.rows.length - 1] === 'Show in waterfall'
             && named === 'Light blue' && !mvPop() && !!b && bg === 'rgb(0, 176, 240)',
           { look: f, named: named, closed: !mvPop(), block: !!b, bg: bg });
      byId('undo-btn').click(); await settle();
    });

    await step('S1', async function () {
      var w = selFacts(await openEditor('2026-11-02'));
      await closeEditor();
      var m = selFacts(await openMv('November 2026', '2026-11-03', /kickoff/));
      await closeMv();
      kase('S1', 'focused, the Day and Stays with selects draw no outline or ring, and Stays with ends above its hint (waterfall editor; month editor\'s Stays with)',
           selFactsOk(w, ['Day', 'Stays with']) && selFactsOk(m, ['Stays with']),
           { waterfall: w, month: m });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'notelook threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
