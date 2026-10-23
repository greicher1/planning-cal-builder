// shootdays -- "Number Production Days": "Day N" in the top right of every shoot day's square in the month view
// (owner, 19 Oct 2026). Off by default; CALENDAR DATA (owner's picker, "Saved in the calendar"), as captureSnapshot()'s
// `mvNumberShootDays`, an ABSENT key when off; shown whatever labels the bars ("it should add the numbers no matter if we
// are in episode mode/block mode or week mode"). The frozen edit it needed (renderMonthView puts data-shoot-day="N" on
// the cell; legacy.css draws it as the cell's ::after) was approved with a gate, and this leg is the "on" half of it:
// gates 10 and 13, byte-identical with it off, are the other half.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=offweek ./run.sh shootdays 900
//     The full run, against offweek's hand trace (t/offweek.js): off marks, a worked Saturday, Labor Day, an all-phase
//     hiatus and Production's own. Mints out.sptcal -> tests/fixtures/shootdays.sptcal from its real Save.
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=dayoverrides-onhalf ./run.sh shootdays 900
//     Half days: a 'half', two half-worked holidays/weekends ('onhalf'), a worked Saturday, an Off. Mints
//     tests/fixtures/shootdays-onhalf.sptcal.
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=blocks ./run.sh shootdays 900
//     A Blocks calendar, where all three labels can be picked.
//
// Every calendar is opened through the real Load path (T.openViaFakePicker) with viewMode 'month' and sidebarTab
// 'settings' written into its JSON and any mvNumberShootDays removed, so the month view is on screen and the undo
// stack starts EMPTY (no view or tab click banks a step of its own); openText then opens the Settings window on its
// Preferences tab, where the switch lives (its Calendar tab until the owner merged the two, 20 Oct 2026). (A sidebarTab of 'settings' opens as Show since the window retired that tab.)
//
// CASES (each a check in out.checks; gate.sh prints them)
//   A0  opened with no key: the switch is shown in Month View, unticked, inside .prefs-card and outside the
//       contextual .pref-mv-row; no month carries a data-shoot-day; the calendar is not dirty and Undo is off
//   A1  ruling: the switch stays shown under every label Label Production by can pick here
//   A2  toggled on by clicking it: ticked, the calendar dirty, Undo on
//   A3  every square agrees with the day menu: a square reads "Day N" exactly when its menu's shoot-day section reads
//       "Shoot day N" (both ways, every day of every month); the numbers run 1..N with no gap or repeat, in date order
//   A4  (offweek) the hand trace: Day 1 on 8/9, Day 16 on the worked Saturday 9/25, Day 40 on 11/4, none on the off
//       weeks, Labor Day, either hiatus or an ordinary weekend
//   A5  (dayoverrides-onhalf) a half day and a half-worked day keep their ½ and carry a number; the Off day has none
//   A6  ONLY THE ATTRIBUTE: every month's HTML with ` data-shoot-day="N"` taken out is byte-identical to the same month
//       with the setting off, and every week row is exactly as tall
//   A7  what CSS draws: each numbered square's ::after reads "Day N", sits on the date's baseline, 5 px in from the
//       right edge, on the date's line; a spillover day's is faded to the date's .35
//   A8  numbering ignores the label: under every label the control can pick, the same days carry the same numbers
//   A9a a file with no key opened right after a calendar with the numbers on opens with them OFF (restore
//       unconditionally; A11 asks again after a Load)
//   A9  ONE undo step: Undo turns it off (the switch, every month byte-identical to off, the stack empty); Redo turns
//       it on again (byte-identical to on)
//   A10 Save writes mvNumberShootDays: true, and no pref- id joins fields.byId (the same ids as with it off)
//   A11 Load of that text shows it on (the switch, every month byte-identical), and so does that text with no
//       sidebarTab (only applyStateSnapshot's own reflect writes the switch then); a file with no key loaded right after
//       shows it off (restore unconditionally); so does one with a value the app never writes ("yes", false)
//   A12 switched off again and saved: the key is ABSENT, never false
//   A13 the month PDF the app writes (Export PDF, its Save dialog stood in) is out.pdf, one page per month it prints
//       (every month of the phases, and an edge month only when a day of it carries a note), and
//       out.pdfExpect lists each month's numbers in reading order as the screen showed them; gate.sh holds every
//       page's text (pdftotext -raw) to that list
//   E0  no console errors but the three A11 causes on purpose: the restore validator's warning for each value the
//       app never writes ("yes", false, 1), exactly three
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = {checks: []}, checks = out.checks;
  function check(cond, what, detail) { checks.push({what: what, ok: !!cond, detail: detail === undefined ? null : detail}); return !!cond; }
  var st = (/[?&]state=([\w.-]+)/.exec(location.search) || [])[1];
  out.run = st;
  var $ = function (id) { return document.getElementById(id); };
  function settle(label) {
    var last = -1, n0 = 0;
    return T.until(function () {
      var n = ($('table-wrap') || {innerHTML: ''}).innerHTML.length;
      n0 = (n === last && n > 0) ? n0 + 1 : 0; last = n; return n0 >= 5;
    }, label || 'settle', 200, 100);
  }
  // Answer the unsaved-work guard if a re-open raises it: it is the app's own dialog.
  var guard = setInterval(function () {
    var b = [].find.call(document.querySelectorAll('button'), function (x) {
      return (x.textContent || '').trim() === 'Load' && x.offsetParent !== null;
    });
    if (b) b.click();
  }, 50);
  var seq = 0;
  async function openText(text, writes) {
    seq++;
    await T.openViaFakePicker(null, 'shootdays-' + seq + '.sptcal', {text: text, writes: writes || []});
    await T.sleep(300);
    await settle('open ' + seq);
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'month grid ' + seq, 200, 100);
    await settle('month ' + seq);
    // The switch is in the Settings window's Preferences tab (Calendar until merged into it, 20 Oct 2026); it was the
    // sidebar's Settings tab, which the JSON's sidebarTab 'settings' used to bring up and now opens as Show.
    // Opening the window is session UI, never an undo step (settingswin W8), so A0's empty stack holds.
    await T.openSettings('prefs');
  }
  async function saveNow(writes) {
    var save = $('save-file-btn'), n = writes.length;
    await T.until(function () { return !save.disabled && !save.hasAttribute('data-disabled'); }, 'save enabled', 100, 100);
    save.click();
    await T.until(function () { return writes.length > n; }, 'save write', 100, 100);
    await T.sleep(200);
    return writes[writes.length - 1].text;
  }
  function sw() { return $('pref-mv-shootdays'); }
  function swShown() { var el = sw(); return !!el && el.getClientRects().length > 0; }
  function statusText() { return (($('save-status') || {}).textContent || '').trim(); }
  function undoOff() { return !!$('undo-btn').disabled; }
  function redoOff() { return !!$('redo-btn').disabled; }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // The month on screen: its title, its HTML, each week row's height, and per square its date (the renderer's grid:
  // Sunday to Saturday from the Sunday on or before the 1st), its number and its classes.
  function readMonth() {
    var wrap = $('table-wrap'), title = (wrap.querySelector('.mv-monthyear') || {}).textContent || '';
    var lm = /^(\w+) (\d{4})$/.exec(title.trim()), mo = lm ? MONTHS.indexOf(lm[1]) : -1, yr = lm ? +lm[2] : 0;
    var first = Date.UTC(yr, mo, 1), lead = new Date(first).getUTCDay();
    var cells = [].map.call(wrap.querySelectorAll('.mv-body > .mv-week > .mv-daygrid > .mv-daycell'), function (c, k) {
      var d = new Date(first + (k - lead) * 86400000);
      return {iso: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()), el: c,
              sd: c.hasAttribute('data-shoot-day') ? c.getAttribute('data-shoot-day') : null,
              out: c.classList.contains('mv-out'), half: c.classList.contains('mv-day-half'), num: (c.querySelector('.mv-daynum') || {}).textContent};
    });
    var heights = [].map.call(wrap.querySelectorAll('.mv-body > .mv-week'), function (w) { return w.getBoundingClientRect().height; });
    return {title: title, html: wrap.innerHTML, heights: heights, cells: cells};
  }
  // Walk every month, first to last, calling `each(month)` on each.
  async function walk(each) {
    var g = 0;
    while (g++ < 80) { var p = $('mv-prev'); if (!p || p.disabled) break; p.click(); await settle('prev'); }
    var res = []; g = 0;
    while (g++ < 80) {
      var m = readMonth();
      if (each) await each(m);
      res.push({title: m.title, html: m.html, heights: m.heights, cells: m.cells.map(function (c) { return {iso: c.iso, sd: c.sd, out: c.out, half: c.half}; })});
      var nx = $('mv-next');
      if (!nx || nx.disabled) break;
      nx.click(); await settle('next');
    }
    return res;
  }
  // Numbered squares over EVERY month walked. ⚠️ Never "is a square on screen numbered": a Load opens on the calendar's
  // first month, which may hold no shoot day at all (offweek's July 2027 does), so that would read a working load as a
  // broken one, and a broken "off" as a working one.
  function numberedIn(ms) { return ms.reduce(function (n, m) { return n + m.cells.filter(function (c) { return c.sd !== null; }).length; }, 0); }
  function sameHtml(a, b, strip) {
    if (a.length !== b.length) return 'months ' + a.length + ' vs ' + b.length;
    for (var i = 0; i < a.length; i++) {
      var x = strip ? a[i].html.replace(/ data-shoot-day="\d+"/g, '') : a[i].html;
      if (x !== b[i].html) return 'month ' + i + ' (' + a[i].title + ') differs';
    }
    return true;
  }
  function sameHeights(a, b) {
    if (a.length !== b.length) return 'months ' + a.length + ' vs ' + b.length;
    for (var i = 0; i < a.length; i++) if (JSON.stringify(a[i].heights) !== JSON.stringify(b[i].heights)) return a[i].title + ': ' + a[i].heights + ' vs ' + b[i].heights;
    return true;
  }
  // iso -> number, one entry per date (a spillover square repeats its date in the next month; it must agree).
  function numbering(months) {
    var map = {}, clash = [];
    months.forEach(function (m) { m.cells.forEach(function (c) {
      var v = c.sd === null ? null : +c.sd;
      if (c.iso in map && map[c.iso] !== v) clash.push(c.iso + ': ' + map[c.iso] + ' / ' + v);
      if (!(c.iso in map) || v !== null) map[c.iso] = v;
    }); });
    return {map: map, clash: clash};
  }
  // The day menu's shoot-day section for one square: right-click its date as Chrome sends it, read, close.
  function rclick(el) {
    var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    var base = {bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, buttons: 2, view: window};
    el.dispatchEvent(new MouseEvent('mousedown', base));
    el.dispatchEvent(new MouseEvent('contextmenu', base));
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, {buttons: 0})));
  }
  async function menuShootDay(cell) {
    rclick(cell.el.querySelector('.mv-daynum'));
    await T.sleep(15);
    var m = document.querySelector('.day-menu');
    var sec = m && m.querySelector('[data-section="shoot"]');
    var lab = sec ? ((sec.textContent || '').match(/Shoot day \d+|Not a shoot day/) || [''])[0] : '';
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await T.sleep(8);
    return {menu: !!m, label: lab};
  }
  // Where CSS put "Day N": a stand-in span with the ::after's own computed style as the cell's last child (where a
  // ::after box goes), the pseudo switched off meanwhile, and a zero-size inline-block on each baseline.
  function probe(cell) {
    var c = cell.el, live = getComputedStyle(c, '::after'), snap = {};
    ['content', 'float', 'whiteSpace', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'color', 'opacity'].forEach(function (k) { snap[k] = live[k]; });
    var off = document.createElement('style');
    off.textContent = '.__sdprobe-off::after{ content:none !important; }';
    document.head.appendChild(off);
    c.classList.add('__sdprobe-off');
    var sp = document.createElement('span');
    sp.textContent = (/^"(.*)"$/.exec(snap.content) || [, ''])[1];
    ['float', 'whiteSpace', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'color', 'opacity'].forEach(function (k) { sp.style[k] = snap[k]; });
    c.appendChild(sp);
    var mk = function () { var e = document.createElement('span'); e.style.cssText = 'display:inline-block;width:0;height:0'; return e; };
    var m1 = mk(), m2 = mk(), num = c.querySelector('.mv-daynum');
    num.appendChild(m1); sp.appendChild(m2);
    var cr = c.getBoundingClientRect(), pr = sp.getBoundingClientRect(), cs = getComputedStyle(c);
    var res = {content: snap.content, opacity: parseFloat(snap.opacity), dateBase: m1.getBoundingClientRect().bottom - cr.top,
               sdBase: m2.getBoundingClientRect().bottom - cr.top, rightGap: cr.right - parseFloat(cs.borderRightWidth || 0) - pr.right,
               padRight: parseFloat(cs.paddingRight), top: pr.top - cr.top, padTop: parseFloat(cs.paddingTop),
               numOpacity: parseFloat(getComputedStyle(num).opacity)};
    m1.remove(); sp.remove(); c.classList.remove('__sdprobe-off'); off.remove();
    return res;
  }
  // Pick a label through the real control, as a user does: a click on its segment's LABEL.
  function ctlLabel() { var r = [].filter.call(document.querySelectorAll('input[name="mv-prod-label"]'), function (x) { return x.checked; }); return r.length === 1 ? r[0].value : null; }
  async function pick(v) {
    var lab = document.querySelector('label[for="mv-prod-label-' + v + '"]');
    if (!lab) throw new Error('no segment label for ' + v);
    lab.click();
    await T.until(function () { return ctlLabel() === v; }, 'picked ' + v, 60, 100);
    await settle('label ' + v);
  }

  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); }, 'restored', 200, 100);
    await settle('first load');
    var text = await (await fetch('/tests/fixtures/' + st + '.sptcal', {cache: 'no-store'})).text();
    function withKey(v) {
      var o = JSON.parse(text);
      o.viewMode = 'month'; o.sidebarTab = 'settings';
      if (v === undefined) delete o.mvNumberShootDays; else o.mvNumberShootDays = v;
      return JSON.stringify(o);
    }
    out.fixtureHadKey = 'mvNumberShootDays' in JSON.parse(text);

    // ---- A0: off, as every calendar saved before the setting opens ----
    var w0 = [];
    await openText(withKey(undefined), w0);
    var inCard = !!(sw() && sw().closest('.prefs-card')), inRow = !!(sw() && sw().closest('.pref-mv-row'));
    var off = await walk();
    var offNumbered = off.reduce(function (n, m) { return n + m.cells.filter(function (c) { return c.sd !== null; }).length; }, 0);
    check(swShown() && sw().checked === false && inCard && !inRow && offNumbered === 0 && undoOff() && statusText() !== 'Unsaved changes',
      'A0 opened with no key: the switch shown and unticked, in .prefs-card and not a .pref-mv-row; no data-shoot-day in ' + off.length + ' months; not dirty, Undo off',
      {shown: swShown(), checked: sw() && sw().checked, inCard: inCard, inRow: inRow, numbered: offNumbered, undoOff: undoOff(), status: statusText()});
    out.months = off.length;
    out.scheduleBy = ($('show-mode') || {}).value || '(none)';
    var blocksCal = out.scheduleBy === 'blocks';
    var labels = ['week', 'episode'].concat(blocksCal ? ['block'] : []);

    // ---- A1: shown under every label (the owner's ruling) ----
    var startLabel = ctlLabel(), shownUnder = {};
    for (var li = 0; li < labels.length; li++) { await pick(labels[li]); shownUnder[labels[li]] = swShown(); }
    // Back to the file's own label through the control, then re-open, so A2 starts from an empty undo stack.
    await openText(withKey(undefined), w0);
    check(Object.keys(shownUnder).every(function (k) { return shownUnder[k]; }) && Object.keys(shownUnder).length === labels.length,
      'A1 the switch stays shown under every label the control can pick here (' + labels.join(', ') + ')', {shownUnder: shownUnder, opened: startLabel});

    // ---- A2: on, through the switch ----
    var undoBefore = undoOff();
    sw().click();
    await T.until(function () { return !!document.querySelector('#table-wrap [data-shoot-day]') || sw().checked; }, 'numbers on', 60, 100);
    await settle('on');
    await T.sleep(700);
    check(sw().checked === true && statusText() === 'Unsaved changes' && undoBefore && !undoOff(),
      'A2 a click on the switch turns it on: ticked, the calendar dirty, Undo on (it was off)', {checked: sw().checked, status: statusText(), undoBefore: undoBefore, undoAfter: undoOff()});

    // ---- A3 + A7: every square against the day menu, and against what CSS draws ----
    var menuBad = [], probeBad = [], probed = 0, opened = 0, menuDays = 0, firstProbe = null;
    var on = await walk(async function (m) {
      for (var k = 0; k < m.cells.length; k++) {
        var c = m.cells[k], r = await menuShootDay(c);
        if (r.menu) opened++;
        var want = c.sd === null ? null : 'Shoot day ' + c.sd, got = /^Shoot day \d+$/.test(r.label) ? r.label : null;
        if (got) menuDays++;
        if (!r.menu) menuBad.push(m.title + ' ' + c.num + ': no menu');
        else if (want !== got) menuBad.push(m.title + ' ' + c.num + ': square ' + want + ', menu "' + r.label + '"');
        if (c.sd !== null) {
          var p = probe(c); probed++;
          if (!firstProbe) firstProbe = p;
          var okP = p.content === '"Day ' + c.sd + '"' && Math.abs(p.sdBase - p.dateBase) < 0.01 && Math.abs(p.rightGap - p.padRight) < 0.01 &&
                    Math.abs(p.top - p.padTop) < 0.01 && Math.abs(p.opacity - (c.out ? p.numOpacity : 1)) < 1e-6 && (!c.out || Math.abs(p.opacity - 0.35) < 1e-6);
          if (!okP) probeBad.push(m.title + ' ' + c.num + ': ' + JSON.stringify(p));
        }
      }
    });
    var N = numbering(on), seqIsos = Object.keys(N.map).filter(function (i) { return N.map[i] !== null; }).sort();
    var seqOk = seqIsos.every(function (iso, i) { return N.map[iso] === i + 1; });
    out.shootDays = seqIsos.length;
    // What each printed page must read: its month's numbers in the order the squares run (row by row, Sun to Sat).
    // ⚠️ Since bundle A (MONTH-NOTES-PLAN.md item 6, 20 Oct 2026) the screen walks one month each side of the
    // phases, and the month PDF prints such an EDGE month only when a day of its own carries a note or holiday
    // (ruling "Only if they hold something"; monthHoldsSomething). Each note bar (.mv-note-block) names its day
    // (data-note-day), so an edge month is a page exactly when one of its bars is dated inside it. The walk's first and last
    // months are always the edges.
    function holdsSomething(m) {
      var lm = /^(\w+) (\d{4})$/.exec(m.title.trim()); if (!lm) return true;
      var ym = lm[2] + '-' + pad(MONTHS.indexOf(lm[1]) + 1) + '-';
      // Note BARS only: the "+" that adds a note carries data-note-day on every day too.
      var doc = new DOMParser().parseFromString(m.html, 'text/html');
      return !!doc.querySelector('.mv-note-block[data-note-day^="' + ym + '"]');
    }
    var printed = on.filter(function (m, i) { return (i > 0 && i < on.length - 1) || holdsSomething(m); });
    out.pdfExpect = printed.map(function (m) { return {title: m.title, days: m.cells.filter(function (c) { return c.sd !== null; }).map(function (c) { return +c.sd; })}; });
    check(menuBad.length === 0 && opened > 0 && menuDays > 0 && N.clash.length === 0 && seqOk && seqIsos.length > 0,
      'A3 every square agrees with the day menu (' + opened + ' squares, ' + menuDays + ' "Shoot day N" menus), and the numbers run 1..' + seqIsos.length + ' in date order',
      {bad: menuBad.slice(0, 10), clash: N.clash.slice(0, 5), seqOk: seqOk, first: seqIsos.slice(0, 3), last: seqIsos.slice(-2)});
    check(probed > 0 && probeBad.length === 0,
      'A7 every numbered square\'s ::after reads "Day N" on the date\'s baseline, at the right padding, on the date\'s line; spillover faded to .35 (' + probed + ' squares)',
      {bad: probeBad.slice(0, 5), sample: firstProbe});

    // ---- A4 / A5: the calendar's own facts ----
    if (st === 'offweek') {
      var want4 = {};
      var spans = [['2027-08-09', 5, 1], ['2027-08-16', 5, 6], ['2027-09-13', 5, 11], ['2027-09-25', 1, 16], ['2027-09-27', 5, 17],
                   ['2027-10-11', 5, 22], ['2027-10-18', 5, 27], ['2027-10-25', 5, 32], ['2027-11-01', 4, 37]];
      spans.forEach(function (s) { for (var i = 0; i < s[1]; i++) { var d = new Date(Date.parse(s[0] + 'T00:00:00Z') + i * 86400000); want4[d.toISOString().slice(0, 10)] = s[2] + i; } });
      var got4 = {}; seqIsos.forEach(function (i) { got4[i] = N.map[i]; });
      var none = ['2027-08-02', '2027-08-06', '2027-08-23', '2027-08-27', '2027-08-30', '2027-09-03', '2027-09-06', '2027-09-07',
                  '2027-09-10', '2027-09-20', '2027-09-24', '2027-09-26', '2027-10-04', '2027-10-08', '2027-10-09', '2027-11-05'];
      var noneBad = none.filter(function (i) { return N.map[i] !== null && N.map[i] !== undefined; });
      check(JSON.stringify(got4) === JSON.stringify(want4) && noneBad.length === 0,
        'A4 offweek\'s hand trace: Day 1 on 8/9, Day 16 on the worked Saturday 9/25, Day 40 on 11/4; none on the off weeks, Labor Day, either hiatus or a weekend',
        {count: seqIsos.length, mismatch: Object.keys(want4).filter(function (i) { return got4[i] !== want4[i]; }).slice(0, 5), noneBad: noneBad});
    }
    if (st === 'dayoverrides-onhalf') {
      var cellAt = function (iso) { for (var i = 0; i < on.length; i++) { var c = on[i].cells.filter(function (x) { return x.iso === iso && !x.out; })[0]; if (c) return c; } return null; };
      var h1 = cellAt('2026-07-06'), h2 = cellAt('2026-07-03'), h3 = cellAt('2026-08-01'), wk = cellAt('2026-07-11'), offD = cellAt('2026-07-07');
      check(h1 && h1.half && h1.sd !== null && h2 && h2.half && h2.sd !== null && h3 && h3.half && h3.sd !== null && wk && wk.sd !== null && offD && offD.sd === null,
        'A5 the half day (7/6) and the half-worked holiday (7/3) and Saturday (8/1) keep their ½ and carry a number, so does the worked Saturday (7/11); the Off day (7/7) has none',
        {h1: h1, h2: h2, h3: h3, worked: wk, off: offD});
    }

    // ---- A6: only the attribute moved ----
    check(sameHtml(on, off, true) === true && sameHeights(on, off) === true,
      'A6 every month with data-shoot-day taken out is byte-identical to the month with the setting off, and every week row is as tall',
      {html: sameHtml(on, off, true), heights: sameHeights(on, off)});

    // ---- A8: numbering ignores the label ----
    var byLabel = {}, labelBad = [];
    for (li = 0; li < labels.length; li++) {
      await pick(labels[li]);
      var nm = numbering(await walk()).map;
      byLabel[labels[li]] = Object.keys(nm).filter(function (i) { return nm[i] !== null; }).length;
      Object.keys(N.map).forEach(function (i) { if ((nm[i] === undefined ? null : nm[i]) !== N.map[i]) labelBad.push(labels[li] + ' ' + i + ': ' + nm[i] + ' vs ' + N.map[i]); });
      if (!swShown() || !sw().checked) labelBad.push(labels[li] + ': the switch ' + (swShown() ? 'unticked' : 'hidden'));
    }
    check(labelBad.length === 0, 'A8 under every label (' + labels.join(', ') + ') the same days carry the same numbers, and the switch stays on', {perLabel: byLabel, bad: labelBad.slice(0, 5)});

    // ---- A9: one undo step (re-opened at no key, then switched on) ----
    var w9 = [];
    await openText(withKey(undefined), w9);
    // A file with no key, opened straight after the calendar above had the numbers on: it must open with them OFF
    // (restore unconditionally). Checked here, where it first can be, so a leak names itself rather than surfacing as
    // a timeout below; and put right if it leaked, so the cases after it still run.
    var leaked = sw().checked || numberedIn(await walk()) > 0;
    check(!leaked, 'A9a a file with no key, opened right after one with the numbers on, opens with them off (restore unconditionally)', {checked: sw().checked});
    if (leaked && sw().checked) { sw().click(); await T.until(function () { return !sw().checked; }, 'put off', 60, 100); await settle('put off'); }
    sw().click();
    await T.until(function () { return sw().checked; }, 'on for A9', 60, 100);
    await settle('A9 on'); await T.sleep(700);
    $('undo-btn').click();
    await T.until(function () { return !sw().checked; }, 'undo turns it off', 60, 100);
    await settle('A9 undo');
    var afterUndo = await walk(), undoEmpty = undoOff(), redoReady = !redoOff();
    $('redo-btn').click();
    await T.until(function () { return sw().checked; }, 'redo turns it on', 60, 100);
    await settle('A9 redo');
    var afterRedo = await walk();
    check(sameHtml(afterUndo, off) === true && undoEmpty && redoReady && sameHtml(afterRedo, on) === true && sw().checked,
      'A9 one undo step: Undo turns it off (byte-identical to off, the stack empty), Redo turns it on (byte-identical to on)',
      {undoView: sameHtml(afterUndo, off), undoEmpty: undoEmpty, redoReady: redoReady, redoView: sameHtml(afterRedo, on)});

    // ---- A10: Save writes the key, and fields.byId does not move ----
    var savedOn = JSON.parse(await saveNow(w9));
    var savedOff = JSON.parse(await (async function () { var w = []; await openText(withKey(undefined), w); return saveNow(w); })());
    var idsOn = Object.keys((savedOn.fields || {}).byId || {}).sort(), idsOff = Object.keys((savedOff.fields || {}).byId || {}).sort();
    check(savedOn.mvNumberShootDays === true && !('mvNumberShootDays' in savedOff) && JSON.stringify(idsOn) === JSON.stringify(idsOff) &&
          !idsOn.some(function (k) { return /^pref-/.test(k); }),
      'A10 Save writes mvNumberShootDays: true (and no key with it off), and fields.byId holds the same ' + idsOn.length + ' ids either way, no pref- id among them',
      {on: savedOn.mvNumberShootDays, offHasKey: 'mvNumberShootDays' in savedOff, ids: idsOn.length, idsOff: idsOff.length});
    // The fixture the month-PDF legs read (gate.sh): this calendar, switched on through the switch, through the real Save.
    out.sptcal = btoa(unescape(encodeURIComponent(w9[w9.length - 1].text)));

    // ---- A11: Load round trip, then restore unconditionally ----
    var w11 = [];
    await openText(w9[w9.length - 1].text, w11);
    await T.until(function () { return sw().checked; }, 'reopened on', 60, 100).catch(function () {});
    var reOn = sw().checked, reOnView = sameHtml(await walk(), on);
    await openText(withKey(undefined), w11);
    var noKeyOff = !sw().checked, noKeyView = sameHtml(await walk(), off);
    // The same text with no sidebarTab: the switch must still show the loaded value. (applyStateSnapshot's own
    // reflect is the only thing that writes it then; setSidebarTab() reflects it too, but only when the file has a tab.)
    var noTab = JSON.parse(w9[w9.length - 1].text); delete noTab.sidebarTab;
    await openText(JSON.stringify(noTab), w11);
    var noTabOn = sw().checked === true && numberedIn(await walk()) > 0;
    var bogus = {};
    for (var bv of ['yes', false, 1]) {
      await openText(withKey(bv), w11);
      bogus[JSON.stringify(bv)] = !sw().checked && numberedIn(await walk()) === 0;
    }
    check(reOn && reOnView === true && noKeyOff && noKeyView === true && noTabOn && Object.keys(bogus).every(function (k) { return bogus[k]; }),
      'A11 Load of the saved text shows it on (byte-identical), and so does that text with no sidebarTab; a file with no key loaded right after shows it off (byte-identical); "yes", false and 1 open off',
      {reOn: reOn, reOnView: reOnView, noKeyOff: noKeyOff, noKeyView: noKeyView, noTabOn: noTabOn, bogus: bogus});

    // ---- A12: off again writes no key ----
    var w12 = [];
    await openText(withKey(true), w12);
    var wasOn = sw().checked;
    sw().click();
    await T.until(function () { return !sw().checked; }, 'off for A12', 60, 100);
    await settle('A12 off'); await T.sleep(700);
    var saved12 = JSON.parse(await saveNow(w12));
    check(wasOn && !('mvNumberShootDays' in saved12) && statusText() !== 'Unsaved changes',
      'A12 opened on, switched off and saved: the key is absent, never false', {wasOn: wasOn, hasKey: 'mvNumberShootDays' in saved12, value: saved12.mvNumberShootDays});

    // ---- A13: the month PDF the app writes, for gate.sh to read ----
    var w13 = [];
    await openText(withKey(true), w13);
    var spk = T.fakeSavePicker();
    await T.sleep(700);
    $('export-btn').click();
    try { await T.until(function () { return spk.files.length > 0; }, 'the month PDF written', 300, 100); } catch (e) {}
    spk.restore();
    var f13 = spk.files[0];
    if (f13 && f13.bytes) out.pdf = T.b64(f13.bytes.buffer);
    var nPrinted = (out.pdfExpect || []).length;
    check(!!(f13 && f13.bytes && f13.bytes.length > 10000) && nPrinted > 0 && T.pdfPages(f13.bytes) === nPrinted,
      'A13 Export PDF writes the month PDF with the numbers on (' + (f13 && f13.bytes ? f13.bytes.length : 0) + ' bytes, ' + (f13 && f13.bytes ? T.pdfPages(f13.bytes) : 0) + ' pages for the ' + nPrinted + ' of ' + off.length + ' months on screen that print); gate.sh reads its text',
      {name: f13 && f13.name});

    clearInterval(guard);
    // E0. A11 opened three values the app never writes, and the restore validator warns once for each: those three,
    // exactly, are expected. Anything else is a failure.
    var all = T.appHealth().errors || [], WARN = 'warn: SPTCal: 1 value(s) in this calendar were not in a form the app writes, and were ignored.';
    var expected = all.filter(function (e) { return e === WARN; }).length;
    var errs = all.filter(function (e) { return e !== WARN; }).slice(0, 10);
    check(expected === 3, 'E0 the restore validator warned exactly three times, once for each value A11 opened on purpose (' + expected + ')', {warnings: expected});
    out.health = {errors: errs};
  } catch (e) { clearInterval(guard); out.EX = e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); out.health = {errors: (window.__ERR || []).slice(0, 10)}; }
  out.pass = !out.EX && checks.length > 0 && checks.every(function (c) { return c.ok; }) && !((out.health || {}).errors || []).length;
  T.done(out);
})(); });
