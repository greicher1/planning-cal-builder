# LAYOUT-RULES.md

**How the waterfall's columns should be placed, ordered and widened — derived from the owner's own calendars
(the layout study, 4–5 Nov 2026) and the owner's picks on every place today's rule differs from them.**

Read [`LAYOUT-STUDY-PLAN.md`](LAYOUT-STUDY-PLAN.md) §12 first (what was measured, how). The seeds are 15 real
calendars, 14 hand-built in Excel and one SPTCal export, kept outside the repo; they are named here only as
`hand-NN`. **The owner answered "Yes, as pictured" on all 15 and "Picture" on all 64 differences** (picks.json,
outside the repo), so the pictures are the specification, and today's rules are measured against them: **82.3%**
of phase-weeks right with Reuse Empty Columns off, **71.6%** with it on.

Terms: a *block* is one year's grid (or the whole calendar in Single Column); a *column* is a slot in a block; a
phase *continues* another when it starts the week after the other ends (an all-phase hiatus between does not
break that, ruled Q5); a phase's *run* is its weeks in a block.

---

## 0. The rules, simply (the owner's ask, 5 Nov 2026 — the whole algorithm in plain words)

**Columns — where each phase goes.** Phases are placed one at a time, in the order they start.

1. **Start order.** Earliest start first. Two starting the same week: the one higher in the phase list first,
   except rule 6.
