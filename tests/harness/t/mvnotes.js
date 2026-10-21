// mvnotes -- bundle A of the 20 Oct 2026 gap list: five month-view note features (MONTH-NOTES-PLAN.md, the owner's
// rulings by picker that day). One leg, a case group per item, on a synthetic calendar built through the UI.
//
//   HARNESS_PAGE=/dist/index.html ./run.sh mvnotes 600                          LIVE: build, assert, mint
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=mvnotes ./run.sh mvnotes 600    RESTORE: the minted file
//
// LIVE builds T.buildFixture() (the reference calendar: US General, Writer's Room 1/5/26 to Localization ending
// 4/25/27, the default Christmas hiatus from 12/21/26) and adds through the UI:
//   custom1  "Network Table Read and Studio Notes Session"  Dates, 4/15/26 only     a one-day phase, long name
//   custom2  "Costume and Hair Camera Tests With The Director"  Weeks, from Fri 5/1/26 (Snap off), 2 weeks
//   custom3  "Fittings"  Dates, 4/17/26 only                                        a one-day phase, short name
//   custom holidays  Studio Shutdown 12/15/25 (the edge month before), Office Move 4/1/26 (the gap between Writer's
//                    Room and Pre Prep), Far Away Day 6/1/28 (beyond every month the view shows)
// then day notes through the editor and Paste notes…, and mints tests/fixtures/mvnotes.sptcal from its real Save
// (out.sptcal). RESTORE holds the minted file to the same facts, and is what gates 10 and 13 print.
//
// The groups: P (item 2, the editor's palette, No fill, remember last colour), E (item 6, one month each side),
// H (item 10, notes on every hiatus day), V (item 15, Paste notes…), W (item 17, one-day custom pills wrap).
// Every case is null-safe: a build missing a feature turns its case red rather than ending the leg.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [], out = {cases: cases};
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: !!pass, observed: observed, expected: expected}); }
  function el(id){ return document.getElementById(id); }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function eq(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function monthLabel(){ return ((q('#table-wrap .mv-monthyear') || {}).textContent || '').trim(); }
  function monthIndex(label){ var m = /^(\w+) (\d{4})$/.exec(label || ''); return m ? (+m[2]) * 12 + MONTHS.indexOf(m[1]) : NaN; }
  async function settle(){
    var last = -1, st = 0;
    await T.until(function () {
      var n = (el('table-wrap') || {innerHTML: ''}).innerHTML.length;
      st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 4;
    }, 'the grid to settle', 200, 60);
  }
  async function goTo(label){
    var want = monthIndex(label);
    for(var g = 0; g < 40 && monthLabel() !== label; g++){
      var b = el(monthIndex(monthLabel()) < want ? 'mv-next' : 'mv-prev');
      if(!b || b.disabled) break;
      b.click(); await T.sleep(120);
    }
    await settle();
    return monthLabel() === label;
  }
  var lastAt = 0;
  async function snap(){
    var got = null;
    await T.until(function () { got = T.latestBackup(); return !!(got && got.state && got.at > lastAt); }, 'a fresh crash backup', 200, 100);
    lastAt = got.at;
    // ⛔ A COPY. T.memoryIDB() stores values by reference, and captureSnapshot() hands over the live stores (dayNotes
    // among them) by reference too, so an uncopied backup is the live store and every comparison of two of them is the
    // store compared with itself. Mutant m08 (a paste banked one step per note) passed V5 until this copy was taken.
    return JSON.parse(JSON.stringify(got.state));
  }
  function blocks(iso, kind){
    return qa('#table-wrap .mv-note-block[data-note-day="' + iso + '"]' + (kind ? '[data-note-kind="' + kind + '"]' : ''));
  }
  function texts(iso, kind){ return blocks(iso, kind).map(function (b) { return (b.textContent || '').trim(); }); }
  function plus(iso){ return q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]:not(.mv-note-add-full)') || q('#table-wrap .mv-note-add[data-note-day="' + iso + '"]'); }
  function pop(){ return el('mv-note-pop'); }
  function swatchRows(){ var p = pop(); return p ? qa('.note-color-row', p).map(function (r) { return qa('.color-swatch', r).map(function (s) { return s.title; }); }) : null; }
  function selectedSwatch(){ var s = pop() && q('.color-swatch.selected', pop()); return s ? s.title : null; }
  async function openAdd(iso){ var p = plus(iso); if(!p) return false; p.click(); await T.sleep(150); return !!pop(); }
  async function commit(text, swatchName){
    var p = pop(); if(!p) return false;
    if(swatchName){ var sw = q('.color-swatch[title="' + swatchName + '"]', p); if(!sw) return false; sw.click(); }
    var ta = q('textarea', p); ta.value = text; ta.dispatchEvent(new Event('input', {bubbles: true}));
    ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true}));
    await settle();
    return !pop();
  }
  function escEditor(){ var p = pop(); if(p) q('textarea', p).dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})); }
  function styleOf(b){ if(!b) return null; var cs = getComputedStyle(b); return {bg: cs.backgroundColor, border: cs.borderTopColor, ink: cs.color}; }
  // The print path's document, captured at its window.print() as the monthprint leg does.
  async function printDoc(){
    T.monthPrintPath(true);
    var html = null, real = window.print;
    window.print = function () { html = el('print-root').innerHTML; };
    await T.sleep(700);                         // the Export button's re-click guard
    el('export-btn').click();
    try { await T.until(function () { return html !== null; }, 'the print path', 150, 100); }
    finally { window.print = real; window.dispatchEvent(new Event('afterprint')); T.monthPrintPath(false); }
    var d = document.createElement('div'); d.innerHTML = html; return d;
  }
  function docMonths(d){ return qa('.mv-monthyear', d).map(function (e) { return e.textContent.trim(); }); }
  async function writerPdf(){
    var rec = T.fakeSavePicker();
    await T.sleep(700);
    el('export-btn').click();
    try { await T.until(function () { return rec.files.length > 0 && rec.files[0].closed; }, 'the written month PDF', 300, 100); }
    finally { rec.restore(); }
    return rec.files[0].bytes;
  }
  function overlay(){ return q('.paste-notes-overlay'); }
  // Paste notes… lives in Settings ▸ Calendar ▸ Month view since 20 Oct 2026 (it was a toolbar button). Open the
  // window on its Calendar tab, press the button where a user can reach it (hit-tested at its centre), then close
  // the window again if this opened it, so the cases after it see the sidebar as they always did.
  async function settingsOpen(on){
    var sw = el('settings-window'), isOpen = !!sw && sw.classList.contains('is-open');
    if(isOpen !== on){ var sb = q('.side-settings-btn'); if(sb) sb.click(); await T.sleep(200); }
    if(on){
      var tab = qa('#settings-window [role="tab"]').find(function (t) { return /Calendar/.test(t.textContent); });
      if(tab && tab.getAttribute('aria-selected') !== 'true'){ tab.click(); await T.sleep(200); }
      // ⚠️ The window SLIDES in (a CSS transition from translateX(-100%)), and under run.sh's virtual clock the
      // transition does not advance: measured, its button sat at x -131 for good. Finishing the transition jumps
      // to where it ends for a user, so the hit test below sees the open window.
      var sw2 = el('settings-window');
      if(sw2 && sw2.getAnimations) sw2.getAnimations({subtree: true}).forEach(function (a) { try { a.finish(); } catch (e) {} });
      await T.sleep(50);
    }
  }
  // Is the button laid out (not inside a display:none card or a closed window)?
  function pasteShown(){ var b = el('paste-notes-btn'); return !!b && b.getClientRects().length > 0; }
  async function openPaste(){
    var was = !!el('settings-window') && el('settings-window').classList.contains('is-open');
    await settingsOpen(true);
    var b = el('paste-notes-btn');
    if(!b || !pasteShown() || !b.closest('#settings-window')){ if(!was) await settingsOpen(false); return false; }
    b.scrollIntoView({block: 'center'}); await T.sleep(120);
    var r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    var ok = !!hit && (hit === b || b.contains(hit));
    window.__pasteDiag = {open: el('settings-window').className, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      hit: hit ? hit.tagName + '.' + String(hit.className).slice(0, 60) : null, vw: innerWidth, vh: innerHeight};
    if(ok){ hit.click(); await T.sleep(150); }
    if(!was) await settingsOpen(false);
    return ok && !!overlay();
  }
  async function typePaste(text){ var ta = q('.paste-notes-text'); if(!ta) return null; ta.value = text; ta.dispatchEvent(new Event('input', {bubbles: true})); await T.sleep(60); return pasteState(); }
  function pasteState(){
    var o = overlay(); if(!o) return null;
    var a = q('.paste-notes-add', o);
    return {sum: q('.paste-notes-sum', o).textContent, add: a.textContent, disabled: a.disabled,
            rows: qa('.paste-row', o).map(function (r) { return r.classList.contains('is-error') ? 'E:' + r.textContent : r.textContent; })};
  }
  function dayList(state, iso){ var v = state.dayNotes && state.dayNotes[iso]; return Array.isArray(v) ? v : []; }

  try {
    await T.appReady();
    var st = (new URL(location.href)).searchParams.get('state') || '';
    out.run = st ? 'restore' : 'live';
    try { localStorage.removeItem('sptcal.prefs'); } catch(e){}

    if(!st){
      // ---------------- LIVE: the calendar, through the UI ----------------
      T.buildFixture();
      for(var i = 0; i < 3; i++){ el('add-phase-btn').click(); await T.sleep(80); }
      T.set('name-custom1', 'Network Table Read and Studio Notes Session'); T.set('unit-custom1', 'dates');
      T.set('start-custom1', '2026-04-15'); T.set('end-custom1', '2026-04-15');
      T.set('name-custom2', 'Costume and Hair Camera Tests With The Director');
      var sn = el('snap-custom2'); sn.checked = false; ['input', 'change'].forEach(function (t) { sn.dispatchEvent(new Event(t, {bubbles: true})); });
      T.set('start-custom2', '2026-05-01'); T.set('weeks-custom2', '2');
      T.set('name-custom3', 'Fittings'); T.set('unit-custom3', 'dates');
      T.set('start-custom3', '2026-04-17'); T.set('end-custom3', '2026-04-17');
      [['Studio Shutdown', '2025-12-15'], ['Office Move', '2026-04-01'], ['Far Away Day', '2028-06-01']].forEach(function (h) {
        T.set('custom-hol-name', h[0]); T.set('custom-hol-date', h[1]); el('custom-hol-add').click();
      });
      await settle();
      el('view-month-btn').click();
      await settle();
    } else {
      await T.until(function () { return !!q('#table-wrap .mv-daygrid'); }, 'the month view', 200, 100);
      await settle();
    }

    // ================= E: item 6, one month each side =================
    var opened = monthLabel();
    add('E1', 'the month view opens on the first month a phase covers (January 2026), not on the month added before it',
      opened === 'January 2026', opened, 'January 2026');
    await goTo('December 2025');
    var e2a = {at: monthLabel(), prevDisabled: !!(el('mv-prev') || {}).disabled};
    await goTo('May 2027');
    var e2b = {at: monthLabel(), nextDisabled: !!(el('mv-next') || {}).disabled};
    add('E2', 'the view pages one month past the phases each side, and no further: back to December 2025, on to May 2027 (Localization ends 4/25/27)',
      e2a.at === 'December 2025' && e2a.prevDisabled && e2b.at === 'May 2027' && e2b.nextDisabled, {before: e2a, after: e2b}, 'Dec 2025 (◀ off) and May 2027 (▶ off)');

    await goTo('December 2025');
    var e3 = {plus: qa('#table-wrap .mv-note-add[data-note-day^="2025-12-"]').length,
              shutdown: texts('2025-12-15', 'wf'), christmas: texts('2025-12-25'), observed: texts('2025-12-26')};
    add('E3', 'December 2025, the edge month, takes notes ("+" on its days) and draws the custom holiday there, "Studio Shutdown 12/15/25"',
      e3.plus > 50 && eq(e3.shutdown, ['Studio Shutdown 12/15/25']), e3, '+ lanes, and the holiday block');
    add('E4', 'ruling Q1 ("Your own only"): a UNION holiday outside the phases still draws nowhere -- Christmas 12/25/25 is not on the edge month',
      e3.christmas.length === 0 && e3.observed.length === 0, e3, 'no Christmas block');
    var hv = qa('#holiday-vis-list .hv-row').map(function (r) { return (r.textContent || '').replace(/\s+/g, ' ').trim(); });
    function hvRow(name){ return hv.filter(function (t) { return t.indexOf(name) === 0; })[0] || ''; }
    add('E5', 'Settings tags the holidays the month view draws outside the phases "(month view only)", and one beyond every month it shows "(outside schedule)"',
      /\(month view only\)/.test(hvRow('Studio Shutdown')) && /\(month view only\)/.test(hvRow('Office Move'))
        && /\(outside schedule\)/.test(hvRow('Far Away Day')) && !/month view only/.test(hvRow('Far Away Day')),
      {shutdown: hvRow('Studio Shutdown'), move: hvRow('Office Move'), far: hvRow('Far Away Day')}, 'two "(month view only)", one "(outside schedule)"');
    await goTo('April 2026');
    var e6 = texts('2026-04-01', 'wf');
    add('E6', 'a custom holiday in a GAP between two phases (4/1/26, between Writer\'s Room and Pre Prep) draws in the month view too',
      eq(e6, ['Office Move 4/1/26']), e6, ['Office Move 4/1/26']);

    // E7: a click on the edge holiday, whose week has no waterfall row, adds a DAY note there, as its "+" would.
    await goTo('December 2025');
    var hb = blocks('2025-12-15', 'wf')[0];
    if(hb) hb.click();
    await T.sleep(200);
    var e7 = {open: !!pop(), hint: pop() ? (q('.mv-note-pop-hint', pop()) || {}).textContent : '', text: pop() ? q('textarea', pop()).value : null};
    escEditor(); await T.sleep(100);
    add('E7', 'clicking the edge month\'s holiday (a week with no waterfall row) opens a DAY note editor ("Month view only"), blank, never a waterfall note',
      e7.open && /Month view only/.test(e7.hint) && e7.text === '' && !pop(), e7, 'a blank day-note editor');

    if(!st){
      // ================= P: item 2, the editor =================
      var p1ok = await openAdd('2025-12-10');
      var rows = swatchRows();
      var p1sel = selectedSwatch();
      add('P1', 'a new day note\'s editor offers the month note palette in two rows: the ten standard colours, then No fill, Pink, Lavender, Peach, Pale blue and the three greys; it opens on the default purple',
        p1ok && eq(rows, [['Dark red', 'Red', 'Orange', 'Yellow', 'Light green', 'Green', 'Light blue', 'Blue', 'Dark blue', 'Purple'],
                          ['No fill', 'Pink', 'Lavender', 'Peach', 'Pale blue', 'Light grey', 'Grey', 'Dark grey']]) && p1sel === 'Purple',
        {rows: rows, selected: p1sel}, 'two rows, Purple selected');
      var p2ok = await commit('Deal memo signed', 'No fill');
      var nb = blocks('2025-12-10', 'day')[0], ns = styleOf(nb);
      add('P2', 'No fill draws the note as its text alone: transparent fill, NO box (ruling Q2, "No box at all"), black ink',
        p2ok && !!nb && /background:#FFFFFF00/i.test(nb.getAttribute('style') || '') && ns.bg === 'rgba(255, 255, 255, 0)'
          && ns.border === 'rgba(0, 0, 0, 0)' && ns.ink === 'rgb(0, 0, 0)',
        {style: nb && nb.getAttribute('style'), computed: ns}, 'transparent fill and border, black ink');
      await openAdd('2025-12-11');
      var p3sel = selectedSwatch();
      await commit('Writers notes in');
      var prefRaw = null; try { prefRaw = localStorage.getItem('sptcal.prefs'); } catch(e){}
      var p3b = blocks('2025-12-11', 'day')[0];
      add('P3', 'remember last colour: the next new note opens on No fill and keeps it with no pick; it is stored per user in sptcal.prefs (mvNoteColor)',
        p3sel === 'No fill' && !!p3b && /background:#FFFFFF00/i.test(p3b.getAttribute('style') || '') && /"mvNoteColor":"#FFFFFF00"/.test(prefRaw || ''),
        {opensOn: p3sel, style: p3b && p3b.getAttribute('style'), prefs: prefRaw}, 'No fill, stored in prefs');
      await openAdd('2025-12-12');
      await commit('Pitch draft', 'Pink');
      await openAdd('2025-12-16');
      var p4sel = selectedSwatch();
      await commit('Budget lock', 'Dark grey');
      var pk = blocks('2025-12-12', 'day')[0], dg = blocks('2025-12-16', 'day')[0];
      add('P4', 'a tint and a grey draw as any colour does: Pink #F7C1D9 with black ink, Dark grey #595959 with white ink; the editor opened on Pink, the colour last used',
        p4sel === 'Pink' && !!pk && /background:#F7C1D9; color:#000000/.test(pk.getAttribute('style') || '')
          && !!dg && /background:#595959; color:#FFFFFF/.test(dg.getAttribute('style') || ''),
        {opensOn: p4sel, pink: pk && pk.getAttribute('style'), grey: dg && dg.getAttribute('style')}, 'Pink black, Dark grey white');
      // An existing note opens on its OWN colour, whatever was used last (Dark grey).
      var own = blocks('2025-12-12', 'day')[0];
      if(own) own.click();
      await T.sleep(150);
      var p5sel = selectedSwatch(); escEditor(); await T.sleep(100);
      // A waterfall-owned note keeps the ten standard colours: its colour prints in the waterfall and Excel.
      await goTo('July 2026');
      var wf = q('#table-wrap .mv-note-block[data-note-kind="wf"]');
      if(wf) wf.click();
      await T.sleep(150);
      var p5rows = swatchRows(); escEditor(); await T.sleep(100);
      add('P5', 'an existing note opens on its own colour (Pink, not the last used Dark grey); a WATERFALL note\'s editor keeps the ten standard colours only',
        p5sel === 'Pink' && !!p5rows && p5rows.length === 1 && p5rows[0].length === 10 && p5rows[0].indexOf('No fill') < 0,
        {own: p5sel, wfRows: p5rows}, 'Pink; one row of ten');

      // ================= H: item 10, every hiatus day =================
      await goTo('December 2026');
      var band = q('#table-wrap .mv-hiatus-bar');
      // The hiatus is Mon 12/21/26 to Sun 1/3/27; its first week's seven days, Monday to Sunday, across two month rows.
      var days = ['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27'];
      var per = days.map(function (d) { return qa('#table-wrap .mv-note-add[data-note-day="' + d + '"]').length; });
      add('H1', 'the hiatus week (12/21/26) has "+" note lanes on every day, its banded weekdays and its weekend alike (owner: "Every hiatus day")',
        !!band && per.every(function (n) { return n > 0; }), {plusPerDay: per, band: band && band.textContent}, 'a "+" on all seven days');
      var p23 = plus('2026-12-23');
      var r23 = p23 && p23.getBoundingClientRect();
      var hit = r23 && document.elementFromPoint(r23.left + r23.width / 2, r23.top + r23.height / 2);
      if(p23){ p23.scrollIntoView({block: 'center'}); await T.sleep(60); r23 = p23.getBoundingClientRect(); hit = document.elementFromPoint(r23.left + r23.width / 2, r23.top + r23.height / 2); }
      var h2open = false;
      if(hit && hit.classList && hit.classList.contains('mv-note-add')){ hit.click(); await T.sleep(150); h2open = !!pop(); }
      var h2ok = h2open && await commit('Crew holiday party');
      var hp = blocks('2026-12-23', 'day')[0];
      var bandRow = band ? parseInt((band.getAttribute('style').match(/grid-row:(\d+)/) || [])[1], 10) : NaN;
      var b2 = q('#table-wrap .mv-hiatus-bar');
      bandRow = b2 ? parseInt((b2.getAttribute('style').match(/grid-row:(\d+)/) || [])[1], 10) : bandRow;
      var hpRow = hp ? parseInt((hp.getAttribute('style').match(/grid-row:(\d+)/) || [])[1], 10) : NaN;
      add('H2', 'a hiatus weekday\'s "+" is hit-testable at its centre, and a note typed there is stored and drawn on 12/23, on a line below the band',
        h2ok && !!hp && hp.textContent.trim() === 'Crew holiday party' && hpRow > bandRow,
        {hitClass: hit && hit.className, note: hp && hp.textContent, noteRow: hpRow, bandRow: bandRow}, 'the note under the band');

      // ================= V: item 15, Paste notes… =================
      el('view-sheet-btn').click(); await settle();
      await settingsOpen(true);
      var vSheet = pasteShown();
      await settingsOpen(false);
      el('view-month-btn').click(); await settle();
      // In the MONTH view, where the old toolbar button used to render: no Paste notes… outside the Settings window.
      var inToolbar = qa('#paste-notes-btn').some(function (b) { return !b.closest('#settings-window'); });
      await goTo('March 2026');
      var sig0 = T.formSignature();
      var v1 = await openPaste();
      var ids = overlay() ? qa('[id]', overlay()).length : -1;
      add('V1', 'Paste notes… is in Settings ▸ Calendar ▸ Month view (the owner moved it out of the toolbar, 20 Oct 2026), shown in the month view only, reachable there (hit-tested), opens its box, and nothing in the box carries an id (collectFieldValues cannot sweep it)',
        !vSheet && !inToolbar && v1 && ids === 0 && eq(T.formSignature(), sig0), {inWaterfall: vSheet, inToolbar: inToolbar, opened: v1, idsInBox: ids, diag: window.__pasteDiag}, 'Settings, month only, no ids');
      var bad = await typePaste([
        '3/2/26, Table read, pale blue',
        '2026-03-03\tNetwork notes due\tpink',
        '',
        '3/4/26 Wardrobe fittings',
        '13/45/26, Bad date',
        '3/5/26, Call sheet, cast, crew',
        '5/20/28, Too far',
        '3/6/26, Kickoff, Gray',
        '3/9/26, Spotting session, #ABCDEF',
        '3/10/26, Plain one, no fill',
        '3/11/26,',
        '3/12/26, Odd colour, teel, x'
      ].join('\n'));
      add('V2', 'the preview reads every non-blank line back (date, text, colour) and names each bad line\'s problem; ruling Q4: Add stays off while any line is bad',
        !!bad && bad.disabled && /3 lines need fixing/.test(bad.sum) && bad.rows.length === 11
          && /^E:Line 5can’t read the date “13\/45\/26”/.test(bad.rows[3]) && /^E:Line 7.*outside the months this calendar shows \(Dec 2025 – May 2027\)/.test(bad.rows[5])
          && /^E:Line 11no note text after the date/.test(bad.rows[9]) && bad.rows[4] === 'Line 6Thu 3/5/26Call sheet, cast, crew',
        bad, '3 errors, Add off');
      var good = await typePaste([
        '3/2/26, Table read, pale blue',
        '2026-03-03\tNetwork notes due\tpink',
        '',
        '3/4/26 Wardrobe fittings',
        '3/5/26, Call sheet, cast, crew',
        '3/6/26, Kickoff, Gray',
        '3/9/26, Spotting session, #ABCDEF',
        '3/10/26, Plain one, no fill',
        '3/12/26, Odd colour, teel, x',
        '12/10/25, Second note on the tenth, red'
      ].join('\n'));
      add('V3', 'with every line read, Add names the count ("Add 9 notes")',
        !!good && !good.disabled && good.add === 'Add 9 notes' && good.sum === '9 notes ready', good, 'Add 9 notes');
      var before = await snap();
      var undoOff = el('undo-btn').disabled;
      q('.paste-notes-add').click();
      await settle();
      var after = await snap();
      var got = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-09', '2026-03-10', '2026-03-12'].map(function (d) {
        var l = dayList(after, d); return l.length ? [l[0].text, l[0].color, l[0].lane] : null;
      });
      var tenth = dayList(after, '2025-12-10').map(function (n) { return [n.text, n.color]; });
      add('V4', 'Add writes each note as the editor does: names, hex, "Gray", No fill and the remembered colour (Dark grey, for a line with none) read right; commas kept in the text; lane null; a second note on 12/10/25 AFTER the one already there; the box closes',
        !overlay() && eq(got, [['Table read', '#BBDCF7', null], ['Network notes due', '#F7C1D9', null], ['Wardrobe fittings', '#595959', null],
                               ['Call sheet, cast, crew', '#595959', null], ['Kickoff', '#A6A6A6', null], ['Spotting session', '#ABCDEF', null],
                               ['Plain one', '#FFFFFF00', null], ['Odd colour, teel, x', '#595959', null]])
          && eq(tenth, [['Deal memo signed', '#FFFFFF00'], ['Second note on the tenth', '#FF0000']]),
        {notes: got, tenth: tenth}, 'eight days and the tenth');
      // The pasted notes on screen: March 2026 holds eight of the nine (the ninth is on 12/10/25).
      function marchPasted(){ return qa('#table-wrap .mv-note-block[data-note-kind="day"][data-note-day^="2026-03-"]').length; }
      var onScreen = [monthLabel(), marchPasted()];
      el('undo-btn').click(); await settle();
      var undone = await snap(), undoneScreen = marchPasted();
      el('redo-btn').click(); await settle();
      var redone = await snap(), redoneScreen = marchPasted();
      add('V5', 'the whole paste is ONE undo step: one undo takes all nine notes away, one redo puts them all back',
        eq(undone.dayNotes, before.dayNotes) && eq(redone.dayNotes, after.dayNotes) && !eq(before.dayNotes, after.dayNotes)
          && onScreen[0] === 'March 2026' && onScreen[1] === 8 && undoneScreen === 0 && redoneScreen === 8,
        {undoKeys: Object.keys(undone.dayNotes || {}).length, beforeKeys: Object.keys(before.dayNotes || {}).length,
         afterKeys: Object.keys(after.dayNotes || {}).length, march: [onScreen, undoneScreen, redoneScreen]}, 'undo = before, redo = after; 8, 0, 8 in March');
      await openPaste();
      await typePaste('3/13/26, Never added');
      overlay().dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
      await T.sleep(100);
      var escClosed = !overlay();
      await openPaste();
      await typePaste('3/13/26, Never added either');
      overlay().dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
      await T.sleep(100);
      var outClosed = !overlay();
      add('V6', 'Escape, and a press on the dimmed page outside the box, close it and add nothing',
        escClosed && outClosed && texts('2026-03-13').length === 0, {escape: escClosed, outside: outClosed}, 'closed, nothing added');

      // ================= W: item 17, one-day custom pills wrap =================
      await goTo('April 2026');
      function pillOf(name){ return qa('#table-wrap .mv-pill').filter(function (p) { return p.textContent.indexOf(name) === 0; }); }
      var w1 = pillOf('Network Table Read')[0], w2 = pillOf('Fittings')[0];
      function pillInfo(p){
        if(!p) return null;
        var s = p.getAttribute('style') || '';
        return {cls: p.className, col: (s.match(/grid-column:([^;]*)/) || [])[1], row: (s.match(/grid-row:([^;]*)/) || [])[1],
                h: Math.round(p.getBoundingClientRect().height), lines: Math.round((p.scrollHeight - 4) / 15)};
      }
      var i1 = pillInfo(w1), i2 = pillInfo(w2);
      add('W1', 'a one-day custom phase whose name does not fit wraps to two lines: .mv-pill-2l, two lanes, two lines tall (owner: "Wrap to two lines")',
        !!i1 && /mv-pill-2l/.test(i1.cls) && /span 2/.test(i1.row) && i1.h >= 34 && i1.lines >= 2, i1, '2 lanes, 2 lines');
      add('W2', 'a one-day custom phase whose name fits ("Fittings") stays one line in one lane, as before',
        !!i2 && !/mv-pill-2l/.test(i2.cls) && !/span/.test(i2.row), i2, 'one lane');
      await goTo('May 2026');
      var cm = pillOf('Costume and Hair').map(pillInfo);
      var fri = cm.filter(function (x) { return x.col.trim() === '6 / 7'; })[0], full = cm.filter(function (x) { return x.col.trim() === '2 / 7'; })[0];
      add('W3', 'ruling Q3 ("Any one-day piece"): the Friday piece of a custom phase that starts on a Friday wraps, and its full-week piece keeps one cut line',
        !!fri && /mv-pill-2l/.test(fri.cls) && !!full && !/mv-pill-2l/.test(full.cls) && !/span/.test(full.row), {friday: fri, week: full}, 'Friday wraps, the week does not');
      // Every wrapping pill, in every month, is a custom phase's, one day wide.
      var stray = [];
      await goTo('December 2025');
      for(var g = 0; g < 24; g++){
        qa('#table-wrap .mv-pill-2l').forEach(function (p) {
          var s = p.getAttribute('style') || '', c = (s.match(/grid-column:\s*(\d+)\s*\/\s*(\d+)/) || []);
          if(!/^custom\d+$/.test(p.getAttribute('data-ph') || '') || +c[2] - +c[1] !== 1) stray.push(monthLabel() + ':' + p.textContent);
        });
        var nx = el('mv-next'); if(!nx || nx.disabled) break; nx.click(); await T.sleep(80);
      }
      add('W4', 'no other bar wraps: every .mv-pill-2l in every month is a custom phase\'s one-day piece', stray.length === 0, stray, []);
    }

    // ================= the outputs =================
    // E8: the print path prints an edge month only when it holds something (ruling "Only if they hold something").
    var doc = await printDoc();
    var dm = docMonths(doc);
    var noFill = qa('.mv-note-block[data-note-day="2025-12-10"]', doc).map(function (b) { return b.getAttribute('style') || ''; });
    var hiPlus = qa('.mv-note-add[data-note-day="2026-12-23"]', doc).length;
    add('E8', 'the month PDF (print path) starts on December 2025, the edge month with notes and a holiday, and ends on April 2027: May 2027 holds nothing',
      dm[0] === 'December 2025' && dm[dm.length - 1] === 'April 2027' && dm.length === 17, {months: dm.length, first: dm[0], last: dm[dm.length - 1]}, '17 months, Dec 2025 to Apr 2027');
    add('E9', 'the print document carries the No fill note as the screen draws it (background:#FFFFFF00), and the hiatus day\'s hidden "+" lanes',
      noFill.length >= 1 && /background:#FFFFFF00/i.test(noFill[0]) && hiPlus > 0, {noFill: noFill, hiatusPlus: hiPlus}, 'both present');
    var pdf = await writerPdf();
    var pages = T.pdfPages(pdf);
    out.pdfs = {month: T.b64(pdf)};
    add('E10', 'the written month PDF (the direct writer) prints the same 17 months, one page each, and draws every new colour without an error',
      pages === dm.length, {pages: pages, printMonths: dm.length}, 'pages = months');
    // E11: the waterfall never sees a month-only holiday, even when it is ticked for the waterfall.
    el('view-sheet-btn').click(); await settle();
    var moveCb = qa('#holiday-vis-list .hv-row').filter(function (r) { return (r.textContent || '').indexOf('Office Move') === 0; })
      .map(function (r) { return q('.hv-cb[data-view="sheet"]', r); })[0];
    if(moveCb && !moveCb.checked){ moveCb.click(); await settle(); }
    var sheetText = ((q('#table-wrap table.sheet-table') || {}).textContent || '');
    add('E11', 'the waterfall shows no month-only holiday, not even one ticked "Show in Waterfall": no waterfall row could print it',
      !!moveCb && moveCb.checked && sheetText.indexOf('Office Move') < 0 && sheetText.indexOf('Studio Shutdown') < 0,
      {ticked: !!(moveCb && moveCb.checked), hasMove: sheetText.indexOf('Office Move') >= 0}, 'neither in the waterfall');
    if(moveCb && moveCb.checked){ moveCb.click(); await settle(); }
    el('view-month-btn').click(); await settle();

    if(!st){
      // ---------------- MINT: the real Save ----------------
      var written = [];
      var h = { name: 'mvnotes.sptcal', kind: 'file',
        queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
        isSameEntry: async function(o){ return o === h; },
        getFile: async function(){ return new File([written.length ? written[written.length - 1] : ''], 'mvnotes.sptcal', {lastModified: 1}); },
        createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ written.push(parts.join('')); } }; } };
      window.showSaveFilePicker = async function(){ return h; };
      el('save-file-btn').click();
      await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
      var text = written[0], saved = JSON.parse(text);
      out.sptcal = T.b64(new TextEncoder().encode(text));
      add('M1', 'the saved file carries the notes\' colours as stored (No fill as #FFFFFF00) and NO preference: mvNoteColor is not anywhere in it',
        text.indexOf('mvNoteColor') < 0 && dayList(saved, '2025-12-10')[0] && dayList(saved, '2025-12-10')[0].color === '#FFFFFF00'
          && dayList(saved, '2026-12-23')[0] && dayList(saved, '2026-12-23')[0].text === 'Crew holiday party',
        {bytes: text.length, hasPref: text.indexOf('mvNoteColor') >= 0}, 'colours kept, no pref');
    } else {
      // RESTORE: the minted file draws what it was saved with.
      await goTo('December 2025');
      var r1 = styleOf(blocks('2025-12-10', 'day')[0]), r1b = (blocks('2025-12-12', 'day')[0] || {getAttribute: function(){ return ''; }}).getAttribute('style');
      add('R1', 'restored, the No fill note still draws as text alone and the Pink one as Pink: the sanitizer keeps #FFFFFF00 for a day note',
        !!r1 && r1.bg === 'rgba(255, 255, 255, 0)' && r1.border === 'rgba(0, 0, 0, 0)' && /background:#F7C1D9/.test(r1b || ''), {noFill: r1, pink: r1b}, 'no box; pink');
      await goTo('April 2026');
      var rw = qa('#table-wrap .mv-pill-2l').map(function (p) { return p.textContent; });
      // April's last row is Sun 4/26 to Sat 5/2, so it shows custom2's Friday piece (5/1) too.
      add('R2', 'restored, the one-day custom pills still wrap: 4/15\'s one-day phase, and the Friday piece on April\'s last row (5/1)',
        rw.length === 2 && rw[0].indexOf('Network Table Read') === 0 && rw[1].indexOf('Costume and Hair') === 0, rw, 'two wrapping pills in April');
    }
    out.errors = (window.__ERR || []).slice(0, 10);
    add('Z', 'no console errors', !out.errors.length, out.errors, []);
  } catch (e) { out.EX = String(e && e.stack || e); }
  T.done(out);
})(); });
