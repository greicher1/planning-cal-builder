// rippleundo -- with Ripple Hiatus Periods on (the users' default), a hiatus edit and the push it causes are ONE undo
// step, wherever the edit is made, and redo puts both back (audit AUD2-038, owner decision D2 = b, Nov 2026: "the edit
// and its push are one Undo").
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=rippleundo ./run.sh rippleundo 400
//
// THE BUG IT HOLDS. Every ripple banked TWO steps: the hiatus edit, then its push (HIATUS-RIPPLE-PLAN.md §6, a session's
// call, never ruled). So after a month-view band drag answered Keep, the first Cmd+Z took back only the push: the break
// stayed where it was dropped and, dropped on Production's first week, the calendar looked unchanged. After the day
// menu's Add hiatus it put Post back while the new break stayed, so Post started while Production was still shooting,
// a plan that never existed. A second Cmd+Z was needed every time.
//
// THE CALENDAR: tests/fixtures/rippleundo.sptcal (the audit's synthetic audit-gap-hiatus.sptcal; made-up names and
// dates): Production from Mon 6/29/26 (10 episodes x 8 days, US general holidays), the UNLOCKED one-week "Summer break"
// on Mon 7/13/26, Post 11/2/26, Localization 3/1/27, New's four locked winter breaks. It opens in the month view.
//
// ⚠️ lib.js turns the ripple OFF for every leg (HIATUS-RIPPLE-PLAN.md §8). This leg puts the users' default back (the
// key absent = on) at the top, before the build's deferred app module reads its preferences.
//
// EACH CASE: the calendar as saved before (Save As through the fake picker, Date Last Edited and the view left out),
// the edit, the calendar after; then Cmd+Z must give back BEFORE exactly, Shift+Cmd+Z AFTER exactly, and Cmd+Z BEFORE
// again (which is also where the next case starts).
//   R0  the ripple preference is the users' default; the calendar as described
//   M1  month view: the Summer break band dragged up two rows onto the week of 6/29/26, answered Keep: the question
//       names the push ("Pushed 1 wk: Production"), the break is on 6/29 and Production starts 7/6
//   M2  ... ONE Cmd+Z gives back the calendar exactly as before the drag (break 7/13, Production 6/29); red before
//       the fix: the break stayed on 6/29
//   M3  ... Shift+Cmd+Z gives back the drag AND its push; Cmd+Z again, as before
//   D1  month view: right-click Mon 8/17/26 > Add hiatus > All phases: a 2-week break, Post 11/2 -> 11/16 and
//       Localization 3/1 -> 3/15
//   D2  ... ONE Cmd+Z: exactly as before (red before the fix: the new break stayed, Post back on 11/2 inside the shoot)
//   D3  ... redo both, undo both
//   P1  month view: right-click Mon 8/17/26 > Add hiatus > Production only: Production's own 2-week hiatus, Post and
//       Localization pushed 2 wks; ONE Cmd+Z exactly as before; redo both; undo both
//   X1  month view: right-click a day of the Summer break > Remove hiatus…, answered Remove: Post and Localization
//       pulled 1 wk; ONE Cmd+Z exactly as before; redo both; undo both
//   W1  waterfall: right-click Post's week of 11/9/26 > Add hiatus > All phases: Localization pushed 2 wks; ONE Cmd+Z
//       exactly as before; redo both; undo both
//   S1  sidebar: the Summer break's Weeks 1 -> 2 (pushes at once, focus kept): Post 11/9; ONE Cmd+Z (from the
//       calendar, the box left) exactly as before; redo both; undo both. The edit's own step was still PENDING
//       when the push came (inside the 500 ms debounce): one push banks both
//   S2  sidebar: the Summer break's Starts typed 2026-06-29, a pause past the 500 ms debounce (the typing banks a
//       step of its own), then Enter: Production 7/6; ONE Cmd+Z exactly as before (the push folds into the typing's
//       step); redo both; undo both
//   S3  sidebar: the Summer break's ×, answered Remove (no bracket: the removal is pending when the pull lands): Post
//       10/26; ONE Cmd+Z exactly as before; redo both; undo both
//   S4  sidebar: Production's own Hiatus, its Starts written by code (no ripple), then its switch clicked on: Post
//       11/16, Localization 3/15; ONE Cmd+Z exactly as before; redo both; undo both
//   E0  0 console errors
//
// ⚠️ What it does not prove: synthetic mouse events drive the handlers, not real hit-testing (hiatusripple.mjs and
// hiatusdrag.mjs drive the same drag with CDP's trusted input). The undo contract is what is under test here.
try {
  var o = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {};
  delete o.hiatusRipple;
  localStorage.setItem('sptcal.prefs', JSON.stringify(o));
} catch (e) {}
window.__T.memoryIDB();   // Save As puts each new file in the recents list (IndexedDB never settles headless)
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'rippleundo', cases: [], observed: {} };
  function kase(id, title, pass, extra) {
    var c = { id: id, title: title, pass: pass === true };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    out.cases.push(c);
    var r = document.getElementById('R');
    if (r) r.textContent = 'pending after ' + id + ' ' + JSON.stringify(out.cases.map(function (x) { return x.id + ':' + x.pass; }));
  }
  function $(id) { return document.getElementById(id); }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }
  function txt(el) { return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function val(id) { return ($(id) || {}).value; }
  function nativeSet(e, v) { var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(e, v); }

  // ---- the calendar, as a Save would write it ----
  // Save As through a stand-in for the OS picker that keeps the text as it is WRITTEN. ⚠️ Not T.fakeSavePicker: that one
  // reads the bytes back with Blob.arrayBuffer(), a read the browser process answers in REAL time, while
  // --virtual-time-budget runs the poll below on virtual time, which races ahead whenever the page is idle. Twice in
  // eleven runs the 10 s (virtual) wait ran out before the read came back ("calls 1", nothing closed).
  async function snap() {
    var real = window.showSaveFilePicker, rec = { calls: 0, text: null };
    window.showSaveFilePicker = async function (o) {
      rec.calls++;
      var parts = [];
      return { name: (o && o.suggestedName) || 'rippleundo.sptcal', kind: 'file',
        createWritable: async function () { return {
          write: async function (d) { parts.push(String(d)); },
          close: async function () { rec.text = parts.join(''); },
          abort: async function () {} }; } };
    };
    try {
      await T.sleep(700);   // Save As drops a second click inside 600 ms (reClickGuard)
      await T.until(function () { var b = $('save-as-btn'); return !!b && !b.disabled; }, 'Save As', 60, 100);
      $('save-as-btn').click();
      try { await T.until(function () { return rec.text !== null; }, 'the Save As write', 100, 100); }
      catch (e) { throw new Error(e.message + '; calls ' + rec.calls + '; modal "' + T.modalText().slice(0, 200) + '"; menu ' + !!q('.day-menu')); }
      await T.sleep(100);   // the rest of Save As (its stamp and the recents list) before the picker goes back
    } finally { window.showSaveFilePicker = real; }
    var s = JSON.parse(rec.text);
    delete s.lastEdited; delete s.viewMode;
    return JSON.stringify(s);
  }
  // What differs between two snapshots, for the record (the first few keys / fields).
  function diff(ar, br) {
    if (ar === br) return [];
    var a = JSON.parse(ar), b = JSON.parse(br), d = [];
    Object.keys(Object.assign({}, a, b)).forEach(function (k) {
      if (JSON.stringify(a[k]) === JSON.stringify(b[k])) return;
      if (k === 'fields' && a.fields && b.fields) {
        if (JSON.stringify(a.fields.hiatuses) !== JSON.stringify(b.fields.hiatuses)) d.push('hiatuses ' + JSON.stringify(a.fields.hiatuses).slice(0, 160) + ' -> ' + JSON.stringify(b.fields.hiatuses).slice(0, 160));
        Object.keys(Object.assign({}, a.fields.byId, b.fields.byId)).forEach(function (f) {
          if (JSON.stringify(a.fields.byId[f]) !== JSON.stringify(b.fields.byId[f])) d.push(f + ' ' + JSON.stringify(a.fields.byId[f]) + ' -> ' + JSON.stringify(b.fields.byId[f]));
        });
      } else d.push(k + ' ' + String(JSON.stringify(a[k])).slice(0, 120) + ' -> ' + String(JSON.stringify(b[k])).slice(0, 120));
    });
    return d.slice(0, 12);
  }
  function hiatuses() {
    return qa('#hiatus-list .hiatus-entry').map(function (r) {
      return q('.hiatus-start', r).value + ' x' + q('.hiatus-weeks', r).value + (q('.hiatus-locked', r).checked ? ' L' : '');
    });
  }
  function starts() { return { production: val('start-production'), post: val('start-post'), localization: val('start-localization') }; }
  function wrap() { var m = /→\s*(\d+\/\d+\/\d+)/.exec(txt($('meta-production'))); return m ? m[1] : null; }
  function state() { return { starts: starts(), hiatuses: hiatuses(), wrap: wrap(), phi: val('phiatus-start-production') + '/' + (($('phiatus-en-production') || {}).checked ? 'on' : 'off') }; }

  // ---- keys, as a keyboard sends them: to whatever has focus ----
  function blur() { var a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); }
  async function press(shift) {
    blur();
    var e = new KeyboardEvent('keydown', { key: shift ? 'Z' : 'z', code: 'KeyZ', bubbles: true, cancelable: true, metaKey: true, shiftKey: !!shift });
    (document.activeElement || document).dispatchEvent(e);
    await T.sleep(900);
    return e.defaultPrevented;
  }

  // ---- the month view (mvmenu's helpers) ----
  async function settle() {
    var last = -1, st = 0;
    await T.until(function () {
      var n = ($('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  async function toMonth(label) {
    if (!q('#table-wrap .mv-daygrid')) { $('view-month-btn').click(); await settle(); }
    var want = Date.parse('1 ' + label);
    for (var i = 0; i < 40; i++) {
      var my = txt(q('#table-wrap .mv-monthyear'));
      if (my === label) return settle();
      $(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev').click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  function monthCells() {
    var m0 = new Date(Date.parse('1 ' + txt(q('#table-wrap .mv-monthyear')) + ' UTC')), map = {};
    qa('#table-wrap .mv-body > .mv-week').forEach(function (wk, row) {
      var cells = wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell');
      var inIdx = [].findIndex.call(cells, function (c) { return !c.classList.contains('mv-out'); });
      if (inIdx < 0) return;
      var d = +txt(cells[inIdx].querySelector('.mv-daynum'));
      var sunday = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth(), d) - inIdx * 86400000;
      [].forEach.call(cells, function (c, i) { map[new Date(sunday + i * 86400000).toISOString().slice(0, 10)] = { cell: c, week: wk, row: row }; });
    });
    return map;
  }
  async function bringIntoView(el) {
    var pp = $('table-wrap'), r = el.getBoundingClientRect(), b = pp.getBoundingClientRect();
    if (r.top < b.top + 20 || r.bottom > b.bottom - 20) { pp.scrollTop += (r.top + r.height / 2) - (b.top + b.height / 2); await T.sleep(250); }
  }
  // A right-click on a day's number band, dispatched on whatever is on top there, as mvmenu's rclick.
  async function rclickDay(iso) {
    var m = monthCells()[iso];
    if (!m) throw new Error('no cell for ' + iso);
    await bringIntoView(m.cell);
    m = monthCells()[iso];
    var r = m.cell.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + 8);
    var el = document.elementFromPoint(x, y);
    var base = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2 };
    el.dispatchEvent(new MouseEvent('mousedown', base));
    el.dispatchEvent(new MouseEvent('contextmenu', base));
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, { buttons: 0 })));
    await T.sleep(150);
    if (!q('.day-menu')) throw new Error('no day menu on ' + iso);
  }
  async function chooseSub(id) {
    q('.day-menu [data-item="hiatus"]').click(); await T.sleep(150);
    var b = q('.day-menu-sub [data-item="' + id + '"]');
    if (!b) throw new Error('no submenu item ' + id);
    b.click(); await settle(); await T.sleep(300);
  }
  async function choose(prefix) {
    var b = qa('.day-menu .day-menu-item').find(function (x) { return (x.getAttribute('data-item') || '').indexOf(prefix) === 0; });
    if (!b) throw new Error('no item ' + prefix);
    b.click(); await T.sleep(300);
  }
  async function answer(label) {
    await T.until(function () { return !!T.modalText(); }, 'the question', 60, 100);
    var text = T.modalText();
    if (!T.clickModalButton(label)) throw new Error('no ' + label + ' in: ' + text);
    await T.until(function () { return !T.modalText(); }, 'the question to close', 60, 100);
    await settle(); await T.sleep(300);
    return text;
  }

  // One case's undo / redo contract, once its edit has been made: Cmd+Z = before, Shift+Cmd+Z = after, Cmd+Z = before.
  async function undoRedo(id, title, before, after, made, extra) {
    var z1 = await press(false), s1 = await snap(), st1 = state();
    var r1 = await press(true), s2 = await snap(), st2 = state();
    var z2 = await press(false), s3 = await snap();
    out.observed[id] = Object.assign({ made: made, afterUndo: st1, afterRedo: st2, keys: [z1, r1, z2],
      undoDiff: diff(before, s1), redoDiff: diff(after, s2), undo2Diff: diff(before, s3) }, extra || {});
    kase(id + '-undo', title + ': ONE Cmd+Z gives back the calendar exactly as before the edit', made && z1 && s1 === before, { observed: out.observed[id].undoDiff, state: st1 });
    kase(id + '-redo', title + ': Shift+Cmd+Z gives back the edit AND its push; Cmd+Z again, as before',
      made && r1 && z2 && s2 === after && s3 === before, { redo: out.observed[id].redoDiff, undo2: out.observed[id].undo2Diff });
    // On a build that banks two steps (the bug), the calendar is left between them: one more Cmd+Z (at most two) brings
    // it back, so the next case still starts where it expects and is judged on its own.
    for (var i = 0; i < 2 && s3 !== before; i++) { await press(false); s3 = await snap(); out.observed[id].recovered = i + 1; }
  }

  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(txt($('meta-production'))) && !!q('#table-wrap .mv-daygrid'); }, 'the restored calendar in the month view', 200, 100);
    await T.sleep(1500);
    var pref = {};
    try { pref = JSON.parse(localStorage.getItem('sptcal.prefs') || '{}') || {}; } catch (e) {}
    var st0 = state();
    out.observed.R0 = { pref: pref, state: st0 };
    kase('R0', 'the ripple preference is the users\' default (absent = on); Production 6/29/26, the unlocked Summer break 7/13/26 x1, Post 11/2/26',
      !Object.prototype.hasOwnProperty.call(pref, 'hiatusRipple') && st0.starts.production === '2026-06-29' && st0.starts.post === '2026-11-02'
        && st0.hiatuses[0] === '2026-07-13 x1', { observed: st0 });

    // ---- M: the month view's band drag, answered Keep (the finding's own steps) ----
    await toMonth('July 2026');
    var before = await snap();
    var rows = qa('#table-wrap .mv-body > .mv-week');
    var row = rows.findIndex(function (w) { return qa('.mv-hiatus-bar', w).some(function (b) { return /Summer break/i.test(txt(b)); }); });
    var bar = row >= 0 && qa('.mv-hiatus-bar', rows[row]).find(function (b) { return /Summer break/i.test(txt(b)); });
    if (!bar || row < 2) throw new Error('M1: no Summer break band two rows down in July 2026 (row ' + row + ')');
    await bringIntoView(bar);
    var br = bar.getBoundingClientRect(), bx = Math.round(br.left + Math.min(60, br.width / 2)), by = Math.round(br.top + br.height / 2);
    (document.elementFromPoint(bx, by) || bar).dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: bx, clientY: by }));
    await T.sleep(150);
    var layer = q('.hiatus-drag-layer');
    if (!layer || layer.hidden) throw new Error('M1: the drag layer did not show over the band');
    var tr = rows[row - 2].getBoundingClientRect(), ty = Math.round(tr.top + tr.height / 2);
    layer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: bx, clientY: by, button: 0, buttons: 1 }));
    for (var k = 1; k <= 4; k++) {
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: bx, clientY: Math.round(by + (ty - by) * k / 4), button: 0, buttons: 1 }));
      await T.sleep(200);
    }
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: bx, clientY: ty, button: 0, buttons: 0 }));
    var question = await answer('Keep');
    var after = await snap(), stM = state();
    var madeM = stM.hiatuses[0] === '2026-06-29 x1' && stM.starts.production === '2026-07-06' && /Pushed 1 wk: Production/.test(question);
    kase('M1', 'month view: the Summer break dragged onto the week of 6/29/26 and kept: the question names "Pushed 1 wk: Production"; break 6/29, Production 7/6',
      madeM, { observed: { state: stM, question: question } });
    await undoRedo('M', 'month band drag, Keep', before, after, madeM, { question: question });

    // ---- D: the month day menu's Add hiatus > All phases (the finding's third case) ----
    // The sidebar on Phases first, for the S cases at the end: sidebarTab is in the undo history but a tab switch is no
    // step of its own, so it rides with the next step banked. The day menu's leading flush (addHiatusHere) banks it here,
    // before D's own "before", so no case's Cmd+Z puts a tab back.
    var tab = q('.side-tab-btn[data-tab="phases"]');
    if (tab) { tab.click(); await T.sleep(300); }
    await toMonth('August 2026');
    before = await snap();
    await rclickDay('2026-08-17');
    await chooseSub('hiatus-all');
    after = await snap();
    var stD = state();
    var madeD = stD.hiatuses.indexOf('2026-08-17 x2 L') >= 0 && stD.starts.post === '2026-11-16' && stD.starts.localization === '2027-03-15';
    kase('D1', 'month day menu, Mon 8/17/26 > Add hiatus > All phases: a 2-week break; Post 11/16, Localization 3/15',
      madeD, { observed: stD });
    await undoRedo('D', 'month day menu Add hiatus (all phases)', before, after, madeD);

    // ---- P: the month day menu's Add hiatus > Production only (a phase's own hiatus) ----
    before = await snap();
    await rclickDay('2026-08-17');
    await chooseSub('hiatus-production');
    after = await snap();
    var stP = state();
    var madeP = stP.phi === '2026-08-17/on' && stP.starts.post === '2026-11-16' && stP.starts.localization === '2027-03-15';
    kase('P1', 'month day menu, Mon 8/17/26 > Add hiatus > Production only: its own 2-week hiatus; Post 11/16, Localization 3/15',
      madeP, { observed: stP });
    await undoRedo('P', 'month day menu Add hiatus (one phase)', before, after, madeP);

    // ---- X: the month day menu's Remove hiatus…, answered Remove ----
    await toMonth('July 2026');
    before = await snap();
    await rclickDay('2026-07-14');
    await choose('band-remove-');
    await answer('Remove');
    after = await snap();
    var stX = state();
    var madeX = stX.hiatuses.indexOf('2026-07-13 x1') < 0 && stX.starts.post === '2026-10-26' && stX.starts.localization === '2027-02-22';
    kase('X1', 'month day menu, a day of the Summer break > Remove hiatus…, Remove: the break gone; Post 10/26, Localization 2/22',
      madeX, { observed: stX });
    await undoRedo('X', 'month day menu Remove hiatus', before, after, madeX);

    // ---- W: the waterfall's right-click Add hiatus > All phases ----
    $('view-sheet-btn').click(); await settle(); await T.sleep(300);
    before = await snap();
    var td = q('#table-wrap td.sheet-phase-cell[data-pkey="post"][data-week="2026-11-09"]:not(.sheet-hiatus-cell)');
    if (!td) throw new Error('W1: no Post cell in the week of 11/9/26');
    var box = $('sheet-scroll-container'), bb = box.getBoundingClientRect(), r0 = td.getBoundingClientRect();
    box.scrollTop += (r0.top + r0.height / 2) - (bb.top + bb.height / 2);
    box.scrollLeft += (r0.left + r0.width / 2) - (bb.left + bb.width / 2);
    await T.sleep(600);
    var rr = td.getBoundingClientRect(), wx = rr.left + rr.width / 2, wy = rr.top + rr.height / 2;
    (document.elementFromPoint(wx, wy) || td).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, composed: true, clientX: wx, clientY: wy, button: 2, buttons: 2 }));
    await T.sleep(150);
    if (!q('.day-menu')) throw new Error('W1: no waterfall menu on Post 11/9/26');
    await chooseSub('hiatus-all');
    after = await snap();
    var stW = state();
    var madeW = stW.hiatuses.indexOf('2026-11-09 x2 L') >= 0 && stW.starts.post === '2026-11-02' && stW.starts.localization === '2027-03-15';
    kase('W1', 'waterfall, Post\'s week of 11/9/26 > Add hiatus > All phases: a 2-week break; Post (running) stays 11/2, Localization 3/15',
      madeW, { observed: stW });
    await undoRedo('W', 'waterfall Add hiatus', before, after, madeW);

    // ---- S: the sidebar's own boxes ----
    function summerRow() { return qa('#hiatus-list .hiatus-entry').find(function (r) { return q('.hiatus-start', r).value === '2026-07-13'; }); }
    // S1: Weeks 1 -> 2, pushed at once; its own step is still pending (inside the debounce) when the push comes.
    before = await snap();
    var wk = q('.hiatus-weeks', summerRow());
    wk.focus(); wk.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));   // the "before" (rippleBegin), focused or not
    nativeSet(wk, '2'); wk.dispatchEvent(new Event('input', { bubbles: true }));
    await T.sleep(400);
    after = await snap();
    var stS1 = state();
    var madeS1 = stS1.hiatuses[0] === '2026-07-13 x2' && stS1.starts.post === '2026-11-09' && stS1.starts.localization === '2027-03-08';
    kase('S1', 'sidebar, the Summer break\'s Weeks 1 -> 2: Post 11/9, Localization 3/8 at once',
      madeS1, { observed: stS1 });
    await undoRedo('S1', 'sidebar Weeks', before, after, madeS1);

    // S2: Starts typed, a pause past the debounce (the typing banks its own step), then Enter settles it.
    before = await snap();
    var sb = q('.hiatus-start', summerRow());
    sb.focus(); sb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    nativeSet(sb, '2026-06-29'); sb.dispatchEvent(new Event('input', { bubbles: true }));
    await T.sleep(1200);
    var midStarts = starts();
    sb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
    await T.sleep(400);
    after = await snap();
    var stS2 = state();
    var madeS2 = midStarts.production === '2026-06-29' && stS2.hiatuses[0] === '2026-06-29 x1' && stS2.starts.production === '2026-07-06';
    kase('S2', 'sidebar, the Summer break\'s Starts typed 2026-06-29, nothing pushed while typing; Enter: Production 7/6',
      madeS2, { observed: { mid: midStarts, state: stS2 } });
    await undoRedo('S2', 'sidebar Starts', before, after, madeS2);

    // S3: the row's own ×, answered Remove (rippleAround, with no bracket: the removal is still pending when the pull lands).
    before = await snap();
    q('.remove-hiatus', summerRow()).click();
    await answer('Remove');
    after = await snap();
    var stS3 = state();
    var madeS3 = stS3.hiatuses.indexOf('2026-07-13 x1') < 0 && stS3.starts.post === '2026-10-26' && stS3.starts.localization === '2027-02-22';
    kase('S3', 'sidebar, the Summer break\'s ×, Remove: the break gone; Post 10/26, Localization 2/22',
      madeS3, { observed: stS3 });
    await undoRedo('S3', 'sidebar ×', before, after, madeS3);

    // S4: Production's own Hiatus switch: its Starts written by code (no focus, so no ripple of its own), then the
    // switch clicked on: the hiatus goes in and pushes Post and Localization 2 wks, one step with the date.
    before = await snap();
    T.set('phiatus-start-production', '2026-08-17');
    await T.sleep(100);
    var midS4 = starts();
    $('phiatus-en-production').click();
    await T.sleep(400);
    after = await snap();
    var stS4 = state();
    var madeS4 = midS4.post === '2026-11-02' && stS4.phi === '2026-08-17/on' && stS4.starts.post === '2026-11-16' && stS4.starts.localization === '2027-03-15';
    kase('S4', 'sidebar, Production\'s own Hiatus switched on at 8/17/26: Post 11/16, Localization 3/15 (nothing moved before the switch)',
      madeS4, { observed: { mid: midS4, state: stS4 } });
    await undoRedo('S4', 'a phase\'s Hiatus switch', before, after, madeS4);

    var h = T.appHealth();
    kase('E0', '0 console errors', h.errors.length === 0, { errors: h.errors });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'the leg threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
