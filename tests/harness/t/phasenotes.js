// phasenotes -- NOTES LINKED TO A PHASE, step 1: the store and the placement (PHASE-LINKED-NOTES-PLAN.md §6 step 1;
// rulings R1-R9 by the owner's pickers, 5 Nov 2026, every one the recommendation). A linked note is stored as its LINK,
// phaseNotes['<phase>@<n>'] (n = the phase's own working-week count) or phaseNotes['production@day<n>'] (its n-th shoot
// day, R4(b)), and computeSchedule works out where it is drawn every run, so every way of moving a phase carries it
// with no code in any mover. Step 1 has no UI: the links come from the file.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=phasenotes ./run.sh phasenotes 900
//
// tests/fixtures/phasenotes.sptcal (synthetic, US General) is wfkeys.sptcal plus five linked notes:
//   production@2      "Stunt rehearsal", size 9, height 60   -> Production wk 2 (7/6/26), a week with no typed note
//   production@6      "Visitor", #FF0000                       -> Production wk 6 (8/3/26), under the typed "Table read"
//   production@day10  "Day ten"                                -> the 10th shoot day, Mon 7/13/26 (Fri 7/3 is a holiday)
//   prodPrep@3        "Tech scout", Wed (dow 2), #00B0F0      -> Prod Prep wk 3 (6/1/26), drawn "Tech scout 6/3/26"
//   post@1            a long line, bold                        -> Post wk 1 (11/2/26)
// and wfkeys' own typed notes, which are NOT linked: 8/3 "Table read" (#FFC000, size 9, bold+italic), 8/10 two lines,
// 9/7 "Wrap party 9/10/26" (pinned), 9/14 "Blocker".
//
//   P1  each linked note is drawn in its phase week's Notes cell; the typed notes are where they were
//   L1  its look travels (R7(a)): Tech scout's cell is #00B0F0 and Stunt rehearsal's row is 60 px; Post kickoff is
//       bold; 8/3's typed note keeps its own look (#FFC000) with Visitor under it (R2(a): the note that stayed owns it)
//   M1  typing Production's start two weeks later carries Production's linked notes (Day ten to the 10th shoot day,
//       7/24, not +14 days) and leaves Prod Prep's, Post's and every typed note; U1 one undo puts it back
//   M2  Build Around (Production pinned to 7/13, Both): Prod Prep's note follows Prod Prep too
//   M3  ▼ on Production's card (one week later): Production's notes follow; the typed notes stay (▲ / ▼ carries no
//       typed note)
//   M4  the Shift form, All phases +1 wk: every linked note moves exactly ONE week (never twice), as the typed ones
//   M5  the Shift form, Phase & after Production +1 wk: Production's and Post's notes move, Prod Prep's stays
//   M6  an all-phase hiatus on 6/29: Production's working weeks start a week later, and so do its notes; Day ten is
//       7/17 (the shoot starts 7/6, and 7/3's holiday falls in the hiatus)
//   M7  Production's own hiatus on 7/6: wk 2 is 7/13, Day ten is 7/20
//   M8  the Region to None: 7/3 becomes a shoot day, so Day ten is 7/10 (R4(b)); the weeks stay
//   X1  the workbook: every linked line in its Notes cell, Tech scout's cell filled #00B0F0
//   X2  the waterfall PDF draws the linked lines
//   W1  the long linked line widens its year's Notes column, as a typed one does
//   E1  the waterfall note editor: opened and committed unchanged, nothing is written; a linked line renamed in place
//       renames its note (a dated one's date taken out); one taken out deletes it; a line added becomes the week's own
//   C1  a custom phase removed: its linked note becomes a plain note where it was drawn, its look with it; undo links it
//   F1  Save writes phaseNotes, keys sorted, fields in their fixed order, no linked line in userNotes, no new field id
//   F1b the linked note's row height stays out of the file's legacy rowHeights: after Save, Load and a move, the height
//       is on the note's new week only (the row-height migration must not bake it onto the old one)
//   F2  an older file (no key) opens with no linked note: the previous calendar's never leak through
//   F3  hostile entries are dropped and counted; a bad field is dropped and its note kept; nothing reaches a prototype
//   E0  no console errors, apart from F3's repair warning
//
// ⛔ No dollar sign anywhere in this file (srv.js splices legs in with String.replace).
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, out = { test: 'phasenotes', cases: [] };
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
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  async function settle() {
    await T.sleep(700);                                  // past the 500 ms undo debounce
    var last = -1, st = 0;
    await T.until(function () {
      var n = (byId('table-wrap') || { innerHTML: '' }).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3;
    }, 'the grid to settle', 150, 100);
  }
  function closePops(){ T.closePops(); }   // presses an open tool panel's ✕ (no click-away since 11 Nov 2026)

  // ---- the waterfall ------------------------------------------------------------------------------------------------
  function noteTd(wk) { return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  function cellLines(wk) { var t = noteTd(wk); return t ? (t.innerText || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean) : null; }
  // The week whose phase cell reads `label` ("Production wk 2"), from the cell's own data-week.
  function weekOf(label) {
    var td = qa('#table-wrap td[data-week]').filter(function (x) { return !x.classList.contains('sheet-note-cell') && (x.innerText || '').trim() === label; })[0];
    return td ? td.dataset.week : null;
  }
  // Every week whose Notes cell holds a line containing `s`.
  function weeksWith(s) {
    return qa('#table-wrap td.sheet-note-cell[data-week]').filter(function (td) {
      return (td.innerText || '').split('\n').some(function (l) { return l.indexOf(s) !== -1; });
    }).map(function (td) { return td.dataset.week; });
  }
  function where() {
    return { stunt: weeksWith('Stunt rehearsal'), visitor: weeksWith('Visitor'), dayten: weeksWith('Day ten'),
             scout: weeksWith('Tech scout'), kickoff: weeksWith('Post kickoff'),
             table: weeksWith('Table read'), cast: weeksWith('Cast fittings'), wrap: weeksWith('Wrap party'), blocker: weeksWith('Blocker') };
  }
  function line(s) {   // the full drawn line holding `s`, wherever it is
    var hit = null;
    qa('#table-wrap td.sheet-note-cell[data-week]').forEach(function (td) {
      (td.innerText || '').split('\n').forEach(function (l) { if (!hit && l.indexOf(s) !== -1) hit = l.trim(); });
    });
    return hit;
  }
  function bg(wk) { var t = noteTd(wk); return t ? getComputedStyle(t).backgroundColor : null; }
  function rowH(wk) { var t = noteTd(wk), tr = t && t.closest('tr'); return tr ? tr.style.height : null; }
  function weightOf(wk) {
    var t = noteTd(wk); if (!t) return null;
    var b = t.querySelector('.cell-body') || t;
    return getComputedStyle(b).fontWeight;
  }
  var TYPED0 = { table: ['2026-08-03'], cast: ['2026-08-10'], wrap: ['2026-09-07'], blocker: ['2026-09-14'] };
  function typedSame(w) { return same(w.table, TYPED0.table) && same(w.cast, TYPED0.cast) && same(w.wrap, TYPED0.wrap) && same(w.blocker, TYPED0.blocker); }

  // ---- Save and Load through the real controls ----------------------------------------------------------------------
  var written = [];
  var saveHandle = { name: 'phasenotes.sptcal', kind: 'file',
    queryPermission: async function () { return 'granted'; }, requestPermission: async function () { return 'granted'; },
    isSameEntry: async function (o) { return o === saveHandle; },
    getFile: async function () { return new File([written.length ? written[written.length - 1] : ''], 'phasenotes.sptcal', { lastModified: 1 }); },
    createWritable: async function () { var parts = []; return { write: async function (c) { parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function () { written.push(parts.join('')); } }; } };
  async function save() {
    var n = written.length;
    window.showSaveFilePicker = async function () { return saveHandle; };
    await T.until(function () { return !byId('save-file-btn').disabled; }, 'the Save button', 60, 100);
    byId('save-file-btn').click();
    await T.until(function () { return written.length > n; }, 'the Save write', 100, 100);
    await T.sleep(300);
    var w = written[written.length - 1];
    return typeof w === 'string' ? w : w.text;
  }
  var loads = 0;
  function menuLabel() { return ((byId('file-menu-label') || {}).textContent || '').trim(); }
  // Load through File > Load, answering the unsaved-work guard. A Load straight after a toolbar tool can be slow to
  // raise the guard (seen once after the Shift form), so it waits longer for it and tries once more if the file's name
  // never reaches the menu.
  async function load(text) {
    for (var attempt = 0; attempt < 2; attempt++) {
      closePops();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await T.sleep(200);
      var stem = 'phasenotes-load-' + (++loads), name = stem + '.sptcal';
      var p = T.openViaFakePicker('/x.sptcal', name, { text: text, writes: written });
      for (var i = 0; i < 80; i++) { await T.sleep(100); if (T.clickModalButton('Load') || menuLabel().indexOf(stem) !== -1) break; }
      await p;
      try {
        await T.until(function () { return menuLabel().indexOf(stem) !== -1; }, 'the loaded file\'s name in the file menu', 100, 100);
        await settle();
        return;
      } catch (e) { if (attempt) throw e; }
    }
  }
  function repairWarnings() { return (T.appHealth().errors || []).filter(function (e) { return /were not in a form the app writes/.test(String(e)); }).length; }
  async function undo() { byId('undo-btn').click(); await settle(); }

  // ---- the editor ---------------------------------------------------------------------------------------------------
  async function openWf(wk) {
    var td = noteTd(wk); if (!td) throw new Error('no note cell for ' + wk);
    td.scrollIntoView({ block: 'center' }); await T.sleep(100);
    T.openCell(td); await T.sleep(300);
    var pop = q('.note-pop'); if (!pop) throw new Error('the note editor did not open on ' + wk);
    return pop;
  }
  async function commitWf(pop, text) {
    var ta = q('textarea', pop);
    if (text !== undefined) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await settle();
  }

  // ---- the movers ---------------------------------------------------------------------------------------------------
  async function shiftForm(move, phase, weeks) {
    closePops(); await T.sleep(150);
    byId('pop-shift-btn').click(); await T.sleep(300);
    // The Shift box lists the phases first (9 Nov 2026): it opens with every phase ticked (the old All phases), and
    // "After X" ticks X and every phase after it (the old Phase & after).
    if (move === 'after') await T.shiftSide('after', phase);
    T.set('tool-shift-weeks', String(weeks)); await T.sleep(150);
    byId('tool-shift-later').click(); await settle();
    closePops();
  }
  async function waitModal(re, polls) {
    for (var i = 0; i < (polls || 30); i++) { await T.sleep(100); var t = T.modalText(); if (re.test(t)) return t; }
    return '';
  }

  try {
    try { localStorage.clear(); } catch (e) {}
    await T.appReady();
    await T.until(function () { return !!noteTd('2026-09-14') && (cellLines('2026-09-14') || []).join() === 'Blocker'; }, 'the fixture', 200, 100);
    await settle();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var w0 = repairWarnings();
    var S0text = await save(), S0 = JSON.parse(S0text);

    // ===== P1: where each is drawn =====================================================================================
    var W0 = where();
    await step('P1', async function () {
      var wk = { p2: weekOf('Production wk 2'), p6: weekOf('Production wk 6'), pp3: weekOf('Prod Prep wk 3'), post1: weekOf('Post wk 1') };
      kase('P1', 'each linked note is in its phase week\'s Notes cell (Production wk 2 7/6, wk 6 8/3 under "Table read", Day 10 7/13, Prod Prep wk 3 6/1 dated Wed, Post wk 1 11/2); the typed notes are where they were; the file loaded clean',
        same(wk, { p2: '2026-07-06', p6: '2026-08-03', pp3: '2026-06-01', post1: '2026-11-02' })
          && same(W0.stunt, [wk.p2]) && same(W0.visitor, [wk.p6]) && same(W0.dayten, ['2026-07-13']) && same(W0.scout, [wk.pp3]) && same(W0.kickoff, [wk.post1])
          && same(cellLines('2026-08-03'), ['Table read', 'Visitor']) && same(cellLines('2026-07-06'), ['Stunt rehearsal'])
          && line('Tech scout') === 'Tech scout 6/3/26' && line('Day ten') === 'Day ten 7/13/26' && typedSame(W0) && repairWarnings() === w0,
        { weeks: wk, where: W0, c83: cellLines('2026-08-03'), scout: line('Tech scout'), dayten: line('Day ten'), warnings: repairWarnings() - w0 });
    });

    // ===== L1: the look travels ========================================================================================
    await step('L1', async function () {
      var o = { scout: bg('2026-06-01'), table: bg('2026-08-03'), stuntRow: rowH('2026-07-06'), kickoffWeight: weightOf('2026-11-02'),
                plainRow: rowH('2026-08-17'), plainWeight: weightOf('2026-08-10') };
      kase('L1', 'Tech scout\'s cell wears its own #00B0F0, Stunt rehearsal\'s row is its 60 px, Post kickoff is bold; 8/3 keeps "Table read"\'s own #FFC000 with Visitor (red) under it',
        o.scout === 'rgb(0, 176, 240)' && o.table === 'rgb(255, 192, 0)' && o.stuntRow === '60px' && +o.kickoffWeight >= 700 && o.plainRow !== '60px' && +o.plainWeight < 700, o);
    });

    // ===== M1, U1: typing Production's start ===========================================================================
    await step('M1', async function () {
      T.set('start-production', '2026-07-13'); await settle();
      var w = where(), o = { where: w, dayten: line('Day ten'), p2: weekOf('Production wk 2'), c720: cellLines('2026-07-20'),
                             bg817: bg('2026-08-17'), rh720: rowH('2026-07-20'), rh76: rowH('2026-07-06') };
      kase('M1', 'Production typed two weeks later: Stunt rehearsal to wk 2 (7/20), Visitor to wk 6 (8/17), Day ten to the 10th shoot day (Fri 7/24, not +14 days); Tech scout, Post kickoff and every typed note stay',
        o.p2 === '2026-07-20' && same(w.stunt, ['2026-07-20']) && same(w.visitor, ['2026-08-17']) && o.dayten === 'Day ten 7/24/26' && same(w.dayten, ['2026-07-20'])
          && same(o.c720, ['Stunt rehearsal', 'Day ten 7/24/26']) && same(w.scout, W0.scout) && same(w.kickoff, W0.kickoff) && typedSame(w)
          && o.bg817 === 'rgb(255, 0, 0)' && o.rh720 === '60px' && o.rh76 !== '60px', o);
      await undo();
      var u = where();
      kase('U1', 'one undo puts Production and its linked notes back (wk 2 7/6, Day ten 7/13, Visitor 8/3)',
        byId('start-production').value === '2026-06-29' && same(u, W0), { start: byId('start-production').value, where: u });
    });

    // ===== M2: Build Around ============================================================================================
    await step('M2', async function () {
      closePops(); await T.sleep(150);
      byId('pop-solve-btn').click(); await T.sleep(400);
      T.set('tool-solve-phase', 'production'); await T.sleep(450);
      T.set('tool-solve-date', '2026-07-13'); await T.sleep(450);
      byId('tool-solve-go').click(); await settle(); closePops();
      var w = where(), o = { where: w, prodPrep: byId('start-prodPrep').value, production: byId('start-production').value, scout: line('Tech scout') };
      kase('M2', 'Build Around (Production pinned to 7/13, Both): Prod Prep two weeks later carries Tech scout to its wk 3 (6/15, "6/17/26"); Production\'s notes as typed-start; typed notes stay',
        o.production === '2026-07-13' && o.prodPrep === '2026-06-01' && same(w.scout, ['2026-06-15']) && o.scout === 'Tech scout 6/17/26'
          && same(w.stunt, ['2026-07-20']) && same(w.dayten, ['2026-07-20']) && typedSame(w), o);
      await load(S0text);
    });

    // ===== M3: ▼ on Production's card ==================================================================================
    await step('M3', async function () {
      var b = byId('swatch-production').parentElement.querySelector('.ph-nudge-btn[data-nudge="1"]');
      if (!b) throw new Error('no ▼ on Production');
      b.click(); await T.sleep(1500); await settle();
      var w = where(), o = { where: w, start: byId('start-production').value, dayten: line('Day ten') };
      kase('M3', '▼ on Production\'s card: Production a week later, Stunt rehearsal to 7/13, Day ten to 7/17 (its 10th shoot day), Visitor to 8/10; Prod Prep\'s note and every typed note stay',
        o.start === '2026-07-06' && same(w.stunt, ['2026-07-13']) && o.dayten === 'Day ten 7/17/26' && same(w.visitor, ['2026-08-10'])
          && same(w.scout, W0.scout) && typedSame(w), o);
      await load(S0text);
    });

    // ===== M4, M5: the Shift form =======================================================================================
    await step('M4', async function () {
      await shiftForm('all', null, 1);
      var w = where(), o = { where: w, scout: line('Tech scout'), dayten: line('Day ten') };
      kase('M4', 'Shift, All phases +1 wk: every linked note exactly one week later (never two) -- Stunt 7/13, Day ten 7/17, Tech scout 6/8 "6/10/26", Visitor 8/10 (under Table read, moved there too), Post kickoff 11/9 -- and the typed notes a week later but the pinned one',
        same(w.stunt, ['2026-07-13']) && o.dayten === 'Day ten 7/17/26' && same(w.scout, ['2026-06-08']) && o.scout === 'Tech scout 6/10/26'
          && same(w.visitor, ['2026-08-10']) && same(cellLines('2026-08-10'), ['Table read', 'Visitor']) && same(w.kickoff, ['2026-11-09'])
          && same(w.table, ['2026-08-10']) && same(w.cast, ['2026-08-17']) && same(w.wrap, ['2026-09-07']), o);
      await load(S0text);
    });
    await step('M5', async function () {
      await shiftForm('after', 'production', 1);
      var w = where(), o = { where: w, prodPrep: byId('start-prodPrep').value, production: byId('start-production').value };
      kase('M5', 'Shift, Phase & after Production +1 wk: Production\'s and Post\'s notes a week later, Prod Prep\'s Tech scout stays on 6/1',
        o.production === '2026-07-06' && o.prodPrep === '2026-05-18' && same(w.stunt, ['2026-07-13']) && same(w.kickoff, ['2026-11-09']) && same(w.scout, W0.scout), o);
      await load(S0text);
    });

    // ===== M6, M7: hiatuses ============================================================================================
    await step('M6', async function () {
      T.addHiatus('2026-06-29', 1); await settle();
      var w = where(), o = { where: w, p2: weekOf('Production wk 2'), dayten: line('Day ten') };
      kase('M6', 'an all-phase hiatus on 6/29: Production\'s wk 2 is 7/13 and Stunt rehearsal with it; Day ten 7/17 (the shoot starts 7/6, and 7/3\'s holiday is in the hiatus); the typed notes stay',
        o.p2 === '2026-07-13' && same(w.stunt, ['2026-07-13']) && o.dayten === 'Day ten 7/17/26' && typedSame(w) && same(w.scout, W0.scout), o);
      await load(S0text);
    });
    await step('M7', async function () {
      var en = byId('phiatus-en-production'); if (!en.checked) en.click();
      await T.sleep(400);
      T.set('phiatus-weeks-production', '1');
      T.set('phiatus-start-production', '2026-07-06'); await settle();
      var w = where(), o = { where: w, p2: weekOf('Production wk 2'), dayten: line('Day ten') };
      kase('M7', 'Production\'s own hiatus on 7/6: its wk 2 is 7/13, Stunt rehearsal with it, Day ten 7/20; the typed notes stay',
        o.p2 === '2026-07-13' && same(w.stunt, ['2026-07-13']) && o.dayten === 'Day ten 7/20/26' && typedSame(w), o);
      await load(S0text);
    });

    // ===== M8: the Region ==============================================================================================
    await step('M8', async function () {
      T.set('union-place', '');
      var asked = await waitModal(/Continue\?/, 40);
      if (asked) T.clickModalButton('Continue');
      await settle();
      var w = where(), o = { asked: !!asked, place: byId('union-place').value, where: w, dayten: line('Day ten'), c76: cellLines('2026-07-06') };
      kase('M8', 'the Region to None (asked, Continue): Fri 7/3 is a shoot day now, so Day ten is Fri 7/10 and joins Stunt rehearsal in 7/6\'s cell; the weeks stay',
        o.place === '' && o.dayten === 'Day ten 7/10/26' && same(o.c76, ['Stunt rehearsal', 'Day ten 7/10/26']) && same(w.visitor, W0.visitor) && typedSame(w), o);
      await load(S0text);
    });

    // ===== X1, X2: the exports =========================================================================================
    await step('X1', async function () {
      await T.sleep(700);
      var b = await T.captureExport('export-btn', 'phasenotes-xlsx');
      var wb = new ExcelJS.Workbook(); await wb.xlsx.load(await b.arrayBuffer());
      var vals = [], scoutFill = null;
      wb.worksheets[0].eachRow({ includeEmpty: false }, function (row) {
        row.eachCell({ includeEmpty: false }, function (c) {
          if (typeof c.value !== 'string') return;
          vals.push(c.value);
          if (c.value === 'Tech scout 6/3/26') scoutFill = c.fill && c.fill.fgColor ? c.fill.fgColor.argb : null;
        });
      });
      var has = function (s) { return vals.indexOf(s) !== -1; };
      kase('X1', 'the workbook carries every linked line in its Notes cell ("Table read\\nVisitor" one cell), and Tech scout\'s cell is filled 00B0F0',
        has('Stunt rehearsal') && has('Day ten 7/13/26') && has('Tech scout 6/3/26') && has('Table read\nVisitor') && has('Post kickoff with editorial and the network team')
          && /00B0F0/i.test(String(scoutFill)),
        { found: vals.filter(function (v) { return /Stunt|Day ten|Tech scout|Visitor|kickoff/.test(v); }), scoutFill: scoutFill });
    });
    await step('X2', async function () {
      await T.sleep(700);
      var b = await T.captureExport('export-wf-pdf-btn', 'phasenotes-pdf');
      var runs = await T.pdfRuns(new Uint8Array(await b.arrayBuffer()));
      var has = function (s) { return runs.some(function (r) { return r.indexOf(s) !== -1; }); };
      kase('X2', 'the waterfall PDF draws the linked lines',
        has('Stunt rehearsal') && has('Day ten 7/13/26') && has('Tech scout 6/3/26') && has('Visitor') && has('Post kickoff'),
        { found: runs.filter(function (r) { return /Stunt|Day ten|Tech scout|Visitor|kickoff/.test(r); }).slice(0, 12) });
    });

    // ===== W1: the Notes width =========================================================================================
    await step('W1', async function () {
      var wide = noteTd('2026-11-02').getBoundingClientRect().width;
      var s = JSON.parse(S0text); delete s.phaseNotes['post@1'];
      await load(JSON.stringify(s));
      var narrow = noteTd('2026-11-02').getBoundingClientRect().width;
      kase('W1', 'the long linked line widens its year\'s Notes column (measured against the same calendar without it)',
        wide > narrow + 20, { wide: wide, narrow: narrow });
      await load(S0text);
    });

    // ===== E1: the waterfall note editor ===============================================================================
    await step('E1', async function () {
      var pop = await openWf('2026-07-06');
      var box0 = q('textarea', pop).value;
      await commitWf(pop);
      var s1 = JSON.parse(await save());
      var a = { box: box0, own: s1.userNotes['2026-07-06'] || null, note: s1.phaseNotes['production@2'] };
      pop = await openWf('2026-07-06'); await commitWf(pop, 'Stunt rehearsal B');
      pop = await openWf('2026-06-01'); await commitWf(pop, 'Tech survey 6/3/26');
      pop = await openWf('2026-08-03'); await commitWf(pop, 'Table read');
      pop = await openWf('2026-07-13'); await commitWf(pop, 'Day ten 7/13/26\nCatering');
      var s2 = JSON.parse(await save());
      var b = { p2: s2.phaseNotes['production@2'], pp3: s2.phaseNotes['prodPrep@3'], p6: s2.phaseNotes['production@6'] || null, d10: s2.phaseNotes['production@day10'],
                own76: s2.userNotes['2026-07-06'] || null, own61: s2.userNotes['2026-06-01'] || null, own83: s2.userNotes['2026-08-03'], own713: s2.userNotes['2026-07-13'],
                c713: cellLines('2026-07-13'), c83: cellLines('2026-08-03'), c76: cellLines('2026-07-06'), c61: cellLines('2026-06-01') };
      kase('E1', 'the editor opens on the linked line and, committed unchanged, writes nothing; renamed in place it renames its note (Tech scout\'s date taken out, its Wed kept); taken out it deletes it; a line added is the week\'s own',
        a.box === 'Stunt rehearsal' && a.own === null && same(a.note, { text: 'Stunt rehearsal', size: 9, height: 60 })
          && same(b.p2, { text: 'Stunt rehearsal B', size: 9, height: 60 }) && same(b.pp3, { text: 'Tech survey', dow: 2, color: '#00B0F0' }) && b.p6 === null
          && same(b.d10, { text: 'Day ten' }) && b.own76 === null && b.own61 === null && b.own83.text === 'Table read' && same(b.own713, { text: 'Catering' })
          && same(b.c713, ['Catering', 'Day ten 7/13/26']) && same(b.c83, ['Table read']) && same(b.c76, ['Stunt rehearsal B']) && same(b.c61, ['Tech survey 6/3/26']),
        { opened: a, after: b });
      await load(S0text);
    });

    // ===== C1: a custom phase removed ==================================================================================
    await step('C1', async function () {
      var s = JSON.parse(S0text);
      s.customPhaseDefs = [{ key: 'custom1', colorIndex: 0 }]; s.customPhaseCounter = 1;
      s.fields.byId['name-custom1'] = { value: 'Reshoots' };
      s.fields.byId['start-custom1'] = { value: '2026-12-07' };
      s.fields.byId['weeks-custom1'] = { value: '3' };
      s.phaseNotes['custom1@2'] = { text: 'Reshoot prep', color: '#92D050' };
      await load(JSON.stringify(s));
      var before = { where: weeksWith('Reshoot prep'), bg: bg('2026-12-14') };
      var row = q('.phase-row[data-key="custom1"]');
      if (!row) throw new Error('no custom1 row');
      row.querySelector('.remove-custom-phase').click();
      for (var i = 0; i < 30; i++) { await T.sleep(100); if (T.clickModalButton('Remove')) break; }
      await settle();
      var after = { row: !!q('.phase-row[data-key="custom1"]'), where: weeksWith('Reshoot prep'), bg: bg('2026-12-14') };
      var sv = JSON.parse(await save());
      var file = { own: sv.userNotes['2026-12-14'] || null, colour: (sv.noteColors || {})['2026-12-14'] || null, linked: Object.keys(sv.phaseNotes || {}) };
      await undo();
      var su = JSON.parse(await save());
      var back = { row: !!q('.phase-row[data-key="custom1"]'), linked: (su.phaseNotes || {})['custom1@2'] || null, own: su.userNotes['2026-12-14'] || null };
      kase('C1', 'a custom phase removed: its linked note stays where it was drawn (12/14, green) as a plain note of that week, its colour with it; one undo makes it a linked note again',
        same(before.where, ['2026-12-14']) && before.bg === 'rgb(146, 208, 80)' && !after.row && same(after.where, ['2026-12-14']) && after.bg === 'rgb(146, 208, 80)'
          && same(file.own, { text: 'Reshoot prep' }) && file.colour === '#92D050' && file.linked.indexOf('custom1@2') === -1
          && back.row && same(back.linked, { text: 'Reshoot prep', color: '#92D050' }) && back.own === null,
        { before: before, after: after, file: file, back: back });
      await load(S0text);
    });

    // ===== F1, F2, F3: the file ========================================================================================
    await step('F1', async function () {
      var s = JSON.parse(await save());
      var want = '{"post@1":{"text":"Post kickoff with editorial and the network team","style":{"bold":true}},'
               + '"prodPrep@3":{"text":"Tech scout","dow":2,"color":"#00B0F0"},'
               + '"production@2":{"text":"Stunt rehearsal","size":9,"height":60},'
               + '"production@6":{"text":"Visitor","color":"#FF0000"},'
               + '"production@day10":{"text":"Day ten"}}';
      var keys = Object.keys(s), at = keys.indexOf('phaseNotes');
      var idsSame = same(Object.keys(s.fields.byId).sort(), Object.keys(S0.fields.byId).sort());
      var linkedWeeks = ['2026-07-06', '2026-07-13', '2026-06-01', '2026-11-02'].filter(function (k) { return s.userNotes[k] !== undefined; });
      kase('F1', 'Save writes phaseNotes, keys sorted and each entry\'s fields in their fixed order, after autoNoteColors\' place and before colWidths; no linked line reaches userNotes; no new field id',
        JSON.stringify(s.phaseNotes) === want && at > 0 && keys[at + 1] === 'colWidths' && idsSame && linkedWeeks.length === 0
          && same(s.userNotes, S0.userNotes),
        { got: JSON.stringify(s.phaseNotes), next: keys[at + 1], idsSame: idsSame, linkedWeeks: linkedWeeks });
      // The height Stunt rehearsal lends its row is the note's, not the week's: kept out of the file's rowHeights, so
      // after Save and Load a move still takes it along (the legacy row-height migration must not bake it onto 7/6).
      var savedText = JSON.stringify(s);
      await load(savedText);
      T.set('start-production', '2026-07-13'); await settle();
      var r = { rh76: rowH('2026-07-06'), rh720: rowH('2026-07-20'), fileRows: s.rowHeights, byWeek: JSON.parse(await save()).rowHeightsByWeek };
      kase('F1b', 'the linked note\'s row height is kept out of the file\'s rowHeights, so after Save, Load and a move it is on the note\'s new week only',
        same(s.rowHeights, {}) && r.rh76 !== '60px' && r.rh720 === '60px' && same(r.byWeek, {}), r);
      await load(S0text);
    });
    await step('F2', async function () {
      var s = JSON.parse(S0text); delete s.phaseNotes;
      await load(JSON.stringify(s));
      var w = where(), sv = JSON.parse(await save());
      kase('F2', 'a file with no phaseNotes (every older file) opens with no linked note -- the previous calendar\'s do not leak through -- and saves without the key',
        !w.stunt.length && !w.visitor.length && !w.dayten.length && !w.scout.length && !w.kickoff.length && typedSame(w) && !('phaseNotes' in sv)
          && same(cellLines('2026-08-03'), ['Table read']),
        { where: w, key: 'phaseNotes' in sv });
    });
    await step('F3', async function () {
      var bad = '"__proto__":{"text":"evil"},"production@0":{"text":"zero"},"nophase@1":{"text":"who"},"post@day3":{"text":"post day"},'
              + '"production@700":{"text":"far"},"production@3":{"text":"   "},"production@4":"plain",'
              + '"prodPrep@1":{"text":"Kept","dow":9,"color":"red","size":"big","height":"1px;background:red","style":{"bold":"yes"},"monthHidden":1,"extra":5},';
      var text = S0text.replace(/"phaseNotes":\s*\{/, function (m) { return m + bad; });
      if (text === S0text) throw new Error('no phaseNotes in the saved text');
      var wb = repairWarnings();
      await load(text);
      var w = where(), sv = JSON.parse(await save());
      var proto = ({}).text;
      kase('F3', 'hostile entries are dropped and the repair counted; a bad field is dropped and its note kept ("Kept", undated, in Prod Prep wk 1); nothing reaches a prototype; the good links still draw',
        repairWarnings() > wb && proto === undefined && same(sv.phaseNotes['prodPrep@1'], { text: 'Kept' }) && line('Kept') === 'Kept'
          && same(weeksWith('Kept'), [weekOf('Prod Prep wk 1')]) && !weeksWith('evil').length && !weeksWith('zero').length && !weeksWith('who').length
          && !weeksWith('post day').length && !weeksWith('far').length && same(Object.keys(sv.phaseNotes), ['post@1', 'prodPrep@1', 'prodPrep@3', 'production@2', 'production@6', 'production@day10'])
          && same(w.stunt, W0.stunt) && same(w.dayten, W0.dayten),
        { warnings: repairWarnings() - wb, saved: sv.phaseNotes, kept: weeksWith('Kept'), pp1: weekOf('Prod Prep wk 1') });
    });

    var errs = (T.appHealth().errors || []).filter(function (e) { return !/were not in a form the app writes/.test(String(e)); });
    kase('E0', '0 console errors (F3\'s repair warning aside)', errs.length === 0, { errors: errs.slice(0, 5) });
  } catch (e) {
    out.EX = String(e && e.stack || e);
    kase('EX', 'phasenotes threw: ' + String(e && e.message || e), false);
  }
  T.done(out);
})(); });
