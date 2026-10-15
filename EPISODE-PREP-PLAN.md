# EPISODE-PREP-PLAN.md

**Status: PLAN, 15 Oct 2026. Nothing built.** ✅ **All rulings received 15 Oct 2026** (§9). Ready to
build (§10).
**Written against:** `400ea6c`.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) →
[`CUSTOM-PHASE-UNITS-PLAN.md`](CUSTOM-PHASE-UNITS-PLAN.md) (its ruling 6 is where this plan comes
from, and its rulings 2–5 carry over) → [`BLOCKS-PLAN.md`](BLOCKS-PLAN.md) →
[`MONTH-PILL-LABEL-PLAN.md`](MONTH-PILL-LABEL-PLAN.md) (another plan that reaches the same pill
text).

---

## 1. The request

✅ **CUSTOM-PHASE-UNITS-PLAN ruling 6 (owner, 15 Oct 2026):** per-episode prep is a **derived
setting, in its own plan, written next**, not one hand-entered custom phase per episode.

**What it is.** Each episode gets a prep run of **N working days ending the day before that
episode's first shoot day.** So each episode's prep overlaps the previous episode's shoot. It is
computed from the shoot, so it moves whenever Production moves:
- a new start date;
- a shift tool;
- a holiday;
- a hiatus;
- a change to the shooting order.

Nothing about it is stored except the lengths.

✅ **Owner ruling P1: it lives in the MONTH VIEW ONLY.** Prep runs are drawn in the month view and
the month PDF, never in the waterfall, Excel or the waterfall PDF. The Prep row shows in the sidebar
only while the month view is open.

⛔ The owner's example calendar is a real show's and is **not in the repo**. This plan describes its
patterns only. Every fixture is synthetic (`tests/fixtures/README.md`).

---

## 2. The example, checked against this model

⭐ **One N reproduces every prep run in the example, by hand trace (15 Oct 2026).** The rule: count N
working days back from the day before each episode's first shoot day, skipping
- weekends;
- the union holidays (a Monday holiday, and the two-day Thanksgiving break);
- the winter hiatus.

Every run the example draws starts and ends on the day this rule gives. The example also shows:

- **No prep run for the first episode,** but ✅ **ruling P3 gives it one anyway.**
- **Preps never overlap each other there,** because N is shorter than every episode's shoot. With
  per-episode lengths (P2) overlap becomes easy to produce, and it is handled (§8).
- ⚠️ **One shoot day is shared by two episodes** (a split day: one episode wraps and the next
  starts on the same Wednesday). The app gives every shoot day to exactly one episode
  (`episodeDayMap()`), so it cannot draw that. It does not affect prep, because prep keys off the
  next episode's first day either way. **Out of scope.**

---

## 3. Why "month view only" is not the two-schedules split

MONTH-VIEW-PLAN §1 and CUSTOM-PHASE-UNITS-PLAN ruling 1 forbid two schedules: a phase may never
have one set of dates in the month view and another in the waterfall. **Prep does not break that:**

- **It is derived from the shoot and moves no date.** Production, every phase and every hiatus
  have the same dates with prep on or off. No two outputs can disagree about a date.
- **It is a month-view decoration,** of the same kind as holidays that show only in the month view
  (`holidayView.month`), day notes and extra note lanes. The month PDF will show prep runs that the
  Excel file does not, exactly as it already shows month-only holidays the Excel file does not.
- **It costs the waterfall nothing:** no extra column, and the waterfall, Excel and waterfall PDF
  are byte-identical with prep on or off (§11 proves this).

---

## 4. How it fits without a frozen edit

Checked by reading on 15 Oct 2026:

- **Each episode's shoot days already exist.** `episodeDayMap(schedule)` maps every shoot day to
  its episode **in shooting order** (`effectiveShootOrder()`, ruling 9). In Blocks mode,
  `productionPillTag()`'s day-to-block map does the same for blocks.
- **The month view reads `schedule.segments`. The waterfall, Excel and waterfall PDF read
  `schedule.weeks` and never `schedule.segments`.** No `segments` read exists anywhere in
  `renderSpreadsheetView`, `exportExcel`, `computeBlockLayout`, `sheetColumnWidths` or the waterfall
  PDF writer. So the prep segment is **appended to `segments` AFTER `computeSchedule()` has built
  the weeks.** The waterfall's weeks, columns, `maxConcurrent` and grid range never see it, and the
  month view draws it like any other segment.
- **The month view packs pills into the first free lane** (`takeLane` inside `renderMonthView`).
  Prep sits in its own lane beside the shoot, as in the example, and overlapping preps stack (§8).
  `pillRunsForWeek()` and `segPillLabel()` are NOT frozen.
- **The month-view drag ignores it for free.** A drag starts only when the pill's phase has a
  `start-<key>` field (`if(!startEl …) return`), and prep has none.

⛔ **Four constraints found:**

1. **`episodePrep` must NOT be returned by `getAllPhaseDefs()`.** `readState()` and frozen
   `render()`'s hint-line loop both do `document.getElementById('start-'+p.key).value` for every
   def, and a phase with no start field would throw there and take the whole render with it. Prep
   is a segment synthesized inside `computeSchedule()` only. So header tokens (`buildHeaderCtx()`
   iterates the defs) offer no prep tokens. That is deliberate.
