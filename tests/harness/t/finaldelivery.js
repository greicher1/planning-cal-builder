// finaldelivery -- Post's "Final Delivery" automatic note starts ON for a new calendar (owner, 19 Nov 2026: "Final
// Delivery note should be enabled by default"), and a calendar saved without it keeps it off.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh finaldelivery 300
//
// It is still an opt-in kind (autoNotesOn, absent = hidden), so only a NEW calendar starts ticked: the boot and New both
// take newCalendarAutoNotesOn(). ⚠️ lib.js keeps it off for every other leg (localhost key 'sptcal.finalDeliveryTest');
// this leg removes the key below, which runs before the build's deferred app module, so it tests the users' default.
//
// THE CALENDAR (synthetic: made-up 2027 dates, no region, so no holidays): Post Mon 7/5/27 x 12 -> "Final Delivery
// 9/24/27" in the week of 9/20/27, as autonotephases' ALL table has it.
try { localStorage.removeItem('sptcal.finalDeliveryTest'); } catch (e) {}
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'finaldelivery', cases: [] };
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
  var OTHERS = ['writersRoomEnd', 'prePrepStart', 'prePrepEnd', 'prodPrepStart', 'prodPrepEnd',
                'postStart', 'localizationStart', 'localizationEnd'];
  var WEEK = '2027-09-20', LINE = 'Final Delivery 9/24/27';
  async function settle() {
    await T.sleep(700);
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function cell(week) {
    var td = document.querySelector('#table-wrap td.sheet-note-cell[data-week="' + week + '"]');
    return td ? txt(td).replace(/^\+$/, '') : '';
  }
  function box(kind, view) { return document.querySelector('input[data-autonote="' + kind + '"][data-view="' + view + '"]'); }
  async function boxes(kinds) {
    await T.openSettings('prefs');
    await T.sleep(200);
    var r = kinds.map(function (k) {
      var s = box(k, 'sheet'), m = box(k, 'month');
      return (s && m) ? (s.checked === m.checked ? s.checked : 'split') : null;
    });
    await T.closeSettings();
    return r;
  }
  function datePost() {
    T.set('start-post', '2027-07-05'); T.set('weeks-post', '12');
  }
  var written = [];
  var saveHandle = { name: 'finaldelivery.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'finaldelivery.sptcal', { lastModified: 1 }); },
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
  var loads = 0;
  function menuLabel() { return (($('file-menu-label') || {}).textContent || '').trim(); }
  async function load(text) {
    var stem = 'finaldelivery-load-' + (++loads), name = stem + '.sptcal';
    var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
    for (var i = 0; i < 40; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
    await p;
    await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
    await settle();
  }

  try {
    await T.appReady();
    T.set('show-title', 'Final Delivery Test');
    datePost();
    await settle();

    var saved;
    await step('F1', async function () {
      var b = await boxes(['postEnd']), o = await boxes(OTHERS);
      kase('F1', 'a new calendar (the boot) starts with Final Delivery ticked in both views and in Post\'s last week; the other eight phase edges stay off',
           cell(WEEK) === LINE && b[0] === true && o.every(function (x) { return x === false; }),
           { cell: cell(WEEK), postEnd: b[0], others: o });
    });

    await step('F2', async function () {
      saved = await save();
      var s = JSON.parse(saved);
      kase('F2', 'Save writes autoNotesOn {postEnd: true} and nothing else in it',
           JSON.stringify(s.autoNotesOn) === JSON.stringify({ postEnd: true }), { autoNotesOn: s.autoNotesOn });
    });

    await step('F3', async function () {
      var s = JSON.parse(saved); delete s.autoNotesOn;
      await load(JSON.stringify(s));
      var b = await boxes(['postEnd']);
      kase('F3', 'a calendar saved without the key (every file before today, or one unticked) opens with Final Delivery OFF',
           cell(WEEK) === '' && b[0] === false, { cell: cell(WEEK), postEnd: b[0] });
    });

    await step('F4', async function () {
      var newBtn = $('new-file-btn');
      if (!newBtn) throw new Error('no New button');
      newBtn.click();
      await T.sleep(300);
      T.clickModalButton('Start new');
      await T.sleep(800);
      await T.until(function () { return ($('show-title') || {}).value === ''; }, 'a blank calendar after New', 60, 100);
      datePost();
      await settle();
      var b = await boxes(['postEnd']);
      kase('F4', 'New starts the next calendar with Final Delivery ticked again, after a file that had it off',
           cell(WEEK) === LINE && b[0] === true, { cell: cell(WEEK), postEnd: b[0] });
    });
  } catch (e) {
    kase('X', 'threw: ' + String(e && e.message || e), false, { ex: String(e && e.stack || e) });
  }
  T.done(out);
})(); });
