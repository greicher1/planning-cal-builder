# HALF-SQUARE-BARS-PLAN.md

**Status: PLAN, 15 Oct 2026. Nothing built. ⛔ A FROZEN EDIT: needs the owner's sign-off on §4's gate before any
code.** The owner chose (picker, 15 Oct 2026) to plan it and build it in its own session.

---

## 1. The request

Seen in the month PDF of a half-days calendar (`halfdays`, labelled by Week, during MONTH-PILL-LABEL-PLAN step 2):

> Owner, 15 Oct 2026: *"maybe rather than having both pills overlap, the bar ends half way thru the calendar square
> and the next pill starts in the second half of the square"*

So on a **switch day** (an episode or block ending at .5, the next starting in the same day), the two bars should
meet **in the middle of the day's square, in one lane**, instead of being stacked one above the other.

This revises half-days' ruling **"Stacked bars, always"** (HANDOFF, 15 Oct 2026) in its look only: Production is still
one bar per episode or block, and the switch day still belongs to both. It applies wherever the bars split: no label
chosen, Episode and Block. Labelled by Week, Production is one bar per week (MONTH-PILL-LABEL-PLAN Q13), so there is no
switch day to draw.

## 2. ⛔ Why it is a frozen edit

- **Geometry.** Frozen `renderMonthView` places every bar with `place(startCol, endCol, …)`, which writes
  `grid-column: a / b` on `.mv-bars`' seven-column grid. A bar can only start or end on a day's edge.
- **Lanes.** Frozen `takeLane(startCol, endCol)` gives two bars that share a column two lanes. That is the stacking.
- Non-frozen code decides only which runs exist and their two strings (`pillRunsForWeek()`, `productionSplitRuns()`,
  `segPillLabel()`, `productionPillTag()`). Nothing it returns can reach a bar's style or its lane.
- **Both month PDFs follow `renderMonthView`.** The print path (`exportMonthPdf`, frozen, the rollback) prints its DOM;
  the direct writer parses its HTML (`buildMonthLayout` → `mvlParseItem`, new code, not on the frozen list).

## 3. A shape that keeps every other calendar byte-identical

*To be confirmed by reading the code at build time; not yet tried.*

1. `productionSplitRuns()` (not frozen) marks a run's first day `halfStart` when its unit starts at .5 inside that
   day, and its last day `halfEnd` when the unit ends at .5. `productionUnits()` already knows each unit's start `c`
   and length `d`, so both flags come from its interval rule; no second walk.
2. **Frozen edit 1, the Production `place()` call:** when a run carries a flag, append an inset to its style:
   `margin-left: calc(100% / (2 × span))` for `halfStart`, `margin-right` for `halfEnd` (span = the run's day count;
   a grid item's percentage margin resolves against its grid area). A run with no flag gets **no new text**, so its
   HTML is unchanged.
3. **Frozen edit 2, `takeLane()`:** count occupancy in HALF-days. Column c becomes slots 2c and 2c+1; a `halfEnd` run
   leaves 2·end+1 free and a `halfStart` run leaves 2·start free. So the earlier unit's bar and the next one's fit in
   ONE lane. With no flags the lanes come out exactly as today.
4. **The writer** (`mvlParseItem` / the fit / the emitter, not frozen) reads the margin and insets the bar to match.
   Its text-fitting must use the narrower box.
5. **The edge grips** (`installProductionEdgeHandles`, not frozen) find a switch day's bars by LANE ("the higher lane
   is the earlier row", `splitSpanOf()`). With one lane they must use x instead, and `pilldrag` E14 changes.

## 4. The gate (proposed to the owner 15 Oct 2026; sign-off still needed before code)

- **Gates 10 and 13:** every calendar without a .5 switch day stays **byte-identical**, with no re-cut. Only `halfdays`
  (the one baselined calendar with switch days) is re-cut, and only after the owner sees `monthbase.py sheets`
  contact sheets of it.
- **No clipped text** at the print width or on screen at **961 px** (the narrowest day column, MONTH-PILL-LABEL-PLAN
  §7.2). ⚠️ A half-day bar is about 68 px in print and about 42 px at 961. A one-day *Ep. 202* piece is close to
  that, so measure it before building, the way MONTH-PILL-LABEL-PLAN step 1 did.
- `halfdays` D2 (two bars on 7/6, 7/17 and 7/30) is rewritten for one lane; `pilldrag` E14 for the grips.
- The full `gate.sh` is green.

## 5. Open questions for the owner, at the build

- What a half bar shows when its text does not fit (truncate as every bar does today, or a shorter form).
- Whether the month view on screen and both PDFs all change together (assumed yes: they are one renderer).

## 6. Coordination

- MONTH-PILL-LABEL-PLAN (labels) and EPISODE-PREP-PLAN also work in `productionSplitRuns()` / `pillRunsForWeek()`.
  Build one at a time and re-run gate 13 on whichever landed first.
- `installProductionEdgeHandles()` is MONTH-VIEW-PLAN step 7's. Its HANDOFF entry lists what is easy to break.
