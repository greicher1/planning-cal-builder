# HALF-SQUARE-BARS-PLAN.md

**Status: ✅ BUILT 16 Oct 2026** (worktree `sweet-mestorf-8d18b8`, branch `claude/sweet-mestorf-8d18b8`, on top of
MONTH-PILL-LABEL-PLAN step 2 `62c62b7`, which is not in `main` yet). ⛔ A FROZEN EDIT, **approved by the owner's picker
on 16 Oct 2026** against §4's gate. §7 records the rulings, the measurement and what was built, and §8 the proof.
Planned 15 Oct 2026. The owner chose (picker) to plan it and build it in its own session.

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

## 4. The gate (proposed to the owner 15 Oct 2026; ✅ approved by picker 16 Oct 2026, "Yes, build it")

- **Gates 10 and 13:** every calendar without a .5 switch day stays **byte-identical**, with no re-cut. Only `halfdays`
  (the one baselined calendar with switch days) is re-cut, and only after the owner sees `monthbase.py sheets`
  contact sheets of it.
- **No clipped text** at the print width or on screen at **961 px** (the narrowest day column, MONTH-PILL-LABEL-PLAN
  §7.2). ⚠️ A half-day bar is about 68 px in print and about 42 px at 961. A one-day *Ep. 202* piece is close to
  that, so measure it before building, the way MONTH-PILL-LABEL-PLAN step 1 did.
- `halfdays` D2 (two bars on 7/6, 7/17 and 7/30) is rewritten for one lane; `pilldrag` E14 for the grips.
- The full `gate.sh` is green.

## 5. Open questions for the owner, at the build (✅ both ruled, picker, 16 Oct 2026)

- What a half bar shows when its text does not fit (truncate as every bar does today, or a shorter form).
  ✅ **"Cut it with …"**, the rule every bar follows. Offered and not chosen: "Number only" (*202* / *2*, a new text
  rule, screen and PDFs alike) and "No text" (like ruling 7).
  ⚠️ *"Every bar" has one exception since 20 Oct 2026* ([`MONTH-NOTES-PLAN.md`](MONTH-NOTES-PLAN.md) §6, owner by
  picker: *"Wrap to two lines"*): a one-day piece of a custom phase wraps to two lines first, and is cut with "…" only
  at the end of the second. A half bar is always Production's, so this ruling stands for every half bar.
- Whether the month view on screen and both PDFs all change together (assumed yes: they are one renderer).
  ✅ **"All three together."** Not chosen: screen only, which would have needed a print-only branch in frozen code.

## 6. Coordination

- MONTH-PILL-LABEL-PLAN (labels) and EPISODE-PREP-PLAN also work in `productionSplitRuns()` / `pillRunsForWeek()`.
  Build one at a time and re-run gate 13 on whichever landed first.
- `installProductionEdgeHandles()` is MONTH-VIEW-PLAN step 7's. Its HANDOFF entry lists what is easy to break.

## 7. ✅ Built, 16 Oct 2026

### 7.1 The measurement (before any code)

A throwaway leg loaded `halfdays`, found every switch day (two Production bars sharing a column, stacked) and applied
the planned inset to the DOM only. It then measured each bar's text room at 961, 1280 and 1600 px windows. Print room
comes from `MVL_GEOMETRY` (a track of 140.22 px). Text widths are in the bar's own font (Inter 600, 10 px).

| where | text room in a ONE-DAY half bar | *Ep. 202* (37 px) | *Block 12* (40 px) |
|---|---|---|---|
| both PDFs (print width) | 50 px | fits | fits |
| screen, 1600 px window | 60 px | fits | fits |
| screen, 1280 px window | 40 px | fits | just |
| screen, 961 px window | 21 px | cut to *E…* | cut |

- §4's "no clipped text on screen at 961 px" **could not hold as written**. Below about a 1,230 px window, a one-day
  half piece is too narrow for its name. That became §5's question, put to the owner with these numbers.
  - The ruling: cut it with "…".
  - Hovering the bar still shows the name (its `title`), and both PDFs print it whole.
- A bar of 1.5 days (a half start plus a whole day) also loses half a day of room. At 961 px one grey "Production
  Week 6" was cut. Neither PDF cuts any text: the written `halfdays` PDF has no `…`.

### 7.2 What was built (`src/legacy/app.js`)

**Not frozen:**
- **`productionSplitRuns()`** flags a run `halfStart` / `halfEnd`. The flags are read off `productionUnits()`' `byDay`,
  which lists a day's units in shooting order:
  - a day with two units is a switch day, because only a .5 boundary shares a day;
  - the first unit ends there, so its run gets `halfEnd`;
  - the second starts there, so its run gets `halfStart`.

  `productionUnits()` itself is untouched.
  - ⭐ **The wrap day of a total ending in .5 is NOT inset** (my call, not a ruling; cheap to change). No unit
    follows it, so it is no switch day. Insetting it would have changed calendars that have no switch day, against
    §4's "every calendar without a .5 switch day stays byte-identical".
