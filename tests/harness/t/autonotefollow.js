// autonotefollow -- the automatic and holiday lines inside a Notes cell the user has TYPED in follow the calendar
// (November 2026 audit, Batch 1 item 1.1: AUD2-001, AUD2-002, AUD2-003; owner's decision D1 (a), 13 Nov 2026).
//
//   HARNESS_PAGE=/dist/index.html HARNESS_QUERY=g=a ./run.sh autonotefollow 240     (g = a | c | e | g, one fresh page each)
//
// A typed note used to freeze its week's automatic lines as text. So a milestone moved INTO a typed week was
// swallowed (AUD2-001), a moved or switched-off line stayed printed (AUD2-002), and a user's line written ABOVE the
// automatic one stopped the movers from re-dating it (AUD2-003). D1 (a): a line arrives when its holiday or
// milestone lands in the week, is re-dated wherever it sits in the note, and leaves when it is switched off, hidden
// or moved away. The user's own lines stay as typed, on their week.
//
// Every case reads the waterfall's Notes cells (what Excel and the waterfall PDF write: effectiveNoteText), and the
// month view's notes for the cases where the month view lost a line.
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass === true, observed: observed, expected: expected}); }
  function q(s, r){ return (r || document).querySelector(s); }
  function qa(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function txt(e){ return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function cellText(weekIso){
    var td = q('#table-wrap td.sheet-note-cell[data-week="' + weekIso + '"]');
    if(!td) return null;
    if(!td.classList.contains('has-note')) return '';   // an empty cell draws only the screen's "+"
    var body = td.querySelector('.cell-body') || td;
    return (body.innerText || body.textContent || '').replace(/\r/g, '').trim();
  }
  function allNotes(){ return qa('#table-wrap td.sheet-note-cell.has-note').map(function (td) { return td.innerText || td.textContent || ''; }).join(' | '); }
  function isoPlus(iso, days){ var d = new Date(iso + 'T00:00:00Z'); return new Date(d.getTime() + days * 86400000).toISOString().slice(0, 10); }
  function mondayIso(iso){ var d = new Date(iso + 'T00:00:00Z'); return isoPlus(iso, -((d.getUTCDay() + 6) % 7)); }
  function mdyToIso(t){ var m = /(\d+)\/(\d+)\/(\d+)/.exec(t || ''); return m ? ('20' + m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2)) : ''; }
  function fmt(iso){ var p = iso.split('-'); return (+p[1]) + '/' + (+p[2]) + '/' + p[0].slice(2); }
  function meta(){ return txt(document.getElementById('meta-production')); }
  function prodStart(){ var m = /(\d+\/\d+\/\d+)\s*→/.exec(meta()); return m ? mdyToIso(m[1]) : ''; }
  function wrapIso(){ var m = /→\s*(\d+\/\d+\/\d+)\s*$/.exec(meta()); return m ? mdyToIso(m[1]) : ''; }
  async function settle(){
    await T.sleep(500); var last = -1, st = 0;
    await T.until(function () { var n = (document.getElementById('table-wrap') || {innerHTML: ''}).innerHTML.length; st = (n === last && n > 0) ? st + 1 : 0; last = n; return st >= 3; }, 'settle', 150, 100);
  }
  async function view(mode){
    var on = mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table');
    if(on) return;
    document.getElementById(mode === 'month' ? 'view-month-btn' : 'view-sheet-btn').click();
    await T.until(function () { return mode === 'month' ? !!q('#table-wrap .mv-daygrid') : !!q('#table-wrap table.sheet-table'); }, mode, 100, 100);
    await settle();
  }
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  async function mvDay(iso){
    await view('month');
    var label = MONTHS[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4), want = Date.parse('1 ' + label);
    for(var i = 0; i < 60; i++){
      var my = txt(q('#table-wrap .mv-monthyear'));
      if(my === label) break;
      document.getElementById(Date.parse('1 ' + my) < want ? 'mv-next' : 'mv-prev').click(); await T.sleep(150);
    }
    await settle();
    var out = qa('#table-wrap .mv-note-block[data-note-day="' + iso + '"]').map(txt);
    await view('sheet');
    return out;
  }
  async function typeNote(wk, text){ await view('sheet'); await T.typeUserNote(wk, text); await settle(); }
  async function nudgeProd(dir){
    await view('sheet');
    var nb = document.getElementById('swatch-production').closest('.phase-row').querySelector('.ph-nudge-btn[data-nudge="' + dir + '"]');
    nb.click(); await T.sleep(1800); await settle();   // a burst closes on its timer: one undo step
  }
  function hvBox(hid, view){ return q('#holiday-vis-list input.hv-cb[data-hid="' + hid + '"][data-view="' + view + '"]'); }
  async function undo(){ document.getElementById('undo-btn').click(); await settle(); }
  async function fresh(){ T.buildFixture(); await settle(); await view('sheet'); }
  // One group per page (HARNESS_QUERY=g=...), so no group's typed notes reach another's weeks.
  var G = new URLSearchParams(location.search).get('g') || 'a';
  try {
    await T.appReady();
    await fresh();
    var S0 = '2026-06-29';
    if(G === 'a'){
    add('F0', 'control: the reference calendar starts Production 6/29/26 with its automatic note',
      prodStart() === S0 && cellText(S0) === 'Start Principal Photography 6/29/26', {start: prodStart(), cell: cellText(S0)}, 'Start Principal Photography 6/29/26');

    // ---- AUD2-001, the mover route: a typed note in an EMPTY week, then Production moved onto it (card arrow). ----
    await typeNote('2026-07-06', 'Dailies review');
    await nudgeProd('1');
    var n1 = {start: prodStart(), c706: cellText('2026-07-06'), c629: cellText(S0)};
    add('A1', 'AUD2-001: a milestone moved onto a typed week is added beside the typed text (card arrow)',
      n1.start === '2026-07-06' && n1.c706 === 'Start Principal Photography 7/6/26\nDailies review' && !n1.c629,
      n1, '7/6: Start Principal Photography 7/6/26 / Dailies review; 6/29 empty');
    var mv1 = await mvDay('2026-07-06');
    add('A2', 'AUD2-001: the month view draws the start note on Mon 7/6 too',
      mv1.indexOf('Start Principal Photography 7/6/26') >= 0 && mv1.indexOf('Dailies review') >= 0, mv1, 'both lines on 7/6');
    await undo();
    var u1 = {start: prodStart(), c706: cellText('2026-07-06'), c629: cellText(S0)};
    add('A3', 'one Undo puts the start date and both notes back exactly',
      u1.start === S0 && u1.c706 === 'Dailies review' && u1.c629 === 'Start Principal Photography 6/29/26', u1, 'as before the arrow');

    // ---- AUD2-001, route 1: a typed note, then the week's holiday ticked into the waterfall. ----
    await typeNote('2026-09-07', 'Camera test');
    var lbBefore = await mvDay('2026-09-07');
    hvBox('labor-day@2026', 'sheet').click(); await settle();
    var t1 = cellText('2026-09-07'), lb1 = await mvDay('2026-09-07');
    add('B1', 'AUD2-001: a holiday ticked into the waterfall is added to the typed note there',
      t1 === 'Labor Day 9/7/26\nCamera test', t1, 'Labor Day 9/7/26 / Camera test');
    add('B2', 'AUD2-001: and the month view keeps Labor Day on 9/7 (it lost it before the fix)',
      lbBefore.indexOf('Labor Day 9/7/26') >= 0 && lb1.indexOf('Labor Day 9/7/26') >= 0 && lb1.indexOf('Camera test') >= 0, {before: lbBefore, after: lb1}, 'Labor Day before and after');
    hvBox('labor-day@2026', 'sheet').click(); await settle();
    var t2 = cellText('2026-09-07'), lb2 = await mvDay('2026-09-07');
    add('B3', 'unticked again: it leaves the typed note, and the month view still shows it (month only)',
      t2 === 'Camera test' && lb2.indexOf('Labor Day 9/7/26') >= 0, {cell: t2, month: lb2}, 'Camera test; Labor Day in the month view');

    }
    // ---- AUD2-002, route 1: a line added under the start note, then the start TYPED later. ----
    if(G === 'c'){
    await typeNote(S0, 'Start Principal Photography 6/29/26\nCast arrives');
    T.set('start-production', '2026-07-13'); await settle();
    var d1 = {start: prodStart(), c629: cellText(S0), c713: cellText('2026-07-13')};
    add('C1', 'AUD2-002: a typed start date takes the start line out of the old week and leaves the user\'s line',
      d1.start === '2026-07-13' && d1.c629 === 'Cast arrives' && d1.c713 === 'Start Principal Photography 7/13/26', d1, '6/29: Cast arrives; 7/13: the start');
    add('C2', 'AUD2-002: no Notes cell still states the old start date', allNotes().indexOf('6/29/26') === -1, {found: allNotes().indexOf('6/29/26')}, 'absent');
    // The keystrokes' detour: away and back is a round trip, the order of the lines kept (the plan's N3 guard).
    T.set('start-production', '2026-08-03'); await settle();
    T.set('start-production', S0); await settle();
    var d2 = cellText(S0);
    add('C3', 'away and back again: the note is exactly what was typed (never chained one step to the next)',
      d2 === 'Start Principal Photography 6/29/26\nCast arrives', d2, 'Start Principal Photography 6/29/26 / Cast arrives');

    // ---- AUD2-002, route 2: a holiday switched off leaves an edited cell. ----
    var hidObs = 'independence-day-observed@2026';
    hvBox(hidObs, 'sheet').click(); await settle();
    var h0 = cellText(S0);
    add('D0', 'ticking Independence Day (Observed) into the waterfall adds it to the edited start week',
      /Independence Day \(Observed\) 7\/3\/26/.test(h0 || '') && /Cast arrives/.test(h0 || ''), h0, 'the holiday line beside the note');
    hvBox(hidObs, 'sheet').click(); await settle();
    var h1 = cellText(S0);
    add('D1', 'AUD2-002: switched out of the waterfall again, it leaves the edited cell',
      h1 === 'Start Principal Photography 6/29/26\nCast arrives', h1, 'Start Principal Photography 6/29/26 / Cast arrives');

    }
    // ---- AUD2-003: the user's line ABOVE the automatic one. ----
    if(G === 'e'){
    var W0 = wrapIso(), WW = mondayIso(W0), wrapLine = 'Principal Photography Wraps ' + fmt(W0);
    await typeNote(S0, 'Table read\nStart Principal Photography 6/29/26');
    await typeNote(WW, 'Crew party\n' + wrapLine);
    await nudgeProd('1');
    var e1 = {start: prodStart(), c629: cellText(S0), c706: cellText('2026-07-06'), notes: allNotes()};
    add('E1', 'AUD2-003: card arrow: the old start line leaves the note the user wrote above it',
      e1.start === '2026-07-06' && e1.c629 === 'Table read' && e1.c706 === 'Start Principal Photography 7/6/26', e1, '6/29: Table read; 7/6: the start');
    add('E2', 'AUD2-003: card arrow: no Notes cell states 6/29/26 or the old wrap',
      e1.notes.indexOf('6/29/26') === -1 && e1.notes.indexOf(wrapLine) === -1, {i629: e1.notes.indexOf('6/29/26'), iWrap: e1.notes.indexOf(wrapLine)}, 'absent');
    await undo();
    add('E3', 'one Undo restores both notes as typed',
      cellText(S0) === 'Table read\nStart Principal Photography 6/29/26' && cellText(WW) === 'Crew party\n' + wrapLine,
      {c629: cellText(S0), wrap: cellText(WW)}, 'as typed');
    // Shift All +1 wk: the notes travel with their weeks, so the start line is re-dated where it sits.
    document.getElementById('shift-fwd-btn').click(); await settle();
    var W1 = wrapIso(), sameWeek = mondayIso(W1) === isoPlus(WW, 7);
    var wantWrap = sameWeek ? 'Crew party\nPrincipal Photography Wraps ' + fmt(W1) : 'Crew party';
    var s1 = {start: prodStart(), c706: cellText('2026-07-06'), wrapCell: cellText(isoPlus(WW, 7)), wrap: W1, notes: allNotes()};
    add('E4', 'AUD2-003: Shift +1 wk re-dates the start line under the user\'s line above it',
      s1.start === '2026-07-06' && s1.c706 === 'Table read\nStart Principal Photography 7/6/26', s1, 'Table read / Start Principal Photography 7/6/26');
    add('E5', 'AUD2-003: and the wrap line (re-dated, or gone if the wrap left that week)', s1.wrapCell === wantWrap, s1.wrapCell, wantWrap);
    add('E6', 'AUD2-003: no Notes cell states the old dates after the shift',
      s1.notes.indexOf('6/29/26') === -1 && s1.notes.indexOf(wrapLine) === -1, {i629: s1.notes.indexOf('6/29/26'), iWrap: s1.notes.indexOf(wrapLine)}, 'absent');

    }
    // ---- Guards: what must NOT change. ----
    if(G === 'g'){
    // A user's own copy of a milestone line in ANOTHER week is their text, not the milestone.
    await typeNote('2026-08-03', 'Start Principal Photography 6/29/26');
    T.set('weeks-post', '17'); await settle();
    add('G1', 'a copy of a milestone line typed in another week is left alone by an unrelated edit',
      cellText('2026-08-03') === 'Start Principal Photography 6/29/26' && cellText(S0) === 'Start Principal Photography 6/29/26',
      {c803: cellText('2026-08-03'), c629: cellText(S0)}, 'both unchanged');
    // A plain note with no automatic line in its week never changes.
    await typeNote('2026-08-10', 'Network notes call');
    T.set('start-production', '2026-07-06'); await settle();
    add('G2', 'a note with no automatic line in its week stays exactly as typed when Production moves',
      cellText('2026-08-10') === 'Network notes call', cellText('2026-08-10'), 'Network notes call');
    }

    // ---- MINT (g=m): tests/fixtures/autonotefollow.sptcal, the reference calendar with typed notes in the weeks the
    // cases use, saved through the real Save. A calendar to try the fix on by hand: Production's ▼ moves the start
    // onto "Dailies review" and out from under "Table read"; ticking Labor Day's Waterfall box adds it to "Camera test".
    if(G === 'm'){
      var W0m = wrapIso(), WWm = mondayIso(W0m);
      await typeNote(S0, 'Table read\nStart Principal Photography 6/29/26');
      await typeNote('2026-07-06', 'Dailies review');
      await typeNote('2026-09-07', 'Camera test');
      await typeNote(WWm, 'Principal Photography Wraps ' + fmt(W0m) + '\nWrap party Fri');
      var written = [];
      var h = { name: 'autonotefollow.sptcal', kind: 'file',
        queryPermission: async function(){ return 'granted'; }, requestPermission: async function(){ return 'granted'; },
        isSameEntry: async function(o){ return o === h; },
        getFile: async function(){ return new File([written.length ? written[written.length - 1] : ''], 'autonotefollow.sptcal', {lastModified: 1}); },
        createWritable: async function(){ var parts = []; return { write: async function(c){ parts.push(typeof c === 'string' ? c : await c.text()); }, close: async function(){ written.push(parts.join('')); } }; } };
      window.showSaveFilePicker = async function(){ return h; };
      document.getElementById('save-file-btn').click();
      await T.until(function () { return written.length > 0; }, 'the Save write', 100, 100);
      var mintSnap = JSON.parse(written[0]), un = mintSnap.userNotes || {};
      add('M1', 'the minted calendar carries the four typed notes',
        Object.keys(un).length === 4 && (un[S0] || {}).text === 'Table read\nStart Principal Photography 6/29/26',
        un, 'four notes');
      var mintOut = {sptcal: T.b64(new TextEncoder().encode(written[0]))};
    }

    var clipped = T.clippedCells();
    add('X1', 'no horizontally clipped cell', clipped.h.length === 0, clipped.h.slice(0, 5), 0);
  } catch (err) {
    add('ERR', 'the leg threw', false, String(err && err.stack || err), 'no error');
  }
  T.done(Object.assign({group: G, cases: cases}, typeof mintOut !== 'undefined' && mintOut ? mintOut : {}));
})(); });
