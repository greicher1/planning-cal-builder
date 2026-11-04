// hiatussidebar -- a hiatus is named and coloured on its sidebar card only (owner, 4 Nov 2026: "Remove ability to edit
// the name and color of all phase hiatuses in the waterfall itself. That should only be possible in the left side
// bar"; then, by picker, "Same rule, add colour" for a phase's own hiatus and "remove month color, but keep the style
// bar working for all"). A gate.sh leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh hiatussidebar 300
//
// app.js "A HIATUS IS NAMED AND COLOURED ON ITS SIDEBAR CARD ONLY" (bandCardOf, showBandCard), "THE CARD'S NAME REACHES
// EVERY WEEK OF ITS HIATUS" (claimBandNames) and "A PHASE'S OWN HIATUS: ITS COLOUR, FROM ITS CARD". The waterfall's band
// editor (a label box and ten colours) no longer opens on a hiatus band: a double-click or Enter shows the card that
// names it, the way a double-click on a month bar shows a phase's. A phase's hiatus block gained a colour square. The
// month day menu lost Colour…. A week labelled or coloured in a band before this change (only an older file has one
// now) prints as saved, and the card's name box takes it over the next time the name is typed. (A Production off week
// has no card and keeps the band editor: offweek R7 holds that.)
//
// THE CALENDAR (synthetic: made-up dates, no region, so no holidays), with New's four default hiatuses
// (12/21/26, 12/20/27, 12/18/28, 12/17/29, two weeks each):
//   prePrep    Pre Prep    Mon 11/2/26 x 10 weeks, its own hiatus 2 weeks from Mon 11/16/26 ("Pre-Prep Hiatus")
//   production             Mon 1/11/27, 4 episodes x 5 days
//
//   W1  a real double-click (hit-tested) on the 12/21/26 band, Show tab open and the card folded: no editor; the
//       Phases tab, that card unfolded and on screen, its name box focused
//   W2  one undo step (the tab is saved state), and nothing about the band changed
//   W3  a click highlights the band; Enter opens no editor and focuses the card's name box
//   W4  a key typed on a highlighted band opens nothing and changes nothing
//   W5  Pre-Prep's own band, its card folded: no editor either; the card unfolded, its hiatus Name box focused
//   P1  the hiatus block's colour square (no id) opens the ten band colours on red; green paints BOTH weeks, in the
//       waterfall, the square and the file ("<week>|prePrep" keys), with no new field id
//   P2  one undo step back to red, redo green
//   P3  Starts retyped 11/16 -> 11/30: the green moves to the new weeks and the old keys go
//   M1  the month day menu on a hiatus day offers no Colour… (only Remove hiatus…)
//   L1  an older file whose 12/28/26 week was typed "Typed Week 2" and coloured green in the band, and Pre-Prep's
//       12/7/26 week typed "Typed PP", prints both as saved
//   L2  its typed band, double-clicked, opens no editor either (the card)
//   L3  typing "Winter Break" on the card names BOTH weeks, the typed one included; the colour stays
//   L4  one undo brings "Typed Week 2" back; redo names it again
//   L5  Save holds both weeks as the card's own name (hiatusNameSyncedKeys), so it follows the next rename
//   L6  typing Pre-Prep's hiatus Name "PP Break" names both its weeks, "Typed PP" included
//   E0  no console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'hiatussidebar', cases: [] };
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
  function q(s, r) { return (r || document).querySelector(s); }
  function txt(e) { return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function tab(name) { var b = q('.side-tab-btn[data-tab="' + name + '"]'); if (b) b.click(); await T.sleep(150); }
  function activeTab() { var b = q('.side-tab-btn.active'); return b ? b.dataset.tab : ''; }
  function rows() { return Array.from(document.querySelectorAll('#hiatus-list > .hiatus-entry')); }
  function folded(r) { return !!r && r.classList.contains('is-collapsed'); }
  function nameBox(r) { return r ? r.querySelector('.hiatus-name') : null; }
  // The card's box against the box the sidebar scrolls in (mvbarcard's test): on screen means wholly inside both.
  function cardOnScreen(r) {
    if (!r || !r.getClientRects().length) return false;
    var b = r.getBoundingClientRect(), top = 0, bottom = innerHeight;
    for (var a = r.parentElement; a && a !== document.body; a = a.parentElement) {
      var cs = getComputedStyle(a);
      if (/(auto|scroll)/.test(cs.overflowY) && a.scrollHeight > a.clientHeight) {
        var ar = a.getBoundingClientRect(); top = Math.max(top, ar.top); bottom = Math.min(bottom, ar.bottom);
      }
    }
    return b.top >= top - 1 && b.top < bottom && Math.min(b.bottom, bottom) - b.top >= Math.min(40, b.height);
  }
  // An all-phase band (no data-pkey) and a phase's own band, by week.
  function band(iso) { return q('#table-wrap td.sheet-hiatus-cell[data-week="' + iso + '"]:not([data-pkey])'); }
  function phaseBand(key, iso) { return q('#table-wrap td.sheet-hiatus-cell[data-pkey="' + key + '"][data-week="' + iso + '"]'); }
  function look(td) { return td ? { text: txt(td), bg: getComputedStyle(td).backgroundColor } : null; }
  function editorOpen() { return !!q('.note-pop'); }
  function closeEditor() {
    var ta = q('.note-pop textarea');
    if (ta) ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  }
  function mid(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }
  function name(e) { return e ? (e === document.body ? 'BODY' : (e.className && String(e.className)) || e.tagName) : null; }
  // ⛔ HIT-TESTED, as a real mouse: each event goes to what is on top at the band's centre, so a layer over the band
  // (a handle, the highlight's own layer) gets what the user's mouse would give it.
  async function dblAt(el) {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    await T.sleep(150);
    var p = mid(el), seen = [];
    for (var i = 1; i <= 2; i++) {
      var o = { bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0, buttons: 1, detail: i };
      var t = document.elementFromPoint(p.x, p.y) || document.body;
      t.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerType: 'mouse', pointerId: 1, isPrimary: true }, o)));
      t.dispatchEvent(new MouseEvent('mousedown', o));
      var u = Object.assign({}, o, { buttons: 0 });
      var t2 = document.elementFromPoint(p.x, p.y) || document.body;
      t2.dispatchEvent(new PointerEvent('pointerup', Object.assign({ pointerType: 'mouse', pointerId: 1, isPrimary: true }, u)));
      t2.dispatchEvent(new MouseEvent('mouseup', u));
      t2.dispatchEvent(new MouseEvent('click', u));
      if (i === 2) t2.dispatchEvent(new MouseEvent('dblclick', u));
      seen.push(name(t2));
      await T.sleep(60);
    }
    await settle();
    return seen;
  }
  // A single click: the text style bar's highlight (pointerdown + pointerup on what is on top).
  async function clickAt(el) {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    await T.sleep(100);
    var p = mid(el), o = { bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0, buttons: 1,
                           pointerType: 'mouse', pointerId: 1, isPrimary: true };
    var t = document.elementFromPoint(p.x, p.y) || document.body;
    t.dispatchEvent(new PointerEvent('pointerdown', o));
    var u = Object.assign({}, o, { buttons: 0 });
    t.dispatchEvent(new PointerEvent('pointerup', u));
    t.dispatchEvent(new MouseEvent('click', u));
    await T.sleep(250);
  }
  function key(k) { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
  function blur() { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); }
  function hiCount() { return document.querySelectorAll('#table-wrap .text-sel-layer .text-sel-cell').length; }
  function type(el, v) {
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    d.set.call(el, v); ['input', 'change'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
  }
  var written = [];
  var saveHandle = { name: 'hiatussidebar.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'hiatussidebar.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];
    return typeof w === 'string' ? w : w.text;   // after a Load, openViaFakePicker's handle records {file, text}
  }
  var loads = 0;
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'hiatussidebar-load-' + (++loads), fname = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', fname, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  // A hit-tested click: the element on top at the target's centre must be the target, and THAT element gets the click.
  async function hitClick(el, what) {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    await T.sleep(150);
    var r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== el) throw new Error(what + ' is not on top at its centre (got ' + name(hit) + ')');
    hit.click();
    await T.sleep(150);
  }
  function phaseSquare(key) { return q('#phiatus-fields-' + key + ' .phiatus-swatch'); }
  function phaseFolded(key) { var sw = $('swatch-' + key), r = sw && sw.closest('.phase-row'); return !!r && r.classList.contains('is-collapsed'); }
  async function foldPhase(key) {
    await tab('phases');
    var sw = $('swatch-' + key), r = sw && sw.closest('.phase-row');
    var b = r && r.querySelector('.phase-collapse-btn');
    if (!b) throw new Error('no caret on ' + key + '\'s card');
    if (!phaseFolded(key)) b.click();
    await T.sleep(150);
  }
  async function pickColour(hex) {
    var sw = Array.from(document.querySelectorAll('.phase-color-pop .pc-sw')).filter(function (x) { return x.title === hex; })[0];
    if (!sw) throw new Error('no ' + hex + ' in the picker');
    await hitClick(sw, 'the ' + hex + ' swatch');
    await settle();
  }
  async function view(mode) { $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await settle(); }
  async function toMonth(label) {
    if (!q('#table-wrap .mv-daygrid')) await view('month');
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 40; i++) {
      var my = txt(q('#table-wrap .mv-monthyear'));
      if (my === label) return settle();
      var btn = $(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if (!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  var RED = 'rgb(255, 0, 0)', GREEN = 'rgb(0, 176, 80)';
  var W1 = '2026-12-21', W2 = '2026-12-28', PH = '2026-11-16', PH2 = ['2026-11-30', '2026-12-07'];
  var G = '#00B050';

  try {
    await T.appReady();
    T.set('show-title', 'Hiatus Sidebar Test'); T.set('season-num', '1');   // Season completes Show Info: Production schedules
    T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-prePrep', '2026-11-02'); T.set('weeks-prePrep', '10');
    T.set('start-production', '2027-01-11');
    var en = $('phiatus-en-prePrep');
    if (en && !en.checked) en.click();
    T.set('phiatus-start-prePrep', PH); T.set('phiatus-weeks-prePrep', '2');
    await settle();
    await T.until(function () { return !!band(W1) && !!band(W2) && !!phaseBand('prePrep', PH); }, 'the two bands', 100, 100);
    var row0 = rows()[0];
    var saveA = await save();                          // before any colour: the field ids P1 compares against

    await step('W1', async function () {
      await tab('phases');
      var caret = row0.querySelector('.hiatus-collapse-btn');
      if (!folded(row0) && caret) caret.click();
      await T.sleep(150);
      var f0 = folded(row0);
      await tab('show');
      await settle();
      var before = look(band(W1));
      var seen = await dblAt(band(W1));
      var r = rows()[0];
      kase('W1', 'a real double-click on the 12/21/26 all-phase band, Show tab open and its card folded, opens NO editor: the Phases tab, that card unfolded and on screen, its name box focused',
           f0 && !editorOpen() && activeTab() === 'phases' && !folded(r) && cardOnScreen(r) && document.activeElement === nameBox(r),
           { folded0: f0, targets: seen, editor: editorOpen(), tab: activeTab(), folded: folded(r), onScreen: cardOnScreen(r),
             focus: name(document.activeElement), before: before });
    });

    await step('W2', async function () {
      blur();
      var lk = look(band(W1));
      $('undo-btn').click(); await settle();
      var back = activeTab();
      $('redo-btn').click(); await settle();
      kase('W2', 'ONE undo step (the tab is saved state): Undo puts the Show tab back, Redo the Phases tab; the band still reads "Hiatus" in red',
           back === 'show' && activeTab() === 'phases' && lk.text === 'Hiatus' && lk.bg === RED && look(band(W1)).text === 'Hiatus',
           { afterUndo: back, afterRedo: activeTab(), band: lk });
    });

    await step('W3', async function () {
      await tab('show');
      await settle();
      blur();
      await clickAt(band(W1));
      var hi = hiCount();
      blur();
      key('Enter');
      await settle();
      var r = rows()[0];
      kase('W3', 'a click highlights the band (no editor); Enter on it opens NO editor and focuses its card\'s name box on the Phases tab',
           hi >= 1 && !editorOpen() && activeTab() === 'phases' && document.activeElement === nameBox(r),
           { highlighted: hi, editor: editorOpen(), tab: activeTab(), focus: name(document.activeElement) });
    });

    await step('W4', async function () {
      blur();
      await clickAt(band(W1));
      blur();
      var hi = hiCount();
      key('x');
      await settle();
      kase('W4', 'a key typed on a highlighted band opens nothing and changes nothing (the band still reads "Hiatus", focus stays on the page)',
           hi >= 1 && !editorOpen() && look(band(W1)).text === 'Hiatus' && (document.activeElement === document.body || !document.activeElement),
           { highlighted: hi, editor: editorOpen(), band: look(band(W1)), focus: name(document.activeElement) });
      blur(); key('Escape'); await T.sleep(150);
    });

    await step('W5', async function () {
      await foldPhase('prePrep');
      var f0 = phaseFolded('prePrep');
      await tab('show'); await settle();
      var pb = phaseBand('prePrep', PH);
      if (!pb) throw new Error('no Pre-Prep hiatus band on ' + PH);
      await dblAt(pb);
      kase('W5', 'Pre-Prep\'s OWN hiatus band, its card folded, opens NO editor either: the Phases tab, the card unfolded, its hiatus Name box focused',
           f0 && !editorOpen() && activeTab() === 'phases' && !phaseFolded('prePrep') && document.activeElement === $('phiatus-name-prePrep'),
           { folded0: f0, editor: editorOpen(), tab: activeTab(), folded: phaseFolded('prePrep'), focus: name(document.activeElement) });
      blur();
    });

    await step('P1', async function () {
      await tab('phases');
      var sq = phaseSquare('prePrep');
      if (!sq) throw new Error('no colour square in Pre-Prep\'s hiatus block');
      var noId = !sq.id && !sq.querySelector('[id]');
      await hitClick(sq, 'Pre-Prep\'s hiatus square');
      var pop = q('.phase-color-pop');
      var sw = pop ? Array.from(pop.querySelectorAll('.pc-sw')).map(function (x) { return x.title; }) : [];
      var marked = pop ? Array.from(pop.querySelectorAll('.pc-sw.selected')).map(function (x) { return x.title; }) : [];
      await pickColour(G);
      var wf = [look(phaseBand('prePrep', PH)), look(phaseBand('prePrep', '2026-11-23'))];
      var sqc = getComputedStyle(phaseSquare('prePrep')).backgroundColor;
      var sv = JSON.parse(await save());
      var cols = sv.hiatusColors || {};
      var idsSame = JSON.stringify(Object.keys(JSON.parse(saveA).fields.byId).sort()) === JSON.stringify(Object.keys(sv.fields.byId).sort());
      kase('P1', 'Pre-Prep\'s hiatus block has a colour square (no id): it opens the ten band colours on red, and green paints BOTH weeks in the waterfall, the square, and the file as "<week>|prePrep" keys, with no new field id',
           noId && sw.length === 10 && sw[0] === '#C00000' && JSON.stringify(marked) === JSON.stringify(['#FF0000'])
             && wf[0].bg === GREEN && wf[1].bg === GREEN && sqc === GREEN
             && cols['2026-11-16|prePrep'] === G && cols['2026-11-23|prePrep'] === G && idsSame,
           { noId: noId, swatches: sw, marked: marked, bands: wf, square: sqc, saved: cols, idsSame: idsSame });
    });

    await step('P2', async function () {
      $('undo-btn').click(); await settle();
      var u = [look(phaseBand('prePrep', PH)).bg, look(phaseBand('prePrep', '2026-11-23')).bg];
      $('redo-btn').click(); await settle();
      var r = [look(phaseBand('prePrep', PH)).bg, look(phaseBand('prePrep', '2026-11-23')).bg];
      kase('P2', 'one undo step takes the green off both weeks; redo puts it back',
           u[0] === RED && u[1] === RED && r[0] === GREEN && r[1] === GREEN, { undo: u, redo: r });
    });

    await step('P3', async function () {
      T.set('phiatus-start-prePrep', PH2[0]);
      await settle();
      var wf = [look(phaseBand('prePrep', PH2[0])), look(phaseBand('prePrep', PH2[1]))];
      var cols = JSON.parse(await save()).hiatusColors || {};
      kase('P3', 'Starts retyped 11/16 -> 11/30: the green moves to the hiatus\'s new weeks (11/30, 12/7) and the old weeks\' keys are gone',
           !!wf[0] && !!wf[1] && wf[0].bg === GREEN && wf[1].bg === GREEN && cols['2026-11-30|prePrep'] === G && cols['2026-12-07|prePrep'] === G
             && !('2026-11-16|prePrep' in cols) && !('2026-11-23|prePrep' in cols),
           { bands: wf, saved: cols });
    });

    await step('M1', async function () {
      await toMonth('December 2026');
      var cell = null;
      Array.from(document.querySelectorAll('#table-wrap .mv-body > .mv-week')).forEach(function (wk) {
        Array.from(wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell')).forEach(function (c) {
          if (!c.classList.contains('mv-out') && txt(c.querySelector('.mv-daynum')) === '22') cell = c;
        });
      });
      if (!cell) throw new Error('no 22 Dec cell');
      cell.scrollIntoView({ block: 'center' });
      await T.sleep(250);
      var cr = cell.getBoundingClientRect(), x = Math.round(cr.left + cr.width / 2), y = Math.round(cr.top + cr.height / 2);
      var el = document.elementFromPoint(x, y), base = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2 };
      el.dispatchEvent(new MouseEvent('mousedown', base));
      el.dispatchEvent(new MouseEvent('contextmenu', base));
      el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, { buttons: 0 })));
      await T.until(function () { return !!q('.day-menu [data-item^="band-remove-"]'); }, 'the day menu\'s hiatus section', 40, 100);
      var items = Array.from(document.querySelectorAll('.day-menu [data-section="hiatus"] [data-item]')).map(function (b) { return b.getAttribute('data-item'); });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await T.sleep(200);
      await view('sheet');
      kase('M1', 'the month day menu on a hiatus day (22 Dec) offers no Colour…: its hiatus section is Remove hiatus… alone',
           items.length === 1 && /^band-remove-/.test(items[0]), { items: items });
    });

    // ---- An older file, saved when the band itself could be typed in and coloured ----
    var saveA = await save();
    var s = JSON.parse(saveA);
    s.hiatusTexts = Object.assign({}, s.hiatusTexts, { '2026-12-28': 'Typed Week 2' });
    s.hiatusColors = Object.assign({}, s.hiatusColors, { '2026-12-21': '#00B050', '2026-12-28': '#00B050' });
    s.hiatusTexts['2026-12-07|prePrep'] = 'Typed PP';
    await load(JSON.stringify(s));

    await step('L1', async function () {
      var a = look(band(W1)), b = look(band(W2)), c = look(phaseBand('prePrep', PH2[1]));
      kase('L1', 'an older file whose 12/28/26 week was typed "Typed Week 2" in the band (both weeks green), and Pre-Prep\'s 12/7/26 week "Typed PP", opens and prints both as saved',
           a.text === 'Hiatus' && b.text === 'Typed Week 2' && a.bg === GREEN && b.bg === GREEN && !!c && c.text === 'Typed PP',
           { w1: a, w2: b, pp: c });
    });

    await step('L2', async function () {
      await tab('show'); await settle();
      await dblAt(band(W2));
      kase('L2', 'its typed band, double-clicked, opens no editor either: its card, name box focused',
           !editorOpen() && activeTab() === 'phases' && document.activeElement === nameBox(rows()[0]),
           { editor: editorOpen(), tab: activeTab(), focus: name(document.activeElement) });
      blur();
    });

    await step('L3', async function () {
      type(nameBox(rows()[0]), 'Winter Break');
      await settle();
      var a = look(band(W1)), b = look(band(W2));
      kase('L3', 'typing "Winter Break" on the card names BOTH weeks, the one typed in the band included; the green stays',
           a.text === 'Winter Break' && b.text === 'Winter Break' && a.bg === GREEN && b.bg === GREEN, { w1: a, w2: b });
    });

    await step('L4', async function () {
      $('undo-btn').click(); await settle();
      var u = [look(band(W1)).text, look(band(W2)).text, nameBox(rows()[0]).value];
      $('redo-btn').click(); await settle();
      var r = [look(band(W1)).text, look(band(W2)).text, nameBox(rows()[0]).value];
      kase('L4', 'one undo brings "Typed Week 2" back (and the blank name); redo names both weeks again',
           u[0] === 'Hiatus' && u[1] === 'Typed Week 2' && u[2] === '' && r[0] === 'Winter Break' && r[1] === 'Winter Break' && r[2] === 'Winter Break',
           { undo: u, redo: r });
    });

    await step('L5', async function () {
      var sv = JSON.parse(await save());
      var t = sv.hiatusTexts || {}, k = sv.hiatusNameSyncedKeys || {};
      kase('L5', 'Save holds both weeks as the card\'s own name (hiatusTexts and hiatusNameSyncedKeys alike), so the next rename reaches them',
           t[W1] === 'Winter Break' && t[W2] === 'Winter Break' && k[W1] === 'Winter Break' && k[W2] === 'Winter Break',
           { hiatusTexts: { a: t[W1], b: t[W2] }, synced: { a: k[W1], b: k[W2] } });
    });

    await step('L6', async function () {
      blur();
      T.set('phiatus-name-prePrep', 'PP Break');
      await settle();
      var got = [look(phaseBand('prePrep', PH2[0])).text, look(phaseBand('prePrep', PH2[1])).text];
      kase('L6', 'typing Pre-Prep\'s hiatus Name "PP Break" names both its weeks, the one typed "Typed PP" in the band included',
           got[0] === 'PP Break' && got[1] === 'PP Break', { got: got });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'hiatussidebar threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
