// anchorside -- the ONE Shift tool (owner, 4 Nov 2026: "Ok im going to vote we go with C, one master shift tool";
// ANCHOR-TO-DIRECTION-PLAN.md §2, §5 step 3 and §6). Shift All's form, Shift From and Anchor To are one popover with
// two choices: What moves (All phases | Phase & before | Phase & after) and How far (By weeks | To a date). Since
// 5 Nov 2026 (owner: "lets go with A"; plan §7) a LIST of the phases sits under the phase, Rebuild From's rows with a
// tick each: the three buttons fill the ticks in, a tick changed by hand makes the user's own set (no button pressed),
// and for that set a note moves when its week is inside a ticked phase's run (T2). Folded under All phases.
//
//   HARNESS_PAGE=/dist/index.html HARNESS_STATE=anchorside ./run.sh anchorside 400
//
// THE CALENDAR: tests/fixtures/anchorside.sptcal, which is dayoverrides.sptcal with, added by script:
//   Localization 3/1/27 x 8, a calendar range start of 2/2/26, an UNLOCKED one-week "Fall Break" from 9/21/26 (inside
//   the shoot), and six week notes: PREP-NOTE (4/13, Pre Prep), SHOOT-WK6 (8/3, the shoot's 6th week), "Wrap party
//   booked" (7/27, DATED 7/30, so pinned), OVERLAP-WK (11/2), POST-WK3 (11/16, Post) and LOC-WK2 (3/8/27, Localization).
// TWO OVERLAPS, both by days: with the Fall Break the shoot wraps Tue 11/3, so Post (Mon 11/2) starts inside it; and
// Pre Prep (snap-off Wed 4/8 x 6) works to Tue 5/19, inside Prod Prep's first week (Mon 5/18). Prod Prep (to Fri 6/26)
// and Production (Mon 6/29) are back to back, which is NOT an overlap.
// THE RULE: a part move takes the picked phase and every phase STARTING on its side; an overlap does not count.
// Notes, unlocked hiatuses and the range go by the picked phase's start week (after) or LAST week (before).
// ⛔ For one deploy (c52094f) overlapping phases moved too (owner's "Overlaps move too"); the owner reverted it the
// same night: "how would you move everything except for writers room", whose room ran into Pre-Prep. X2 holds that.
// From dayoverrides it keeps: Writer's Rm 1/5/26 x 12, Pre Prep snap-off Wed 4/8 x 6, Prod Prep 5/18 x 6, Production
// Mon 6/29/26 (80 days, US General) with four day marks (7/3 on, 7/6 half, 7/7 off, 7/11 on), the LOCKED "Summer
// Break" 7/13 x 1, Post 11/2 x 16, and the locked Christmas hiatuses.
//
// Every move is read back from the crash backup, which IS captureSnapshot(), and compared key-sorted.
//
//   T0      truth guard: the calendar as loaded, and the wrap before Post
//   O1      the form opens on All phases, By weeks: the phase row, the date row and the list hidden behind "Choose
//           phases…", no Whole schedule
//   L1      "Choose phases…" opens the list: every phase ticked, "6 of 6 move", All phases still pressed
//   X1      Phase & after + Production: the list ticks the shoot onward and says the three earlier phases stay
//   X2      Phase & after + Prod Prep moves Prod Prep onward and LEAVES Pre Prep, which started earlier and runs into
//           it (the owner's "everything except for writers room"); its notes stay too
//   C1      a tick changed by hand (Localization off): no button pressed, "3 of 6 move"; Later moves the three ticked
//           phases and their notes; Localization's note stays (T2: not inside a ticked phase's run)
//   C2      T2's shared week: only Production ticked, +1 wk: the shoot's notes move, the 11/2 note it shares with Post
//           goes with the shoot, Post's own note stays, the Fall Break moves, the marks travel, the range stays
//   C3      nothing ticked: Later says so and moves nothing
//   C4      T2 across a gap: Pre Prep and Post ticked, the shoot between them not: each ticked phase takes its own
//           notes, the shoot's note, its Fall Break and its marks stay (red on a one-span build)
//   H1      Phase & before + Production: the list ticks the four phases up to the shoot; Post (it starts inside the
//           shoot's last week) and Localization stay
//   B1      Phase & before Production, 2 wks Earlier: the four phases up to Production move; Post and Localization keep
//   B2      ... notes in Pre Prep, the shoot's week 6 and its LAST week (11/2, which Post shares) move; Post's week 3
//           and Localization's stay (the last-week bound)
//   B3      ... the unlocked hiatus inside the shoot moves; the locked Summer Break and Christmas stay
//   B5      ... the dated note stays, and nothing keyed by a holiday moved
//   Bm      ... the result line: what moved and what stayed
//   Br      ... the calendar range's start (before the bound) moved
//   U1      one Undo restores the whole snapshot
//   F2      Phase & before to a date (Production starts on 6/15) = Phase & before by 2 weeks, snapshot for snapshot
//   B4      Production's marks keep their shoot-day numbers: Phase & before -2 wks = All phases -2 wks, mark for mark
//   E1      All phases is today's call: the arrow, the form by weeks and the form to a date give one snapshot
//   F1      Phase & after Post by 1 wk = the old Shift From: Post and Localization a week later, the shoot (which
//           runs into Post) and everything before stays; the list said so first
//   A1      Phase & after to a date (Post starts on 11/16) = Phase & after by 2 weeks, snapshot for snapshot
//   B6      Phase & before, Production "ends by": lands on or before the date; Post and Localization stay
//   W1      Whole schedule is offered only for All phases to a date (every tick on and fixed), and leaving that
//           choice drops it for Production
//   O2      reopened after a hand-picked set: back to All phases, By weeks, the list folded (ruling R2(a))
//   I1      no choice button or tick carries an id, and every control is inside .tools-menu
//   S1      no new key in fields.byId, in any snapshot taken
//   E0      0 console errors
window.__T.memoryIDB();
window.addEventListener('load', function () { (async function () {
  var T = window.__T, cases = [];
  function add(id, title, pass, observed, expected){ cases.push({id: id, title: title, pass: pass, observed: observed, expected: expected}); }
  function $(id){ return document.getElementById(id); }
  function val(id){ return ($(id) || {}).value; }
  function txt(id){ return (($(id) || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  var MENU = function () { return $('pop-shift'); };
  function q(sel){ return MENU().querySelector(sel); }
  function msg(){ return ((q('[data-tools-msg]') || {}).textContent || '').trim(); }
  function listRows(){ return Array.prototype.map.call(MENU().querySelectorAll('[data-shift-list] .solve-row'), function (r) { return (r.innerText || r.textContent || '').replace(/\s+/g, ' ').trim(); }); }
  function moving(){ return listRows().map(function (r) { return r.replace(/ \d+\/\d+\/\d+ /, ' '); }); }
  function count(){ return ((q('[data-shift-count]') || {}).textContent || '').trim(); }
  function listShown(){ return !hiddenOf('[data-shift-list-wrap]'); }
  function linkShown(){ return !hiddenOf('[data-shift-choose]'); }
  function pressed(){ return Array.prototype.map.call(MENU().querySelectorAll('[data-move]'), function (b) { return b.dataset.move + ':' + b.getAttribute('aria-pressed'); }).join(' '); }
  function tick(key, on){ var b = q('input[data-key="' + key + '"]'); if(!b) throw new Error('no tick for ' + key); if(b.checked !== on){ b.checked = on; b.dispatchEvent(new Event('change', {bubbles: true})); } }
  function closePops(){ document.body.click(); }
  async function openShift(){ closePops(); await T.sleep(150); $('pop-shift-btn').click(); await T.sleep(250); }
  async function choose(move, far){
    if(move) q('[data-move="' + move + '"]').click();
    if(far) q('[data-far="' + far + '"]').click();
    await T.sleep(120);
  }
  async function settle(){ await T.sleep(900); }
  async function undo(){ $('undo-btn').click(); await T.sleep(900); }
  function hiddenOf(sel){ var e = q(sel); return !e || e.hidden || getComputedStyle(e).display === 'none'; }
  function phaseOpts(){ return Array.prototype.map.call($('tool-anchor-phase').options, function (o) { return o.value; }); }
  // Key-sorted, so two snapshots that hold the same state compare equal whatever order their maps were built in.
  function canon(o){
    if(Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
    if(o && typeof o === 'object') return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(o[k]); }).join(',') + '}';
    return JSON.stringify(o);
  }
  var lastAt = 0;
  async function snap(){
    var got = null;
    await T.until(function () {
      got = T.latestBackup();
      return !!(got && got.state && got.at > lastAt);
    }, 'a fresh crash backup', 150, 100);
    lastAt = got.at;
    return got.state;
  }
  var KEYS = ['writersRoom', 'prePrep', 'prodPrep', 'production', 'post', 'localization'];
  function startsOf(s){ var o = {}; KEYS.forEach(function (k) { o[k] = ((s.fields.byId['start-' + k]) || {}).value; }); return o; }
  function notesOf(s){ var o = {}; Object.keys(s.userNotes || {}).sort().forEach(function (k) { o[k] = s.userNotes[k].text; }); return o; }
  function hiatusOf(s){ return (s.fields.hiatuses || []).map(function (h) { return h.start + (h.locked ? ' locked' : '') + (h.name ? ' ' + h.name : ''); }); }
  function same(a, b){ return canon(a) === canon(b); }
  // The wrap is the meta line's last date.
  function wrapIso(){
    var m = /→\s*(\d+)\/(\d+)\/(\d+)\s*$/.exec(txt('meta-production'));
    return m ? ('20' + m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2)) : '';
  }
  function addDaysIso(iso, n){ var d = new Date(iso + 'T00:00:00Z'); return new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10); }
  var snaps = [];
  async function take(){ var s = await snap(); snaps.push(s); return s; }

  try {
    await T.appReady();
    await T.until(function () { return /shoot days/.test(txt('meta-production')); }, 'the restored calendar', 200, 100);
    await T.sleep(1500);
    // A loaded calendar is clean, and a clean page writes no backup: one edit that is not a schedule input.
    T.set('show-title', 'Anchor Side');
    var s0 = await take();
    var st0 = startsOf(s0), n0 = notesOf(s0), w0 = wrapIso(), ov0 = s0.dayOverrides;
    add('T0', 'the calendar as loaded: six phases, six notes, the Fall Break unlocked, the wrap Tue 11/3 (inside Post\'s first week)',
      same(st0, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-18', production: '2026-06-29', post: '2026-11-02', localization: '2027-03-01'})
        && same(n0, {'2026-04-13': 'PREP-NOTE', '2026-07-27': 'Wrap party booked', '2026-08-03': 'SHOOT-WK6', '2026-11-02': 'OVERLAP-WK', '2026-11-16': 'POST-WK3', '2027-03-08': 'LOC-WK2'})
        && hiatusOf(s0).indexOf('2026-09-21 Fall Break') >= 0 && hiatusOf(s0).indexOf('2026-07-13 locked Summer Break') >= 0
        && w0 === '2026-11-03' && val('cal-range-start') === '2026-02-02',
      {starts: st0, notes: n0, hiatuses: hiatusOf(s0), wrap: w0, range: val('cal-range-start')}, 'the fixture; wrap 2026-11-03');

    // ---- O1: the form as it opens ----
    await openShift();
    var o1 = {open: MENU().classList.contains('open'), move: q('[data-move="all"]').getAttribute('aria-pressed'), far: q('[data-far="weeks"]').getAttribute('aria-pressed'),
              phaseRow: hiddenOf('[data-shift-phase-row]'), weeksRow: hiddenOf('[data-far-row="weeks"]'), dateRow: hiddenOf('[data-far-row="date"]'),
              whole: phaseOpts().indexOf('__whole_schedule__') >= 0, label: txt('pop-shift-btn'), list: listShown(), link: linkShown(), hint: !!q('[data-shift-hint]'),
              width: Math.round(MENU().getBoundingClientRect().width), height: Math.round(MENU().getBoundingClientRect().height)};
    add('O1', 'it opens on All phases, By weeks: no phase row, no date row, the list folded behind "Choose phases…", no Whole schedule; the button reads "Shift"',
      o1.open && o1.move === 'true' && o1.far === 'true' && o1.phaseRow && !o1.weeksRow && o1.dateRow && !o1.whole && /^Shift\b/.test(o1.label) && !/All/.test(o1.label)
        && o1.width === 340 && !o1.list && o1.link && !o1.hint && o1.height < 260,
      o1, 'all pressed, weeks pressed; phase row, date row and list hidden, the link shown; 340 px, under 260 tall');
    q('[data-shift-choose]').click(); await T.sleep(150);
    add('L1', '"Choose phases…" opens the list: six rows, every one ticked and "Moves", "6 of 6 move", All phases still pressed, the link gone',
      listShown() && !linkShown() && count() === '6 of 6 move' && pressed() === 'all:true before:false after:false'
        && same(moving(), ["Writer's Rm Moves", 'Pre Prep Moves', 'Prod Prep Moves', 'Production Moves', 'Post Moves', 'Localization Moves'])
        && MENU().querySelectorAll('[data-shift-list] input[data-key]:checked').length === 6,
      {rows: listRows(), count: count(), pressed: pressed()}, 'six ticked rows');

    // ---- X1, X2: what counts as an overlap (the hint is worked out by the same shiftPlan() the move uses) ----
    await choose('after');
    T.set('tool-anchor-phase', 'production'); await T.sleep(150);
    var x1 = {rows: moving(), count: count(), pressed: pressed()};
    add('X1', 'Phase & after + Production: the list ticks the shoot, Post and Localization; Writer\'s Rm, Pre Prep and Prod Prep stay',
      same(x1.rows, ["Writer's Rm Stays", 'Pre Prep Stays', 'Prod Prep Stays', 'Production Moves', 'Post Moves', 'Localization Moves']) && x1.count === '3 of 6 move'
        && x1.pressed === 'all:false before:false after:true', x1, 'three Stays, three Moves, "3 of 6 move"');
    T.set('tool-anchor-phase', 'prodPrep'); await T.sleep(150);
    var x2 = {rows: moving(), count: count()};
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mX2 = msg(), sX2 = await take(), stX2 = startsOf(sX2), nX2 = notesOf(sX2);
    add('X2', 'Phase & after Prod Prep +1 wk leaves Pre Prep, which started earlier and works into Prod Prep\'s first week (the owner\'s case: everything but the Writer\'s Room)',
      same(x2.rows, ["Writer's Rm Stays", 'Pre Prep Stays', 'Prod Prep Moves', 'Production Moves', 'Post Moves', 'Localization Moves']) && x2.count === '4 of 6 move'
        && same(stX2, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-25', production: '2026-07-06', post: '2026-11-09', localization: '2027-03-08'})
        && nX2['2026-04-13'] === 'PREP-NOTE' && nX2['2026-08-10'] === 'SHOOT-WK6'
        && /Prod Prep and everything after it moved \(4 phases\)\. 2 stayed where they were\./.test(mX2),
      {list: x2, starts: stX2, notes: nX2, msg: mX2}, 'Pre Prep and Writer\'s Rm unmoved; Prod Prep 5/25 and every later phase a week on');
    await undo(); await take();

    // ---- C1: a tick changed by hand -- the user's own set ----
    await openShift(); await choose('after');
    T.set('tool-anchor-phase', 'prodPrep'); await T.sleep(150);
    tick('localization', false); await T.sleep(150);
    var c1 = {pressed: pressed(), count: count(), rows: moving(), list: listShown()};
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mC1 = msg(), sC1 = await take(), stC1 = startsOf(sC1), nC1 = notesOf(sC1);
    add('C1', 'Localization unticked by hand: no button pressed, "3 of 6 move"; Later moves Prod Prep, the shoot and Post with their notes; Localization and its note stay (T2), and so do the earlier phases',
      c1.pressed === 'all:false before:false after:false' && c1.count === '3 of 6 move' && c1.list
        && same(stC1, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-25', production: '2026-07-06', post: '2026-11-09', localization: '2027-03-01'})
        && same(nC1, {'2026-04-13': 'PREP-NOTE', '2026-07-27': 'Wrap party booked', '2026-08-10': 'SHOOT-WK6', '2026-11-09': 'OVERLAP-WK', '2026-11-23': 'POST-WK3', '2027-03-08': 'LOC-WK2'})
        && hiatusOf(sC1).indexOf('2026-09-28 Fall Break') >= 0 && ((sC1.fields.byId['cal-range-start']) || {}).value === '2026-02-02'
        && /^Shifted 1 week later\./.test(mC1) && /3 ticked phases moved\. Writer's Rm, Pre Prep and Localization stayed where they were\./.test(mC1),
      {before: c1, starts: stC1, notes: nC1, msg: mC1}, 'Prod Prep 5/25, Production 7/6, Post 11/9; Localization 3/1/27 and LOC-WK2 3/8/27 unmoved; "3 ticked phases moved…"');
    await undo(); await take();

    // ---- C2: T2's shared week -- only Production ticked ----
    await openShift();
    q('[data-shift-choose]').click(); await T.sleep(150);
    ['writersRoom', 'prePrep', 'prodPrep', 'post', 'localization'].forEach(function (k) { tick(k, false); });
    await T.sleep(150);
    var c2 = {pressed: pressed(), count: count(), phaseRow: hiddenOf('[data-shift-phase-row]')};
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mC2 = msg(), sC2 = await take(), stC2 = startsOf(sC2), nC2 = notesOf(sC2);
    add('C2', 'only Production ticked, +1 wk: the shoot moves alone; its week-6 note and the 11/2 note it shares with Post go with it (T2), Post\'s own note stays; the Fall Break moves, the marks travel by shoot day, the range start stays',
      c2.pressed === 'all:false before:false after:false' && c2.count === '1 of 6 move' && c2.phaseRow
        && same(stC2, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-18', production: '2026-07-06', post: '2026-11-02', localization: '2027-03-01'})
        && same(nC2, {'2026-04-13': 'PREP-NOTE', '2026-07-27': 'Wrap party booked', '2026-08-10': 'SHOOT-WK6', '2026-11-09': 'OVERLAP-WK', '2026-11-16': 'POST-WK3', '2027-03-08': 'LOC-WK2'})
        && hiatusOf(sC2).indexOf('2026-09-28 Fall Break') >= 0 && ((sC2.fields.byId['cal-range-start']) || {}).value === '2026-02-02'
        && same(sC2.dayOverrides, {'2026-07-10': 'half', '2026-07-20': 'off', '2026-07-25': 'on'})   // the overrides leg's PLUS_ONE
        && /1 ticked phase moved\. Writer's Rm, Pre Prep, Prod Prep, Post and Localization stayed where they were\./.test(mC2),
      {before: c2, starts: stC2, notes: nC2, marks: sC2.dayOverrides, hiatuses: hiatusOf(sC2), range: sC2.fields.byId['cal-range-start'], msg: mC2}, 'Production 7/6 alone; SHOOT-WK6 8/10, OVERLAP-WK 11/9, POST-WK3 still 11/16; Fall Break 9/28');
    await undo(); var sC2u = await take();
    add('C2u', 'one Undo restores the whole snapshot', canon(sC2u) === canon(s0), {starts: startsOf(sC2u)}, 'the T0 snapshot');

    // ---- C4: T2 across a gap -- Pre Prep and Post ticked, the shoot between them not ----
    await openShift();
    q('[data-shift-choose]').click(); await T.sleep(150);
    ['writersRoom', 'prodPrep', 'production', 'localization'].forEach(function (k) { tick(k, false); });
    await T.sleep(150);
    var c4Count = count();
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mC4 = msg(), sC4 = await take(), stC4 = startsOf(sC4), nC4 = notesOf(sC4);
    add('C4', 'Pre Prep and Post ticked, not the shoot between them, +1 wk: each takes its own notes (PREP-NOTE, the 11/2 note, POST-WK3); the shoot\'s note, its Fall Break and its marks stay, and so does Localization\'s note',
      c4Count === '2 of 6 move'
        && same(stC4, {writersRoom: '2026-01-05', prePrep: '2026-04-15', prodPrep: '2026-05-18', production: '2026-06-29', post: '2026-11-09', localization: '2027-03-01'})
        && same(nC4, {'2026-04-20': 'PREP-NOTE', '2026-07-27': 'Wrap party booked', '2026-08-03': 'SHOOT-WK6', '2026-11-09': 'OVERLAP-WK', '2026-11-23': 'POST-WK3', '2027-03-08': 'LOC-WK2'})
        && hiatusOf(sC4).indexOf('2026-09-21 Fall Break') >= 0 && same(sC4.dayOverrides, ov0)
        && /2 ticked phases moved\. Writer's Rm, Prod Prep, Production and Localization stayed where they were\./.test(mC4),
      {count: c4Count, starts: stC4, notes: nC4, hiatuses: hiatusOf(sC4), marks: sC4.dayOverrides, msg: mC4}, 'Pre Prep 4/15, Post 11/9; PREP-NOTE 4/20, OVERLAP-WK 11/9, POST-WK3 11/23; SHOOT-WK6 still 8/3, Fall Break 9/21');
    await undo(); await take();

    // ---- C3: nothing ticked ----
    await openShift();
    q('[data-shift-choose]').click(); await T.sleep(150);
    KEYS.forEach(function (k) { tick(k, false); });
    await T.sleep(150);
    var c3Count = count();
    $('tool-shift-later').click(); await T.sleep(600);
    var sC3 = T.latestBackup();
    add('C3', 'nothing ticked: Later says "Tick a phase to move." and moves nothing',
      c3Count === '0 of 6 move' && msg() === 'Tick a phase to move.' && MENU().querySelector('[data-tools-msg]').classList.contains('warn')
        && same(startsOf(sC3.state), st0) && sC3.at === lastAt,
      {count: c3Count, msg: msg(), starts: startsOf(sC3.state)}, 'warning, no new backup, every start as loaded');
    await openShift();

    // ---- H1 + B: Phase & before, Production, 2 weeks Earlier ----
    await choose('before');
    T.set('tool-anchor-phase', 'production'); await T.sleep(150);
    var h1 = {rows: moving(), count: count(), phaseRow: hiddenOf('[data-shift-phase-row]'), whole: phaseOpts().indexOf('__whole_schedule__') >= 0};
    add('H1', 'Phase & before + Production: the phase row shows, and the list ticks the four phases up to the shoot; Post (it STARTS after the shoot does) and Localization stay',
      !h1.phaseRow && !h1.whole && h1.count === '4 of 6 move'
        && same(h1.rows, ["Writer's Rm Moves", 'Pre Prep Moves', 'Prod Prep Moves', 'Production Moves', 'Post Stays', 'Localization Stays']), h1,
      'four Moves, then Post Stays, Localization Stays');
    T.set('tool-shift-weeks', '2');
    $('tool-shift-earlier').click(); await settle();
    var mB = msg();
    var sB = await take(), stB = startsOf(sB), nB = notesOf(sB);
    add('B1', 'Phase & before Production -2 wks: Writer\'s Rm, Pre Prep, Prod Prep and Production move; Post and Localization keep their dates',
      same(stB, {writersRoom: '2025-12-22', prePrep: '2026-03-25', prodPrep: '2026-05-04', production: '2026-06-15', post: '2026-11-02', localization: '2027-03-01'}),
      stB, 'WR 12/22/25, Pre Prep 3/25, Prod Prep 5/4, Production 6/15, Post 11/2, Localization 3/1/27');
    add('B2', 'notes: Pre Prep\'s, the shoot\'s week 6 and its LAST week\'s (11/2, shared with Post) move 2 weeks; Post\'s week 3 and Localization\'s stay',
      nB['2026-07-20'] === 'SHOOT-WK6' && nB['2026-03-30'] === 'PREP-NOTE' && nB['2026-10-19'] === 'OVERLAP-WK' && nB['2026-11-16'] === 'POST-WK3'
        && nB['2027-03-08'] === 'LOC-WK2' && !nB['2026-08-03'] && !nB['2026-04-13'] && !nB['2026-11-02'],
      nB, 'SHOOT-WK6 on 7/20, PREP-NOTE on 3/30, OVERLAP-WK on 10/19, POST-WK3 still on 11/16, LOC-WK2 still on 3/8/27');
    var hB = hiatusOf(sB);
    add('B3', 'the unlocked Fall Break inside the shoot moves with it (9/21 -> 9/7); the locked Summer Break and Christmas stay',
      hB.indexOf('2026-09-07 Fall Break') >= 0 && hB.indexOf('2026-09-21 Fall Break') < 0 && hB.indexOf('2026-07-13 locked Summer Break') >= 0
        && hB.indexOf('2026-12-21 locked') >= 0, hB, 'Fall Break 9/7; Summer Break 7/13 and 12/21 locked as they were');
    // Holidays are never stored (they come from the region's rules), so what CAN move is what is keyed by one.
    add('B5', 'the dated note stays on its week, and nothing keyed by a holiday moved',
      nB['2026-07-27'] === 'Wrap party booked' && sB.userNotes['2026-07-27'].date === '2026-07-30'
        && same(sB.holidayView, s0.holidayView) && same(sB.holidayOff, s0.holidayOff) && same(sB.customHolidays, s0.customHolidays),
      {note: sB.userNotes['2026-07-27'], holidayView: sB.holidayView, holidayOff: sB.holidayOff}, '"Wrap party booked" (7/30) on 7/27; holiday stores as loaded');
    add('Bm', 'the result line says what moved and what stayed',
      /^Shifted 2 weeks earlier\./.test(mB) && /Production and everything before it moved \(4 phases\)\. 2 stayed where they were\./.test(mB),
      {msg: mB}, '"Shifted 2 weeks earlier. … Production and everything before it moved (4 phases). 2 stayed where they were."');
    add('Br', 'the calendar range\'s start, before the bound, moved with it (2/2 -> 1/19)',
      ((sB.fields.byId['cal-range-start']) || {}).value === '2026-01-19', {range: sB.fields.byId['cal-range-start']}, '2026-01-19');
    await undo();
    var sU = await take();
    add('U1', 'one Undo restores the whole snapshot', canon(sU) === canon(s0), {starts: startsOf(sU), notes: notesOf(sU), hiatuses: hiatusOf(sU)}, 'the T0 snapshot, key for key');

    // ---- F2: Phase & before TO A DATE, Production starts on 6/15 = the same move by 2 weeks ----
    await openShift(); await choose('before', 'date');
    T.set('tool-anchor-phase', 'production'); T.set('tool-anchor-edge', 'start'); await T.sleep(150);
    var f2Prefill = val('tool-anchor-date');
    T.set('tool-anchor-date', '2026-06-15');
    $('tool-anchor-go').click(); await settle();
    var mF2 = msg(), sF2 = await take();
    add('F2', 'Phase & before to a date (Production starts on 6/15) = Phase & before by 2 weeks, snapshot for snapshot',
      canon(sF2) === canon(sB) && f2Prefill === '2026-06-29' && /Production starts 6\/15\/26\./.test(mF2) && /Production and everything before it moved \(4 phases\)/.test(mF2),
      {starts: startsOf(sF2), notes: notesOf(sF2), prefill: f2Prefill, msg: mF2}, 'the B snapshot; prefill 6/29; "Production starts 6/15/26."');
    await undo(); await take();

    // ---- B4: the marks keep their shoot-day numbers (differential: All phases -2 moves the shoot identically) ----
    await openShift();
    T.set('tool-shift-weeks', '2');
    $('tool-shift-earlier').click(); await settle();
    var sAll = await take();
    add('B4', 'Production\'s day marks keep their shoot-day numbers: Phase & before -2 wks lands them exactly where All phases -2 wks does, and they moved',
      same(sB.dayOverrides, sAll.dayOverrides) && !same(sB.dayOverrides, ov0) && startsOf(sAll).production === '2026-06-15' && startsOf(sAll).post === '2026-10-19',
      {before: sB.dayOverrides, all: sAll.dayOverrides, original: ov0}, 'equal, and not the original');
    await undo(); await take();

    // ---- E1: All phases is today's call -- the arrow, the form by weeks and the form to a date ----
    closePops(); await T.sleep(150);
    $('shift-fwd-btn').click(); await settle();
    var sArrow = await take();
    await undo(); await take();
    await openShift();
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mE = msg(), sForm = await take();
    await undo(); await take();
    await openShift(); await choose(null, 'date');
    T.set('tool-anchor-phase', 'production'); T.set('tool-anchor-edge', 'start'); await T.sleep(150);
    T.set('tool-anchor-date', '2026-07-06');
    $('tool-anchor-go').click(); await settle();
    var mE2 = msg(), sDate = await take();
    await undo(); await take();
    add('E1', 'All phases: the 1 wk -> arrow, the form by 1 week and the form to a date (Production starts 7/6) give one snapshot, and no part-calendar words',
      canon(sForm) === canon(sArrow) && canon(sDate) === canon(sArrow) && startsOf(sArrow).post === '2026-11-09' && startsOf(sArrow).writersRoom === '2026-01-12'
        && /^Shifted 1 week later\./.test(mE) && !/moved \(/.test(mE) && !/moved \(/.test(mE2) && /Production starts 7\/6\/26\./.test(mE2),
      {arrow: startsOf(sArrow), form: startsOf(sForm), date: startsOf(sDate), msg: mE, msg2: mE2}, 'three equal snapshots, every phase a week later');

    // ---- F1: Phase & after Post by 1 week = the old Shift From (the shoot runs into Post and stays) ----
    await openShift(); await choose('after');
    T.set('tool-anchor-phase', 'post'); await T.sleep(150);
    var f1List = {rows: moving(), count: count()};
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mF1 = msg(), sF1 = await take(), stF1 = startsOf(sF1), nF1 = notesOf(sF1);
    add('F1', 'Phase & after Post +1 wk (the old Shift From): Post and Localization a week later; the shoot, every earlier phase, its notes, marks, hiatus and the range start stay',
      same(stF1, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-18', production: '2026-06-29', post: '2026-11-09', localization: '2027-03-08'})
        && same(nF1, {'2026-04-13': 'PREP-NOTE', '2026-07-27': 'Wrap party booked', '2026-08-03': 'SHOOT-WK6', '2026-11-09': 'OVERLAP-WK', '2026-11-23': 'POST-WK3', '2027-03-15': 'LOC-WK2'})
        && same(sF1.dayOverrides, ov0) && hiatusOf(sF1).indexOf('2026-09-21 Fall Break') >= 0 && ((sF1.fields.byId['cal-range-start']) || {}).value === '2026-02-02'
        && /Post and everything after it moved \(2 phases\)\. 4 stayed where they were\./.test(mF1)
        && f1List.count === '2 of 6 move' && same(f1List.rows, ["Writer's Rm Stays", 'Pre Prep Stays', 'Prod Prep Stays', 'Production Stays', 'Post Moves', 'Localization Moves']),
      {starts: stF1, notes: nF1, marks: sF1.dayOverrides, msg: mF1, list: f1List}, 'Post 11/9, Localization 3/8/27, OVERLAP-WK 11/9, POST-WK3 11/23, LOC-WK2 3/15/27, the rest as loaded');
    await undo(); await take();

    // ---- A1: Phase & after TO A DATE (Post starts on 11/16) = Phase & after by 2 weeks ----
    await openShift(); await choose('after');
    T.set('tool-anchor-phase', 'post'); await T.sleep(150);
    T.set('tool-shift-weeks', '2');
    $('tool-shift-later').click(); await settle();
    var sA1w = await take();
    await undo(); await take();
    await openShift(); await choose('after', 'date');
    T.set('tool-anchor-phase', 'post'); T.set('tool-anchor-edge', 'start'); await T.sleep(150);
    T.set('tool-anchor-date', '2026-11-16');
    $('tool-anchor-go').click(); await settle();
    var mA1 = msg(), sA1d = await take();
    await undo(); await take();
    add('A1', 'Phase & after to a date (Post starts on 11/16) = Phase & after by 2 weeks, snapshot for snapshot',
      canon(sA1d) === canon(sA1w) && startsOf(sA1d).post === '2026-11-16' && startsOf(sA1d).production === '2026-06-29' && startsOf(sA1d).prodPrep === '2026-05-18'
        && /Post starts 11\/16\/26\./.test(mA1),
      {weeks: startsOf(sA1w), date: startsOf(sA1d), msg: mA1}, 'equal; Post 11/16, Production and Prod Prep unmoved');

    // ---- B6: Phase & before, Production "ends by" a date 10 days before its wrap ----
    var target = addDaysIso(w0, -10);
    await openShift(); await choose('before', 'date');
    T.set('tool-anchor-phase', 'production'); T.set('tool-anchor-edge', 'end'); await T.sleep(150);
    var b6Prefill = val('tool-anchor-date');
    T.set('tool-anchor-date', target);
    $('tool-anchor-go').click(); await settle();
    var mB6 = msg(), w6 = wrapIso(), sB6 = await take();
    add('B6', 'Phase & before, Production ends by ' + target + ': it lands on or before the date, and Post and Localization stay',
      b6Prefill === w0 && !!w6 && w6 <= target && w6 < w0 && startsOf(sB6).post === '2026-11-02' && startsOf(sB6).localization === '2027-03-01'
        && /Production ends /.test(mB6) && /Production and everything before it moved \(4 phases\)/.test(mB6) && !MENU().querySelector('[data-tools-msg]').classList.contains('warn'),
      {prefill: b6Prefill, wrapBefore: w0, wrapAfter: w6, target: target, starts: startsOf(sB6), msg: mB6}, 'wrap <= ' + target + '; Post 11/2');
    await undo(); await take();

    // ---- W1: Whole schedule only for All phases to a date ----
    await openShift();
    T.set('tool-anchor-edge', 'start');   // B6 left it on "ends by", which the form keeps between openings, as Anchor To did
    var w = {};
    w.allWeeks = phaseOpts().indexOf('__whole_schedule__') >= 0;
    await choose('all', 'date');
    w.allDate = phaseOpts().indexOf('__whole_schedule__') >= 0;
    w.allDateRow = hiddenOf('[data-shift-phase-row]');
    T.set('tool-anchor-phase', '__whole_schedule__'); await T.sleep(150);
    // Under All phases the list stays folded (layout A), to a date too: open it to see the fixed ticks.
    w.wholeFolded = !listShown() && linkShown();
    q('[data-shift-choose]').click(); await T.sleep(150);
    w.wholeRows = moving(); w.wholeFixed = MENU().querySelectorAll('[data-shift-list] input[data-key]:disabled:checked').length; w.wholeCount = count();
    await choose('before');
    w.beforeDate = phaseOpts().indexOf('__whole_schedule__') >= 0;
    w.fellBackTo = val('tool-anchor-phase');
    w.prefill = val('tool-anchor-date');
    await choose('after', 'weeks');
    w.afterWeeks = phaseOpts().indexOf('__whole_schedule__') >= 0;
    await choose('all');
    w.allWeeksRow = hiddenOf('[data-shift-phase-row]');
    w.dateRowInWeeks = hiddenOf('[data-far-row="date"]');
    add('W1', 'Whole schedule is in the list only for All phases to a date; leaving it puts Production back, with its own date',
      !w.allWeeks && w.allDate && !w.allDateRow && w.wholeFolded && w.wholeFixed === 6 && w.wholeCount === '6 of 6 move' && !w.beforeDate && w.fellBackTo === 'production'
        && w.prefill === '2026-06-29' && !w.afterWeeks && w.allWeeksRow && w.dateRowInWeeks,
      w, 'only All phases + To a date offers it; Phase & before falls back to Production (6/29)');

    // ---- O2: reopened -> All phases, By weeks, folded, every phase ticked ----
    await choose('before', 'date');
    T.set('tool-anchor-phase', 'production'); await T.sleep(150);
    tick('writersRoom', false); await T.sleep(100);
    var o2before = pressed();
    await openShift();
    var o2 = {move: q('[data-move="all"]').getAttribute('aria-pressed'), far: q('[data-far="weeks"]').getAttribute('aria-pressed'),
              phaseRow: hiddenOf('[data-shift-phase-row]'), dateRow: hiddenOf('[data-far-row="date"]'), list: listShown(), link: linkShown(), wasCustom: o2before};
    q('[data-shift-choose]').click(); await T.sleep(100);
    o2.count = count(); o2.pressedAfterOpen = pressed();
    add('O2', 'reopened after a hand-picked set to a date, it is back on All phases, By weeks, the list folded and every phase ticked (ruling R2(a))',
      o2.wasCustom === 'all:false before:false after:false' && o2.move === 'true' && o2.far === 'true' && o2.phaseRow && o2.dateRow && !o2.list && o2.link
        && o2.count === '6 of 6 move' && o2.pressedAfterOpen === 'all:true before:false after:false', o2, 'All phases, By weeks, folded; 6 of 6 once opened');
    closePops(); await T.sleep(150);

    // ---- I1: hygiene ----
    var choiceIds = Array.prototype.filter.call(MENU().querySelectorAll('[data-move], [data-far], [data-shift-choose], [data-shift-list] *'), function (b) { return !!b.id; }).length;
    var controls = ['tool-anchor-phase', 'tool-anchor-edge', 'tool-anchor-date', 'tool-shift-weeks'];
    var outside = controls.filter(function (id) { return !$(id) || !$(id).closest('.tools-menu'); });
    add('I1', 'no choice button, link or tick carries an id; every id\'d control sits inside .tools-menu; the retired popovers are gone',
      choiceIds === 0 && outside.length === 0 && q('[data-move]') && !$('pop-ripple') && !$('pop-anchor') && !$('pop-ripple-btn') && !$('pop-anchor-btn') && !$('tool-ripple-phase'),
      {choiceIds: choiceIds, outside: outside, retired: [!!$('pop-ripple'), !!$('pop-anchor'), !!$('tool-ripple-phase')]}, '0 ids; none outside; none retired left');

    // ---- S1: the save format ----
    var keys0 = Object.keys(s0.fields.byId).sort().join();
    var drift = snaps.filter(function (s) { return Object.keys(s.fields.byId).sort().join() !== keys0; }).length;
    var toolKeys = Object.keys(s0.fields.byId).filter(function (k) { return /^tool-|^pop-/.test(k); });
    add('S1', 'no new key in fields.byId in any of the ' + snaps.length + ' snapshots, and no tool control in it',
      drift === 0 && toolKeys.length === 0 && snaps.length >= 20, {snapshots: snaps.length, drift: drift, toolKeys: toolKeys}, '0 drift, no tool-* key');

    var errs = (window.__ERR || []);
    add('E0', '0 console errors', errs.length === 0, errs.slice(0, 5), '[]');
  } catch (e) { cases.push({id: 'EX', title: 'harness', pass: null, observed: String(e && e.stack || e)}); }
  T.done({test: 'anchorside', cases: cases, err: (window.__ERR || []).slice(0, 10)});
})(); });