- **The writer:**
  - `mvlHalfInset()` reads the two margins back exactly. It throws on any other margin, or on an inset that is not
    Production's.
  - `mvlInsetCols()` gives the inset's share of the bar, as CSS resolves it.
  - `mvlParseItem` / `mvlMonthLayout` carry `halfStart` / `halfEnd` (only when true, so other calendars model as before).
  - `mvlPackLanes` copies `takeLane()`'s half-day occupancy.
  - The painter insets the box, and re-fits a ½ shade inside it.
  - `mvlHalfColumns` inverts the re-fitted shade.
- **The edge grips:** `splitSpanOf()` tells a switch day's two bars apart by **x** (`getBoundingClientRect().left`),
  not by lane. "The higher lane is the earlier row" was never promised by first-fit anyway.

**Frozen** (`renderMonthView`, each marked `⛔ FROZEN EDIT (owner-approved 16 Oct 2026 by picker …)`):
1. **`halfInset(r)`**, appended to the Production `place()` call's style:
   - ` margin-left:calc(P% + 1px);` for `halfStart`, `margin-right` for `halfEnd`, where P = 100 / (2 × span) to four
     places. A grid item's percentage margin resolves against its grid area, so that is half of one of the run's
     days.
   - The `+ 1px` keeps `.mv-bar`'s own 1 px margin on that side, so the two halves stand 2 px apart, like any two
     neighbouring bars.
   - A run with no flag gets `''`.
2. **`takeLane()` / `place()`** take the run as a 9th argument (`half`):
   - `halfHeld` records, per lane, a column taken by one half only ('L' or 'R'), and a run needing the other half
     finds it free.
   - The column still enters `occupied` as soon as either half is taken, so the "+" loop is unchanged.
   - With no `half` the search is the old one, line for line in effect.
3. **`halfSlices(weekStart, startCol, endCol, half)`.** This is the one line beyond §3, named in the gate the owner
   approved.
   - A background percentage is a share of the BAR, so in an inset bar each ½ shade is re-fitted to that day's share
     of the shorter box.
   - With no flag, the old lines run untouched.
   - Without this, a saved ½ mark on or beside a switch day would shade a quarter of the wrong day. The `halfmarks`
     leg measured 65 px into Thursday on a mutant.

### 7.3 Known, and left

- **A one-day half bar on screen below ~1,230 px reads "E…"** (ruled, §5).
- The screen's half bars use the bar track's middle, the same grid every bar uses. A day CELL's middle differs from
  its bar track's by up to 2.6 px (`.mv-bars` pads 3 px a side), so the meeting point can sit up to 2.6 px off the
  cell's visual centre at the outer columns. That is the same offset every bar edge already has.

## 8. Proof (build `be311b275aa4d884…`, 1,482,152 bytes)

- **Gates 10 and 13 on every calendar without a .5 switch day: byte-identical, no re-cut.** See the full gate below.
- **`halfdays` re-cut in both baseline folders, after the owner's sign-off.** The owner saw `monthbase.py sheets`
  contact sheets of the written PDF, plus a poppler render of the print path's July and August, then answered **"Yes,
  re-cut halfdays"** (picker, 16 Oct 2026).
  - Only July and August moved. No text run was added or removed, and the file has no `…`.
  - The four switch weeks fall from 78 px back to 57.
  - Both READMEs carry the record.
- **`halfdays` 26/26:** D2 is rewritten for one lane and measures the geometry: 2 px apart, centred on the day's
  track to 0.01 px. D2i is new (only those six bars carry an inset). D7m and D10m are revised.
- **`pilldrag` 20/20:** E14 is rewritten. The bars are read left to right, and 202's end grip sits mid-Monday on its
  own bar's edge. The drag still makes 202 5.5 and the wrap 9/2, and one Ctrl+Z puts it back.
- **New leg `halfmarks`, 5/5, and a new fixture `halfmarks.sptcal`** (cut from the running app). The leg holds the
  `halfSlices` re-fit on screen in px. A mutant with the re-fit off is red.
- **The writer:**
  - `monthlayout` on `halfdays` and `halfmarks`, 14/14 each: the half flags read back, L0 re-packs to one lane, and P1
    reads each ½ slice of an inset bar back to its marked day.
  - `monthwriter` hd and hm, 12/12 each, including A3 (every box the writer draws is where Chrome lays it out).
  - `monthab` P0–P5 against Chrome's real print. Its three "laid out anew" INFO months on `halfdays` are the same on
    the pre-change build.
- `npm run check` 40/40; `check-refs.py` CLEAN.
- **The full gate on build `be311b275aa4d884…` (1,482,152 bytes): **1,493 PASS, 0 FAIL, GATE PASSED** (14 min, 16 Oct 2026, no other gate alongside). Gate 13: all twenty written month PDFs byte-identical to their baselines, nineteen of them untouched and `halfdays` at its new cut. Gate 10: all ten print documents identical. `pilllabel` 90/90, `pilldrag` 20/20, `halfdays` 26/26, `halfmarks` 5/5, `monthlayout` on `halfdays` and `halfmarks`, `monthwriter` hd and hm, `fields.byId` 62 ids.**
  - Chrome is 155.0.8059.82 here (.40 at the 15 Oct cut). Its compressor moved no untouched file.

