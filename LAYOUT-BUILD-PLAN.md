# LAYOUT-BUILD-PLAN.md

**Build the nineteen waterfall layout rules of [`LAYOUT-RULES.md`](LAYOUT-RULES.md) §0 into SPTCal, in three
gated pieces, so a calendar lays itself out the way the owner's own calendars are laid out, and the Reuse Empty
Columns switch retires.**

Written 5 Nov 2026 on branch `layout-study` (worktree `.claude/worktrees/layout-study`, from `origin/main` at
`e5e4435`). Read [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) → [`LAYOUT-RULES.md`](LAYOUT-RULES.md)
(§0 is the whole algorithm; §1–§4 the evidence and rulings) → [`LAYOUT-STUDY-PLAN.md`](LAYOUT-STUDY-PLAN.md) §12
first. The code this replaces is described in [`COLUMN-REUSE-PLAN.md`](COLUMN-REUSE-PLAN.md) §3 and
[`COLUMN-ORDER-PLAN.md`](COLUMN-ORDER-PLAN.md). Tracker card `learned-column-layout`.

---

## 1. The three pieces, and the one word that ties them

`colReuse: true` — the PERMANENT snapshot key the Reuse Empty Columns box wrote — becomes **the layout stamp**:
"this calendar lays out by the current rules, columns AND widths". A calendar without it is **unstamped** and
keeps, byte for byte and forever, the placement it has today (`computeSchedule`'s start-order `segCol` block)
and the widths it has today (`computePhaseRowLayout` as frozen). Nothing in any piece reads the stamp for
anything else, and nothing writes it but New, the boot (a fresh page) and the strip's **Update layout**.

| Piece | Rules | Where | Frozen? | Gate |
|---|---|---|---|---|
| 1. Placement v3 | 1–10 | `placeSegmentsByRules()` replaces `placeSegmentsReusingColumns()` on the stamped path; rule 9 through `stintOrderFor` (edit E0's seam) | **No** | fixtures `layout-r*` red on today's build, green here; `?layout=` hook unmoved; every unstamped leg unmoved |
| 2. Widths | 11–19 | ONE edit inside `computePhaseRowLayout` (helpers beside it), behind the stamp | **Yes** — owner sign-off first | the same fixtures' widths; gates 2, 3, 10, 13 byte-identical on the unstamped reference calendar |
| 3. The switch retires | — | `Sidebar.jsx` (the row goes), `#layout-notice` strip, help text, legs | No | legs `colreuse`, `settingswin`, `simpostbeside`, … rewritten; full gate |

Each piece is gated before the next starts. Merge into `main` and push are the owner's decisions, by picker.

## 2. Piece 1 — placement v3 (rules 1–10), not frozen

### 2.1 What runs where

`computeSchedule`'s `segCol` block keeps its three branches, in this order: the localhost `?layout=` hook (a full
map forces every column, the study's panel C); the stamped path (`placeSegmentsByRules`, new); the unstamped path
(the start-order block, untouched). The unstamped path and the hook are byte for byte what they were.

### 2.2 The algorithm as built (the plain words of §0, with the pictures' two refinements)

Terms: `firstRow` / `rowsEnd` are a segment's week rows (Monday-snapped, `rowsEnd` exclusive), as the reuse
placement used them; a column is **free** for a phase when its last occupant's `rowsEnd` ≤ the phase's `firstRow`
(a paused phase has not ended: its own hiatus is inside its segment); a **handoff** column is a free column whose
occupant's `rowsEnd` equals the phase's `firstRow`, or only all-phase hiatus weeks lie between (ruled Q5).

**The year order (rule 9) is the metric for "left".** For a column and a year block, its *top* is the earliest
start among the phases that have cells of that column in that block; a column with no cells in the block yet
sorts after every column that has (as if it first appeared now, ties by column index). Columns sort by their
top's start, ties by phase order. Sim Post's lane (below) counts as an occupant whose key is Production's start,
a half step after Production, so it sorts right after Production's column.

Phases are placed in start order (`firstRow`, ties by phase order), with rule 6's exception: when two or more
phases start the same week and at least one column is free, the **shorter run goes first** (it takes the free
column; the longer goes right). For each phase:

1. **Hand move (rule 10).** `colFollow[key]` = X: X's column, if X is placed and that column is free now.
   Otherwise the note says why (`moves`, unchanged shape) and the phase is placed automatically.
2. **Post continues the Sim Post lane (rule 6).** If Sim Post ran — the lane was reserved under 5 — and the
   phase is Post, starting once Production has ended, and the lane's column is free: the lane's column.
3. **Production goes left (rule 3, as the pictures have it).** Production takes the **leftmost free column** by
   the year order of its first block, among columns that are handoffs or sit right of every running phase
   (rule 4's R-D). ⚠️ *Refinement:* §0 rule 3 says "two just freed: take the left one", and R3's evidence list
   includes hand-10, hand-12, hand-15 and hand-16, where Writers ended one to six weeks BEFORE the shoot and only
   Prod Prep's column was handed off — the pictures still put Production in Writers' column. The study's own
   comparison agrees: Reuse OFF, which takes the lowest free column, scored 100% on hand-01 and hand-10. So the
   rule as built is "Production goes left", handoff or not; where both columns are handed off (06, 07, 08) it
   reads exactly as §0's rule 3. hand-13 still lands in Prod Prep's column: Writers' column has no cells in
   2028, so by the year order it sorts after Prod Prep's.
4. **Follow on (rule 2).** Any other phase takes a handoff column; two or more: the leftmost by the year order
   (rule 3). A handoff may sit left of a running phase (R-D's "unless following on"). Localization after Post
   (rule 7) and a wrap-like phase after Production are this rule.
5. **Nothing just freed (rule 4).** The leftmost free column by the year order that sits right of every running
   phase's column. Because an unused column sorts after every used one, this is §0's "preferring one already
   used this year" (hand-13's Production, swapsplit-reuse's Late Post) and never grows a year a column it does
   not need.
6. **Nothing free (rule 5).** A new column on the right.
7. **After Production, the lane (rule 8).** With Sim Post on, a column is reserved for the lane from
   Production's first row to its `rowsEnd`: the leftmost free column by the year order that sorts right of
   Production's column (hand-01: Prod Prep's freed column; hand-05, hand-09: none qualifies, a new column).
   The lane has no cells of its own; frozen SP1 draws Sim Post at Production's slot + 1 and finds that slot
   empty in every Sim Post week, so it never has to insert a lane. If a phase that is still running sits
   between Production's column and the lane's in the year order, SP1 inserts as it does today — no worse than
   today, and no seed has the shape.

Hidden phases are not in `wfSegments` and take no column (rule 10).

### 2.3 Rule 9 through the sanctioned seam

`col` is an opaque identity and frozen `computeBlockLayout` orders a block's columns by first appearance, ties by
`col` value — a value cannot say "left this year, right the next", which hand-03 and hand-08 need. The one hook
into that frozen function is edit E0 (`stintOrderFor`, 1 Sep 2026), which returns a per-block order to pin, or
null. On a stamped calendar whose columns v3 placed, `computeSchedule` derives each block's order from the drawn
cells (the top occupant per column, by its segment's start; the lane as above) and records it as
`schedule.stintOrder.orders`, so `stintOrderFor` returns it for every block. A stored block swap exchanges two
columns' `col` values on top, exactly as today, with the rule-9 order as the order it preserves. On an unstamped
calendar, or under the `?layout=` hook, `stintOrderFor` returns what it did (null unless a block swap is stored).
⚠️ **This is a behaviour change on the stamped path only** — a stamped calendar with two columns beginning a year
together can order them differently from last week's build — and it is what piece 1 asks the gate to prove
inert elsewhere.

### 2.4 Fixtures and leg (LAYOUT-RULES §5), all synthetic, 2031–2034, generic names

One fixture per rule group, each red on today's build where the rule differs; one leg, `layoutrules`, that reads
the grid as `colreuse` does (`data-own` per cell, `colspan` for widths, the Sim Post lane by its text):

- `layout-r3.sptcal` — Writers | Prep, Writers ending five weeks before the shoot, Prod Prep handing off; Sim
  Post on. Expect Production in Writers' column, the lane in Prep's, two columns (today's Reuse ON: three).
- `layout-r6.sptcal` — Production ends; a 3-week custom phase that is not a wrap ("Reshoots") and Post start that
  week, with Sim Post (Post → the lane, the short one → Production's column) and, in a second scenario tab, the
  same without Sim Post (the short one → Production's column, Post → the next column right).
- `layout-r9.sptcal` — the hand-03 / hand-08 shape: a column left of Writers' in one year and right of it the
  next, because the phase that reuses it starts later than Writers did.
- `layout-r7.sptcal` — Post → Localization stacked; a paused phase keeping its column across its own hiatus
  (rule 2); a phase that is not following on placed right of a running one although a column left of it is
  free (R-D).
- Widths (piece 2): `layout-r13.sptcal` — Post widening the week a 3-week phase beside it ends; Prod Prep's last
  week widening after Writers closes; a column empty for 30 weeks but taken before the run ends, staying narrow
  (hand-08's Shoot); a spare column between two phases going to the left one (R-E); a hiatus week not splitting
  a run (rule 18). `layout-r17.sptcal` — Single Column: nothing widens.

Legs that read a stamped fixture today lay out by v3 and are re-read: `colreuse` (RESTORE), `layouthook` (its
HALF-map expectations are the stamped layout's), `swapsplitreuse`, `colswappartial` on `colswap-widened-reuse`,
`simpostbeside` (the reuse-on cases), `notescols` / `hdrfit` / `monthmap` on `colreuse`. Each is re-run; an
expectation that changes is checked against §0 by hand before it is rewritten.

### 2.5 Gate for piece 1

`npm run check`; the new leg green on the branch build and red on `dist/pre.html` (the pre-change build, kept
ignored); the swap/reuse mini-gate; the study's `compare.mjs` on the 15 seeds with `reuse=on` — every COLUMN
right (widths wait for piece 2); a full gate with every unstamped baseline byte-identical.

## 3. Piece 2 — widths (rules 11–19): ONE frozen edit, owner sign-off first

### 3.1 The edit

Inside `computePhaseRowLayout`, behind `layoutStamped()` (false on every unstamped calendar, so each line below
is unreachable there):

- **Rule 13 (the new idea).** `freeForRun(s, n)` becomes "slot n is empty from THIS week to the end of the
  phase's run in this block", not from the run's start. The run end is walked forward skipping all-phase hiatus
  rows (rule 18: a band does not split the run), through a helper beside `phaseRunBounds` — `phaseRunBounds`
  itself is not edited. A width therefore only ever grows along a run.
- **Rule 12's spare (R-E).** After the walk, an empty run that sits between a phase and the next cell to its
  right goes to the phase on its left, provided it is free for the rest of that phase's run (so it never grows
  and shrinks back). A hole left of every phase, or right of every phase, stays as today (hand-08's 2027).
- **Rule 17.** In Single Column mode every phase and band is one column wide: no right walk, no left absorb.
- **Rules 11, 14, 15, 16, 19** are today's code and are kept: one wide unless widened; alone fills the width;
  the active lane is never spread into (`n === simSlot`, and the lane's `SIM_KEY` entries); a band as its phase;
  `applyCellSpanOverrides` last.

`computeBlockLayout`, `phaseRunBounds` and every writer are not edited.

### 3.2 The measurement (the sign-off's terms)

- `layout-r13` and `layout-r17` reproduce every expected width on the stamped path; `layout-r3/r6/r7/r9` keep
  their columns.
- The study's 15 seeds, stamped: the projection of LAYOUT-RULES §4, **less three explained shortfalls** found
  while building (§5 below).
- **Every unstamped baseline byte-identical:** the waterfall PDF (gate 2) and every Excel part (gate 3) on the
  reference calendar, both month PDFs (gates 10 and 13) on their nine and seventeen calendars.
  ⚠️ **The reference calendar is a NEW calendar, and a new calendar is stamped** (since 2 Nov 2026). On the
  stamped path rule 13 widens its Localization from the week Post ends (two columns in 2027), so gates 2 and 3
  would move — by design. To keep those two gates proving that the FROZEN WRITERS have not moved, the `base` leg
  runs the reference calendar on the legacy path through the existing localhost-only hook: `?layout=legacy`
  (`layoutStamped()` is then false). Everything stamped is proven by the fixtures above. The gate comment and
  README say so.

## 4. Piece 3 — the switch retires

- The **Reuse Empty Columns** row leaves `Sidebar.jsx`'s Waterfall card (the switch, its line, its divider).
  `reflectColReuse()` becomes a no-op on a page without the box; `setColReuse(true)` stays as the strip's action
  (one undo step, Q7's width clearing, `update`, `markDirty`).
- `colReuse` keeps its `let colReuse = false` declaration where it is (COLUMN-REUSE-PLAN lesson 2) and its two
  writers: the boot (just before `restoreSavedState`) and New. `captureSnapshot()` writes it only as `true`;
  `applyStateSnapshot()` restores it unconditionally, absent = unstamped.
- **The strip** `#layout-notice`, the holiday-correction strip's shape (`src/index.html` beside `#holiday-notice`,
  the same `legacy.css` selector lists, hidden by `buildSavedHtml`'s clone and by the boot's hide list):
  *"Columns can now lay out automatically — this calendar keeps the layout it was saved with until you say so.
  **Update layout** · Keep as is"*. Raised when a FILE is loaded (Load…, a recent, a launched file, a legacy
  `.html`, a shareable copy opening itself, a recovered backup) and the calendar is unstamped; never by undo,
  redo, New or a scenario switch. **Update layout** = `setColReuse(true)`: one undo step, the file dirtied, the
  strip gone. **Keep as is** and × hide it for this load; nothing is written, so the next load of the same file
  offers again (an unstamped file is unstamped until it is updated — the strip is the only way, and the owner
  ruled "never changed on its own").
- **Help text:** the column-reuse paragraph says what the rules do and that an older calendar keeps its layout
  until updated.
- Legs: `colreuse` (rewritten for a world without the box: a new calendar is stamped and lays out by the rules;
  the unstamped fixture opens with its old columns AND widths and raises the strip; Update layout is one undo
  step and clears the changed years' widths; Keep as is; the save format), `settingswin` (no `col-reuse-btn`),
  `simpostbeside` (legacy cases from an unstamped fixture instead of the box), `layouthook`, `phasesui`.

## 5. Where the pictures and the rules part, as found while building (owner to confirm)

1. **Production goes left even when Writers' column was freed weeks before** (§2.2 step 3). Built as the pictures
   have it; §0's rule 3 reads as the special case.
2. **hand-09's first year: Sim Post LEFT of Production.** SP1 (ruled 2 Nov 2026) keeps the lane right of
   Production, so the engine draws three columns there where the picture had two, and Production, alone in its
   row for the last two weeks of 2026, fills the width (rule 14): two phase-weeks the scorer counts as width
   misses. Not scored by the study; stays unless SP1 is overruled.
3. **hand-08's Post S2, alone for the last seven weeks of 2027**, fills the width under rule 14. The picture keeps
   it one wide; R-F (typed headings never make lanes) gave that up knowingly.
4. **hand-07's last year** (Localization beside Post): ruled R-A, stacked.

So the target is 100% of phase-weeks on 12 seeds, hand-08 less seven weeks, hand-09 less two, hand-07 less its
last year. Reported with the numbers in HANDOFF.

## 6. Order of work

1. ✅ Commit the study's uncommitted files (owner's picker, 5 Nov 2026).
2. ✅ Piece 1: engine, fixtures, leg, the affected legs re-read, `npm run check`, compare.mjs columns; committed
   `e7b589c` (owner's picker); full gate 3,977 PASS / 4 FAIL, the four in the old `colreuse` leg, every baseline identical.
3. ✅ Piece 2 signed off (owner, 5 Nov 2026, by picker) on §3.2's terms.
4. ✅ Piece 2: frozen edit LR1 + `layoutRestOfRun`, `layout-r13` 12/12 and `layout-r17` 5/5 (8 and 4 cases red on the
   old build), the `base` leg on the legacy path identical to the stage-7 baseline (`sig`, `cols`, `gridWidthPt`).
5. ✅ Piece 3: the switch out, the strip in, help, legs (`colreuse` rewritten, `settingswin`, `simpostbeside`); checked
   in the browser pane; committed as the third commit.
6. ✅ `npm run check` 40/40; full gate 4,000 PASS / 1 FAIL (a `pilllabel` month capture under contention, 29/29 alone);
   README changelog; HANDOFF; the tracker card.
7. ✅ Re-scored: stamped 98.1% of phase-weeks, 0 width misses; the 31 left are §5's four cases plus hand-10's Hard Prep
   (6 weeks: that picture keeps it narrow beside Writers' freed column where hand-11, 15 and 16 widen) and hand-04's
   two weeks of transcription drift (its Writers ends two weeks before the picture's). Unstamped 82.3%, unchanged.

## 7. Rule 20 — a column must earn its place (owner, 5 Nov 2026, after the three pieces)

**The ask.** On a Test Show (synthetic, in chat) Post started in Production's last week while Sim Post still held its
lane. Rule 5 opened a third 2027 column for that one week, which then stood empty beside Writers + Pre-Prep and beside
Production + Sim Post for the rest of the year. The owner: *"its less about phase specific changes like that and more
about the algorithm understanding better what looks right and what doesnt with any phases"*. The rules place phases one
at a time and never look back at what the year came out like; that was the gap.

**What "looks right", measured on the 15 calendars** (`scan-coluse` / `scan-shared`, scratch): every pictured column is
used, beside another column's cell, for at least 5 rows (hand-07 2025, Pre-Prep beside Writers); hand-02's 2026 third
column holds Pre-Prep for 6 rows and then stands EMPTY beside two one-wide phases for 14 — so an empty column is not the
fault, an unearned one is; rule 6's Wrap column is 3 rows; hand-12 2028 is exactly 3 and 3. The floor is 3
(`LAYOUT_EARNED_WEEKS`): under the pictures' minimum, at the Wrap.

**The measure, one definition, two readers.** A column's use in a year block is, summed over what it holds there, the
non-hiatus rows each occupant holds BESIDE another column's cell over its WHOLE run (the marker counts as the lane's
occupant). Whole run, not the year's slice: the first cut counted the year's rows and read hand-09's lane — three marker
rows in December, twelve in January — as a phantom, and Prep absorbed it (8 width misses, 97.6%). A lone row counts for
nothing (a lone phase fills the row, rule 14): the Test Show's third column holds Post for one shared row and then three
lone ones, and earned one. A column used less than the floor while another in the block is used more is a phantom.

- **Giving way** (`placeSegmentsByRules`, not frozen): the placement runs as a pass; a scan between passes finds, per
  year, a phantom column's occupant that started while the marker ran, is not Production, is not moved by hand, and
  whose run fits the lane's column beside its non-marker occupants; the pass runs again with that phase sent to the lane
  (step 20, before rule 6), its rows recorded in `yields`, and the lane kept reserved past a short yielder so the marker
  resumes. `computeSchedule`'s `isSimPostWeek` is false on a yielded row, so the week carries the phase's cell in the
  lane and no marker, and the numbering and Post's continued count skip it as they skip a hiatus. Frozen SP1 sees no
  conflict (the phase's cell sits in the lane only on non-marker rows).
- **Absorbing** (frozen edit LR2 in `computePhaseRowLayout`, stamped only): `markLayoutPhantoms` (after the week loop,
  on the drawn rows, per frozen `computeYearBlocks` block) stamps each week row of a block with the block's phantom
  columns (`layoutPhantom`, absent on an unstamped calendar); LR2 maps them through the slotMap and leaves a phantom slot
  out of the even share — `spanCap` over the earned slots, the rightward walk and the left-extend counting earned slots
  only — so a phase beside it spreads into it on rule 13's rest-of-run terms. Unstamped, no row carries the key and the
  three counts are exactly the old `span < spanCap`, `Math.min(n - k, Math.max(0, spanCap - 1))` and
  `(left + span) < spanCap`.

**What it does not do.** A phantom beside the lane (Production | lane | a real one-week phase) stays empty: the lane
never widens (15) and Production cannot cross it. No picture shows the shape; it waits for one.

**Gate.** Full gate 4,012 PASS / 4 FAIL, baselines byte-identical: `simpostdays` E1–E3 met rule 20 (its scenario E has
Post starting in Production's pushed last week, so the marker now steps aside there — a deliberate exception to the
2 Nov "exactly Production's weeks" ruling, in the owner's accepted wording; the leg follows), and `phiatusnum` H4 is the
leg's own PDF reader trimming a Flate stream that ends in a newline today (the HEAD build fails identically; `main`'s
by-`/Length` reader is the fix). Seeds 98.1% / 31 / 0, unchanged. `npm run check` 40/40.

**Fixtures** (`layout-r20`, `layout-r20b`; `fixtures.mjs`), leg `layoutrules`, both red on `dist/pre.html` and on the
build before rule 20: r20 the Test Show shape (two columns; the 24 Nov row reads Production | Post with no marker; Post
then fills two); r20b a one-week Table Read beside Writers + Prep (its column stays, Prep is two wide from the week
after, Writers one wide throughout — Prep's column is taken before Writers' run ends, rule 13).