2. **Follow on.** A column is free once the phase in it has ended before this one starts (hiatus weeks between
   don't matter). If a column's phase ended the week before, take that column. **A paused phase has not ended:**
   a phase on its own hiatus keeps its column.
3. **Two just freed: take the left one.** That is what puts Production in Writers' column, not Prep's.
   *(As built, 5 Nov 2026 — LAYOUT-BUILD-PLAN.md §2.2: **Production goes left whether or not both columns were freed
   that week.** In hand-10, 12, 15 and 16 Writers' column had been free for one to six weeks and only Prod Prep's was
   handed off, and the pictures still put Production in Writers' column; the study's own scoring agrees, since Reuse
   OFF, which takes the lowest free column, got those seeds right. Every other phase takes its handoff column first,
   as rule 2 says — hand-05's and hand-08's Localization over a free column further left.)*
4. **Nothing just freed: the lowest free column** — preferring one already used this year, so the year does not
   grow a column — **but never left of a phase still running** unless following on (rule 2): a phase that is not
   continuing a column goes right of everything running. *(Ruled R-D, 5 Nov 2026.)*
5. **Nothing free: a new column on the right.**
6. **Post continues the Sim Post lane** when Sim Post ran, so whatever else starts the week Production ends takes
   Production's column by rule 2. **Where several phases start the same week and compete for one free column,
   the shorter takes it; the longer goes right** (and widens into the space when the short one ends, rule 13).
   Any free column, not only one freed the week before. The pictures showed this with a 3-week Wrap beside Post,
   with and without Sim Post; the rule is general — any short follow-on, not a phase named "Wrap" — and keys on
   nothing but length. *(Ruled general, R-C, 5 Nov 2026.)*
7. **Localization follows Post** into its column (rule 2).
8. **Sim Post sits in the column right of Production,** for the whole shoot.
9. **Order within a year:** columns run left to right by when the phase at the top of each column started —
   earliest on the left; a column that first appears later in the year goes after.
10. **A hidden phase takes no column. A hand move** (drag into a free column, Swap Column) **always wins.**

**Widths — how wide each cell draws.**

11. A cell is **one column wide** unless a rule below widens it.
12. **Phases in the same week share the width evenly** — two take half each, three a third. **A spare column that
    the share leaves over goes to the left phase**, so there is never an empty column between two phases (three
    columns, two phases: the left one is two wide). *(Ruled R-E, 5 Nov 2026; today leaves the hole.)*
13. **A phase spreads into the next column from the week that column is free for the rest of the phase's run,**
    and not before. Judged week by week, looking forward: at a given week, the column beside it must be empty
    from that week to the end of the phase's run in this year block. Post widens the week Wrap ends; Prep's last
    week widens after Writers closes; a phase whose neighbour column is empty for 31 weeks but taken before the
    phase ends stays narrow throughout (hand-08's Shoot). So a width only ever grows along a run, never grows and
    shrinks back. Either side; the even share (12) still caps it; the lane (15) is excluded while Sim Post runs;
    a run is the phase's weeks within one year block, so a phase continuing into the next year is judged afresh
    there. *(Today: "empty for the WHOLE run", so Post beside a 3-week Wrap stays one wide for 22 weeks.)*
14. **A phase alone in its row fills the whole width.**
15. **The Sim Post lane is never spread into while Sim Post runs;** after the shoot it is an ordinary column.
16. **A per-phase hiatus band is as wide as its phase would be that week; an all-phase hiatus spans the block.**
17. **Lanes: in Single Column mode nothing spreads** — every phase stays one column wide. *(Single Column only,
    ruled R-F, 5 Nov 2026: typed column headings do NOT make lanes, so typing a heading never changes a width.)*
18. **A hiatus week does not split a phase's run** for these rules: the weeks before a band do not widen on their
    own.
19. **A width dragged by hand wins.**

**Built** (LAYOUT-BUILD-PLAN.md, 5 Nov 2026): placement v3 is `placeSegmentsByRules` in `src/legacy/app.js`, rule 9 is
`layoutBlockOrders` through `stintOrderFor`, the widths are `computePhaseRowLayout`'s stamped branch; the fixtures are
`tests/fixtures/layout-r*.sptcal` (made by `tools/layout-study/fixtures.mjs`) and the leg `layoutrules`.

**Old files.** A calendar saved without the layout stamp (`colReuse`) keeps its old columns and widths exactly,
forever, and is offered the update once, by a strip — never changed on its own (owner ruling, 5 Nov 2026: *"yes
that way"*).

---

## 1. Placement — which column a phase takes (NOT frozen code)

Today: with Reuse off, strict start order and never left of a running phase; with Reuse on, COLUMN-REUSE-PLAN §3.
The pictures agree with Reuse ON's shape — a phase takes over a freed column — but not with two of its choices.

**R1. Start order.** Phases are placed in the order they start; ties by phase order. *(As today.)*

**R2. A phase takes a free column, preferring the one it continues.** A column is free once its last occupant's
final week is above this phase's first. Among free columns: first one whose occupant ended the week before
(a handoff); else the lowest free; else a new column on the right. *(Reuse ON's rules 2–3 and 5; the 4 Nov
"already used in this year" preference is not contradicted by any seed and stays.)*
Seeds: 02/03/04 (Pre-Prep takes S1 Post's column across the holiday), 05, 08 (four writers' phases in one column;
Soft Prep → Hard Prep → Shoot in one), 13 (Prod Prep → Production), 15/16.

**R3. Production goes LEFT.** When two columns are handed off the same week — Writers and Prod Prep both ending
the week before the shoot — Production takes the **leftmost** of them, not its chain predecessor's (Prod Prep's).
Sim Post's lane (SP1: Production's slot + 1) then lands in Prod Prep's column and the block stays two wide.
Today's Reuse ON takes Prod Prep's column and renumbers Production 0; the frozen first-appearance order then leaves
Writers' column on the left, Production absorbs it, and Sim Post opens a THIRD column. Seeds: 01, 06, 10, 11, 13,
15, 16 — every calendar with a Writers | Prep pair before the shoot. ⛔ Reuse ON's "Production is column 0" (ruled
Q2) is withdrawn by this: it is what breaks R5 in 02, 03 and 07, and hand-08 — the one seed Q2 served — is also
produced by R5.

**R4. Starting together as Production ends: the wrap takes Production's column, Post the Sim Post lane.** A
custom phase that starts the week Production ends continues Production's column (owner's note on hand-06: *"wrap
weeks are related to production, so they should go right underneath prod"*). Post, starting the same week, takes
the Sim Post lane's column when Sim Post ran, else the next column right. Today Post wins the handoff by phase
order and the wrap is pushed right. Seeds: 06, 09, 11, 12 (no Sim Post: Wrap left, Post right), 13.

