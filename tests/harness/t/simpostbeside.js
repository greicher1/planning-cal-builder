// simpostbeside -- Simultaneous Post's column sits directly right of Production, with Reuse Empty Columns on or
// off, and Production's Swap Column carries it along (owner, 2 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html ./run.sh simpostbeside 1500
//
// The owner's two screenshots, rebuilt: Writer's Rm 4/6/26 20 wks, Pre-Prep 8/3/26 20 wks, Production 8/24/26
// (10 x 8 days), Prod Prep 10/5/26 20 wks, a 2-week hiatus 12/21/26, Sim Post on from Production's first week.
// Prod Prep sits in the column right of Production during Sim Post weeks, which used to send Sim Post to the
// FAR RIGHT (frozen computeBlockLayout's conflict branch). Frozen edit SP1 puts it beside Production instead.
//
//   L1  reuse off (an UNSTAMPED file, the legacy layout): Writer's Rm | Pre-Prep | Production | Sim Post | Prod Prep,
//       five columns as before
//   L2  reuse on (the layout stamp, LAYOUT-RULES.md): Production | Sim Post | Pre-Prep | Prod Prep, four columns --
//       Production in Writers' column, and SP1 pulling the lane beside it past the running Pre-Prep
//   L3  Prod Prep starting BEFORE Production: Sim Post beside Production in both modes
//   L4  the workbook puts Sim Post one column right of Production too (the writers share the layout)
//   L5  the waterfall PDF still exports
//   L6  Sim Post off: no lane, columns as they always were
//   S1  Swap Column on Production, right: Prod Prep | Production | Sim Post (Sim Post moves with it)
//   S2  undo puts it back
//   S3  Swap Column on Production, left: Production | Sim Post | Pre-Prep
//   S4  Pre-Prep's Swap Column, right: trades with Production (beside it), Sim Post follows Production
//   S5  Prod Prep's Swap Column, left: steps over Sim Post's column and trades with Production
//   S6  reuse on, Production right: Pre-Prep | Production | Sim Post | Prod Prep
//   W1  a calendar saved BEFORE SP1 (no simPostBeside): its dragged widths and typed heading move with their
//       columns on Load, and Save writes them in the new order with simPostBeside: true
//   W2  that saved file opens again unmoved
//   W3  the same old positions WITH simPostBeside are taken as they are (never moved twice)
//   T1  Sim Post switched off: the widths and heading follow Prod Prep back one column
//   T2  switched on again: forward again
//   T3  undo of T2 is one step back to T1's
//   E0  no engine errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  var $ = function (id) { return document.getElementById(id); };
  var txt = function (el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; };
  // The unsaved-work guard, when a Load raises it, is the app's own dialog.
  var guard = setInterval(function () {
    var b = [].find.call(document.querySelectorAll('button'), function (x) { return txt(x) === 'Load' && x.offsetParent !== null; });
    if (b) b.click();
  }, 50);
  async function settle(label) {
    var last = '', stable = 0;
    await T.until(function () {
      var s = ($('table-wrap') || {innerHTML: ''}).innerHTML.length + ':' + [].map.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
        function (td) { return td.dataset.pkey + td.dataset.own + td.dataset.week; }).join('');
      stable = (s === last && s) ? stable + 1 : 0; last = s; return stable >= 4;
    }, label, 200, 100);
  }
  // Each phase's own column in 2026, read off the cells' data-own; and the column Sim Post is drawn in, read off
  // its position in the row (it carries no data-own): the slot after the cells before it.
  function cols2026() {
    var by = {};
    [].forEach.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'), function (td) {
      if ((td.dataset.week || '').slice(0, 4) !== '2026' || !td.dataset.pkey) return;
      (by[td.dataset.pkey] = by[td.dataset.pkey] || {})[td.dataset.own] = 1;
    });
    var o = {};
    Object.keys(by).forEach(function (k) { o[k] = Object.keys(by[k]).map(Number).join('/'); });
    return o;
  }
  function simSlotIn(dateText) {
    var res = null;
    [].forEach.call(document.querySelectorAll('#table-wrap table.sheet-table tbody tr'), function (tr) {
      var tds = [].slice.call(tr.children);
      if (!tds.length || txt(tds[0]) !== dateText) return;
      var slot = 0;
      for (var i = 1; i < tds.length; i++) {
        if (tds[i].classList.contains('sheet-note-cell') || /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(txt(tds[i]))) break;
        if (txt(tds[i]).indexOf('Simultaneous Post') === 0) { res = slot; break; }
        slot += +(tds[i].getAttribute('colspan') || 1);
      }
    });
    return res;
  }
  function nCols2026() { return document.querySelectorAll('#table-wrap colgroup col[data-ckey^="y2026:s"]').length; }
  function colPx(key) { var c = document.querySelector('#table-wrap colgroup col[data-ckey="' + key + '"]'); return c ? parseFloat(c.style.width) : null; }
  function heading(key) { return txt(document.querySelector('#table-wrap th.hdrrow-cell[data-hcol="' + key + '"]')); }
  // "Reuse on / off" was the Reuse Empty Columns box until 5 Nov 2026 (LAYOUT-BUILD-PLAN.md §4). It is the
  // layout STAMP now (`colReuse`), which no control sets: a new calendar carries it, a file without it keeps the
  // legacy layout. So the calendar as it stands is saved and loaded back with the key set or removed -- every
  // edit made so far travels in the snapshot, the undo history starts afresh (no case undoes across this).
  var reuseSeq = 0;
  async function reuse(on) {
    var s = await snapshot();
    if (!!s.colReuse === on) return;
    if (on) s.colReuse = true; else delete s.colReuse;
    reuseSeq++;
    await T.openViaFakePicker(null, 'simpostbeside-reuse-' + reuseSeq + '.sptcal', {text: JSON.stringify(s), writes: writes});
    await T.sleep(400); await settle('reuse ' + on);
  }
  async function simPost(on) { var b = $('simpost-enabled'); if (b.checked !== on) { b.click(); await T.sleep(600); await settle('sim post ' + on); } }
  async function snapshot() {
    var cap = T.captureDownload();
    $('share-copy-btn').click();
    await T.until(cap.peek, 'the shareable copy', 200, 100);
    var html = await cap.stop().text();
    var m = html.match(/<script id="saved-state" type="application\/json">([\s\S]*?)<\/script>/);
    return m ? JSON.parse(m[1]) : null;
  }
  function ptr(t, el, x, y, b) {
    el.dispatchEvent(new PointerEvent(t, { bubbles:true, cancelable:true, composed:true,
      clientX:x, clientY:y, button:0, buttons:b, pointerId:7, pointerType:'mouse', isPrimary:true }));
  }
  // Select a whole block through the "Swap Column" hover button, as a user does.
  async function selectBlock(key, weekIso) {
    var td = [].find.call(document.querySelectorAll('#table-wrap td.sheet-phase-cell'),
      function (t) { return t.dataset.pkey === key && t.dataset.week === weekIso; });
    if (!td) return false;
    td.scrollIntoView({ block: 'center' });
    await T.sleep(200);
    var r = td.getBoundingClientRect();
    // Off every cell first: the button is redrawn only when the stint under the pointer CHANGES, and after an
    // undo the pointer may still be "over" the same stint.
    ptr('pointermove', document.body, 1, 1, 0);
    await T.sleep(150);
    ptr('pointermove', td, Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2), 0);
    await T.sleep(450);
    var sb = document.querySelector('.grid-swap-layer .grid-stint-btn');
    if (!sb) return false;
    sb.focus(); sb.click();
    await T.sleep(700);
    return true;
  }
  async function swapBlock(key, weekIso, dir, label) {
    var before = JSON.stringify(cols2026());
    var sel = await selectBlock(key, weekIso);
    if (sel) { T.altSwap(dir); await T.sleep(900); await settle(label); }
    var chip = document.querySelector('.grid-swap-chip');
    return { selected: sel, moved: JSON.stringify(cols2026()) !== before, cols: cols2026(), sim: simSlotIn('10/12/26'), refusal: chip ? txt(chip) : '' };
  }
  async function undo(label) { $('undo-btn').click(); await T.sleep(600); await settle(label); }
  var seq = 0, writes = [];
  async function openText(text) {
    seq++;
    await T.openViaFakePicker(null, 'simpostbeside-' + seq + '.sptcal', {text: text, writes: writes});
    await T.sleep(400); await settle('load ' + seq);
  }
  async function save() {
    var b = $('save-file-btn'), n = writes.length;
    await T.until(function () { return !b.disabled && !b.hasAttribute('data-disabled'); }, 'save enabled', 100, 100);
    b.click();
    await T.until(function () { return writes.length > n; }, 'save write', 100, 100);
    await T.sleep(200);
    return JSON.parse(writes[writes.length - 1].text);
  }
  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    T.set('show-title', 'Beside'); T.set('season-num', '2'); T.set('num-episodes', '10'); T.set('shoot-days-per-ep', '8');
    T.set('union-place', 'us-general');
    T.set('start-writersRoom', '2026-04-06'); T.set('weeks-writersRoom', '20');
    T.set('start-prePrep', '2026-08-03');     T.set('weeks-prePrep', '20');
    T.set('start-production', '2026-08-24');
    T.set('start-prodPrep', '2026-10-05');    T.set('weeks-prodPrep', '20');
    T.addHiatus('2026-12-21', 2);
    await T.sleep(600);
    await simPost(true);
    T.set('simpost-offset', '0');
    await reuse(false); await settle('the calendar');

    // ---- L: the layout ---------------------------------------------------------------------------
    var c = cols2026(), sim = simSlotIn('10/12/26');
    add('L1', 'reuse off: Writer\'s Rm | Pre-Prep | Production | Sim Post | Prod Prep (five columns, as before)',
      c.writersRoom === '0' && c.prePrep === '1' && c.production === '2' && sim === 3 && c.prodPrep === '4' && nCols2026() === 5,
      {cols: c, sim: sim, nCols: nCols2026()}, 'production 2, Sim Post 3, Prod Prep 4, 5 columns');
    await reuse(true);
    c = cols2026(); sim = simSlotIn('10/12/26');
    add('L2', 'reuse on: Production | Sim Post | Pre-Prep | Prod Prep (four columns, as before)',
      c.production === '0' && sim === 1 && c.prePrep === '2' && c.prodPrep === '3' && nCols2026() === 4,
      {cols: c, sim: sim, nCols: nCols2026()}, 'production 0, Sim Post 1, Pre-Prep 2, Prod Prep 3');
    T.set('start-prodPrep', '2026-08-10'); await T.sleep(500); await settle('prod prep early, reuse on');
    var l3on = {cols: cols2026(), sim: simSlotIn('10/12/26')};
    await reuse(false);
    var l3off = {cols: cols2026(), sim: simSlotIn('10/12/26')};
    add('L3', 'Prod Prep starting before Production: Sim Post beside Production in both modes',
      l3on.sim === +l3on.cols.production + 1 && l3off.sim === +l3off.cols.production + 1, {on: l3on, off: l3off}, 'Sim Post = Production + 1');
    T.set('start-prodPrep', '2026-10-05'); await T.sleep(500); await settle('prod prep back');

    await T.until(function () { return typeof window.ExcelJS !== 'undefined'; }, 'ExcelJS', 300, 100);
    var xb = await T.captureExport('export-btn', 'the .xlsx blob');
    var wb = new window.ExcelJS.Workbook();
    await wb.xlsx.load(await xb.arrayBuffer());
    var xl = {};
    wb.worksheets[0].eachRow(function (row) { row.eachCell(function (cell) {
      if (cell.isMerged && cell.master && cell.master.address !== cell.address) return;
      var v = cell.value; if (v && typeof v === 'object' && v.richText) v = v.richText.map(function (r) { return r.text; }).join('');
      if (typeof v !== 'string') return;
      if (v === 'Production wk 8') xl.prod = {row: cell.row, col: cell.col};
      if (v === 'Prod Prep wk 2') xl.prodPrep = {row: cell.row, col: cell.col};
      if (v.indexOf('Simultaneous Post') === 0 && xl.prod && cell.row === xl.prod.row) xl.sim = {row: cell.row, col: cell.col};
    }); });
    add('L4', 'the workbook: Sim Post one column right of Production, Prod Prep one past it',
      !!xl.prod && !!xl.sim && !!xl.prodPrep && xl.sim.col === xl.prod.col + 1 && xl.prodPrep.col === xl.prod.col + 2, xl, 'sim = prod + 1, prod prep = prod + 2');
    var pdfErr = null, pb = null;
    try { await T.sleep(700); pb = await T.captureExport('export-wf-pdf-btn', 'the waterfall PDF'); } catch (e) { pdfErr = String(e && e.message || e); }
    add('L5', 'the waterfall PDF still exports', !pdfErr && pb && pb.size > 1000, {bytes: pb && pb.size, err: pdfErr}, '> 1000 bytes');
    await simPost(false);
    c = cols2026();
    add('L6', 'Sim Post off: no lane, columns as they always were',
      c.writersRoom === '0' && c.prePrep === '1' && c.production === '2' && c.prodPrep === '3' && nCols2026() === 4 && simSlotIn('10/12/26') === null,
      {cols: c, nCols: nCols2026()}, 'production 2, Prod Prep 3, 4 columns');
    await simPost(true);

    // ---- S: Swap Column on Production carries Sim Post -------------------------------------------
    var s1 = await swapBlock('production', '2026-08-24', 1, 'swap production right');
    add('S1', 'Production\'s Swap Column, right: Prod Prep | Production | Sim Post',
      s1.selected && s1.cols.prodPrep === '2' && s1.cols.production === '3' && s1.sim === 4 && s1.cols.prePrep === '1' && nCols2026() === 5, s1,
      'prodPrep 2, production 3, Sim Post 4');
    if (s1.moved) await undo('undo S1');
    c = cols2026(); sim = simSlotIn('10/12/26');
    add('S2', 'undo puts it back', c.production === '2' && sim === 3 && c.prodPrep === '4', {cols: c, sim: sim}, 'production 2, Sim Post 3, Prod Prep 4');
    var s3 = await swapBlock('production', '2026-08-24', -1, 'swap production left');
    add('S3', 'Production\'s Swap Column, left: Production | Sim Post | Pre-Prep',
      s3.selected && s3.cols.production === '1' && s3.sim === 2 && s3.cols.prePrep === '3' && s3.cols.prodPrep === '4', s3,
      'production 1, Sim Post 2, prePrep 3');
    if (s3.moved) await undo('undo S3');
    var s4 = await swapBlock('prePrep', '2026-08-03', 1, 'swap pre-prep right');
    add('S4', 'Pre-Prep\'s Swap Column, right: trades with Production, Sim Post follows Production',
      s4.selected && s4.cols.production === '1' && s4.sim === 2 && s4.cols.prePrep === '3', s4, 'production 1, Sim Post 2, prePrep 3');
    if (s4.moved) await undo('undo S4');
    var s5 = await swapBlock('prodPrep', '2026-10-05', -1, 'swap prod prep left');
    add('S5', 'Prod Prep\'s Swap Column, left: steps over Sim Post and trades with Production',
      s5.selected && s5.cols.prodPrep === '2' && s5.cols.production === '3' && s5.sim === 4, s5, 'prodPrep 2, production 3, Sim Post 4');
    if (s5.moved) await undo('undo S5');
    await reuse(true);
    var s6 = await swapBlock('production', '2026-08-24', 1, 'reuse on: swap production right');
    add('S6', 'reuse on, Production right: Pre-Prep | Production | Sim Post | Prod Prep',
      s6.selected && s6.cols.prePrep === '0' && s6.cols.production === '1' && s6.sim === 2 && s6.cols.prodPrep === '3' && nCols2026() === 4, s6,
      'prePrep 0, production 1, Sim Post 2, prodPrep 3');
    if (s6.moved) await undo('undo S6');
    await reuse(false);

    // ---- W: a calendar saved before SP1 ----------------------------------------------------------
    var base = await snapshot();
    out.baseHasMarker = 'simPostBeside' in base;
    var old = JSON.parse(JSON.stringify(base));
    delete old.simPostBeside;
    // The OLD order: Prod Prep was s3 and Sim Post's lane the far right, s4.
    old.colWidths = Object.assign({}, old.colWidths || {}, {'y2026:s3': 30, 'y2026:s4': 9});
    old.headerRowLabels = {'y2026:s3': 'Next Season'};
    await openText(JSON.stringify(old));
    var w1 = {wProdPrep: colPx('y2026:s4'), wLane: colPx('y2026:s3'), wProd: colPx('y2026:s2'), headS4: heading('y2026:s4'), cols: cols2026(), sim: simSlotIn('10/12/26')};
    var saved = await save();
    w1.saved = {marker: saved.simPostBeside, widths: saved.colWidths, labels: saved.headerRowLabels};
    add('W1', 'an old file\'s width and heading move with Prod Prep to its new column; Save writes the new order',
      w1.cols.prodPrep === '4' && w1.wProdPrep > w1.wProd && w1.wLane < w1.wProd && w1.headS4 === 'Next Season'
        && saved.simPostBeside === true && saved.colWidths && saved.colWidths['y2026:s4'] === 30 && saved.colWidths['y2026:s3'] === 9
        && saved.headerRowLabels && saved.headerRowLabels['y2026:s4'] === 'Next Season' && !('y2026:s3' in saved.headerRowLabels),
      w1, 'Prod Prep (s4) 30 wide and "Next Season"; the lane (s3) 9; saved {s3: 9, s4: 30}, simPostBeside: true');
    await openText(JSON.stringify(saved));
    var w2 = {wProdPrep: colPx('y2026:s4'), wLane: colPx('y2026:s3'), headS4: heading('y2026:s4')};
    add('W2', 'the saved file opens again unmoved', w2.wProdPrep === w1.wProdPrep && w2.wLane === w1.wLane && w2.headS4 === 'Next Season', w2, 'as W1');
    var marked = JSON.parse(JSON.stringify(old)); marked.simPostBeside = true;
    await openText(JSON.stringify(marked));
    var w3 = {s3: colPx('y2026:s3'), s4: colPx('y2026:s4'), headS3: heading('y2026:s3')};
    add('W3', 'with simPostBeside the positions are taken as they are', w3.s3 > w3.s4 && w3.headS3 === 'Next Season', w3, 's3 wider than s4, heading on s3');

    // ---- T: the Sim Post switch ------------------------------------------------------------------
    await openText(JSON.stringify(saved));
    await simPost(false);
    var t1 = await snapshot();
    add('T1', 'Sim Post off: the width and heading follow Prod Prep back to s3 (the lane\'s width waits at s4)',
      cols2026().prodPrep === '3' && t1.colWidths && t1.colWidths['y2026:s3'] === 30 && t1.colWidths['y2026:s4'] === 9
        && t1.headerRowLabels && t1.headerRowLabels['y2026:s3'] === 'Next Season' && !('simPostBeside' in t1),
      {cols: cols2026(), widths: t1.colWidths, labels: t1.headerRowLabels, marker: t1.simPostBeside}, '{s3: 30, s4: 9}, heading on s3, no marker');
    await simPost(true);
    var t2 = await snapshot();
    add('T2', 'Sim Post on again: forward again',
      cols2026().prodPrep === '4' && t2.colWidths['y2026:s4'] === 30 && t2.colWidths['y2026:s3'] === 9 && t2.headerRowLabels['y2026:s4'] === 'Next Season' && t2.simPostBeside === true,
      {cols: cols2026(), widths: t2.colWidths, labels: t2.headerRowLabels}, '{s3: 9, s4: 30}, heading on s4');
    await undo('undo T2');
    var t3 = await snapshot();
    add('T3', 'one undo is T1 again', $('simpost-enabled').checked === false && t3.colWidths['y2026:s3'] === 30 && t3.colWidths['y2026:s4'] === 9,
      {on: $('simpost-enabled').checked, widths: t3.colWidths}, 'off, {s3: 30, s4: 9}');
    add('E0', 'no engine errors', !(window.__ERR || []).length, (window.__ERR || []).slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  clearInterval(guard);
  T.done({test: 'simpostbeside', cases: cases, out: out, err: (window.__ERR || []).slice(0, 10)});
})(); });
