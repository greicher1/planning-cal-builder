#!/usr/bin/env node
// The layout rules' fixtures (LAYOUT-RULES.md §5; LAYOUT-BUILD-PLAN.md §2.4): synthetic calendars, made-up dates in
// 2031-2032 and generic names, one per rule group, each STAMPED (`colReuse: true`, the layout stamp) and each red on
// the build before the rules where its rule differs. Written to tests/fixtures/layout-*.sptcal by
//
//   node tools/layout-study/fixtures.mjs
//
// through transcribe.mjs's buildSnapshot, so a fixture is the same shape of file the study's seeds are: region None
// (a Production week is five shoot days, one 5-day episode per week), Snap to Monday on, nothing typed but the
// phases, their dates and lengths, the hiatuses and Sim Post. The leg that reads them is tests/harness/t/layoutrules.js,
// whose header says what each one expects. ⛔ Never replace one with a real calendar.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSnapshot } from './transcribe.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..', '..', 'tests', 'fixtures');
const Y1 = { start: '2031-12-22', weeks: 2 }, Y2 = { start: '2032-12-20', weeks: 2 };

const SPECS = {
  // Rule 3 as the pictures have it: Writers' column freed five weeks before the shoot, Prep's handed off that week,
  // Production in Writers' column, Sim Post's lane in Prep's; then Post continues the lane (rule 6) and
  // Localization follows Post (rule 7). Two columns in 2031; today's reuse placement opens a third for the lane.
  'layout-r3': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 20 },
      { key: 'prePrep', name: 'Design', start: '2031-03-17', weeks: 3 },
      { key: 'prodPrep', name: 'Prep', start: '2031-04-07', weeks: 12 },
      { key: 'production', start: '2031-06-30', weeks: 16 },
      { key: 'post', start: '2031-10-20', weeks: 20 },
      { key: 'localization', start: '2032-03-22', weeks: 6 }
    ],
    hiatuses: [Y1, Y2]
  },
  // Rule 6, general: a 3-week custom phase that is not a wrap ("Reshoots") and Post start the week Production ends.
  // With Sim Post, Post continues the lane and the short one takes Production's column; the leg then switches Sim
  // Post off: the short one still takes Production's column and Post goes right. Today Post takes the handoff.
  'layout-r6': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 20 },
      { key: 'prePrep', name: 'Design', start: '2031-03-17', weeks: 3 },
      { key: 'prodPrep', name: 'Prep', start: '2031-04-07', weeks: 10 },
      { key: 'production', start: '2031-06-16', weeks: 12 },
      { key: 'custom1', name: 'Reshoots', start: '2031-09-08', weeks: 3 },
      { key: 'post', start: '2031-09-08', weeks: 24 }
    ],
    hiatuses: [Y1, Y2]
  },
  // Rule 9, the hand-03 / hand-08 shape: last season's Post column is LEFT of Writers in 2031 and, reused by Design
  // (a handoff across the holiday) and then by Prep and Production, RIGHT of Writers in 2032, because Writers
  // started before Design did. A `col` value cannot say that; stintOrderFor does.
  'layout-r9': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'custom1', name: 'Prior Post', start: '2031-03-17', weeks: 40 },
      { key: 'writersRoom', start: '2031-07-07', weeks: 60 },
      { key: 'prePrep', name: 'Design', start: '2032-01-05', weeks: 6 },
      { key: 'prodPrep', name: 'Prep', start: '2032-02-16', weeks: 14 },
      { key: 'production', start: '2032-05-24', weeks: 16 },
      { key: 'post', start: '2032-09-13', weeks: 20 }
    ],
    hiatuses: [Y1, Y2]
  },
  // Rules 2, 4 (R-D) and 7, no Sim Post: Prep hands off from last season's Post into a column LEFT of the running
  // Writers (following on may); Research, starting the week Writers pauses, takes neither Writers' column (a paused
  // phase has not ended) nor the free column left of Writers (not following on: right of everything running) -- a
  // new column; Post follows Production and Localization follows Post into one column.
  'layout-r7': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'custom1', name: 'S1 Post', start: '2031-01-06', weeks: 8 },
      { key: 'writersRoom', start: '2031-02-03', weeks: 24 },
      { key: 'prodPrep', name: 'Prep', start: '2031-03-03', weeks: 4 },
      { key: 'custom2', name: 'Research', start: '2031-05-05', weeks: 2 },
      { key: 'production', start: '2031-08-04', weeks: 10 },
      { key: 'post', start: '2031-10-13', weeks: 8 },
      { key: 'localization', start: '2031-12-08', weeks: 2 }
    ],
    phaseHiatus: [{ key: 'writersRoom', start: '2031-05-05', weeks: 2, name: 'Writers Break' }],
    hiatuses: [Y1]
  },
  // Rules 11-16 and 18 (piece 2, the frozen widths): Writers takes the spare column between it and Bible once Pilot
  // Cut ends (R-E); Bible alone fills the width; Production beside the lane stays one wide; Post, one wide beside
  // Reshoots, fills the width the week Reshoots ends (rule 13); in 2032 Delivery stays one wide while Marketing's
  // column is empty but spoken for, across the mid-year hiatus (rule 18), and widens once Marketing ends.
  'layout-r13': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 20 },
      { key: 'custom1', name: 'Pilot Cut', start: '2031-02-03', weeks: 9 },
      { key: 'custom2', name: 'Bible', start: '2031-03-03', weeks: 16 },
      { key: 'production', start: '2031-06-23', weeks: 12 },
      { key: 'custom3', name: 'Reshoots', start: '2031-09-15', weeks: 3 },
      { key: 'post', start: '2031-09-15', weeks: 20 },
      { key: 'custom4', name: 'Delivery', start: '2032-02-16', weeks: 30 },
      { key: 'custom5', name: 'Marketing', start: '2032-08-02', weeks: 4 }
    ],
    hiatuses: [Y1, { start: '2032-06-28', weeks: 1 }, Y2]
  },
  // Rule 17 (piece 2), Single Column, the hand-05 shape: Writers alone before its first band, Post and then
  // Localization in the lane with two empty columns beside them -- every cell one column wide.
  'layout-r17': {
    stamped: true, singleColumn: true, simpost: { enabled: true, offset: 0, count: true },
    phases: [
      { key: 'writersRoom', start: '2031-11-10', weeks: 20 },
      { key: 'prodPrep', name: 'Hard Prep', start: '2032-01-26', weeks: 10 },
      { key: 'production', start: '2032-04-05', weeks: 9 },
      { key: 'post', start: '2032-06-07', weeks: 9 },
      { key: 'localization', start: '2032-08-09', weeks: 8 }
    ],
    hiatuses: [{ start: '2031-11-24', weeks: 1 }, Y1]
  },
  // Rule 20 (owner, 5 Nov 2026), giving way -- the owner's Test Show shape: Post starts in Production's last week
  // while the Sim Post marker still holds its lane. Before rule 20 that opened a third column for ONE week, which
  // then stood empty beside Writers + Design and beside Production + the lane for the rest of the year. Post takes
  // the lane from its first week and the marker steps aside that week: two columns.
  'layout-r20': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 20 },
      { key: 'prePrep', name: 'Design', start: '2031-05-12', weeks: 4 },
      { key: 'prodPrep', name: 'Prep', start: '2031-06-09', weeks: 10 },
      { key: 'production', start: '2031-08-25', weeks: 14 },
      { key: 'post', start: '2031-11-24', weeks: 20 }
    ],
    hiatuses: [Y1, Y2]
  },
  // Rule 20, absorbing, any phase: a one-week Table Read opens a third column beside the running Writers and Prep
  // (both need their cells that week, so the column has to exist). Used one week in the year, it does not count
  // toward the even share, and Prep, beside it, spreads into it from the week it is free for the rest of Prep's
  // run; Writers, not beside it, stays one wide. No Sim Post, so nothing can give way.
  // Rule 21 (owner, 6 Nov 2026): a run never shrinks. Post, in the lane after the shoot and alone, spreads into
  // Production's old column (two wide; the third column is Localization's before Post ends, so not that one);
  // Localization starts two weeks before Post ends and goes right (rule 4). Today the even share then pulls Post back
  // to one column and the spare sits at the left edge; now Post keeps its two for the rest of its run, Localization
  // sits one wide beside it, and fills the width when Post ends.
  'layout-r21': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 4 },
      { key: 'production', start: '2031-02-03', weeks: 12 },
      { key: 'post', start: '2031-05-12', weeks: 24 },
      { key: 'localization', start: '2031-10-13', weeks: 8 }
    ],
    hiatuses: [Y1]
  },
  // Rules 12, 13 and 15 as the owner ruled them on 6 Nov 2026 (frozen edit LR4), the shape of their screenshot:
  // Pre-Prep beside Writers is TWO wide from its first week (the column to its right is free for the rest of its run,
  // and the even share no longer caps a spread to the right), the lane is reserved until the shoot ends, Sim Post is
  // on every shoot week, and Post, starting three weeks before the shoot ends, gets a third column for those weeks.
  'layout-r13b': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 14 },
      { key: 'prePrep', start: '2031-03-17', weeks: 6 },
      { key: 'prodPrep', start: '2031-04-28', weeks: 14 },
      { key: 'production', start: '2031-08-04', weeks: 19 },
      { key: 'post', start: '2031-11-24', weeks: 26 }
    ],
    hiatuses: [Y1, Y2]
  },
  // Rule 3 as ruled on 6 Nov 2026 ("Yes, Production only"), the owner's screenshot without Sim Post: Post starts before
  // the shoot and runs to its right; Production, handed Prod Prep's middle column, used to sit one wide beside Post
  // with Writers' free column empty on its left for the whole shoot. Now Production takes the leftmost free column,
  // Writers', and the spare middle column goes to it (R-E). Prod Prep keeps its white column (rule 13: Post takes it
  // before Prod Prep ends), as hand-08's Shoot does.
  'layout-r3b': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 14 },
      { key: 'prePrep', start: '2031-03-17', weeks: 6 },
      { key: 'prodPrep', start: '2031-04-28', weeks: 14 },
      { key: 'post', start: '2031-07-07', weeks: 26 },
      { key: 'production', start: '2031-08-04', weeks: 17 }
    ],
    hiatuses: [Y1, Y2]
  },
  // FILL-INTENT-PLAN.md §4 (leg phasefill): Writers, Pre-Prep six weeks with Production arriving in its sixth, Post
  // after, no Sim Post -- under rule 13 Pre-Prep is one wide for all six weeks, which is where the double-click's wish
  // ("fills its free space") shows. Not a layout-r* fixture: the layoutrules leg does not read it. ⚠️ A three-week
  // "Research" beside Writers' last weeks since 6 Nov 2026 (rule 22, frozen edit LR6): without it Writers is two wide in
  // its last week, and Pre-Prep, following it, now carries that width, so the automatic layout would already draw what
  // the wish draws.
  'fill-intent': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 14 },
      { key: 'custom1', name: 'Research', start: '2031-03-24', weeks: 3 },
      { key: 'prePrep', start: '2031-04-14', weeks: 6 },
      { key: 'production', start: '2031-05-19', weeks: 10 },
      { key: 'post', start: '2031-07-28', weeks: 8 }
    ],
    hiatuses: [Y1]
  },
  // A block swap holds when one of its phases moves (owner, 6 Nov 2026: "if you swap a column then move one of those
  // columns up, it should maintain the position its in"; FILL-INTENT-PLAN.md §8). Pre-Prep and Prod Prep run side by
  // side for three weeks, Pre-Prep left; the file swaps them the way every build before 6 Nov 2026 saved a swap, with no
  // side (`extra`), so the leg also proves an old swap opens looking the same. Leg `swapholds`.
  'swap-holds': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 14 },
      { key: 'prePrep', start: '2031-03-17', weeks: 6 },
      { key: 'prodPrep', start: '2031-04-07', weeks: 14 },
      { key: 'production', start: '2031-08-04', weeks: 19 },
      { key: 'post', start: '2031-11-24', weeks: 26 }
    ],
    hiatuses: [Y1, Y2],
    extra: { gridStintSwaps: { '2031|prePrep': { with: 'prodPrep' }, '2031|prodPrep': { with: 'prePrep' } } }
  },
  // Rule 2's short gap (owner, 6 Nov 2026, "up to 4 weeks"; FILL-INTENT-PLAN.md §9): the owner's test calendar's shape. Writers
  // ends 4/7; Pre-Prep runs beside it; a custom "Test" starts 4/21, one working week after Writers' column emptied, and
  // follows Writers into it instead of opening a third column right of Pre-Prep (R-D). The leg also moves Test to 5/12
  // (four weeks: still Writers' column) and 5/19 (five: a new column, R-D, as layout-r7's Research).
  'layout-r2g': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 14 },
      { key: 'prePrep', start: '2031-03-17', weeks: 6 },
      { key: 'custom1', name: 'Test', start: '2031-04-21', weeks: 10 },
      { key: 'prodPrep', start: '2031-04-28', weeks: 10 },
      { key: 'production', start: '2031-08-04', weeks: 10 },
      { key: 'post', start: '2031-10-13', weeks: 8 }
    ],
    hiatuses: [Y1]
  },
  // Rule 2's short gap, the LATEST-freed column (owner, 6 Nov 2026: "Its jumping back and fourth so many times"): the
  // owner's sweep, shifted to 2030-31. Writers ends 1/6/31, Pre-Prep beside it ends 1/20, Prod Prep follows Pre-Prep
  // on 1/27, Production starts 3/24. The leg slides Prod Prep 1/27 -> 3/3 a week at a time: it stays in Pre-Prep's
  // column, right of Production, through four weeks' gap, and changes once, at five (R-D's limit).
  'layout-r2h': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'writersRoom', start: '2030-08-26', weeks: 20 },
      { key: 'prePrep', start: '2030-12-16', weeks: 6 },
      { key: 'prodPrep', start: '2031-01-27', weeks: 10 },
      { key: 'production', start: '2031-03-24', weeks: 20 }
    ],
    hiatuses: [Y1]
  },
  // Sticky columns (owner, 6 Nov 2026, STICKY-COLUMNS-PLAN.md; rulings K1-K4): the owner's shape, shifted to 2031.
  // Writers then Prod Prep in the left column, Prod Prep's last week 7/28; Production 8/4 (20 weeks); a 10-week custom
  // "Test" starting 7/28, right of Production. By the rules alone, Test nudged to 8/4 -- the week both start, with
  // Prod Prep's column just freed -- goes LEFT (rule 6's tie: the shorter takes it) and right again at 8/11; and
  // Production nudged into Test's start week goes right. A phase the user moves keeps its column. Leg `stickycols`.
  'sticky-cols': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 16 },
      { key: 'prodPrep', start: '2031-04-28', weeks: 14 },
      { key: 'production', start: '2031-08-04', weeks: 20 },
      { key: 'custom1', name: 'Test', start: '2031-07-28', weeks: 10 }
    ],
    hiatuses: [Y1]
  },
  // Rule 23, as few columns as possible (owner, 6 Nov 2026: "We should always prioritize as few collumns as possible"):
  // the owner's test calendar, shifted to 2031. Writers ends 7/28; Pre-Prep beside it ends 8/11; Prod Prep starts 8/18;
  // a four-week custom "Casting" starts 9/8 beside Prod Prep; Production 10/27 with Sim Post. By rules 2-8 alone Prod
  // Prep takes Pre-Prep's handed-off column, so Casting (not following on, and never left of a running phase) opens a
  // third column; Prod Prep following Writers into its column (freed three weeks before, rule 2's short gap) leaves
  // Pre-Prep's for Casting, and the year needs two. The leg also slides Casting into the shoot, where three are needed
  // either way.
  'layout-r23': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-03-17', weeks: 20 },
      { key: 'prePrep', start: '2031-07-07', weeks: 6 },
      { key: 'prodPrep', start: '2031-08-18', weeks: 10 },
      { key: 'custom1', name: 'Casting', start: '2031-09-08', weeks: 4 },
      { key: 'production', start: '2031-10-27', weeks: 16 }
    ],
    hiatuses: [Y1, Y2]
  },
  // Rule 23's give-way (owner, 9 Nov 2026, by picker in the sticky-columns session: "Give way"): the owner's calendar
  // with Casting moved, so it remembers a column of its OWN (colKeep custom1: ''), starting 8/11 the week after
  // Writers' column frees. Kept, that own column is a third; given way, Casting takes Writers' column and the year
  // needs two. A kept column of its own wins only on a tie (stickycols' nudges cost nothing and still hold).
  'layout-r23b': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-03-17', weeks: 20 },
      { key: 'prePrep', start: '2031-07-07', weeks: 6 },
      { key: 'prodPrep', start: '2031-08-18', weeks: 10 },
      { key: 'custom1', name: 'Casting', start: '2031-08-11', weeks: 4 },
      { key: 'production', start: '2031-10-27', weeks: 16 }
    ],
    hiatuses: [Y1],
    extra: { colKeep: { custom1: '' } }
  },
  // layout-r21's shape with three columns needed in January (Bible and Pilot Cut beside Writers), so rule 23 can save
  // nothing later in the year and rule 21 is still what holds Post two wide beside Localization. (layout-r21 itself now
  // lays out in two columns: Post under Production, Localization in the lane column, by the owner's ruling.)
  'layout-r21b': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 4 },
      { key: 'custom1', name: 'Bible', start: '2031-01-06', weeks: 4 },
      { key: 'custom2', name: 'Pilot Cut', start: '2031-01-06', weeks: 4 },
      { key: 'production', start: '2031-02-03', weeks: 12 },
      { key: 'post', start: '2031-05-12', weeks: 24 },
      { key: 'localization', start: '2031-10-13', weeks: 8 }
    ],
    hiatuses: [Y1]
  },
  // layout-r3b's shape with Writers running four more weeks, past Prod Prep's start, so Prod Prep cannot follow Writers
  // and must take Pre-Prep's column; Post (not following on) opens a third, and rule 3 is what puts Production in
  // Writers' free column with Post running to its right. (layout-r3b itself now lays out in two columns.)
  'layout-r3c': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 20 },
      { key: 'prePrep', start: '2031-03-17', weeks: 6 },
      { key: 'prodPrep', start: '2031-04-28', weeks: 14 },
      { key: 'post', start: '2031-07-07', weeks: 26 },
      { key: 'production', start: '2031-08-04', weeks: 17 }
    ],
    hiatuses: [Y1, Y2]
  },
  // Rule 22 (owner, 6 Nov 2026, "this is how it should sort"; frozen edit LR6): the owner's test calendar, shifted to
  // 2031. Pre-Prep two wide beside Writers; Prod Prep follows it and keeps that width until a 4-week Casting takes the
  // third column, then one wide to the end -- not across all three for its last three weeks alone; Production and the
  // lane after. Today: Prod Prep one wide from its first week, and three wide for its last three.
  'layout-r22': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-04-28', weeks: 20 },
      { key: 'prePrep', start: '2031-07-07', weeks: 6 },
      { key: 'prodPrep', start: '2031-08-18', weeks: 10 },
      { key: 'custom1', name: 'Casting', start: '2031-09-08', weeks: 4 },
      { key: 'production', start: '2031-10-27', weeks: 16 }
    ],
    hiatuses: [Y1]
  },
  // Rule 22 again, the owner's second test calendar (6 Nov 2026: "wait why is it still doing the upside down T pattern
  // for prod prep"), shifted to 2031. Writers ends 7/28; Pre-Prep, beside it, is two wide alone on 8/4 and KEPT two wide
  // (rule 21) beside a Casting that remembers a column of its own (it had been moved: colKeep, `extra`). Prod Prep follows
  // Pre-Prep and carries that two-wide cell (the first rule 22 build measured Pre-Prep by the even share alone, saw one
  // column, and Prod Prep sat one wide in the middle, then filled across: the T); alone once Casting ends, it fills the
  // width (ruling 3 of the fewest-columns session: a phase alone in its last weeks still fills). The leg then takes Reset
  // Columns: Casting, remembering nothing, takes Writers' freed column and the year is two columns.
  'layout-r22b': {
    stamped: true, simpost: { enabled: true, offset: 0 },
    phases: [
      { key: 'writersRoom', start: '2031-03-17', weeks: 20 },
      { key: 'prePrep', start: '2031-07-07', weeks: 6 },
      { key: 'prodPrep', start: '2031-08-18', weeks: 10 },
      { key: 'custom1', name: 'Casting', start: '2031-08-11', weeks: 4 },
      { key: 'production', start: '2031-10-27', weeks: 16 }
    ],
    hiatuses: [Y1],
    extra: { colKeep: { custom1: '' } }
  },
  // Rule 22's hold keeps what the phase had (found by the fewest-columns session on its layout-r3c): layout-r3b with a
  // 20-week Writers. Prod Prep follows Pre-Prep two wide, spreads into Writers' column when Writers ends (5/26), and when
  // Post takes the third column (7/7) it keeps the other two -- the first build gave Writers' column back, a run that
  // shrank, against rule 21.
  'layout-r22c': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 20 },
      { key: 'prePrep', start: '2031-03-17', weeks: 6 },
      { key: 'prodPrep', start: '2031-04-28', weeks: 14 },
      { key: 'post', start: '2031-07-07', weeks: 26 },
      { key: 'production', start: '2031-08-04', weeks: 17 }
    ],
    hiatuses: [Y1, Y2]
  },
  'layout-r20b': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 20 },
      { key: 'prodPrep', name: 'Prep', start: '2031-04-07', weeks: 12 },
      { key: 'custom1', name: 'Table Read', start: '2031-04-21', weeks: 1 },
      { key: 'production', start: '2031-06-30', weeks: 10 },
      { key: 'post', start: '2031-09-08', weeks: 12 }
    ],
    hiatuses: [Y1]
  },
  // The hover prompt (owner, 10 Nov 2026; FILL-INTENT-PLAN.md §11, leg hoverexpand): the owner's test calendar's shape,
  // shifted to 2031. A 10-week custom "Test" starts in Writers' last week with an empty column on its right that week
  // only (Prod Prep and Pre-Prep start the week after); once Pre-Prep ends, Test has an empty column on its LEFT for its
  // last weeks. Two separate blanks beside one phase: Expand? on the second must not widen the first (the owner's
  // "it also expanded test wk 1"), and the first is the stint's top cell, where the Swap Column button sits.
  'hover-expand': {
    stamped: true, simpost: { enabled: false },
    phases: [
      { key: 'writersRoom', start: '2031-01-06', weeks: 20 },
      { key: 'custom1', name: 'Test', start: '2031-05-19', weeks: 10 },
      { key: 'prePrep', start: '2031-05-26', weeks: 6 },
      { key: 'prodPrep', start: '2031-05-26', weeks: 10 },
      { key: 'production', start: '2031-08-04', weeks: 20 }
    ],
    hiatuses: [Y1]
  }
};

// `node tools/layout-study/fixtures.mjs <id> …` writes only those; with no ids, every one.
const only = process.argv.slice(2);
for (const [id, spec] of Object.entries(SPECS)) {
  if (only.length && !only.includes(id)) continue;
  const s = buildSnapshot(spec, id);
  if (spec.extra) Object.assign(s, spec.extra);   // stores the spec format has no field for (swap-holds' old swap)
  fs.writeFileSync(path.join(out, id + '.sptcal'), JSON.stringify(s, null, 2) + '\n');
  console.log('wrote tests/fixtures/' + id + '.sptcal');
}