**R5. The top of a year.** Where two or more columns begin a block in its first row, they are ordered by the
**start date of the phase at the top of each column** — the one that started earliest on the left — and columns
that first appear later in the block follow in order of appearance. Seeds: 02, 03, 07 (Writers, continuing, left
of a column that begins with a new-this-year Prep), 08 (Hard Prep, started 9/15, left of Writers EXT, started
12/8; Shoot | Post S1 | Post S2 in 2027), 13, 01. ⚠️ Frozen `computeBlockLayout` orders by first appearance and
breaks ties by `col` VALUE, and a value cannot say "left this year, right the next". **Two seeds need exactly
that** (corrected 5 Nov 2026 — an earlier draft here said none did): in hand-03 the S1 Post column is left of
Writers in 2026 and, reused by Pre-Prep, right of Writers in 2027; in hand-08 the writers' column is left of the
Prep column in 2025 and right of it in 2026. Today's Off path produced hand-03 only by NOT reusing the column, and
hand-08 only through "Production is column 0". So R5 is built through the sanctioned seam: `stintOrderFor` (edit
E0, not frozen) returns the per-block slot order from outside the frozen function; on stamped calendars it returns
R5's order, on unstamped ones null as today. A behaviour change to sign off, not a frozen edit.

**R6. Sim Post's lane is Production's slot + 1.** Unchanged (SP1, ruled 2 Nov 2026). hand-09's first year had
Sim Post LEFT of Production in the picture; the study did not ask about it and the owner's "as pictured" there is
not read as overturning SP1. Say so if it should.

**R7. Localization continues Post's column** (R2's handoff), as in 05 and 08 (twice). ⚠️ **hand-07 is the one
exception:** Post (col 1) and Localization (col 2) side by side in its last year, each one wide, although
Localization starts the week after Post ends. The owner picked the picture there too. Two of three pictures
stack, and R8 below (a lone phase fills the width) cannot hold in hand-07's last year either — Post sits one wide
with an empty column beside it for seven weeks. So hand-07's last year is read as the Excel template's habit (two
columns in every year block), and the rule is the handoff. **Ruling R-A below.**

## 2. Width — how wide a cell draws (FROZEN: `computePhaseRowLayout`)

Today: a phase spans into a neighbour column only if that column is empty for the phase's WHOLE run; phases in a
row share the width evenly; a lone phase fills the width, absorbing empty columns to its left.

**R8. A phase takes a neighbouring column from the week it is free for the REST of the phase's run.** Not the
whole run — the rest of it. So Post, one wide beside a three-week Wrap, becomes two wide the week Wrap ends;
Prod Prep's last week widens after Writers closes. The even share among phases in the row stays. Seeds: 06, 09,
11, 12, 13, 15, 16 (the single largest source of today's misses), and it keeps hand-08's Shoot one wide — the
column beside it is empty for 31 weeks but Post S1 arrives before Shoot ends, so it is not free for the rest of the
run. Today's rule gets 01, 02, 03, 04, 07 (first two years), 10 right and R8 keeps every one of those.

**R9. Lanes: no widening in Single Column mode.** *(Amended by R-F, 5 Nov 2026: Single Column only; the typed-headings
half was dropped because typing a heading would narrow cells on an ordinary calendar, and R8 explains hand-08
but for seven weeks of one phase.)* The evidence as found: hand-05
(Single Column) keeps every phase one wide — Writers alone before the first hiatus, Post and then Localization in
the Sim Post lane with two empty columns beside them. hand-08 (typed column headings every year: Writing, Prep,
Shoot, Post S1, Post S2…) never widens either; R8 explains all of hand-08's narrow cells but one (Post S2 alone for
the last seven weeks of 2027). In both calendars a column is a *role*, and the picture keeps it. Each rests on ONE
calendar, so this is **ruling R-B**, not yet a rule.

**R10. A per-phase hiatus band and a hiatus week do not split a run.** hand-05's Writers stays one wide in the
weeks before the Thanksgiving and holiday bands; today the bands split the run and the weeks before them widen.
Under R9 (Single Column) this needs nothing more; outside Single Column no seed shows it, so it is noted, not
ruled.

## 3. Rulings (owner, 5 Nov 2026, by picker — both as recommended)

- **R-A. Localization after Post: ✅ stacked in Post's column** (R7 stands; hand-07's last year is the template's
  habit, not a rule).
