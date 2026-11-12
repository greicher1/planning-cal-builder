// anchorside -- the ONE Shift tool (owner, 4 Nov 2026: "Ok im going to vote we go with C, one master shift tool";
// ANCHOR-TO-DIRECTION-PLAN.md §2, §5 step 3, §6, §7 and §7.6). Shift All's form, Shift From and Anchor To are one
// popover. Since 9 Nov 2026 (the owner's eight-point spec, "build this", and three corrections the same day) it is
// THE LIST FIRST: no What moves buttons; the box runs from its title to the phases; a header strip holds a select-all
// box (a minus when every phase is ticked) and the count; a click on a row CHOOSES it (the outline) and leaves its
// tick, its box ticks, a drag sets a run; "Prior to X" / "After X" under the list replace the ticks; How far is By
// weeks | To a date, and To a date's box shows the chosen phase and offers ticked phases only. The TICKS decide the
// move: every phase = the whole calendar; the top of the list = the old Phase & before; the bottom = the old Phase &
// after (Shift From); any other set = one window per ticked phase (T2).
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
// THE RULE: the rows run in START order, so "Prior to X" / "After X" take X and every phase STARTING on that side; an
// overlap does not count. Notes, unlocked hiatuses and the range go by X's start week (after) or LAST week (before).
// ⛔ For one deploy (c52094f) overlapping phases moved too (owner's "Overlaps move too"); the owner reverted it the
// same night: "how would you move everything except for writers room", whose room ran into Pre-Prep. X2 holds that.
// From dayoverrides it keeps: Writer's Rm 1/5/26 x 12, Pre Prep snap-off Wed 4/8 x 6, Prod Prep 5/18 x 6, Production
// Mon 6/29/26 (80 days, US General) with four day marks (7/3 on, 7/6 half, 7/7 off, 7/11 on), the LOCKED "Summer
// Break" 7/13 x 1, Post 11/2 x 16, and the locked Christmas hiatuses.
//
// Every move is read back from the crash backup, which IS captureSnapshot(), and compared key-sorted.
//
//   T0      truth guard: the calendar as loaded, and the wrap before Post
//   O1      the form as it opens: the title, "Phases", the box (strip, then six ticked rows), Prior / After, How far;
//           no What moves buttons; every phase ticked, By weeks, the header box ticked, the shoot outlined
//   O3      the strip (spec items 2-4): a tint and a hairline, a box in the rows' own tick column and the count, no
//           labels; "Phases" above carries no count
//   HD      the header box: ticked (a minus) with every phase ticked, and a click then clears them all; empty
//           otherwise, and a click ticks every phase
//   M1      a click on a row CHOOSES it: the outline and both buttons follow, no tick changes; its box flips the tick
//   D1      a drag from a ticked row clears the run it covers, and the last row dragged over is outlined
//   D3      a drag from an unticked row ticks the run
//   D2      dragging back un-does the overshoot (a range, redone from the ticks at the press)
//   D4      a drag from a row's name that comes back to that row changes nothing; from its box, the row stays flipped
//   K1      the keyboard and a tap: a tick's own change flips it and keeps focus; a tap on the row only chooses it
//   P1      Prior / After: side by side under the box, its full width, equal; each names the outlined row; each
//           REPLACES the ticks; one line, cut with an ellipsis, so a long name never changes their height
//   N1      nothing covers the list (item 8): no row has a title, the strip is above the rows and not sticky, and
//           each row is the top thing at its own middle (the hint opening upward is `npm run check`'s: a leg cannot
//           hover a Mantine HoverCard)
//   X1      After Production: the list ticks the shoot onward and says the three earlier phases stay
//   X2      After Prod Prep moves Prod Prep onward and LEAVES Pre Prep, which started earlier and runs into it (the
//           owner's "everything except for writers room"); its notes stay too
//   C1      a set that is neither end of the list (After Prod Prep, Localization unticked): "3 of 6 move"; Later
//           moves the three ticked phases and their notes; Localization's note stays (T2)
//   C2      T2's shared week: only Production ticked, +1 wk: the shoot's notes move, the 11/2 note it shares with Post
//           goes with the shoot, Post's own note stays, the Fall Break moves, the marks travel, the range stays
//   C4      T2 across a gap: Pre Prep and Post ticked, the shoot between them not: each ticked phase takes its own
//           notes, the shoot's note, its Fall Break and its marks stay (red on a one-span build)
//   C3      nothing ticked (the header box): Later says so and moves nothing
//   H1      Prior to Production: the list ticks the four phases up to the shoot; Post (it starts inside the shoot's
//           last week) and Localization stay
//   B1      Prior to Production, 2 wks Earlier: the four phases up to Production move; Post and Localization keep
//   B2      ... notes in Pre Prep, the shoot's week 6 and its LAST week (11/2, which Post shares) move; Post's week 3
//           and Localization's stay (the last-week bound)
//   B3      ... the unlocked hiatus inside the shoot moves; the locked Summer Break and Christmas stay
//   B5      ... the dated note stays, and nothing keyed by a holiday moved
//   Bm      ... the result line: what moved and what stayed
//   Br      ... the calendar range's start (before the bound) moved
//   U1      one Undo restores the whole snapshot
//   F2      Prior to Production to a date (Production starts on 6/15) = the same set by 2 weeks, snapshot for snapshot
//   B4      Production's marks keep their shoot-day numbers: Prior to Production -2 wks = every phase -2 wks
//   E1      every phase ticked is today's call: the arrow, the form by weeks and the form to a date give one snapshot
//   F1      After Post by 1 wk = the old Shift From: Post and Localization a week later, the shoot (which runs into
//           Post) and everything before stays; the list said so first
//   A1      After Post to a date (Post starts on 11/16) = After Post by 2 weeks, snapshot for snapshot
//   B6      Prior to Production, "ends by": lands on or before the date; Post and Localization stay
//   W1      To a date's box: shown only To a date; it shows the chosen (outlined) phase and offers ticked phases only;
//           a pick in it outlines that row; the phase that lands keeps its tick box, and unticking it moves the box
//           to another ticked phase; Whole schedule is offered only with every phase ticked, and fixes the ticks,
//           the header box and both buttons; nothing ticked: "Tick a phase first", and Go says so
//   J1      a phase picked in the box lands: the date prefills, its row says "On your date", Go slides the whole
//           calendar a week
//   O2      reopened after a partial set to a date: every phase ticked again, By weeks, the shoot outlined (R2(a))
//   I1      nothing new carries an id, the retired controls are gone, and every id'd control is inside .tools-menu
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
  var WHOLE = '__whole_schedule__';
  function txtOf(e){ return ((e || {}).textContent || '').replace(/\s+/g, ' ').trim(); }
  function allBox(){ return q('[data-shift-all]'); }
  function sides(){ return txtOf(q('[data-shift-prior]')) + ' | ' + txtOf(q('[data-shift-after]')); }
  // The list as it stands: which phases are ticked, which row is outlined, which one lands on the date.
  function boxOf(key){ return T.shiftRow(key).querySelector('input[type=checkbox]'); }
  function ticked(){ return KEYS.filter(function (k) { var b = boxOf(k); return !!(b && b.checked); }).join(); }
  function mark(){ var r = q('[data-shift-list] .solve-row.is-mark'); return r ? r.dataset.key : ''; }
  function lands(){ var r = q('[data-shift-list] .solve-row.is-land'); return r ? r.dataset.key : ''; }
  // A tick's own change: what Space on the focused box, or a tap on it, does.
  function tick(key, on){ var b = boxOf(key); if(!b) throw new Error('no tick for ' + key); if(b.checked !== on){ b.checked = on; b.dispatchEvent(new Event('change', {bubbles: true})); } }
  function closePops(){ T.closePops(); }   // presses an open tool panel's ✕ (no click-away since 11 Nov 2026)
  async function openShift(){ closePops(); await T.sleep(150); $('pop-shift-btn').click(); await T.sleep(250); }
  async function far(f){ q('[data-far="' + f + '"]').click(); await T.sleep(150); }
  async function settle(){ await T.sleep(900); }
  async function undo(){ $('undo-btn').click(); await T.sleep(900); }
  function hiddenOf(sel){ var e = q(sel); return !e || e.hidden || getComputedStyle(e).display === 'none'; }
  function phaseOpts(){ return Array.prototype.map.call($('tool-anchor-phase').options, function (o) { return o.value; }); }
  function rectOf(e){ var r = e.getBoundingClientRect(); return {left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height}; }
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

    // ---- O1: the form as it opens (spec item 1: from the title straight to the phases) ----
    await openShift();
    var kids = Array.prototype.map.call(MENU().children, function (e) { return String(e.className || '').split(' ')[0]; });
    var o1 = {open: MENU().classList.contains('open'), kids: kids.join(), cap: txtOf(MENU().children[1]), sidesRow: MENU().children[3].classList.contains('shift-sides'),
              whatMoves: /what moves/i.test(MENU().textContent), oldButtons: !!q('[data-move]') || !!q('[data-shift-choose]') || !!q('[data-shift-subject]'),
              far: q('[data-far="weeks"]').getAttribute('aria-pressed'), rows: moving(), ticked: ticked(), count: count(), all: allBox().checked, mark: mark(), sides: sides(),
              phaseRow: hiddenOf('[data-shift-phase-row]'), weeksRow: hiddenOf('[data-far-row="weeks"]'), dateRow: hiddenOf('[data-far-row="date"]'),
              whole: phaseOpts().indexOf(WHOLE) >= 0, label: txt('pop-shift-btn'),
              width: Math.round(MENU().getBoundingClientRect().width), height: Math.round(MENU().getBoundingClientRect().height)};
    add('O1', 'it opens from the title straight to the phases: "Phases", the box, Prior / After, How far; no What moves buttons; every phase ticked and "Moves", By weeks, the header box ticked, "6 of 6 move", the shoot outlined and named by both buttons',
      o1.open && o1.kids.indexOf('tools-head,tools-cap,shift-box,tools-row,tools-cap,tools-seg') === 0 && o1.cap === 'Phases' && o1.sidesRow && !o1.whatMoves && !o1.oldButtons
        && o1.far === 'true' && same(o1.rows, ["Writer's Rm Moves", 'Pre Prep Moves', 'Prod Prep Moves', 'Production Moves', 'Post Moves', 'Localization Moves'])
        && o1.ticked === KEYS.join() && o1.count === '6 of 6 move' && o1.all && o1.mark === 'production' && o1.sides === 'Prior to Production | After Production'
        && o1.phaseRow && !o1.weeksRow && o1.dateRow && !o1.whole && /^Shift\b/.test(o1.label) && o1.width === 340 && o1.height < 470,
      o1, 'title, Phases, box, Prior / After, How far; six ticked rows; weeks pressed; the landing row and the date row hidden; 340 px wide');

    // ---- O3: the header strip (spec items 2-4) ----
    var strip = q('.shift-all'), sbox = q('.shift-box'), list = q('[data-shift-list]'), scs = getComputedStyle(strip);
    var o3 = {first: sbox.firstElementChild === strip, next: strip.nextElementSibling === list,
              kids: Array.prototype.map.call(strip.children, function (e) { return e.tagName.toLowerCase() + (e.hasAttribute('data-shift-count') ? '[count]' : e.hasAttribute('data-shift-all') ? '[all]' : ''); }).join(),
              text: txtOf(strip), bg: scs.backgroundColor, hairline: scs.borderBottomWidth + ' ' + scs.borderBottomStyle,
              boxLeft: allBox().getBoundingClientRect().left, rowBoxLeft: boxOf('writersRoom').getBoundingClientRect().left,
              boxSize: allBox().getBoundingClientRect().width + 'x' + boxOf('writersRoom').getBoundingClientRect().width,
              capCount: !!MENU().children[1].querySelector('[data-shift-count]'), listCount: !!list.querySelector('[data-shift-count]')};
    add('O3', 'the strip is the box\'s first child, above the rows: a box and the count, nothing else; a tint and a 1 px hairline; its box in the rows\' own tick column; "Phases" above carries no count',
      o3.first && o3.next && o3.kids === 'input[all],span[count]' && o3.text === '6 of 6 move' && o3.bg !== 'rgba(0, 0, 0, 0)' && o3.bg !== 'rgb(255, 255, 255)'
        && o3.hairline === '1px solid' && Math.abs(o3.boxLeft - o3.rowBoxLeft) < 0.6 && o3.boxSize === '16x16' && !o3.capCount && !o3.listCount,
      o3, 'input + count only; tinted; 1px solid; the two boxes share a left edge');

    // ---- HD: the header box (spec item 3) ----
    var hd = {openChecked: allBox().checked, minus: /rect/.test(getComputedStyle(allBox()).backgroundImage), rowTick: /path/.test(getComputedStyle(boxOf('post')).backgroundImage)};
    allBox().click(); await T.sleep(120);
    hd.cleared = ticked(); hd.clearedCount = count(); hd.clearedBox = allBox().checked; hd.emptyImg = getComputedStyle(allBox()).backgroundImage;
    allBox().click(); await T.sleep(120);
    hd.again = ticked(); hd.againBox = allBox().checked;
    tick('post', false); await T.sleep(120);
    hd.partBox = allBox().checked; hd.partCount = count(); hd.partImg = getComputedStyle(allBox()).backgroundImage;
    allBox().click(); await T.sleep(120);
    hd.fromPart = ticked(); hd.fromPartCount = count();
    add('HD', 'the header box: ticked and drawn as a MINUS (the rows draw a tick) with every phase ticked, and a click clears them all; an empty box with none or some ticked, and a click ticks every phase',
      hd.openChecked && hd.minus && hd.rowTick && hd.cleared === '' && hd.clearedCount === '0 of 6 move' && !hd.clearedBox && hd.emptyImg === 'none'
        && hd.again === KEYS.join() && hd.againBox && !hd.partBox && hd.partCount === '5 of 6 move' && hd.partImg === 'none' && hd.fromPart === KEYS.join() && hd.fromPartCount === '6 of 6 move',
      hd, 'minus when all; click -> none; click -> all; 5 of 6 -> empty box; click -> all');

    // ---- M1: a click on a row chooses it; its box ticks (the owner: "could it just select it but keep the checkbox selected?") ----
    await openShift();
    await T.shiftPress('post', 'row');
    var m1 = {ticked: ticked(), count: count(), mark: mark(), sides: sides()};
    await T.shiftPress('post', 'box');
    m1.afterBox = ticked(); m1.boxMark = mark(); m1.boxCount = count();
    await T.shiftPress('writersRoom', 'row');
    m1.other = ticked(); m1.otherMark = mark();
    await T.shiftPress('post', 'row');             // a click on an UNTICKED row leaves it unticked
    m1.offRow = ticked(); m1.offMark = mark();
    await T.shiftPress('post', 'box');
    m1.backOn = ticked();
    var NOPOST = KEYS.filter(function (k) { return k !== 'post'; }).join();
    add('M1', 'a click on the Post row outlines it and both buttons name it, with every tick as it was; a click on its box clears it; a click on another row, or on the unticked row, changes no tick; its box ticks it again',
      m1.ticked === KEYS.join() && m1.count === '6 of 6 move' && m1.mark === 'post' && m1.sides === 'Prior to Post | After Post'
        && m1.afterBox === NOPOST && m1.boxMark === 'post' && m1.boxCount === '5 of 6 move'
        && m1.other === NOPOST && m1.otherMark === 'writersRoom' && m1.offRow === NOPOST && m1.offMark === 'post' && m1.backOn === KEYS.join(),
      m1, 'row click: no tick changes, the outline moves; box click: the tick flips');

    // ---- D1-D4: press and drag (spec items 5 and 6) ----
    await openShift();
    await T.shiftDrag('prePrep', 'production');
    var d1 = {ticked: ticked(), mark: mark(), count: count(), sides: sides()};
    add('D1', 'a drag from Pre Prep (ticked) down to Production clears the three rows it covers; Production, the last row dragged over, is outlined and named',
      d1.ticked === 'writersRoom,post,localization' && d1.mark === 'production' && d1.count === '3 of 6 move' && d1.sides === 'Prior to Production | After Production',
      d1, "Writer's Rm, Post and Localization left ticked; the outline on Production");
    await T.shiftDrag('prodPrep', 'prePrep');
    var d3 = {ticked: ticked(), mark: mark()};
    add('D3', 'a drag from Prod Prep (now unticked) up to Pre Prep ticks both: the first row decides',
      d3.ticked === 'writersRoom,prePrep,prodPrep,post,localization' && d3.mark === 'prePrep', d3, 'Pre Prep and Prod Prep ticked again; Production still clear');
    await openShift();
    await T.shiftDrag('prePrep', ['post', 'prodPrep']);
    var d2 = {ticked: ticked(), mark: mark()};
    add('D2', 'dragging from Pre Prep down to Post and back up to Prod Prep leaves only Pre Prep and Prod Prep cleared: the rows past the pointer get their ticks back',
      d2.ticked === 'writersRoom,production,post,localization' && d2.mark === 'prodPrep', d2, 'Production and Post ticked again');
    await openShift();
    await T.shiftDrag('production', ['post', 'production']);
    var d4 = {nameTicked: ticked(), nameMark: mark()};
    await T.shiftDrag('production', ['post', 'production'], 'box');
    d4.boxTicked = ticked(); d4.boxMark = mark();
    add('D4', 'a drag from a row\'s NAME that comes back to that row changes nothing; the same drag from its BOX leaves that one row flipped',
      d4.nameTicked === KEYS.join() && d4.nameMark === 'production' && d4.boxTicked === KEYS.filter(function (k) { return k !== 'production'; }).join() && d4.boxMark === 'production',
      d4, 'name: all six still ticked; box: Production cleared, Post ticked again');

    // ---- K1: the keyboard and a tap ----
    await openShift();
    boxOf('prePrep').focus();
    tick('prePrep', false); await T.sleep(120);
    var k1 = {ticked: ticked(), mark: mark(), focusKey: ((document.activeElement || {}).dataset || {}).key || ''};
    T.shiftRow('post').querySelector('.solve-nm').click(); await T.sleep(120);     // a tap: a click no press swallowed
    k1.tapTicked = ticked(); k1.tapMark = mark();
    boxOf('post').click(); await T.sleep(120);
    k1.boxTap = ticked(); k1.boxTapMark = mark();
    var NOPRE = KEYS.filter(function (k) { return k !== 'prePrep'; }).join();
    add('K1', 'a tick changed from the keyboard clears Pre Prep, outlines it and keeps focus on its box in the redrawn list; a tap on the Post row only chooses it; a tap on its box clears it',
      k1.ticked === NOPRE && k1.mark === 'prePrep' && k1.focusKey === 'prePrep' && k1.tapTicked === NOPRE && k1.tapMark === 'post'
        && k1.boxTap === KEYS.filter(function (k) { return k !== 'prePrep' && k !== 'post'; }).join() && k1.boxTapMark === 'post',
      k1, 'focus stays on Pre Prep\'s box; the tap moves only the outline');

    // ---- P1: Prior / After (spec item 7) ----
    await openShift();
    var pb = q('[data-shift-prior]'), ab = q('[data-shift-after]'), bx = rectOf(q('.shift-box')), pr = rectOf(pb), ar = rectOf(ab), pcs = getComputedStyle(pb);
    var p1 = {below: pr.top >= bx.bottom && ar.top >= bx.bottom, sameTop: Math.abs(pr.top - ar.top) < 0.6, left: Math.abs(pr.left - bx.left) < 0.6, right: Math.abs(ar.right - bx.right) < 0.6,
              equal: Math.abs(pr.width - ar.width) < 0.6, sideBySide: pr.right < ar.left, h: pr.height + 'x' + ar.height, later: rectOf($('tool-shift-later')).height,
              css: pcs.whiteSpace + ' ' + pcs.overflow + ' ' + pcs.textOverflow};
    await T.shiftPress('prodPrep', 'row');
    p1.named = sides();
    await T.shiftSide('after', 'post');
    p1.afterPost = ticked();
    await T.shiftSide('prior', 'prodPrep');
    p1.priorProdPrep = ticked(); p1.priorMark = mark();
    await T.shiftSide('after', 'prodPrep');
    p1.afterProdPrep = ticked();
    pb.textContent = 'Prior to A Very Long Custom Phase Name That Cannot Fit On One Button';
    p1.longCut = pb.scrollWidth > pb.clientWidth; p1.longH = pb.getBoundingClientRect().height; p1.longW = Math.abs(pb.getBoundingClientRect().width - pr.width) < 0.6;
    await T.shiftPress('prodPrep', 'row');         // any redraw writes the real label back
    p1.restored = txtOf(pb);
    add('P1', 'Prior / After sit side by side under the box, its full width, equal, 34 px (taller than Later); they name the outlined row; each REPLACES the ticks (After Post, then Prior to Prod Prep, drops Post and Localization); one line with an ellipsis, so a long name changes neither height nor width',
      p1.below && p1.sameTop && p1.left && p1.right && p1.equal && p1.sideBySide && p1.h === '34x34' && p1.later < 34 && p1.css === 'nowrap hidden ellipsis'
        && p1.named === 'Prior to Prod Prep | After Prod Prep' && p1.afterPost === 'post,localization' && p1.priorProdPrep === 'writersRoom,prePrep,prodPrep' && p1.priorMark === 'prodPrep'
        && p1.afterProdPrep === 'prodPrep,production,post,localization' && p1.longCut && p1.longH === 34 && p1.longW && p1.restored === 'Prior to Prod Prep',
      p1, 'under the box, two halves; replace, never add; nowrap hidden ellipsis');

    // ---- N1: nothing covers the list (spec item 8) ----
    await openShift();
    var n1 = {titles: MENU().querySelectorAll('.shift-box [title]').length, stripPos: getComputedStyle(q('.shift-all')).position,
              stripInScroller: q('[data-shift-list]').contains(q('.shift-all')),
              stripAbove: q('.shift-all').getBoundingClientRect().bottom <= q('[data-shift-list]').getBoundingClientRect().top + 0.6};
    n1.rowsOnTop = KEYS.filter(function (k) {
      var r = T.shiftRow(k), b = r.getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return !!e && r.contains(e);
    }).length;
    // ⚠️ The hint's own card is NOT opened here: Mantine's HoverCard ignores a dispatched mouse or focus event (tried
    // in headless Chrome: mouseover/enter, pointerover/enter, focus), so a leg cannot hover it. That it opens ABOVE the
    // title and never flips is held by `npm run check` (the built file's position: top-start, flip off) and was
    // measured in the app with a real pointer (9 Nov 2026: the card ended 11 px above the "i", 53 px above the box).
    n1.hint = !!q('.tools-head .info-hint');
    add('N1', 'nothing covers the list: no title on a row or the strip; the strip is a static block above the rows, outside their scroller; every row is the top thing at its own middle',
      n1.titles === 0 && n1.stripPos === 'static' && !n1.stripInScroller && n1.stripAbove && n1.rowsOnTop === 6 && n1.hint,
      n1, '0 titles; a static strip above the rows; 6 rows on top');

    // ---- X1, X2: what counts as an overlap (the list is drawn from the same shiftPlan() the move uses) ----
    await openShift();
    await T.shiftSide('after', 'production');
    var x1 = {rows: moving(), count: count(), all: allBox().checked};
    add('X1', 'After Production: the list ticks the shoot, Post and Localization; Writer\'s Rm, Pre Prep and Prod Prep stay',
      same(x1.rows, ["Writer's Rm Stays", 'Pre Prep Stays', 'Prod Prep Stays', 'Production Moves', 'Post Moves', 'Localization Moves']) && x1.count === '3 of 6 move'
        && !x1.all, x1, 'three Stays, three Moves, "3 of 6 move"');
    await T.shiftSide('after', 'prodPrep');
    var x2 = {rows: moving(), count: count()};
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mX2 = msg(), sX2 = await take(), stX2 = startsOf(sX2), nX2 = notesOf(sX2);
    add('X2', 'After Prod Prep +1 wk leaves Pre Prep, which started earlier and works into Prod Prep\'s first week (the owner\'s case: everything but the Writer\'s Room)',
      same(x2.rows, ["Writer's Rm Stays", 'Pre Prep Stays', 'Prod Prep Moves', 'Production Moves', 'Post Moves', 'Localization Moves']) && x2.count === '4 of 6 move'
        && same(stX2, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-25', production: '2026-07-06', post: '2026-11-09', localization: '2027-03-08'})
        && nX2['2026-04-13'] === 'PREP-NOTE' && nX2['2026-08-10'] === 'SHOOT-WK6'
        && /Prod Prep and everything after it moved \(4 phases\)\. 2 stayed where they were\./.test(mX2),
      {list: x2, starts: stX2, notes: nX2, msg: mX2}, 'Pre Prep and Writer\'s Rm unmoved; Prod Prep 5/25 and every later phase a week on');
    await undo(); await take();

    // ---- C1: a set that is neither end of the list -- the user's own ----
    await openShift();
    await T.shiftSide('after', 'prodPrep');
    await T.shiftPress('localization', 'box');
    var c1 = {count: count(), rows: moving(), all: allBox().checked};
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mC1 = msg(), sC1 = await take(), stC1 = startsOf(sC1), nC1 = notesOf(sC1);
    add('C1', 'After Prod Prep, then Localization unticked by its box: "3 of 6 move"; Later moves Prod Prep, the shoot and Post with their notes; Localization and its note stay (T2), and so do the earlier phases',
      c1.count === '3 of 6 move' && !c1.all
        && same(stC1, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-25', production: '2026-07-06', post: '2026-11-09', localization: '2027-03-01'})
        && same(nC1, {'2026-04-13': 'PREP-NOTE', '2026-07-27': 'Wrap party booked', '2026-08-10': 'SHOOT-WK6', '2026-11-09': 'OVERLAP-WK', '2026-11-23': 'POST-WK3', '2027-03-08': 'LOC-WK2'})
        && hiatusOf(sC1).indexOf('2026-09-28 Fall Break') >= 0 && ((sC1.fields.byId['cal-range-start']) || {}).value === '2026-02-02'
        && /^Shifted 1 week later\./.test(mC1) && /3 ticked phases moved\. Writer's Rm, Pre Prep and Localization stayed where they were\./.test(mC1),
      {before: c1, starts: stC1, notes: nC1, msg: mC1}, 'Prod Prep 5/25, Production 7/6, Post 11/9; Localization 3/1/27 and LOC-WK2 3/8/27 unmoved; "3 ticked phases moved…"');
    await undo(); await take();

    // ---- C2: T2's shared week -- only Production ticked ----
    await openShift();
    ['writersRoom', 'prePrep', 'prodPrep', 'post', 'localization'].forEach(function (k) { tick(k, false); });
    await T.sleep(150);
    var c2 = {count: count(), phaseRow: hiddenOf('[data-shift-phase-row]')};
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mC2 = msg(), sC2 = await take(), stC2 = startsOf(sC2), nC2 = notesOf(sC2);
    add('C2', 'only Production ticked, +1 wk: the shoot moves alone; its week-6 note and the 11/2 note it shares with Post go with it (T2), Post\'s own note stays; the Fall Break moves, the marks travel by shoot day, the range start stays',
      c2.count === '1 of 6 move' && c2.phaseRow
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
    allBox().click(); await T.sleep(150);
    var c3Count = count();
    $('tool-shift-later').click(); await T.sleep(600);
    var sC3 = T.latestBackup();
    add('C3', 'nothing ticked (the header box clears every phase): Later says "Tick a phase to move." and moves nothing',
      c3Count === '0 of 6 move' && msg() === 'Tick a phase to move.' && MENU().querySelector('[data-tools-msg]').classList.contains('warn')
        && same(startsOf(sC3.state), st0) && sC3.at === lastAt,
      {count: c3Count, msg: msg(), starts: startsOf(sC3.state)}, 'warning, no new backup, every start as loaded');

    // ---- H1 + B: Prior to Production, 2 weeks Earlier ----
    await openShift();
    await T.shiftSide('prior', 'production');
    var h1 = {rows: moving(), count: count(), phaseRow: hiddenOf('[data-shift-phase-row]'), whole: phaseOpts().indexOf(WHOLE) >= 0};
    add('H1', 'Prior to Production: the list ticks the four phases up to the shoot; Post (it STARTS after the shoot does) and Localization stay',
      h1.phaseRow && !h1.whole && h1.count === '4 of 6 move'
        && same(h1.rows, ["Writer's Rm Moves", 'Pre Prep Moves', 'Prod Prep Moves', 'Production Moves', 'Post Stays', 'Localization Stays']), h1,
      'four Moves, then Post Stays, Localization Stays');
    T.set('tool-shift-weeks', '2');
    $('tool-shift-earlier').click(); await settle();
    var mB = msg();
    var sB = await take(), stB = startsOf(sB), nB = notesOf(sB);
    add('B1', 'Prior to Production -2 wks: Writer\'s Rm, Pre Prep, Prod Prep and Production move; Post and Localization keep their dates',
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

    // ---- F2: Prior to Production TO A DATE, Production starts on 6/15 = the same set by 2 weeks ----
    await openShift(); await far('date');
    await T.shiftSide('prior', 'production');
    T.set('tool-anchor-edge', 'start'); await T.sleep(150);
    var f2 = {prefill: val('tool-anchor-date'), land: val('tool-anchor-phase'), count: count()};
    T.set('tool-anchor-date', '2026-06-15');
    $('tool-anchor-go').click(); await settle();
    var mF2 = msg(), sF2 = await take();
    add('F2', 'Prior to Production to a date (Production starts on 6/15) = Prior to Production by 2 weeks, snapshot for snapshot',
      canon(sF2) === canon(sB) && f2.prefill === '2026-06-29' && f2.land === 'production' && f2.count === '4 of 6 move'
        && /Production starts 6\/15\/26\./.test(mF2) && /Production and everything before it moved \(4 phases\)/.test(mF2),
      {starts: startsOf(sF2), notes: notesOf(sF2), before: f2, msg: mF2}, 'the B snapshot; prefill 6/29; "Production starts 6/15/26."');
    await undo(); await take();

    // ---- B4: the marks keep their shoot-day numbers (differential: every phase -2 moves the shoot identically) ----
    await openShift();
    T.set('tool-shift-weeks', '2');
    $('tool-shift-earlier').click(); await settle();
    var sAll = await take();
    add('B4', 'Production\'s day marks keep their shoot-day numbers: Prior to Production -2 wks lands them exactly where every phase -2 wks does, and they moved',
      same(sB.dayOverrides, sAll.dayOverrides) && !same(sB.dayOverrides, ov0) && startsOf(sAll).production === '2026-06-15' && startsOf(sAll).post === '2026-10-19',
      {before: sB.dayOverrides, all: sAll.dayOverrides, original: ov0}, 'equal, and not the original');
    await undo(); await take();

    // ---- E1: every phase ticked is today's call -- the arrow, the form by weeks and the form to a date ----
    closePops(); await T.sleep(150);
    $('shift-fwd-btn').click(); await settle();
    var sArrow = await take();
    await undo(); await take();
    await openShift();
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mE = msg(), sForm = await take();
    await undo(); await take();
    await openShift(); await far('date');
    T.set('tool-anchor-phase', 'production'); T.set('tool-anchor-edge', 'start'); await T.sleep(150);
    T.set('tool-anchor-date', '2026-07-06');
    $('tool-anchor-go').click(); await settle();
    var mE2 = msg(), sDate = await take();
    await undo(); await take();
    add('E1', 'every phase ticked: the 1 wk -> arrow, the form by 1 week and the form to a date (Production starts 7/6) give one snapshot, and no part-calendar words',
      canon(sForm) === canon(sArrow) && canon(sDate) === canon(sArrow) && startsOf(sArrow).post === '2026-11-09' && startsOf(sArrow).writersRoom === '2026-01-12'
        && /^Shifted 1 week later\./.test(mE) && !/moved \(/.test(mE) && !/moved \(/.test(mE2) && /Production starts 7\/6\/26\./.test(mE2),
      {arrow: startsOf(sArrow), form: startsOf(sForm), date: startsOf(sDate), msg: mE, msg2: mE2}, 'three equal snapshots, every phase a week later');

    // ---- F1: After Post by 1 week = the old Shift From (the shoot runs into Post and stays) ----
    await openShift();
    await T.shiftSide('after', 'post');
    var f1List = {rows: moving(), count: count()};
    T.set('tool-shift-weeks', '1');
    $('tool-shift-later').click(); await settle();
    var mF1 = msg(), sF1 = await take(), stF1 = startsOf(sF1), nF1 = notesOf(sF1);
    add('F1', 'After Post +1 wk (the old Shift From): Post and Localization a week later; the shoot, every earlier phase, its notes, marks, hiatus and the range start stay',
      same(stF1, {writersRoom: '2026-01-05', prePrep: '2026-04-08', prodPrep: '2026-05-18', production: '2026-06-29', post: '2026-11-09', localization: '2027-03-08'})
        && same(nF1, {'2026-04-13': 'PREP-NOTE', '2026-07-27': 'Wrap party booked', '2026-08-03': 'SHOOT-WK6', '2026-11-09': 'OVERLAP-WK', '2026-11-23': 'POST-WK3', '2027-03-15': 'LOC-WK2'})
        && same(sF1.dayOverrides, ov0) && hiatusOf(sF1).indexOf('2026-09-21 Fall Break') >= 0 && ((sF1.fields.byId['cal-range-start']) || {}).value === '2026-02-02'
        && /Post and everything after it moved \(2 phases\)\. 4 stayed where they were\./.test(mF1)
        && f1List.count === '2 of 6 move' && same(f1List.rows, ["Writer's Rm Stays", 'Pre Prep Stays', 'Prod Prep Stays', 'Production Stays', 'Post Moves', 'Localization Moves']),
      {starts: stF1, notes: nF1, marks: sF1.dayOverrides, msg: mF1, list: f1List}, 'Post 11/9, Localization 3/8/27, OVERLAP-WK 11/9, POST-WK3 11/23, LOC-WK2 3/15/27, the rest as loaded');
    await undo(); await take();

    // ---- A1: After Post TO A DATE (Post starts on 11/16) = After Post by 2 weeks ----
    await openShift();
    await T.shiftSide('after', 'post');
    T.set('tool-shift-weeks', '2');
    $('tool-shift-later').click(); await settle();
    var sA1w = await take();
    await undo(); await take();
    await openShift(); await far('date');
    await T.shiftSide('after', 'post');
    T.set('tool-anchor-edge', 'start'); await T.sleep(150);
    var a1Land = val('tool-anchor-phase');
    T.set('tool-anchor-date', '2026-11-16');
    $('tool-anchor-go').click(); await settle();
    var mA1 = msg(), sA1d = await take();
    await undo(); await take();
    add('A1', 'After Post to a date (Post starts on 11/16) = After Post by 2 weeks, snapshot for snapshot',
      canon(sA1d) === canon(sA1w) && a1Land === 'post' && startsOf(sA1d).post === '2026-11-16' && startsOf(sA1d).production === '2026-06-29' && startsOf(sA1d).prodPrep === '2026-05-18'
        && /Post starts 11\/16\/26\./.test(mA1),
      {weeks: startsOf(sA1w), date: startsOf(sA1d), land: a1Land, msg: mA1}, 'equal; Post 11/16, Production and Prod Prep unmoved');

    // ---- B6: Prior to Production, "ends by" a date 10 days before its wrap ----
    var target = addDaysIso(w0, -10);
    await openShift(); await far('date');
    await T.shiftSide('prior', 'production');
    T.set('tool-anchor-edge', 'end'); await T.sleep(150);
    var b6Prefill = val('tool-anchor-date');
    T.set('tool-anchor-date', target);
    $('tool-anchor-go').click(); await settle();
    var mB6 = msg(), w6 = wrapIso(), sB6 = await take();
    add('B6', 'Prior to Production, Production ends by ' + target + ': it lands on or before the date, and Post and Localization stay',
      b6Prefill === w0 && !!w6 && w6 <= target && w6 < w0 && startsOf(sB6).post === '2026-11-02' && startsOf(sB6).localization === '2027-03-01'
        && /Production ends /.test(mB6) && /Production and everything before it moved \(4 phases\)/.test(mB6) && !MENU().querySelector('[data-tools-msg]').classList.contains('warn'),
      {prefill: b6Prefill, wrapBefore: w0, wrapAfter: w6, target: target, starts: startsOf(sB6), msg: mB6}, 'wrap <= ' + target + '; Post 11/2');
    await undo(); await take();

    // ---- W1: To a date's box (owner, 9 Nov 2026: it shows the highlighted phase, and lists only ticked phases) ----
    await openShift();
    T.set('tool-anchor-edge', 'start');   // B6 left it on "ends by", which the form keeps between openings, as Anchor To did
    var w = {weeksRowHidden: hiddenOf('[data-shift-phase-row]'), weeksWhole: phaseOpts().indexOf(WHOLE) >= 0};
    await far('date');
    w.dateRows = !hiddenOf('[data-shift-phase-row]') && !hiddenOf('[data-far-row="date"]') && hiddenOf('[data-far-row="weeks"]');
    w.opts0 = phaseOpts().join(); w.val0 = val('tool-anchor-phase'); w.lands0 = lands();
    w.landBox = boxOf('production').checked && !boxOf('production').disabled && !q('.solve-pin-ic');
    // Whole schedule: every tick fixed, the header box and both buttons off, a press ignored.
    T.set('tool-anchor-phase', WHOLE); await T.sleep(150);
    w.wholeFixed = MENU().querySelectorAll('[data-shift-list] input[data-key]:disabled:checked').length; w.wholeCount = count();
    w.wholeAllOff = allBox().disabled; w.wholeSidesOff = q('[data-shift-prior]').disabled && q('[data-shift-after]').disabled; w.wholeLands = lands();
    await T.shiftPress('post', 'box');
    w.wholePressIgnored = ticked() === KEYS.join() && val('tool-anchor-phase') === WHOLE;
    T.set('tool-anchor-phase', 'production'); await T.sleep(150);
    w.backEnabled = !allBox().disabled && !q('[data-shift-prior]').disabled && MENU().querySelectorAll('[data-shift-list] input[data-key]:disabled').length === 0;
    // Untick Writer's Rm: it leaves the box's list, and so does Whole schedule. The box keeps the shoot (the outlined row is not ticked).
    await T.shiftPress('writersRoom', 'box');
    w.opts1 = phaseOpts().join(); w.val1 = val('tool-anchor-phase'); w.mark1 = mark();
    // The owner's screenshot: click Pre Prep, and the box shows it with its own date.
    await T.shiftPress('prePrep', 'row');
    w.val2 = val('tool-anchor-phase'); w.date2 = val('tool-anchor-date'); w.lands2 = lands(); w.ticked2 = ticked();
    // A pick made in the box outlines that row: one chosen phase.
    T.set('tool-anchor-phase', 'post'); await T.sleep(150);
    w.mark3 = mark(); w.sides3 = sides(); w.lands3 = lands(); w.date3 = val('tool-anchor-date');
    // Untick the phase that lands: the box moves to another ticked phase, the shoot.
    await T.shiftPress('post', 'box');
    w.opts4 = phaseOpts().join(); w.val4 = val('tool-anchor-phase'); w.date4 = val('tool-anchor-date'); w.mark4 = mark(); w.lands4 = lands();
    // Nothing ticked: the box says so, and so does Go.
    allBox().click(); await T.sleep(120);          // some ticked: ticks every phase
    allBox().click(); await T.sleep(120);          // every phase ticked: clears them
    w.noneCount = count(); w.noneOpts = Array.prototype.map.call($('tool-anchor-phase').options, function (o) { return o.textContent; }).join(); w.noneVal = val('tool-anchor-phase');
    $('tool-anchor-go').click(); await T.sleep(600);
    w.noneMsg = msg(); w.noneWarn = MENU().querySelector('[data-tools-msg]').classList.contains('warn'); w.noneMoved = T.latestBackup().at !== lastAt;
    await far('weeks');
    w.weeksAgain = hiddenOf('[data-shift-phase-row]') && hiddenOf('[data-far-row="date"]');
    add('W1', 'To a date\'s box shows only To a date; it offers the ticked phases (Whole schedule too while every phase is ticked) and shows the outlined phase; Whole schedule fixes the ticks, the header box and both buttons; a pick in the box outlines that row; the phase that lands keeps its tick box, and unticking it moves the box to the shoot; nothing ticked: "Tick a phase first", and Go says so',
      w.weeksRowHidden && !w.weeksWhole && w.dateRows && w.opts0 === KEYS.join() + ',' + WHOLE && w.val0 === 'production' && w.lands0 === 'production' && w.landBox
        && w.wholeFixed === 6 && w.wholeCount === '6 of 6 move' && w.wholeAllOff && w.wholeSidesOff && w.wholeLands === '' && w.wholePressIgnored && w.backEnabled
        && w.opts1 === 'prePrep,prodPrep,production,post,localization' && w.val1 === 'production' && w.mark1 === 'writersRoom'
        && w.val2 === 'prePrep' && w.date2 === '2026-04-08' && w.lands2 === 'prePrep' && w.ticked2 === 'prePrep,prodPrep,production,post,localization'
        && w.mark3 === 'post' && w.sides3 === 'Prior to Post | After Post' && w.lands3 === 'post' && w.date3 === '2026-11-02'
        && w.opts4 === 'prePrep,prodPrep,production,localization' && w.val4 === 'production' && w.date4 === '2026-06-29' && w.mark4 === 'post' && w.lands4 === 'production'
        && w.noneCount === '0 of 6 move' && w.noneOpts === 'Tick a phase first' && w.noneVal === '' && w.noneMsg === 'Tick a phase to move.' && w.noneWarn && !w.noneMoved
        && w.weeksAgain,
      w, 'ticked phases only; the outlined phase shown; a pick outlines; the landing row keeps its box; Whole schedule only with all six ticked');

    // ---- J1: a phase picked in the box lands, and Go slides the whole calendar ----
    await openShift(); await far('date');
    var j = {back: val('tool-anchor-date')};
    T.set('tool-anchor-phase', 'post'); await T.sleep(150);
    j.prefill = val('tool-anchor-date'); j.rows = moving(); j.count = count(); j.lands = lands(); j.mark = mark();
    j.box = boxOf('post').checked && !boxOf('post').disabled;
    var jTarget = new Date(Date.UTC(+j.prefill.slice(0, 4), +j.prefill.slice(5, 7) - 1, +j.prefill.slice(8, 10)) + 7 * 864e5).toISOString().slice(0, 10);
    T.set('tool-anchor-date', jTarget);
    $('tool-anchor-go').click(); await settle();
    var mJ = msg(), sJ = await take();
    var stJ = startsOf(sJ), st0J = startsOf(s0);
    j.allMovedAWeek = Object.keys(st0J).every(function (k) { return !st0J[k] || !stJ[k] || (Date.parse(stJ[k]) - Date.parse(st0J[k])) === 7 * 864e5; });
    j.post = stJ.post; j.msg = mJ;
    add('J1', 'Post picked in the box: the date prefills with Post\'s own, its row is outlined and says "On your date" with its tick box kept, and Go slides the whole calendar a week',
      j.back === '2026-06-29' && j.prefill === '2026-11-02' && j.lands === 'post' && j.mark === 'post' && j.box && j.rows.indexOf('Post On your date') >= 0 && j.count === '6 of 6 move'
        && j.allMovedAWeek && stJ.post === '2026-11-09' && /Post starts 11\/9\/26\./.test(mJ) && !/moved \(/.test(mJ),
      j, 'prefill 11/2; "Post On your date"; every start + 7 days; "Post starts 11/9/26."');
    await undo(); await take();

    // ---- O2: reopened -> every phase ticked, By weeks, the shoot outlined ----
    await openShift(); await far('date');
    await T.shiftSide('prior', 'prodPrep');
    var o2before = {ticked: ticked(), mark: mark(), far: q('[data-far="date"]').getAttribute('aria-pressed')};
    await openShift();
    var o2 = {ticked: ticked(), count: count(), far: q('[data-far="weeks"]').getAttribute('aria-pressed'), all: allBox().checked, mark: mark(), sides: sides(),
              phaseRow: hiddenOf('[data-shift-phase-row]'), dateRow: hiddenOf('[data-far-row="date"]'), before: o2before};
    add('O2', 'reopened after Prior to Prod Prep to a date, it is back on every phase ticked, By weeks, the shoot outlined (ruling R2(a))',
      o2before.ticked === 'writersRoom,prePrep,prodPrep' && o2before.mark === 'prodPrep' && o2before.far === 'true'
        && o2.ticked === KEYS.join() && o2.count === '6 of 6 move' && o2.far === 'true' && o2.all && o2.mark === 'production' && o2.sides === 'Prior to Production | After Production'
        && o2.phaseRow && o2.dateRow, o2, 'six ticked, By weeks, Production outlined, the landing row hidden');
    closePops(); await T.sleep(150);

    // ---- I1: hygiene ----
    var newIds = Array.prototype.filter.call(MENU().querySelectorAll('.shift-box, .shift-box *, .shift-sides, .shift-sides *, [data-far]'), function (b) { return !!b.id; }).length;
    var gone = ['[data-move]', '[data-shift-move]', '[data-shift-choose]', '[data-shift-list-wrap]', '[data-shift-subject]', '[data-shift-subject-row]', '[data-shift-subject-line]', '.solve-pin-ic']
      .filter(function (sel) { return !!q(sel); });
    var controls = ['tool-anchor-phase', 'tool-anchor-edge', 'tool-anchor-date', 'tool-shift-weeks'];
    var outside = controls.filter(function (id) { return !$(id) || !$(id).closest('.tools-menu'); });
    add('I1', 'nothing in the list, the strip, Prior / After or How far carries an id; the What moves buttons, the fold, the mirror select and the pin are gone; every id\'d control sits inside .tools-menu; the retired popovers are gone',
      newIds === 0 && gone.length === 0 && outside.length === 0 && !!allBox() && !$('pop-ripple') && !$('pop-anchor') && !$('pop-ripple-btn') && !$('pop-anchor-btn') && !$('tool-ripple-phase'),
      {newIds: newIds, gone: gone, outside: outside, retired: [!!$('pop-ripple'), !!$('pop-anchor'), !!$('tool-ripple-phase')]}, '0 ids; none of the old controls; none outside');

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
