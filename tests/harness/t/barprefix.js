// barprefix -- an episode's or block's month-bar PREFIX (owner, 20 Oct 2026; unitBarLabel): "Shoot Ep. 101" by
// default on every episode bar, old files included; no prefix on a block bar by default; each unit's own prefix
// changed or removed from its bar's day menu (Prefix…), saved on its episodeDefs / blockDefs entry as `barPrefix`
// only where it departs from the default. A switch day's one-day HALF bar never takes one (16 Oct ruling, kept).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=halfdays ./run.sh barprefix 300     (an Episodes calendar)
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=blocks   ./run.sh barprefix 300     (a Blocks calendar)
//
// halfdays (the mvmenu leg's calendar): a shoot from Mon 6/29/26, Episode 201 at 5 days and the rest at 4.5, so
// switch days carry half bars. Wed 8 Jul 2026 is shoot day 7, on Ep. 202's bar. blocks: five blocks from 6/29/26.
//
// CASES, halfdays
//   P0  opened with no key: every Production bar reads "Shoot Ep. …" except a one-day half bar, which reads
//       "Ep. …"; no grey text carries "Shoot"; the day menu's header names the episode bare
//   P1  a hit-tested right-click on Ep. 202's bar: the bar's section offers Prefix…, its second line "“Shoot”
//       before Ep. 202"; no id anywhere in the menu
//   P2  choosing it opens the panel beside the bar holding "Shoot", with no id in it; typing "Pickup" and Enter
//       gives every Ep. 202 bar "Pickup Ep. 202" and leaves every other episode "Shoot"; the calendar is dirty
//   P3  it is ONE undo step: Undo shows "Shoot Ep. 202" again, Redo "Pickup Ep. 202"
//   P4  Save writes barPrefix "Pickup" on Ep. 202's entry and on no other, and fields.byId does not move
//   P5  blank: "Ep. 202" on its bars, and the file keeps barPrefix "" (no prefix is a choice on an episode)
//   P6  Reset: "Shoot Ep. 202" again, and the file's episodeDefs are the untouched file's exactly
//   P7  Escape closes the panel and changes nothing (no undo step)
//   P8  Load of the "Pickup" file shows it; Load of the untouched file after it shows "Shoot" (restore
//       unconditionally: never the previous file's prefix)
//   P9  a file with prefixes the app never writes (a number, 40 characters) opens on the default, and the
//       restore validator drops both
//   P10 labelled by Production Week (no bar per episode) Prefix… is greyed out with its reason
//   P11 the month PDF the app writes is out.pdf; gate.sh reads "Pickup Ep. 202" and "Shoot Ep. 201" in it
// CASES, blocks
//   B0  opened with no key: block bars read "Block N", no "Shoot" anywhere
//   B1  Prefix… on Block 1's bar holds "" (no default on a block); "2nd Unit" and Enter gives "2nd Unit Block 1"
//       and leaves the other blocks bare; Save writes barPrefix on Block 1 only
//   B2  Label Production by Episode: Block 1's bars read "2nd Unit Ep. …", the other blocks' "Shoot Ep. …"
//   E0  no console errors but P9's one validator warning
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {test: 'barprefix'};
  var st = (/[?&]state=([\w.-]+)/.exec(location.search) || [])[1] || '';
  out.run = st;
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function txt(el){ return ((el || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  var $ = function (id) { return document.getElementById(id); };
  var warns = [];
  var cw = console.warn; console.warn = function () { warns.push([].join.call(arguments, ' ')); return cw.apply(console, arguments); };
  async function settle(){
    var last = -1, n0 = 0;
    await T.until(function () {
      var n = ($('table-wrap') || {innerHTML: ''}).innerHTML.length;
      n0 = (n === last && n > 0) ? n0 + 1 : 0; last = n; return n0 >= 4;
    }, 'the grid to settle', 150, 100);
  }
  // The unsaved-work guard, when a Load raises it, is the app's own dialog.
  var guard = setInterval(function () {
    var b = [].find.call(document.querySelectorAll('button'), function (x) { return txt(x) === 'Load' && x.offsetParent !== null; });
    if (b) b.click();
  }, 50);
  var seq = 0, writes = [];
  async function openText(text){
    seq++;
    await T.openViaFakePicker(null, 'barprefix-' + seq + '.sptcal', {text: text, writes: writes});
    await T.sleep(300); await settle();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid'); }, 'month grid ' + seq, 150, 100);
    await settle();
  }
  async function save(){
    var b = $('save-file-btn'), n = writes.length;
    await T.until(function () { return !b.disabled && !b.hasAttribute('data-disabled'); }, 'save enabled', 100, 100);
    b.click();
    await T.until(function () { return writes.length > n; }, 'save write', 100, 100);
    await T.sleep(200);
    return writes[writes.length - 1].text;
  }
  async function toMonth(label){
    var want = Date.parse('1 ' + label);
    for(var i = 0; i < 40; i++){
      var my = txt(document.querySelector('#table-wrap .mv-monthyear'));
      if(my === label) return settle();
      var btn = $(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev');
      if(!btn || btn.disabled) throw new Error('cannot reach ' + label + ' (stuck on ' + my + ')');
      btn.click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  // Every Production bar of every month: its bar text (the first text node), its grey text, and whether it is
  // a one-day half bar (halfInset's margin on a one-column pill).
  async function allBars(){
    var res = [];
    for(var g = 0; g < 60; g++){ var p = $('mv-prev'); if(!p || p.disabled) break; p.click(); await T.sleep(120); }
    await settle();
    for(g = 0; g < 60; g++){
      [].forEach.call(document.querySelectorAll('#table-wrap .mv-pill[data-ph="production"]'), function (el) {
        var one = (+el.style.gridColumnEnd) - (+el.style.gridColumnStart) === 1;
        var half = /margin-(left|right):\s*calc/.test(el.getAttribute('style') || '');
        res.push({bar: ((el.firstChild && el.firstChild.nodeType === 3) ? el.firstChild.nodeValue : '').trim(),
                  grey: txt(el.querySelector('.mv-pill-block')), halfOne: one && half});
      });
      var n = $('mv-next'); if(!n || n.disabled) break; n.click(); await T.sleep(120);
    }
    await settle();
    return res;
  }
  // The month cell of a day, and a point on the Production bar over it.
  function cellOf(iso){
    var my = txt(document.querySelector('#table-wrap .mv-monthyear')), m0 = new Date(Date.parse('1 ' + my + ' UTC'));
    var hit = null;
    [].forEach.call(document.querySelectorAll('#table-wrap .mv-body > .mv-week'), function (wk) {
      var cells = wk.querySelectorAll(':scope > .mv-daygrid > .mv-daycell');
      var k = [].findIndex.call(cells, function (c) { return !c.classList.contains('mv-out'); });
      if(k < 0) return;
      var sunday = Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth(), +txt(cells[k].querySelector('.mv-daynum'))) - k * 86400000;
      [].forEach.call(cells, function (c, i) { if(new Date(sunday + i * 86400000).toISOString().slice(0, 10) === iso) hit = {cell: c, week: wk, col: i}; });
    });
    return hit;
  }
  async function barPoint(iso){
    var m = cellOf(iso);
    if(!m) throw new Error('no cell for ' + iso);
    m.cell.scrollIntoView({block: 'center'}); await T.sleep(250);
    m = cellOf(iso);
    var pill = [].find.call(m.week.querySelectorAll('.mv-pill[data-ph="production"]'), function (p) {
      return +p.style.gridColumnStart - 1 <= m.col && +p.style.gridColumnEnd - 2 >= m.col;
    });
    if(!pill) throw new Error('no Production bar on ' + iso);
    var c = m.cell.getBoundingClientRect(), r = pill.getBoundingClientRect();
    return {x: Math.round(c.left + c.width / 2), y: Math.round(r.top + r.height / 2)};
  }
  // ⛔ HIT-TESTED, as mvmenu's: the event goes to whatever is on top at the point.
  async function rclickBar(iso){
    var p = await barPoint(iso), el = document.elementFromPoint(p.x, p.y);
    var base = {bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 2, buttons: 2};
    el.dispatchEvent(new MouseEvent('mousedown', base));
    el.dispatchEvent(new MouseEvent('contextmenu', base));
    el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, {buttons: 0})));
    await T.sleep(150);
    return el;
  }
  function menu(){ return document.querySelector('.day-menu'); }
  function menuItems(){
    var m = menu();
    return m ? [].map.call(m.querySelectorAll('.day-menu-item'), function (b) {
      return {id: b.getAttribute('data-item'), disabled: b.getAttribute('aria-disabled') === 'true', second: txt(b.querySelector('small')), title: b.getAttribute('title') || ''};
    }) : [];
  }
  function key(k){ (document.activeElement || document).dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true})); }
  function pop(){ return document.querySelector('.barprefix-pop'); }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  async function openPrefix(iso, j){
    await toMonth(MONTHS[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4));   // allBars() leaves the last month up
    await rclickBar(iso);
    var b = menu() && menu().querySelector('[data-item="bar-prefix-' + (j || 0) + '"]');
    if(!b) throw new Error('no Prefix… on ' + iso + ' (' + JSON.stringify(menuItems().map(function (x) { return x.id; })) + ')');
    b.click(); await T.sleep(200);
    if(!pop()) throw new Error('no prefix panel');
  }
  async function typePrefix(v){
    var inp = pop().querySelector('input');
    inp.value = v; inp.dispatchEvent(new Event('input', {bubbles: true}));
    key('Enter'); await settle(); await T.sleep(700);   // past the 500 ms undo debounce
  }
  function undoOff(){ return !!$('undo-btn').disabled; }
  async function undo(){ $('undo-btn').click(); await settle(); }
  async function redo(){ $('redo-btn').click(); await settle(); }
  function defsOf(text, list){ return (JSON.parse(text)[list] || []).map(function (d) { return d.barPrefix === undefined ? null : d.barPrefix; }); }
  function barsOf(bars, re){ return bars.filter(function (b) { return re.test(b.bar); }); }
  function sig(){ var s = T.formSignature(), o = {}; Object.keys(s).sort().forEach(function (k) { o[k] = s[k]; }); return JSON.stringify(o); }

  try {
    await T.appReady();
    await T.until(function () { return !!document.querySelector('#table-wrap .mv-daygrid, #table-wrap table.sheet-table tbody tr'); }, 'restored', 200, 100);
    await settle();
    var fixture = await (await fetch('/tests/fixtures/' + st + '.sptcal', {cache: 'no-store'})).text();
    function asMonth(text, edit){ var o = JSON.parse(text); o.viewMode = 'month'; if(edit) edit(o); return JSON.stringify(o); }

    if(st === 'halfdays'){
      // ---- P0 ----
      await openText(asMonth(fixture));
      var b0 = await allBars();
      var full = b0.filter(function (b) { return !b.halfOne; }), halves = b0.filter(function (b) { return b.halfOne; });
      var fullOk = full.length > 0 && full.every(function (b) { return /^Shoot Ep\. \d+/.test(b.bar); });
      var halfOk = halves.every(function (b) { return /^Ep\. \d+/.test(b.bar); });
      var greyOk = b0.every(function (b) { return !/Shoot/.test(b.grey); });
      await toMonth('July 2026');
      await rclickBar('2026-07-08');
      var hdr = txt(menu() && menu().querySelector('.day-menu-ctx'));
      add('P0', 'No key: every bar "Shoot Ep. N" but a one-day half bar ("Ep. N"); no grey text and no menu header carries "Shoot"',
        fullOk && halfOk && halves.length > 0 && greyOk && /Ep\. 202/.test(hdr) && !/Shoot Ep/.test(hdr),
        {bars: full.length, halves: halves.length, badFull: full.filter(function (b) { return !/^Shoot Ep\./.test(b.bar); }).slice(0, 3),
         badHalf: halves.filter(function (b) { return !/^Ep\./.test(b.bar); }).slice(0, 3), header: hdr}, 'Shoot on every full bar');

      // ---- P1 ----
      var it = menuItems().find(function (x) { return x.id === 'bar-prefix-0'; }) || {};
      var ids = menu() ? menu().querySelectorAll('[id]').length : -1;
      add('P1', 'Prefix… in Ep. 202\'s bar section, second line "“Shoot” before Ep. 202"; no id in the menu',
        !it.disabled && it.second === '“Shoot” before Ep. 202' && ids === 0, {item: it, ids: ids}, '“Shoot” before Ep. 202');
      key('Escape'); await T.sleep(150);

      // ---- P2, P3 ----
      var sig0 = sig(), undoBefore = undoOff();
      await openPrefix('2026-07-08');
      var p = pop(), held = p.querySelector('input').value, popIds = p.querySelectorAll('[id]').length;
      await typePrefix('Pickup');
      var b2 = await allBars();
      var mine = b2.filter(function (b) { return /Ep\. 202\b/.test(b.bar) && !b.halfOne; });
      var others = b2.filter(function (b) { return !/Ep\. 202\b/.test(b.bar) && !b.halfOne; });
      add('P2', 'The panel holds "Shoot" with no id; "Pickup" + Enter: every Ep. 202 bar "Pickup Ep. 202", every other "Shoot Ep. N"; dirty',
        held === 'Shoot' && popIds === 0 && !pop() && mine.length > 0 && mine.every(function (b) { return b.bar === 'Pickup Ep. 202'; }) &&
        others.every(function (b) { return /^Shoot Ep\./.test(b.bar); }) && txt($('save-status')) === 'Unsaved changes',
        {held: held, popIds: popIds, mine: mine.map(function (b) { return b.bar; }).slice(0, 4), others: others.length, status: txt($('save-status'))});
      await undo();
      var u = barsOf(await allBars(), /Ep\. 202\b/).filter(function (b) { return !b.halfOne; }).map(function (b) { return b.bar; });
      var undoEmpty = undoOff();
      await redo();
      var r = barsOf(await allBars(), /Ep\. 202\b/).filter(function (b) { return !b.halfOne; }).map(function (b) { return b.bar; });
      add('P3', 'One undo step: Undo gives "Shoot Ep. 202" and empties the stack, Redo gives "Pickup Ep. 202"',
        undoBefore && undoEmpty && u.length && u.every(function (x) { return x === 'Shoot Ep. 202'; }) && r.every(function (x) { return x === 'Pickup Ep. 202'; }),
        {undoBefore: undoBefore, undoEmpty: undoEmpty, undone: u.slice(0, 2), redone: r.slice(0, 2)});

      // ---- P4 ----
      var sPick = await save();
      var defs = JSON.parse(sPick).episodeDefs, ep202 = defs.findIndex(function (d) { return /202/.test(d.name || ''); });
      var withKey = defs.map(function (d, i) { return 'barPrefix' in d ? i : -1; }).filter(function (i) { return i >= 0; });
      add('P4', 'Save: barPrefix "Pickup" on Ep. 202\'s entry only, and fields.byId as before',
        ep202 >= 0 && defs[ep202].barPrefix === 'Pickup' && eq(withKey, [ep202]) && sig() === sig0, {withKey: withKey, ep202: ep202, sameById: sig() === sig0});

      // ---- P5, P6, P7 ----
      await openPrefix('2026-07-08'); await typePrefix('');
      var blank = barsOf(await allBars(), /Ep\. 202\b/).map(function (b) { return b.bar; });
      var sBlank = await save();
      add('P5', 'Blank: "Ep. 202" on its bars, and the file keeps barPrefix "" on that episode',
        blank.length && blank.every(function (x) { return x === 'Ep. 202'; }) && JSON.parse(sBlank).episodeDefs[ep202].barPrefix === '',
        {bars: blank.slice(0, 2), saved: JSON.parse(sBlank).episodeDefs[ep202].barPrefix});
      await openPrefix('2026-07-08');
      pop().querySelector('.barprefix-reset').click(); await settle(); await T.sleep(700);
      var reset = barsOf(await allBars(), /Ep\. 202\b/).filter(function (b) { return !b.halfOne; }).map(function (b) { return b.bar; });
      var sReset = await save();
      add('P6', 'Reset: "Shoot Ep. 202" again, and the saved episodeDefs equal the untouched file\'s',
        reset.length && reset.every(function (x) { return x === 'Shoot Ep. 202'; }) && eq(JSON.parse(sReset).episodeDefs, JSON.parse(fixture).episodeDefs),
        {bars: reset.slice(0, 2), same: eq(JSON.parse(sReset).episodeDefs, JSON.parse(fixture).episodeDefs)});
      var stackBefore = undoOff();
      $('undo-btn').click(); await settle(); $('redo-btn').click(); await settle();   // put the stack top back where it was
      await openPrefix('2026-07-08');
      pop().querySelector('input').value = 'Nope'; key('Escape'); await settle(); await T.sleep(700);
      var esc = barsOf(await allBars(), /Ep\. 202\b/).filter(function (b) { return !b.halfOne; }).map(function (b) { return b.bar; });
      var sEsc = await save();
      add('P7', 'Escape closes the panel and changes nothing',
        !pop() && esc.every(function (x) { return x === 'Shoot Ep. 202'; }) && eq(JSON.parse(sEsc).episodeDefs, JSON.parse(fixture).episodeDefs),
        {open: !!pop(), bars: esc.slice(0, 2), stackBefore: stackBefore});

      // ---- P8 ----
      await openText(asMonth(sPick));
      var l1 = barsOf(await allBars(), /Ep\. 202\b/).filter(function (b) { return !b.halfOne; }).map(function (b) { return b.bar; });
      await openText(asMonth(fixture));
      var l2 = barsOf(await allBars(), /Ep\. 202\b/).filter(function (b) { return !b.halfOne; }).map(function (b) { return b.bar; });
      add('P8', 'Load: the "Pickup" file shows it; the untouched file loaded after it shows "Shoot" (restore unconditionally)',
        l1.length && l1.every(function (x) { return x === 'Pickup Ep. 202'; }) && l2.every(function (x) { return x === 'Shoot Ep. 202'; }),
        {pickup: l1.slice(0, 2), after: l2.slice(0, 2)});

      // ---- P9 ----
      warns.length = 0;
      await openText(asMonth(fixture, function (o) { o.episodeDefs[0].barPrefix = 5; o.episodeDefs[1].barPrefix = new Array(41).join('x'); }));
      var b9 = await allBars();
      add('P9', 'A number and a 40-character prefix (never written by the app) open on the default, and the validator drops both',
        b9.filter(function (b) { return !b.halfOne; }).every(function (b) { return /^Shoot Ep\./.test(b.bar); }) && warns.some(function (w) { return /2 value\(s\)/.test(w); }),
        {warns: warns.slice(0, 2)});

      // ---- P10 ----
      await openText(asMonth(fixture, function (o) { o.mvProdLabel = 'week'; }));
      await toMonth('July 2026');
      await rclickBar('2026-07-08');
      var w = menuItems().find(function (x) { return x.id === 'bar-prefix'; }) || {};
      add('P10', 'Labelled by Production Week: Prefix… greyed out, with its reason',
        w.disabled === true && /labelled by week/.test(w.title + ' ' + w.second), {item: w});
      key('Escape'); await T.sleep(150);

      // ---- P11 ----
      await openText(asMonth(sPick));
      var spk = T.fakeSavePicker();
      await T.sleep(500);
      $('export-btn').click();
      try { await T.until(function () { return spk.files.length > 0; }, 'the month PDF written', 300, 100); } catch (e) {}
      spk.restore();
      var f = spk.files[0];
      if(f && f.bytes) out.pdf = T.b64(f.bytes.buffer);
      add('P11', 'Export PDF writes the month PDF (gate.sh reads its text)', !!(f && f.bytes && f.bytes.length > 10000), {bytes: f && f.bytes ? f.bytes.length : 0});
    }

    if(st === 'blocks'){
      // ---- B0 ----
      await openText(asMonth(fixture));
      var c0 = await allBars();
      add('B0', 'No key on a Blocks calendar: every block bar "Block N", and no "Shoot" anywhere',
        c0.length > 0 && c0.every(function (b) { return /^Block \d+$/.test(b.bar) && !/Shoot/.test(b.grey); }),
        {bad: c0.filter(function (b) { return !/^Block \d+$/.test(b.bar); }).slice(0, 3)});
      // ---- B1 ----
      await toMonth('July 2026');
      await openPrefix('2026-06-30');
      var held1 = pop().querySelector('input').value;
      await typePrefix('2nd Unit');
      var c1 = await allBars();
      var sB = await save();
      var bk = defsOf(sB, 'blockDefs');
      add('B1', 'Block 1\'s panel holds "" (no default); "2nd Unit" gives "2nd Unit Block 1" and leaves the others bare; saved on Block 1 only',
        held1 === '' && c1.filter(function (b) { return /Block 1$/.test(b.bar); }).every(function (b) { return b.bar === '2nd Unit Block 1'; }) &&
        c1.filter(function (b) { return !/Block 1$/.test(b.bar); }).every(function (b) { return /^Block \d+$/.test(b.bar); }) && eq(bk, ['2nd Unit', null, null, null, null]),
        {held: held1, saved: bk});
      // ---- B2 ----
      await openText(asMonth(sB, function (o) { o.mvProdLabel = 'episode'; }));
      var c2 = await allBars();
      var blk1 = c2.filter(function (b) { return /^2nd Unit /.test(b.bar); }), rest = c2.filter(function (b) { return !/^2nd Unit /.test(b.bar) && !b.halfOne; });
      add('B2', 'Labelled by Episode: Block 1\'s bars "2nd Unit Ep. …", every other block\'s "Shoot Ep. …"',
        blk1.length > 0 && blk1.every(function (b) { return /^2nd Unit Ep\. /.test(b.bar); }) && rest.length > 0 && rest.every(function (b) { return /^Shoot Ep\. /.test(b.bar); }),
        {blk1: blk1.map(function (b) { return b.bar; }).slice(0, 3), rest: rest.map(function (b) { return b.bar; }).slice(0, 3)});
    }

    // P9's validator warning is on purpose, once; anything else is a failure.
    var all = (window.__ERR || []).slice(), mine = all.filter(function (x) { return /value\(s\) in this calendar were not in a form/.test(String(x)); });
    var errs = all.filter(function (x) { return mine.indexOf(x) < 0; });
    add('E0', 'No console errors but P9\'s one validator warning', errs.length === 0 && mine.length === (st === 'halfdays' ? 1 : 0), {errors: errs.slice(0, 5), validator: mine.length}, []);
  } catch (e) {
    out.EX = String(e && e.stack || e);
    add('EX', 'the leg ran to the end', false, out.EX.slice(0, 400), 'no exception');
  }
  clearInterval(guard);
  out.cases = cases;
  T.done(out);
})(); });
