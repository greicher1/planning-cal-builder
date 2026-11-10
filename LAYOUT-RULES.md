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
   *(Since 6 Nov 2026, owner's picker "up to 4 weeks": **a short gap still follows on.** When no column was freed the
   week before, a column freed up to four working weeks earlier counts as following on, so a phase nudged a week or
   two later keeps the column instead of opening a new one right of everything running — **the column freed most
   recently**, the one it is following (taking the leftmost of them made a phase slid week by week flip three times). Five or more is rule 4's R-D
   again — its fixture, `layout-r7`'s Research, has exactly five. The 15 pictures score the same at any gap
   (FILL-INTENT-PLAN.md §9); `layout-r2g` holds it.)*
3. **Two just freed: take the left one.** That is what puts Production in Writers' column, not Prep's.
   *(As built, 5 Nov 2026 — LAYOUT-BUILD-PLAN.md §2.2: **Production goes left whether or not both columns were freed
   that week.** In hand-10, 12, 15 and 16 Writers' column had been free for one to six weeks and only Prod Prep's was
   handed off, and the pictures still put Production in Writers' column; the study's own scoring agrees, since Reuse
   OFF, which takes the lowest free column, got those seeds right. Every other phase takes its handoff column first,
   as rule 2 says — hand-05's and hand-08's Localization over a free column further left.)* *(And since 6 Nov 2026,
   **a phase still running to the right of that free column does not stop Production either**: handed Prod Prep's
   middle column with Writers' free column on its left and Post running on its right, Production had sat one wide
   beside an empty column for the whole shoot. Owner: "Yes, Production only" — rule 4's R-D stays for every other
   phase, since hand-08 keeps Localization in its handoff column with exactly that empty column on its left.)*
4. **Nothing just freed: the lowest free column** — preferring one already used this year, so the year does not
   grow a column — **but never left of a phase still running** unless following on (rule 2): a phase that is not
   continuing a column goes right of everything running. *(Ruled R-D, 5 Nov 2026. "Following on" includes rule 2's
   short gap since 6 Nov 2026.)*
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
    **A phase you move keeps its column** *(sticky columns, owner, 6 Nov 2026, STICKY-COLUMNS-PLAN.md, rulings K1–K4)*:
    moved by a typed date, ▲ / ▼, Shift, Build Around, a length or a hiatus, it stays in the column it was in whenever
    its new dates still fit there — even past rule 2's four-week gap and rule 4's R-D (K3); where it can't fit, the
    rules above place it and it comes back when moved back (K2). Only the phases you move (K1); every other phase is
    placed by rules 1–9, except that they are not handed a column a moved phase remembers if they would still be in it
    the week that phase starts, and in a same-week tie the moved phase goes first. No marker (K4); **Reset Columns**
    forgets it. *(Why: rule 6's tie flipped a phase nudged through the week another starts — right, left, right — and
    any fixed tie rule flips one of the two; only a layout that remembers can keep both still.)*

**And over all of these, rule 23: as few columns as possible** (below, under "Looking back at the year").

**Widths — how wide each cell draws.**

