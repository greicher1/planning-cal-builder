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
  }
};

for (const [id, spec] of Object.entries(SPECS)) {
  const s = buildSnapshot(spec, id);
  fs.writeFileSync(path.join(out, id + '.sptcal'), JSON.stringify(s, null, 2) + '\n');
  console.log('wrote tests/fixtures/' + id + '.sptcal');
}