- **R-B. Lanes: ✅ yes** — in Single Column mode and in a block whose columns carry typed headings, cells never
  widen (R9 is a rule). Everywhere else R8 applies.
- **R-C. The same-week tie (rule 6): ✅ general** (owner, 5 Nov 2026, "Yes, general"). The owner had noted the
  pictures' "Wrap" was a custom phase related to Production, not any custom phase; the rule as adopted keys on
  nothing but length — Post continues the Sim Post lane; among phases starting the same week for one freed column,
  the shorter takes it. No name matching. The fixture includes a short custom phase that is not a wrap.
- **R-D. Left of a running phase: ✅ only when following on** (rule 4). Otherwise right of everything running.
- **R-E. A spare column between two phases: ✅ the left phase takes it** (rule 12). Today leaves the hole.
- **R-F. Lanes: ✅ Single Column mode only** (rule 17, amending R-B). Typed headings never change a width.
- Recorded with these (5 Nov 2026, the owner's "anything missing?"): a paused phase keeps its column (rule 2);
  rule 6 applies to any same-week competition for a free column; the R5 correction above; and three things that
  are consequences, not rules — a length edit past the other phase's flips a rule-6 tie (the swap drag fixes it),
  a hand swap that no longer fits after the update is kept and shown as "can't apply" as today, and a date edit
  that turns a follow-on into an overlap moves a column as it does now.

## 4. What this means for the build

- **Placement v3** = R1–R5 + R7, in `computeSchedule`'s `segCol` block / a successor to
  `placeSegmentsReusingColumns`. Not frozen. It replaces Reuse ON's placement; Reuse OFF stays the untouched
  old path (`colReuse` absent), so every file saved with the box clear lays out as it does today.
- **R8–R10** are frozen edits to `computePhaseRowLayout` (and `phaseRunBounds`), to be asked for with the
  measurement: the rule fixtures below reproduced, and every other baseline byte-identical (the gate).
- **Reuse Empty Columns — ✅ RULED (owner, 5 Nov 2026, "yes that way"): the switch is retired.** The checkbox
  leaves the UI; new calendars lay out by §0; the PERMANENT key `colReuse: true` stays as written and becomes the
  layout stamp ("lays out by the current rules", columns AND widths); a file without it keeps the old placement
  and the old widths byte for byte, forever (the Off path stays in the engine as legacy code); loading such a file
  raises a one-time strip, "Columns can now lay out automatically · Update layout / Keep as is", the
  holiday-correction strip's shape, one undo step — never a silent change. Older builds read the stamp as Reuse ON,
  which is forward-only and acceptable. The swap drag and `colFollow` stay as the override. Projection: 100% on 14
  seeds and all but one year of hand-07, to be proven by the fixtures in §5 before the checkbox goes.

## 4a. Not covered here: how WIDE a column is (owner's ask, 5 Nov 2026 — tracker card `ideal-column-widths`)

These rules decide which column a phase is in and how many columns a cell spans — never a column's width in
characters. That is the frozen width model (`sheetColumnWidths`, `COL_PAD_CHARS` 1.15, `EXCEL_MDW` 7,
`cellTextFit`): per block, each phase column is as wide as the widest one-column label in it, a spanned label
tops up the columns it covers evenly, the Date column has Excel's 8.43 floor, the Notes column is the widest note
line, all plus 1.15 characters at 7 px per character — Excel's autofit, so the screen, the workbook and the PDF
agree. The owner asked for the *ideal* width relative to the text inside, for phase and Notes columns. That is a
width study of its own: measure the hand-set Excel pictures' column widths against their longest text, as the
layout keys were measured, and change the model under the export baselines as the gate. After the layout build.

## 5. Fixtures to cut (synthetic, made-up dates and names; each red on today's build where the rule differs)

`layout-r3` (Writers | Prep, then Production + Sim Post two wide), `layout-r4` (Wrap + Post together, with and
without Sim Post), `layout-r5` (two seasons: a continuing Writers left of a new Prep at the top of a year),
`layout-r7` (Post → Localization stacked), `layout-r8` (Post widening after a 3-week Wrap; Prod Prep's last week
after Writers closes; a column empty for 30 weeks but taken before the run ends, staying narrow), `layout-r9`
(Single Column and typed-headings lanes) after R-B.
