// wfnotelines -- in a waterfall Notes cell, the lines that are NOT the user's own keep their own day: the Day picker,
// the editor's renames, Cut and Paste, and the note drag (November 2026 audit, Batch 2 item 2.3: AUD2-011, AUD2-014,
// AUD2-015; their approved defaults, 13 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_QUERY=g=day ./run.sh wfnotelines 240
//   (g = day | link | link2 | month | cut | drag, one fresh page each)
//
// A cell can show four kinds of line besides the user's own: an automatic note's ("Start Principal Photography
// 6/29/26"), a holiday's, a month note shown in the waterfall ("Table read 7/15/26"), and a note linked to a phase
// ("Stays with"). Each has its own date or its own home. Before the fix:
//   - the Day picker stamped the box's LAST line, which with any of them in the cell was theirs (AUD2-011);
//   - a linked or month line renamed in the editor, with a line added in the same save, was read as deleted (AUD2-015);
//   - a month line given another date in its own week left the month note behind and a typed copy beside it (AUD2-015);
//   - Cut and Paste, and the drag, carried month, holiday and automatic lines along as typed text with their old date,
//     so the month view and its PDF showed the event twice (AUD2-014).
// The defaults applied: a Cut leaves the month note in the month view and a paste leaves month, holiday and automatic
// lines out; a drag moves a month note ITSELF to the same weekday of the drop week; a holiday stays where it is; a month
// line re-dated inside its week moves its note to that day.
//
// The waterfall cells (what Excel and the waterfall PDF write: effectiveNoteText) and the month view's note blocks
// (what both month PDFs draw) are read for every case.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], info = {};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function byId(id){ return document.getElementById(id); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function txt(e){ return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  async function settle(){
    await T.sleep(500); var last = -1, st = 0;
    await T.until(function () { var n = (byId('table-wrap') || {innerHTML: ''}).innerHTML.length; st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3; }, 'settle', 150, 100);
  }
  function bodyFocus(){ var a = document.activeElement; if(a && a !== document.body && a.blur) a.blur(); }
  async function view(mode){
    var on = mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table');
    if(on) return;
    byId(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, mode, 100, 100);
    await settle();
  }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function monthOf(iso){ return MONTHS[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4); }
  async function toMonth(label){
    await view('month'); var want = Date.parse('1 ' + label);
    for(var i = 0; i < 60; i++){
      var my = txt(q('#table-wrap .mv-monthyear')); if(my === label) return settle();
      byId(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev').click(); await T.sleep(150);
    }
    throw new Error('never reached ' + label);
  }
  function noteTd(wk){ return q('#table-wrap td.sheet-note-cell[data-week="' + wk + '"]'); }
  // A cell's lines as drawn; [] for an empty one (it draws only the screen's "+").
  function cell(wk){
    var td = noteTd(wk);
    if(!td) return null;
    if(!td.classList.contains('has-note')) return [];
    return (td.innerText || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }
  // Every Notes cell's lines containing `word`: ['<week> | <line>'].
  function wfFind(word){
    var out = [];
    qa('#table-wrap td.sheet-note-cell[data-week]').forEach(function (td) {
      if(!td.classList.contains('has-note')) return;
      (td.innerText || '').split('\n').forEach(function (l) { l = l.trim(); if(l.indexOf(word) !== -1) out.push(td.getAttribute('data-week') + ' | ' + l); });
    });
    return out.sort();
  }
  // Every month-view note block containing `word`, over the months that hold `isos`: ['<day> | <text> | <kind>'].
  async function mvFind(word, isos){
    var seen = {}, out = [];
    for(var i = 0; i < isos.length; i++){
      var m = monthOf(isos[i]); if(seen[m]) continue; seen[m] = 1;
      await toMonth(m);
      qa('#table-wrap .mv-note-block[data-note-day]').forEach(function (b) {
        var t = txt(b); if(t.indexOf(word) !== -1) out.push(b.getAttribute('data-note-day') + ' | ' + t + ' | ' + b.getAttribute('data-note-kind'));
      });
    }
    await view('sheet');
    return Array.from(new Set(out)).sort();
  }
  async function openWf(wk){
    await view('sheet'); var td = noteTd(wk); td.scrollIntoView({block: 'center'}); await T.sleep(100);
    T.openCell(td); await T.sleep(300); var pop = q('.note-pop'); if(!pop) throw new Error('no wf editor ' + wk); return pop;
  }
  async function commitWf(pop, text){
    var ta = q('textarea', pop);
    if(text !== undefined){ ta.value = text; ta.dispatchEvent(new Event('input', {bubbles: true})); }
    ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', ctrlKey: true, bubbles: true})); await settle(); bodyFocus();
  }
  async function pickDay(pop, iso){
    var ds = q('.note-day-select', pop); if(!ds) throw new Error('no Day list');
    ds.value = iso; ds.dispatchEvent(new Event('change', {bubbles: true})); await T.sleep(200);
    return q('textarea', pop).value;
  }
  async function typeWf(wk, text){ var p = await openWf(wk); await commitWf(p, text); }
  async function typeAbove(wk, line){ var p = await openWf(wk); await commitWf(p, line + '\n' + q('textarea', p).value); }
  function chooseLink(pop, value){
    var sel = q('.note-link-select', pop); if(!sel) throw new Error('no Stays with');
    if(!Array.from(sel.options).some(function (o) { return o.value === value; })) throw new Error('no link option ' + value);
    sel.value = value; sel.dispatchEvent(new Event('change', {bubbles: true}));
  }
  async function linked(wk, text, value){
    var p = await openWf(wk); var ta = q('textarea', p); ta.value = text; ta.dispatchEvent(new Event('input', {bubbles: true}));
    chooseLink(p, value); await commitWf(p);
  }
  async function mvNote(iso, text){
    await toMonth(monthOf(iso));
    var p = q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]:not(.mv-note-add-full)') || q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]');
    if(!p) throw new Error('no + ' + iso); p.click(); await T.sleep(250);
    var pop = byId('mv-note-pop'); if(!pop) throw new Error('no month editor ' + iso);
    var cb = q('.note-view-cb', pop); if(cb && !cb.checked) cb.click();
    var ta = q('textarea', pop); ta.value = text; ta.dispatchEvent(new Event('input', {bubbles: true}));
    ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true})); await settle(); bodyFocus();
    await view('sheet');
  }
  async function nudge(key, dir){
    await view('sheet');
    var b = byId('swatch-' + key).closest('.phase-row').querySelector('.ph-nudge-btn[data-nudge="' + dir + '"]');
    if(!b) throw new Error('no nudge ' + key); b.click(); await T.sleep(1800); await settle(); bodyFocus();
  }
  async function undo(){ byId('undo-btn').click(); await settle(); bodyFocus(); }
  function pe(type, p){
    var o = {bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', pointerId: 1, isPrimary: true};
    var t = document.elementFromPoint(p.x, p.y) || document.body; t.dispatchEvent(new PointerEvent(type, o)); if(type === 'pointerup') t.dispatchEvent(new MouseEvent('click', o));
  }
  function mid(el){ var r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }
  async function wclick(el){ bodyFocus(); el.scrollIntoView({block: 'center', inline: 'nearest'}); await T.sleep(60); var p = mid(el); pe('pointerdown', p); pe('pointerup', p); await T.sleep(200); }
  function chip(){ var c = q('.text-sel-chip'); return c ? txt(c) : ''; }
  function clip(type, data){
    var dt = new DataTransfer(); Object.keys(data || {}).forEach(function (t) { if(data[t] != null) dt.setData(t, data[t]); });
    var ev = new ClipboardEvent(type, {clipboardData: dt, bubbles: true, cancelable: true}); (document.activeElement || document.body).dispatchEvent(ev);
    return {text: dt.getData('text/plain'), rich: dt.getData('application/x-sptcal-notes')};
  }
  async function cutPaste(fromWk, toWk, copyOnly){
    await view('sheet'); await wclick(noteTd(fromWk)); var c = clip(copyOnly ? 'copy' : 'cut'); await settle();
    await wclick(noteTd(toWk)); clip('paste', {'text/plain': c.text, 'application/x-sptcal-notes': c.rich}); await T.sleep(150);
    var said = chip(); await settle(); bodyFocus();
    return {clip: c.text, said: said};
  }
  async function drag(fromWk, toWk){
    await view('sheet'); var from = noteTd(fromWk), to = noteTd(toWk);
    await wclick(from); from.scrollIntoView({block: 'center'}); await T.sleep(100);
    var a = mid(from), b = mid(to); pe('pointerdown', a);
    for(var k = 1; k <= 8; k++){ pe('pointermove', {x: a.x + (b.x - a.x) * k / 8, y: a.y + (b.y - a.y) * k / 8}); await T.sleep(40); }
    pe('pointerup', b); await T.sleep(150);
    var said = chip(), modal = T.modalText();
    await settle(); bodyFocus();
    if(T.modalText()){ modal = T.modalText(); T.clickModalButton('Replace'); await settle(); said = said || chip(); }
    return {said: said, modal: modal};
  }
  function prodStart(){ var m = /(\d+\/\d+\/\d+)\s*→/.exec(txt(byId('meta-production'))); return m ? m[1] : ''; }

  var G = new URLSearchParams(location.search).get('g') || 'day';
  try {
    await T.appReady();
    T.buildFixture();
    await T.until(function () { return !!noteTd('2026-08-03'); }, 'fixture', 200, 100);
    await settle(); if(document.fonts && document.fonts.ready) await document.fonts.ready;
    await view('sheet');

    if(G === 'day'){
      // ---- AUD2-011 (a): the user's line ABOVE "Start Principal Photography 6/29/26", Day = Wed 7/1. ----
      await typeAbove('2026-06-29', 'Crew party');
      var p = await openWf('2026-06-29');
      var picked = await pickDay(p, '2026-07-01');
      await commitWf(p);
      var mvStart = await mvFind('Start Principal', ['2026-06-29']), mvCrew = await mvFind('Crew party', ['2026-07-01']);
      add('D1', 'Day picker, the user\'s line above the start: the Day goes on the user\'s line, the start keeps 6/29/26 (waterfall and month view)',
        picked === 'Crew party 7/1/26\nStart Principal Photography 6/29/26'
          && same(cell('2026-06-29'), ['Crew party 7/1/26', 'Start Principal Photography 6/29/26'])
          && same(mvStart, ['2026-06-29 | Start Principal Photography 6/29/26 | wf'])
          && same(mvCrew, ['2026-07-01 | Crew party 7/1/26 | wf']) && prodStart() === '6/29/26',
        {picked: picked, cell: cell('2026-06-29'), mvStart: mvStart, mvCrew: mvCrew, start: prodStart()},
        'box "Crew party 7/1/26 / Start Principal Photography 6/29/26"; the start on 6/29 only; Crew party on 7/1');

      // ---- AUD2-011 (b): a month note shown in the waterfall (Table read, Wed 7/15), the user's line above it. ----
      await mvNote('2026-07-15', 'Table read');
      await typeAbove('2026-07-13', 'Crew lunch');
      p = await openWf('2026-07-13');
      picked = await pickDay(p, '2026-07-16');
      await commitWf(p);
      var mvRead = await mvFind('Table read', ['2026-07-15']), mvLunch = await mvFind('Crew lunch', ['2026-07-15']);
      add('D2', 'Day picker with a month note in the cell: the Day goes on the user\'s line; the month note keeps its day, once in the month view',
        picked === 'Crew lunch 7/16/26\nTable read 7/15/26'
          && same(cell('2026-07-13'), ['Crew lunch 7/16/26', 'Table read 7/15/26'])
          && same(mvRead, ['2026-07-15 | Table read | day']) && same(mvLunch, ['2026-07-16 | Crew lunch 7/16/26 | wf']),
        {picked: picked, cell: cell('2026-07-13'), mvRead: mvRead, mvLunch: mvLunch},
        'box "Crew lunch 7/16/26 / Table read 7/15/26"; Table read on 7/15 only, as the month note');

      // ---- Controls: a cell of typed text only, and an empty cell, stamp as they always did. ----
      await typeWf('2026-08-10', 'Network call');
      p = await openWf('2026-08-10');
      var pickT = await pickDay(p, '2026-08-11');
      var pickT2 = await pickDay(p, '2026-08-13');   // switching days replaces the stamp, never stacks it
      await commitWf(p);
      p = await openWf('2026-08-17');
      var pickE = await pickDay(p, '2026-08-19');
      p.querySelector('textarea').value = 'Payroll ' + pickE; p.querySelector('textarea').dispatchEvent(new Event('input', {bubbles: true}));
      await commitWf(p);
      add('D3', 'control: a typed-only cell is stamped on its last line (a second pick replaces the date); an empty box takes the date alone',
        pickT === 'Network call 8/11/26' && pickT2 === 'Network call 8/13/26' && same(cell('2026-08-10'), ['Network call 8/13/26'])
          && pickE === '8/19/26' && same(cell('2026-08-17'), ['Payroll 8/19/26']),
        {pickT: pickT, pickT2: pickT2, cell810: cell('2026-08-10'), pickE: pickE, cell817: cell('2026-08-17')},
        '"Network call 8/13/26"; "8/19/26"');

      // ---- A cell holding only a month note and the start: no line of the user's, so the Day stamps nothing. ----
      await mvNote('2026-09-02', 'Costume parade');
      p = await openWf('2026-08-31');
      var before = q('textarea', p).value;
      // The row is hidden while the box holds no typed line (plan D4); a line typed and then taken out shows it.
      var ta = q('textarea', p); ta.value = before + '\nx'; ta.dispatchEvent(new Event('input', {bubbles: true}));
      ta.value = before; ta.dispatchEvent(new Event('input', {bubbles: true}));
      var pickN = await pickDay(p, '2026-09-03');
      await commitWf(p);
      var mvCost = await mvFind('Costume parade', ['2026-09-02']);
      add('D4', 'a cell of other notes\' lines only: picking a Day changes none of their dates',
        pickN === before && same(mvCost, ['2026-09-02 | Costume parade | day']),
        {before: before, picked: pickN, cell: cell('2026-08-31'), mvCost: mvCost}, 'the box unchanged; Costume parade on 9/2 only');
    }

    if(G === 'link' || G === 'link2'){
      // Two notes linked to Prod Prep (wk 2 = 5/25, wk 4 = 6/8), moved by Prod Prep's ▼ into typed weeks 6/1 and 6/15.
      await typeWf('2026-06-01', 'Crew party');
      await typeWf('2026-06-15', 'Lunch');
      await linked('2026-05-25', 'Wardrobe fitting', 'prodPrep@2');
      await linked('2026-06-08', 'Camera test', 'prodPrep@4');
      await nudge('prodPrep', 1);
      add('L0', 'control: Prod Prep ▼ carries both linked notes into the typed weeks',
        same(cell('2026-06-01'), ['Crew party', 'Wardrobe fitting']) && same(cell('2026-06-15'), ['Lunch', 'Camera test'])
          && same(cell('2026-05-25'), []) && same(cell('2026-06-08'), []),
        {c601: cell('2026-06-01'), c615: cell('2026-06-15'), c525: cell('2026-05-25'), c608: cell('2026-06-08')}, 'both moved one week');
      if(G === 'link'){
        // AUD2-015 (R3A-2): the linked line renamed AND a line added below it, in one save.
        var e = await openWf('2026-06-01');
        await commitWf(e, q('textarea', e).value.replace('Wardrobe fitting', 'Wardrobe fitting cast') + '\nCatering');
        // AUD2-011 (c): the Day picked in a cell holding the user's line and a linked note.
        e = await openWf('2026-06-15');
        var lp = await pickDay(e, '2026-06-17');
        await commitWf(e);
        await nudge('prodPrep', -1);
        var mvW = await mvFind('Wardrobe', ['2026-05-25']), mvC = await mvFind('Camera test', ['2026-06-08']), mvL = await mvFind('Lunch', ['2026-06-15']);
        add('L1', 'a linked note renamed with a line added in the same save keeps its link: it goes back with Prod Prep, renamed; the added line stays with the week',
          same(cell('2026-05-25'), ['Wardrobe fitting cast']) && same(cell('2026-06-01'), ['Crew party', 'Catering'])
            && same(wfFind('Wardrobe'), ['2026-05-25 | Wardrobe fitting cast']) && same(mvW, ['2026-05-25 | Wardrobe fitting cast | wf']),
          {c525: cell('2026-05-25'), c601: cell('2026-06-01'), wf: wfFind('Wardrobe'), mv: mvW}, '5/25 "Wardrobe fitting cast"; 6/1 Crew party, Catering');
        add('L2', 'the Day picked beside a linked note goes on the user\'s line; the linked note keeps no date and goes back with its phase',
          lp === 'Lunch 6/17/26\nCamera test' && same(cell('2026-06-08'), ['Camera test']) && same(cell('2026-06-15'), ['Lunch 6/17/26'])
            && same(mvC, ['2026-06-08 | Camera test | wf']) && same(mvL, ['2026-06-17 | Lunch 6/17/26 | wf']),
          {picked: lp, c608: cell('2026-06-08'), c615: cell('2026-06-15'), mvC: mvC, mvL: mvL}, '6/8 "Camera test"; 6/15 "Lunch 6/17/26"');
      } else {
        // The added line ABOVE the renamed linked line: the rename still pairs with the line that reads as its edit.
        var e2 = await openWf('2026-06-01');
        await commitWf(e2, 'Crew party\nCatering\nWardrobe fitting cast');
        // Control: the linked line taken out and two lines of nothing like it typed: the note is deleted, as before.
        e2 = await openWf('2026-06-15');
        await commitWf(e2, 'Lunch\nPayroll\nNetwork call');
        await nudge('prodPrep', -1);
        add('L3', 'a line added ABOVE the renamed linked line: the rename keeps its link (back on 5/25), Catering stays with the week',
          same(cell('2026-05-25'), ['Wardrobe fitting cast']) && same(cell('2026-06-01'), ['Crew party', 'Catering']),
          {c525: cell('2026-05-25'), c601: cell('2026-06-01')}, '5/25 "Wardrobe fitting cast"');
        add('L4', 'control: a linked line taken out, with unrelated lines typed in its place, deletes the note; the typed lines stay with the week',
          same(cell('2026-06-08'), []) && same(cell('2026-06-15'), ['Lunch', 'Payroll', 'Network call']) && same(wfFind('Camera test'), []),
          {c608: cell('2026-06-08'), c615: cell('2026-06-15'), wf: wfFind('Camera test')}, '6/8 empty; 6/15 Lunch, Payroll, Network call');
      }
    }

    if(G === 'month'){
      // ---- AUD2-015 (R3A-3 a): a month line re-dated inside its week moves the month note there. One undo puts it back. ----
      await mvNote('2026-07-15', 'Table read');
      var m1 = await openWf('2026-07-13');
      info.open713 = q('textarea', m1).value;
      await commitWf(m1, 'Table read 7/16/26');
      var mvT = await mvFind('Table read', ['2026-07-15']);
      add('M1', 'a month line given another date in its week moves the month note to that day: once, in both views',
        info.open713 === 'Table read 7/15/26' && same(cell('2026-07-13'), ['Table read 7/16/26']) && same(mvT, ['2026-07-16 | Table read | day']),
        {open: info.open713, cell: cell('2026-07-13'), mv: mvT}, 'cell "Table read 7/16/26"; the month note on 7/16 only');
      await undo();
      var mvU = await mvFind('Table read', ['2026-07-15']);
      add('M2', 'one Undo puts the month note back on 7/15', same(mvU, ['2026-07-15 | Table read | day']) && same(cell('2026-07-13'), ['Table read 7/15/26']),
        {mv: mvU, cell: cell('2026-07-13')}, 'Table read on 7/15');
      // ---- AUD2-015 (R3A-3 b): renamed and a line added in the same save. ----
      await mvNote('2026-08-04', 'Script sync');
      var m2 = await openWf('2026-08-03');
      await commitWf(m2, 'Script sync with cast 8/4/26\nCatering 8am');
      var mvS = await mvFind('Script sync', ['2026-08-04']), mvK = await mvFind('Catering', ['2026-08-03']);
      add('M3', 'a month line renamed with a line added in the same save renames the month note (one copy); the added line is the week\'s',
        same(mvS, ['2026-08-04 | Script sync with cast | day']) && same(wfFind('Script sync'), ['2026-08-03 | Script sync with cast 8/4/26'])
          && same(mvK, ['2026-08-03 | Catering 8am | wf']),
        {mvS: mvS, wf: wfFind('Script sync'), mvK: mvK, cell: cell('2026-08-03')}, 'Script sync with cast on 8/4 only');
      // ---- Control: a plain rename, and a line taken out (switched off for the waterfall, kept in the month view). ----
      await mvNote('2026-09-16', 'Budget lock');
      var m3 = await openWf('2026-09-14');
      await commitWf(m3, 'Budget lock final 9/16/26');
      var mvB = await mvFind('Budget lock', ['2026-09-16']);
      m3 = await openWf('2026-09-14');
      await commitWf(m3, '');
      var mvB2 = await mvFind('Budget lock', ['2026-09-16']);
      add('M4', 'control: a plain rename renames the month note; the line taken out leaves the waterfall and stays in the month view',
        same(mvB, ['2026-09-16 | Budget lock final | day']) && same(mvB2, ['2026-09-16 | Budget lock final | day']) && same(cell('2026-09-14'), []),
        {mvB: mvB, mvB2: mvB2, cell: cell('2026-09-14')}, 'Budget lock final on 9/16 in the month view only');
    }

    if(G === 'cut'){
      // ---- AUD2-014, Cut and Paste of a cell holding a month note's line. ----
      await mvNote('2026-07-15', 'Table read');
      await typeAbove('2026-07-13', 'Crew party');
      var r = await cutPaste('2026-07-13', '2026-08-03');
      var mvT2 = await mvFind('Table read', ['2026-07-15', '2026-08-03']);
      add('C1', 'Cut + Paste: the user\'s line moves; the month note stays in the month view on its day, with no copy on the new week',
        same(cell('2026-08-03'), ['Crew party']) && same(cell('2026-07-13'), []) && same(mvT2, ['2026-07-15 | Table read | day'])
          && same(wfFind('Table read'), []) && /stay on their own dates/.test(r.said),
        {c803: cell('2026-08-03'), c713: cell('2026-07-13'), mv: mvT2, wf: wfFind('Table read'), said: r.said, clip: r.clip},
        '8/3 "Crew party"; Table read on 7/15 only; the paste says the dates stay');
      // ---- ...of a cell that is only an automatic note: the paste writes nothing, and leaves the target as it was. ----
      await typeWf('2026-08-10', 'Network call');
      r = await cutPaste('2026-06-29', '2026-08-10');
      var mvP = await mvFind('Start Principal', ['2026-06-29', '2026-08-10']);
      add('C2', 'Cut + Paste of "Start Principal Photography 6/29/26": no stale copy lands anywhere; the target keeps its note',
        same(mvP, ['2026-06-29 | Start Principal Photography 6/29/26 | wf']) && same(cell('2026-08-10'), ['Network call'])
          && same(wfFind('Start Principal Photography 6/29'), []) && prodStart() === '6/29/26',
        {mv: mvP, c810: cell('2026-08-10'), wf: wfFind('Start Principal'), said: r.said}, 'the start on 6/29 only; 8/10 still "Network call"');
      // ---- Control: Copy + Paste of typed text alone is exactly what it was; nothing is said. ----
      await typeWf('2026-08-17', 'Crew lunch');
      r = await cutPaste('2026-08-17', '2026-08-24', true);
      add('C3', 'control: Copy + Paste of a typed note lands it whole, and says nothing',
        same(cell('2026-08-24'), ['Crew lunch']) && same(cell('2026-08-17'), ['Crew lunch']) && r.said === '',
        {c824: cell('2026-08-24'), c817: cell('2026-08-17'), said: r.said}, '"Crew lunch" in both');
      // ---- ...of a holiday's line (holidays ticked into the waterfall). ----
      await T.showHolidaysInSheet(); await settle();
      r = await cutPaste('2026-09-07', '2026-09-28');
      var mvL2 = await mvFind('Labor Day', ['2026-09-07']);
      add('C4', 'Cut + Paste of "Labor Day 9/7/26": no copy on 9/28 in either view; the holiday stays on 9/7 in the month view',
        same(cell('2026-09-28'), []) && same(mvL2, ['2026-09-07 | Labor Day 9/7/26 | wf']) && same(wfFind('Labor Day'), []),
        {c928: cell('2026-09-28'), mv: mvL2, wf: wfFind('Labor Day'), said: r.said}, 'Labor Day on 9/7 in the month view only');
    }

    if(G === 'drag'){
      // ---- AUD2-014, the drag of a cell holding the user's line and a month note's: the month note moves itself. ----
      await mvNote('2026-07-15', 'Table read');
      await typeAbove('2026-07-13', 'Crew party');
      var d1 = await drag('2026-07-13', '2026-08-03');
      var mvT3 = await mvFind('Table read', ['2026-07-15', '2026-08-05']);
      add('R1', 'drag: the month note moves itself to the same weekday of the new week (Wed 8/5), once, in both views',
        same(cell('2026-08-03'), ['Crew party', 'Table read 8/5/26']) && same(cell('2026-07-13'), [])
          && same(mvT3, ['2026-08-05 | Table read | day']) && same(wfFind('7/15/26'), []),
        {c803: cell('2026-08-03'), c713: cell('2026-07-13'), mv: mvT3, said: d1.said, modal: d1.modal}, '8/3 "Crew party / Table read 8/5/26"; Table read on 8/5 only');
      await undo();
      var mvT4 = await mvFind('Table read', ['2026-07-15', '2026-08-05']);
      add('R2', 'one Undo puts the drag back: both lines in 7/13, the month note on 7/15',
        same(cell('2026-07-13'), ['Crew party', 'Table read 7/15/26']) && same(cell('2026-08-03'), []) && same(mvT4, ['2026-07-15 | Table read | day']),
        {c713: cell('2026-07-13'), c803: cell('2026-08-03'), mv: mvT4}, 'as before the drag');
      // ---- The drag of the start's cell: the line's date moves with it (the month view's own drag rule). ----
      var d2 = await drag('2026-06-29', '2026-08-17');
      var mvS2 = await mvFind('Start Principal', ['2026-06-29', '2026-08-17']);
      add('R3', 'drag of "Start Principal Photography 6/29/26" to week 8/17: it lands dated 8/17/26, never carrying 6/29/26 outside its week',
        same(cell('2026-08-17'), ['Start Principal Photography 8/17/26']) && same(cell('2026-06-29'), [])
          && same(mvS2, ['2026-08-17 | Start Principal Photography 8/17/26 | wf']) && prodStart() === '6/29/26',
        {c817: cell('2026-08-17'), c629: cell('2026-06-29'), mv: mvS2, start: prodStart(), said: d2.said}, 'one line, dated 8/17/26');
      // ---- A holiday cannot move: it stays in its cell, and the user's line beside it moves. ----
      await T.showHolidaysInSheet(); await settle();
      await typeAbove('2026-09-07', 'Crew party two');
      var d3 = await drag('2026-09-07', '2026-09-28');
      var mvL3 = await mvFind('Labor Day', ['2026-09-07']);
      add('R4', 'drag of "Crew party two / Labor Day 9/7/26": the user\'s line moves, Labor Day stays on 9/7 in both views, and the grid says so',
        same(cell('2026-09-28'), ['Crew party two']) && same(cell('2026-09-07'), ['Labor Day 9/7/26'])
          && same(mvL3, ['2026-09-07 | Labor Day 9/7/26 | wf']) && /Holidays stay on their own dates/.test(d3.said),
        {c928: cell('2026-09-28'), c907: cell('2026-09-07'), mv: mvL3, said: d3.said}, '9/28 "Crew party two"; 9/7 "Labor Day 9/7/26"');
      var d4 = await drag('2026-09-07', '2026-10-05');
      add('R5', 'a cell that is only a holiday does not move, and the grid says why',
        same(cell('2026-09-07'), ['Labor Day 9/7/26']) && same(cell('2026-10-05'), []) && /Holidays stay on their own dates/.test(d4.said) && !d4.modal,
        {c907: cell('2026-09-07'), c1005: cell('2026-10-05'), said: d4.said, modal: d4.modal}, 'nothing moves');
    }

    var h = T.appHealth();
    add('E0', 'no console errors', h.errors.length === 0, {errors: h.errors, modal: T.modalText()}, 'none');
  } catch(err){
    add('EX', 'the leg threw', false, String(err && err.stack || err).slice(0, 500) + ' INFO ' + JSON.stringify(info).slice(0, 600), 'no exception');
  }
  T.done({cases: cases, info: info});
})(); });
