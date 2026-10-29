// hiatuscolour -- the colour square on every all-phase hiatus card (owner, 28 Oct 2026). A gate.sh AFSPEC leg.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh hiatuscolour 300
//
// "add the color picker menu to the all phase hiatuses in the left side bar just like you can pick color for phases".
// The phase card's square on the hiatus card's head (app.js "AN ALL-PHASE HIATUS'S COLOUR, FROM ITS CARD"): it opens
// the phase picker's popover with the band palette, and a pick writes hiatusColors for EVERY week of the hiatus, the
// store the waterfall's band editor writes one week of. So no new key and no id: the save format is unchanged. The
// colour follows the hiatus when its Starts or Weeks are retyped, and never recolours a week another hiatus shares.
//
// THE CALENDAR (synthetic: made-up dates, no region, so no holidays), with New's four default hiatuses
// (12/21/26, 12/20/27, 12/18/28, 12/24/29, two weeks each):
//   prePrep    Pre Prep    Mon 11/2/26 x 10 weeks   (crosses the 12/21/26 hiatus)
//   production             Mon 1/11/27, 4 episodes x 5 days
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'hiatuscolour', cases: [] };
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
  function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function view(mode) { $(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click(); await settle(); }
  async function toMonth(label) {
    if (!document.querySelector('#table-wrap .mv-daygrid')) await view('month');
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 40; i++) {
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if (my === label) return settle();
      var btn = $(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if (!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  async function phasesTab() {
    var tab = document.querySelector('.side-tab-btn[data-tab="phases"]'); if (tab) tab.click();
    await T.sleep(150);
  }
  var RED = 'rgb(255, 0, 0)', GREEN = 'rgb(0, 176, 80)', PURPLE = 'rgb(112, 48, 160)';
  function rows() { return Array.from(document.querySelectorAll('#hiatus-list > .hiatus-entry')); }
  function squareOf(row) { return row ? row.querySelector(':scope > .hiatus-head > .hiatus-swatch') : null; }
  function squares() { return rows().map(function (r) { return getComputedStyle(squareOf(r)).backgroundColor; }); }
  function heads() { return rows().map(function (r) { return getComputedStyle(r.querySelector('.hiatus-head')).backgroundColor; }); }
  // A waterfall band's fill, by its week (the band cell carries data-week).
  function band(iso) {
    var td = document.querySelector('#table-wrap td[data-week="' + iso + '"]');
    return td ? getComputedStyle(td).backgroundColor : null;
  }
  function type(el, v) {
    var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    d.set.call(el, v); ['input', 'change'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
  }
  function dirty() { return /Unsaved changes/.test(txt(document.querySelector('header'))); }
  // ⛔ HIT-TESTED: the element on top at the target's centre must be the target, and THAT element gets the click.
  async function hitClick(el, what) {
    el.scrollIntoView({ block: 'center' });
    await T.sleep(150);
    var r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== el) throw new Error(what + ' is not on top at its centre (got ' + (hit && (hit.className || hit.tagName)) + ')');
    hit.click();
    await T.sleep(150);
  }
  async function openSquare(i) {
    await phasesTab();
    var sq = squareOf(rows()[i]);
    if (!sq) throw new Error('no colour square on hiatus card ' + i);
    await hitClick(sq, 'the colour square');
    return document.querySelector('.phase-color-pop');
  }
  async function pick(hex) {
    var sw = Array.from(document.querySelectorAll('.phase-color-pop .pc-sw')).filter(function (s) { return s.title === hex; })[0];
    if (!sw) throw new Error('no ' + hex + ' in the picker');
    await hitClick(sw, 'the ' + hex + ' swatch');
    await settle();
  }
  var written = [];
  var saveHandle = { name: 'hiatuscolour.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'hiatuscolour.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !$('save-file-btn').disabled; }, 'the Save button', 60, 100);
    $('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    return written[written.length - 1];
  }
  function colours(text) { var s = JSON.parse(text); return s.hiatusColors || {}; }
  var loads = 0;
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'hiatuscolour-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }
  var G = '#00B050', P = '#7030A0';

  try {
    await T.appReady();
    T.set('show-title', 'Hiatus Colour Test'); T.set('season-num', '1');   // Season completes Show Info: Production schedules
    T.set('num-episodes', '4'); T.set('shoot-days-per-ep', '5');
    T.set('start-prePrep', '2026-11-02'); T.set('weeks-prePrep', '10');
    T.set('start-production', '2027-01-11');
    await phasesTab();                                 // sidebarTab is saved state
    await settle();
    var saveA = await save();
    var snapA = JSON.parse(saveA);

    await step('C1', async function () {
      var rs = rows(), ph = document.querySelector('#phase-rows > .phase-row');
      var phH = ph.querySelector('.custom-phase-header').getBoundingClientRect(), phS = ph.querySelector('.swatch').getBoundingClientRect();
      var geo = rs.map(function (r) {
        var h = r.querySelector('.hiatus-head').getBoundingClientRect(), s = squareOf(r).getBoundingClientRect();
        return [Math.round(s.left - h.left), Math.round(s.top - h.top), Math.round(s.width), Math.round(s.height)];
      });
      var want = [Math.round(phS.left - phH.left), Math.round(phS.top - phH.top), Math.round(phS.width), Math.round(phS.height)];
      var order = rs.map(function (r) { return Array.from(r.querySelector('.hiatus-head').children).map(function (c) { return c.classList[0]; }); });
      kase('C1', 'every all-phase hiatus card (New\'s four) has ONE colour square, right after its caret, where a phase card\'s square sits, red, "Change colour", no id; the heads all one red tint; nothing in the file carries a colour',
           rs.length === 4 && rs.every(function (r) { return r.querySelectorAll('.hiatus-swatch').length === 1; }) &&
           order.every(function (o) { return eq(o, ['hiatus-collapse-btn', 'swatch', 'hiatus-head-text', 'icon-btn']); }) &&
           geo.every(function (g) { return eq(g, want); }) &&
           rs.every(function (r) { var s = squareOf(r); return !s.id && s.title === 'Change colour' && s.classList.contains('clickable'); }) &&
           squares().every(function (c) { return c === RED; }) && heads().every(function (c) { return c === heads()[0]; }) &&
           Object.keys(colours(saveA)).length === 0,
           { order: order[0], geo: geo, phase: want, squares: squares(), heads: heads() });
    });

    await step('C2', async function () {
      var pop = await openSquare(0);
      var sws = pop ? Array.from(pop.querySelectorAll('.pc-sw')) : [];
      var sel = sws.filter(function (s) { return s.classList.contains('selected'); }).map(function (s) { return s.title; });
      var opened = { pop: !!pop, n: sws.length, selected: sel, dirty: dirty() };
      await pick(G);
      var after = { pop: !!document.querySelector('.phase-color-pop'), squares: squares(), bands: [band('2026-12-21'), band('2026-12-28')],
                    head0: heads()[0], head1: heads()[1], dirty: dirty() };
      var saveB = await save();
      kase('C2', 'a hit-tested click on the 12/21/26 square opens the band palette (10 colours, red marked) and changes nothing; picking green paints BOTH its waterfall weeks, its square and its head, leaves the other cards red, and the saved file holds green on exactly its two weeks',
           opened.pop && opened.n === 10 && eq(opened.selected, ['#FF0000']) && !opened.dirty &&
           !after.pop && eq(after.squares, [GREEN, RED, RED, RED]) && eq(after.bands, [GREEN, GREEN]) &&
           after.head0 !== after.head1 && after.dirty &&
           eq(colours(saveB), { '2026-12-21': G, '2026-12-28': G }),
           { opened: opened, after: after, saved: colours(saveB) });
    });

    await step('C3', async function () {
      await toMonth('December 2026');
      var bars = Array.from(document.querySelectorAll('#table-wrap .mv-hiatus-bar')).map(function (b) { return getComputedStyle(b).backgroundColor; });
      await view('sheet');
      kase('C3', 'the month view draws the hiatus green too (every hiatus bar in December 2026)',
           bars.length >= 2 && bars.every(function (c) { return c === GREEN; }), { bars: bars });
    });

    await step('C4', async function () {
      $('undo-btn').click(); await settle();
      var u = { squares: squares(), bands: [band('2026-12-21'), band('2026-12-28')], saved: colours(await save()) };
      $('redo-btn').click(); await settle();
      var r = { squares: squares(), bands: [band('2026-12-21'), band('2026-12-28')], saved: colours(await save()) };
      kase('C4', 'the pick is ONE undo step: undo puts both weeks, the square and the file back to red; redo brings the green back',
           eq(u.squares, [RED, RED, RED, RED]) && eq(u.bands, [RED, RED]) && Object.keys(u.saved).length === 0 &&
           eq(r.squares, [GREEN, RED, RED, RED]) && eq(r.bands, [GREEN, GREEN]) && eq(r.saved, { '2026-12-21': G, '2026-12-28': G }),
           { undo: u, redo: r });
    });

    await step('C5', async function () {
      type(rows()[0].querySelector('.hiatus-weeks'), '3');
      await settle();
      var b = [band('2026-12-21'), band('2026-12-28'), band('2027-01-04')], saved = colours(await save());
      kase('C5', 'Weeks retyped 2 → 3: the added week (1/4/27) is green too, in the waterfall and the file',
           eq(b, [GREEN, GREEN, GREEN]) && eq(saved, { '2026-12-21': G, '2026-12-28': G, '2027-01-04': G }), { bands: b, saved: saved });
    });

    await step('C6', async function () {
      type(rows()[0].querySelector('.hiatus-start'), '2027-01-04');
      await settle();
      var b = [band('2027-01-04'), band('2027-01-11'), band('2027-01-18')], saved = colours(await save());
      kase('C6', 'Starts retyped to 1/4/27: the green moves with the hiatus (its three new weeks), and its old weeks\' keys are gone from the file',
           eq(b, [GREEN, GREEN, GREEN]) && eq(saved, { '2027-01-04': G, '2027-01-11': G, '2027-01-18': G }) && squares()[0] === GREEN,
           { bands: b, saved: saved, squares: squares() });
    });

    await step('C7', async function () {
      // Onto the 12/20/27 hiatus's two weeks: they are shared, so only the one week of its own (12/13/27) is written,
      // and the other hiatus stays red. Then back: the hiatus's colour is green, so all three weeks get it again.
      type(rows()[0].querySelector('.hiatus-start'), '2027-12-13');
      await settle();
      var on = { squares: squares(), saved: colours(await save()) };
      type(rows()[0].querySelector('.hiatus-start'), '2027-01-04');
      await settle();
      var back = { squares: squares(), saved: colours(await save()) };
      kase('C7', 'moved over another hiatus\'s weeks, the colour is written only on the week that is its own, the other hiatus keeps its red; moved back, all three weeks are green again',
           eq(on.squares, [GREEN, RED, RED, RED]) && eq(on.saved, { '2027-12-13': G }) &&
           eq(back.squares, [GREEN, RED, RED, RED]) && eq(back.saved, { '2027-01-04': G, '2027-01-11': G, '2027-01-18': G }),
           { on: on, back: back });
    });

    await step('C8', async function () {
      // The day menu's Colour… shares the picker and the write, and redraws without update(): the square still follows.
      await toMonth('January 2027');
      var cell = null;
      Array.from(document.querySelectorAll('#table-wrap .mv-body > .mv-week')).forEach(function (wk) {
        Array.from(wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell')).forEach(function (c) {
          if (!c.classList.contains('mv-out') && txt(c.querySelector('.mv-daynum')) === '5') cell = c;
        });
      });
      if (!cell) throw new Error('no 5 Jan cell');
      cell.scrollIntoView({ block: 'center' });
      await T.sleep(250);
      var cr = cell.getBoundingClientRect(), x = Math.round(cr.left + cr.width / 2), y = Math.round(cr.top + cr.height / 2);
      var el = document.elementFromPoint(x, y), base = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2 };
      el.dispatchEvent(new MouseEvent('mousedown', base));
      el.dispatchEvent(new MouseEvent('contextmenu', base));
      el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, { buttons: 0 })));
      await T.until(function () { return !!document.querySelector('.day-menu [data-item^="band-colour-"]'); }, 'the day menu\'s hiatus section', 40, 100);
      document.querySelector('.day-menu [data-item^="band-colour-"]').click();
      await T.until(function () { return !!document.querySelector('.phase-color-pop'); }, 'the day menu\'s colour picker', 40, 100);
      var marked = Array.from(document.querySelectorAll('.phase-color-pop .pc-sw.selected')).map(function (s) { return s.title; });
      await pick(P);
      var sq = squares(), bars = Array.from(document.querySelectorAll('#table-wrap .mv-hiatus-bar')).map(function (b) { return getComputedStyle(b).backgroundColor; });
      await view('sheet');
      var saved = colours(await save());
      kase('C8', 'the month day menu\'s Colour… opens on the hiatus\'s green and a purple pick reaches the sidebar square (repainted after a render alone), the month bars and every week in the file',
           eq(marked, [G]) && eq(sq, [PURPLE, RED, RED, RED]) && bars.length > 0 && bars.every(function (c) { return c === PURPLE; }) &&
           eq(saved, { '2027-01-04': P, '2027-01-11': P, '2027-01-18': P }), { marked: marked, squares: sq, bars: bars, saved: saved });
    });

    await step('C9', async function () {
      var snap = JSON.parse(await save());
      var idsA = Object.keys(snapA.fields.byId).sort(), idsB = Object.keys(snap.fields.byId).sort();
      var hA = Object.keys((snapA.fields.hiatuses || [])[0] || {}).sort(), hB = Object.keys((snap.fields.hiatuses || [])[0] || {}).sort();
      var ids = document.querySelectorAll('#hiatus-list [id]').length;
      kase('C9', 'no new save format: fields.byId has the same keys as before any pick, a hiatus row saves the same keys, and nothing in the hiatus list carries an id',
           eq(idsA, idsB) && eq(hA, hB) && ids === 0, { byIdA: idsA.length, byIdB: idsB.length, rowKeys: hB, ids: ids });
    });

    await step('C10', async function () {
      var text = await save();
      $('new-file-btn').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (/Start a new blank calendar/.test(T.modalText())) { T.clickModalButton('Start new'); break; } }
      await settle();
      var fresh = squares();
      await load(text);
      kase('C10', 'New puts every square back to red; a Load of the saved file paints the first card purple again (and only it)',
           eq(fresh, [RED, RED, RED, RED]) && eq(squares(), [PURPLE, RED, RED, RED]), { afterNew: fresh, afterLoad: squares() });
    });

    var errs = (T.appHealth().errors || []);
    kase('E0', '0 console errors', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'hiatuscolour threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