11. A cell is **one column wide** unless a rule below widens it.
12. **Each phase has its own column; a spare column BETWEEN two phases goes to the left one**, so there is never an
    empty column between two phases (three columns, two phases: the left one is two wide). *(Ruled R-E, 5 Nov 2026.)*
    A spare to the RIGHT of a phase goes to it by rule 13; a spare at the LEFT edge stays empty (hand-08) unless rule
    21 keeps it. **The even share** — two take half each, three a third — **now governs only a spread to the LEFT and
    every hand-dragged width** (a width you drag out alone is not kept once a phase moves in beside it); it no longer
    caps a spread to the right. *(Owner, 6 Nov 2026, on Pre-Prep sitting one wide beside Writers with an empty column
    to its right: "notice how pre-prep also isnt filling its collumn". Until then two phases in three columns were one
    wide each, the share's cap; the pictures that keep such a spare empty all keep the Sim Post lane, rule 15.)*
13. **A phase spreads into the next column from the week that column is free for the rest of the phase's run,**
    and not before. Judged week by week, looking forward: at a given week, the column beside it must be empty
    from that week to the end of the phase's run in this year block. Post widens the week Wrap ends; Prep's last
    week widens after Writers closes; a phase whose neighbour column is empty for 31 weeks but taken before the
    phase ends stays narrow throughout (hand-08's Shoot). So a width only ever grows along a run, never grows and
    shrinks back. To the right, uncapped (6 Nov 2026); to the left, within the even share (12); the lane (15) is
    excluded until the shoot ends; a run is the phase's weeks within one year block, so a phase continuing into the
    next year is judged afresh there. *(Today: "empty for the WHOLE run", so Post beside a 3-week Wrap stays one wide for 22 weeks.)*
14. **A phase alone in its row fills the whole width.**
15. **The Sim Post lane is kept for the shoot: a phase sharing its row with another does not spread into the lane
    column before the shoot has ended**, and nothing spreads into it while the marker runs; after the shoot it is an
    ordinary column. A phase ALONE still fills it (rule 14: hand-13's Prod Prep is two wide the week before its shoot),
    and a hole between two phases still goes to the left one (12). *(6 Nov 2026: with rule 13 uncapped to the right,
    this is what keeps Prep one wide beside Writers with the lane column empty for months, as hand-02, hand-03,
    hand-04 and hand-09 draw it.)*
16. **A per-phase hiatus band is as wide as its phase would be that week; an all-phase hiatus spans the block.**
17. **Lanes: in Single Column mode nothing spreads** — every phase stays one column wide. *(Single Column only,
    ruled R-F, 5 Nov 2026: typed column headings do NOT make lanes, so typing a heading never changes a width.)*
18. **A hiatus week does not split a phase's run** for these rules: the weeks before a band do not widen on their
    own.
19. **A width dragged by hand wins.** *(Since 6 Nov 2026, FILL-INTENT-PLAN.md, the double-click stores a WISH on the
    phase instead of a width on the cell — fills its free space, or keeps to its column — re-applied every week, so
    nothing stored per cell can go stale; a drag to an exact width is still per cell and still wins for that cell.)*

**Looking back at the year — what looks right.**

20. **A column must earn its place.** A column is there for the weeks something in it runs beside another phase. One
    whose occupants run beside another column's cell for **fewer than 3 weeks over their whole run**, while another
    column in that year is used more, is a *phantom*. Two things follow, for any phase:
    - ~~**Don't open it where something can give way.** The Sim Post marker steps aside for a phase whose column would
      otherwise be a phantom.~~ **Withdrawn by the owner on 6 Nov 2026**, on seeing Post, moved up two weeks, take
      the lane and eat two Sim Post weeks: *"thats not right"*. Sim Post is on every shoot week (the 2 Nov ruling), and
      a short overlap gets its column beside the lane, as a three-week one does. Live for one day (v1.12.0–v1.12.1).
    - **Where it must exist, it does not count.** A phantom column is left out of the even share (12), so the phase
      beside it spreads into it; since rule 13 is uncapped to the right this mostly follows from rule 13 itself.

    The floor is measured from the pictures, not chosen: the shortest column drawn by hand is used 5 weeks (hand-07's
    Pre-Prep), rule 6's Wrap column 3; hand-02's third column holds Pre-Prep for 6 weeks beside two one-wide phases
    and then stands empty beside them for 14 — earned, and left alone. A run crossing New Year counts both sides:
    hand-09's lane holds three marker rows in December and twelve in January, and is earned in both years. *(Owner,
    5 Nov 2026, on a Test Show where Post starting in Production's last week had opened a third column for one week,
    empty beside Writers + Pre-Prep and beside Production + Sim Post for the rest of the year: "less about phase
    specific changes ... more about the algorithm understanding better what looks right and what doesnt with any
    phases". Simply: don't open a column for something that is only there for a week or two.)*

21. **A run never shrinks.** A column a phase has spread into stays its for the rest of the run while that column is
    free; the even share of a later row takes nothing back. So Post, two wide while alone, keeps both columns for the
    two weeks Localization runs beside it, and Localization sits one wide beside it until Post ends. Rule 13 already
    said a width "only ever grows along a run, never grows and shrinks back"; this is the half of it the even share
    had been allowed to undo. None of the 15 pictures draws a run that narrows. *(Owner, 6 Nov 2026, on a screenshot
    where Post wk 25–26 sat one wide with an empty column to their left: "why is this happening with post and
    localization?" — "Yes, build it".)*

22. **A follow-on carries its predecessor's width.** A phase that takes over a column the week its occupant ends keeps
    the cell that occupant drew in its last week — over the empty columns beside it, counting a column rule 21 kept for
    it — for as long as those columns stay empty. **Once one of them is taken, it keeps what it had and takes nothing
    new until it ends:** it loses only the taken column, and does not spread again, not even alone (rules 13 and 14 give
    way to this). If nothing it carried is ever taken, it is laid out as rules 13 and 14 say, so alone it still fills. So Prod Prep after a two-wide Pre-Prep is two wide until Casting moves
    into the second column, then one wide to the end, rather than one wide and then three wide alone for its last weeks.
    A column already taken in the follow-on's first week was never carried, so Production after a two-wide Prod Prep,
    with the Sim Post lane beside it from its first week, is unchanged. *(Owner, 6 Nov 2026, on a test calendar: "i feel
    like its weird that the last 3 weeks of prod prep extend across" — then a picture, "this is how it should sort", and
    by picker "Build it". None of the 15 pictures narrows a run, so they score the same with it: 98.1% / 31 / 0. It
    changes `layout-r13`'s Delivery and `layout-r3b`'s Prod Prep the same way, and `fill-intent` gained a three-week
    phase so its Pre-Prep still starts one wide. Two fixes the same night, before anything was committed: the first
    build read the predecessor's width from its last week's even share alone, so a Pre-Prep kept two wide by rule 21
    handed on nothing and the owner saw the upside-down T again (*"wait why is it still doing the upside down T pattern
    for prod prep"*; `layout-r22b`); and its hold kept only the carried columns, so a squeezed phase gave back a freed
    column it had spread into, a run that shrank (found by the fewest-columns session; `layout-r22c`) — the owner,
    asked there whether a squeezed phase should keep a column it had already spread into: "Yes, keep it".)*
23. **As few columns as possible.** Rules 1–8 place one phase at a time and cannot see ahead. So wherever they leave a
    phase a choice of column — a handoff, rule 2's short gap, a free column right of everything running, any free
    column for Production, the Sim Post lane for Post, or a new column — each allowed one is tried with the rest
    placed by the rules, and the one that leaves the year the **fewest columns** is kept. A tie keeps the rules' own
    pick, so a calendar the rules already lay out in the fewest columns is unchanged (all 15 pictures, byte for byte).
    R-D still bounds the choices; a hand move and a remembered predecessor (rule 10) are not choices. **A moved phase's
    column of its own gives way when it costs a column** (owner, 9 Nov 2026, "Give way"): it is kept only when that adds
    no column, and otherwise the phase takes the rules' column; a tie keeps its own. The owner's case: Prod Prep
    took Pre-Prep's handed-off column, so Casting, starting beside it and not following on, opened a third column; with
    Prod Prep following Writers into its column (freed three weeks earlier), Casting takes Pre-Prep's and the year needs
    two. Two consequences, both ruled: **Post may start under Production instead of continuing the Sim Post lane** when
    that saves a column (Localization then takes the lane's column), and a phase nobody moved can change column when
    another moves far enough that the saving goes away. A phase alone in its last weeks still fills the width (rule 14).
    *(Owner, 6 Nov 2026, two screenshots of a test calendar, three columns and two: "We should always prioritize as few
    collumns as possible"; by picker "Yes, build it", "Fewest columns" over Post keeping the lane, "Fill the width".)*

**Built** (LAYOUT-BUILD-PLAN.md, 5–6 Nov 2026): placement v3 is `placeSegmentsByRules` in `src/legacy/app.js`, rule 9 is
`layoutBlockOrders` through `stintOrderFor`, the widths are `computePhaseRowLayout`'s stamped branch; rule 20 is
`markLayoutPhantoms` on the drawn rows and frozen edit LR2 (absorbing), the floor `LAYOUT_EARNED_WEEKS` (its give-way is
gone); rule 21 is frozen edit LR3 in that branch with `layoutRunStart`; rule 22 is frozen edit LR6 (`heldNarrow`,
fixtures `layout-r22`, `layout-r22b`, `layout-r22c`); rule 10's sticky columns are `colKeep`, read
by `placeSegmentsByRules` (step 10b) and written only by `update()` through `noteMovedPhases` (leg `stickycols`);
rule 23 is the fewest-columns pass at the end of `placeSegmentsByRules`, with the own-column give-way in its kept step
(fixtures `layout-r23`, `layout-r23b`, `layout-r21b`, `layout-r3c`); rules 12, 13 and 15 as of 6 Nov 2026 are frozen
edit LR4 (`laneReserved`, the uncapped right walk); the fixtures are `tests/fixtures/layout-r*.sptcal` (made by
`tools/layout-study/fixtures.mjs`) and the leg `layoutrules`.

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