2. **Segment readers outside the month view must skip it.** By reading, two would otherwise move:
   - **`landmarkDate()`'s whole-schedule start** (Anchor To) takes the earliest segment start. A
     first-episode prep (P3) can start before every phase when no Prod Prep is scheduled.
   - **`scheduleLastDay()`.** Prep never ends after the shoot, but the guard is cheap.

   `monthRangeForSchedule()` SHOULD include it, so a first prep before the first phase still gets
   its month.
3. **`episodeDefs` and `blockDefs` restore field by field, and they will drop `prepDays`.** The
   `applyStateSnapshot()` maps copy only `{id, name, days, nameEdited, daysEdited}` and
   `{id, name, days, daysEdited, episodes}`. Without an explicit `prepDays` in each map, every load,
   undo and crash recovery silently discards the per-episode lengths. ⛔ Restore unconditionally:
   absent → `''` (use the default).
4. **The key `episodePrep` is permanent from the first save,** because `phaseColorOverride` stores
   the prep colour under it. Pick it once.

---

## 5. The rule, precisely

For **every** episode in shooting order, the first included (P3):

1. `n` = the episode's own `prepDays` if set, else the default (P2).
2. `first` = the episode's earliest shoot day (from `episodeDayMap()`).
3. Walk back from `first − 1 day`. Count a day only if it is Monday to Friday, not an **enabled**
   union holiday, and not in an all-phase hiatus. Stop at `n` counted days. Those days are the run.

- **Blocks mode (P4):** the same rule per block, with the block's own `prepDays` or the default.
  Pills are labelled with the block's name.
- **A run with `n` blank or 0 is skipped.** A default of blank and no overrides = no prep and no
  segment. That is how every calendar saved before this opens.
- **`dayOverrides` play no part.** They decide which days are SHOT. Prep counts working days before
  the first one, so a Saturday the shoot works is not a prep day.
- **If Show Info is incomplete,** there is no prep.
- **The segment carries:**
  - `days`: the union of every run's days, which `segCoversDate` reads. This is the same
    groundwork as CUSTOM-PHASE-UNITS-PLAN step 2; whichever plan is built first adds it;
  - `preps`: each run's label and days, which `pillRunsForWeek()` splits pills by;
  - `start` / `end`: the outer bounds, for `monthRangeForSchedule()`.

---

## 6. The sidebar: a Prep row in the Phases card, month view only (P1, P2, P4)

```
[■] Prep                         (name editable; swatch opens the phase colour picker)
    Default prep days  [ 5 ]
    202  [   ]  ← blank = 5
    203  [ 7 ]
    204  [   ]
    Ep. 202–208 · 7 preps
```

The numbers in that sketch are illustrative.

- **Under Production, shown only while the month view is open.** It is hidden, never cleared, in
  the waterfall, because it changes nothing there.
- **The list follows the shooting order** and re-renders wherever the episode list does
  (`refreshEpisodesUI()`, and so `refreshAfterRestore()`). In Blocks mode it lists the blocks.
- **The per-episode boxes carry no `id`,** like the episode list's own boxes. Their values live on
  `episodeDefs[].prepDays` / `blockDefs[].prepDays`, not in `fields.byId`.
- **Lowering the episode count drops episodes, and their prep lengths with them.** A typed
  `prepDays` counts as an edit in the existing "Removed …" warning (`lastDroppedEpisodes`), so that
  loss is not silent.
- **The summary line** says what was made, or why nothing was (no default, Show Info incomplete).

---

## 7. Save format: ⛔ new ids and keys are permanent

| New | Where | Absent means |
|---|---|---|
| `prep-days` | id'd field, so `fields.byId` | blank: no default |
| `prep-name` | id'd field, so `fields.byId` | *Prep* |
| `episodeDefs[].prepDays` | `captureSnapshot()`'s existing array | blank: use the default |
| `blockDefs[].prepDays` | same | blank: use the default |
| `phaseColorOverride.episodePrep` | the existing store | the default prep colour |

- **`prep-name`, not `name-episodePrep`,** so nothing that reads the phase-name pattern
  (`name-<key>`, as `getAllPhaseDefs()` does for the built-ins) can mistake it for a phase.
- ⛔ **The M-5 trap applies, and it is the important one.** The Prep row is static markup that a
  restore does NOT rebuild. A calendar saved before this field existed would otherwise open with
  the PREVIOUS calendar's default, which would put prep runs on someone else's plan. `prep-days` and
  `prep-name` go in `applyStateSnapshot()`'s absent-means-default list beside `show-mode`,
  `num-blocks` and `days-per-block`.
- **Gate 5 WILL move by two ids:** every page carries them. That is a deliberate re-cut, made with
  the owner's sign-off, exactly as `show-mode` was.
- **`SNAPSHOT_VERSION` is unchanged.** An older build ignores the new id and keys and simply shows
  no prep, which is a safe misreading.
- **The shift tools need nothing,** because prep is derived.

---

## 8. Overlapping preps: ✅ P5, stacked with no frozen edit

When an episode's prep is longer than the previous episode's shoot, the two preps share days. Both
are drawn, in separate lanes, each with its own label.

- **The packing already stacks them** (§4). The work is the label: the frozen loop labels a run by
  calling `segPillLabel(s, <the run's first date>)`. Two overlapping runs that both continue from
  the previous week start on the same Monday, so **a date cannot tell them apart.**
- **The route:** `pillRunsForWeek()` hands each run's label to `segPillLabel()` in order, for the
  prep segment only. This works because frozen `renderMonthView` calls them in a fixed order: the
  runs, then exactly one label per run, synchronously.
- ⚠️ **That is a contract with frozen code's call order.** It is written as a comment at both
  functions and proven by a leg with overlapping preps. The freeze is also what keeps that order
  from changing: any edit to that loop is itself a gated frozen edit.
- **Rejected:** a one-line frozen edit passing the run to `segPillLabel` (needs sign-off for no
  gain), and refusing overlaps (P2 makes them a normal input).

---

## 9. Rulings: all received 15 Oct 2026, by picker

| # | Question | ✅ Ruling |
|---|---|---|
| P1 | Where does the setting live? | **A Prep row in the Phases card, month view only.** Then confirmed: prep is drawn in the month view and month PDF only, never in the waterfall, Excel or waterfall PDF |
| P2 | One length for every episode, or a per-episode override too? | **Per-episode override, now,** set in the Prep row's list (blank = the default) |
| P3 | Does the first episode shot get a prep run? | **Yes**, every episode (the example has none for the first) |
| P4 | Blocks mode? | **Prep per block,** labelled with the block's name, **with a per-block override** as for episodes |
| P5 | Preps that overlap? | **Stack them, no frozen edit** (§8) |

---

## 10. Steps

1. **Groundwork,** if CUSTOM-PHASE-UNITS-PLAN has not laid it: a segment may carry `days`, and
   `segCoversDate` reads it.
2. **The store and the save format:**
   - `prepDays` on `episodeDefs` and `blockDefs`, with both restore maps;
   - `prep-days` and `prep-name`, with the M-5 default;
   - the gate 5 re-cut (sign-off).

   Cut the synthetic fixture here.
3. **The Prep row:**
   - month view only;
   - the list in shooting order, Blocks mode included;
   - the colour picker;
   - the summary line;
   - the drop warning.
4. **The derivation** in `computeSchedule()`, appended after the weeks are built (§4, §5). Guard
   `landmarkDate()` and `scheduleLastDay()`.
5. **The month view:** `pillRunsForWeek()` splits per prep, and `segPillLabel()` labels *Prep 202*
   or the block's name (§8).
6. **The leg, then the full gate** (§11).

⚠️ **Order against the other two plans.** This plan and MONTH-PILL-LABEL-PLAN both change
`segPillLabel()`, and all three plans are held to gate 13. Build them one at a time. Whichever lands
later re-runs gate 13 on top of the earlier ones.

---

## 11. The gate

- **Every existing calendar unchanged on all four outputs** (gates 1–4, 10, 13), because a blank
  default with no overrides draws nothing. ⛔ **If any existing output moves, stop and report. Do not
  re-cut.**
- ⭐ **"Month view only" is proven, not asserted.** On the prep fixture, export the workbook and the
  waterfall PDF with prep ON and with prep OFF: every Excel part and the PDF must be byte-identical
  (bar the date stamp). This is the check that the segment really is appended after the weeks.
- **Gate 5 re-cut by two ids** (§7), with the owner's sign-off.
- **A synthetic fixture, `episodeprep.sptcal`,** with made-up dates and a made-up show shape:
  - a handful of episodes;
  - a union holiday inside one prep;
  - a hiatus between two episodes;
  - a non-natural shooting order;
  - one episode with its own longer prep, so two preps overlap.

  Plus a Blocks-mode twin.
- **A leg asserting:**
  - each prep's days against a hand trace of §5, the first episode included;
  - the month pill labels, including the two overlapping preps in separate lanes;
  - prep follows a Shift All and a shooting-order drag;
  - a blank default with no overrides draws nothing;
  - `prepDays` survives save, load and undo;
  - loading an older calendar after one with prep set leaves no prep (the M-5 trap);
  - the Prep row is hidden in the waterfall;
  - the row's controls are reachable by `elementsFromPoint`.
- **The fixture's month PDF goes to the owner** as contact sheets before any commit.

---

## 12. Noted for MONTH-PILL-LABEL-PLAN (not this plan's work)

The example draws the **shoot** as one bar per episode, splitting a week's bar where one episode
wraps and the next starts. **That is what ruling 8 replaced on 22 Sep 2026.** The frozen renderer
still has the per-episode branch: `episodeSpans()` is stubbed to return `[]`, which is what hands
the lane back to "Production Week N". So per-episode shoot bars are reachable again with **no
frozen edit**. But they would reverse ruling 8 and move every episodic calendar's month PDF, so
that is the owner's call inside that plan. `MONTH-PILL-LABEL-PLAN.md` was not edited.
