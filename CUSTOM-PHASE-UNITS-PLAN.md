# CUSTOM-PHASE-UNITS-PLAN.md

**Status: steps 1–4 and 6 MERGED INTO `main` as `36db1c1` (16 Oct 2026), full gate 1,593 PASS, 0 FAIL; LIVE at
`695cadc` the same day.** Steps 1–4 BUILT 15 Oct 2026 on branch `custom-units` (steps 1–3 committed as `fa212d7`; step 4, after the
owner reviewed them (*"Reviewed. Build step 4"*), as `8e78e2c`). Step 5, the full gate, passed on each. ✅ All seven
rulings received 15 Oct 2026 (§10).
⛔ **Scope widened the same day:** the five built-in Weeks phases get Dates mode too
(MONTH-VIEW-PLAN ruling 7; §1, §7a), ten ids (ruling 9d). Ruling 7 was re-confirmed as 1c the same
day. That is **step 6, BUILT 15 Oct 2026 on `custom-units`** (§7a "As built", §11), committed as `5111021`. Its
second half, the month-view **edge handles** (MONTH-VIEW-PLAN rulings 7 and 8), was **BUILT 16 Oct 2026** on top of
it (§11 step 6).
**Written against:** `f1a497d`.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) →
[`MONTH-VIEW-PLAN.md`](MONTH-VIEW-PLAN.md) §1, §2, §5 → this file. ⚠️ Read
[`MONTH-PILL-LABEL-PLAN.md`](MONTH-PILL-LABEL-PLAN.md) too: it was planned the same day, and both
plans reach the month view's pill text (§2, §11).

---

## 1. The request

> Owner, 15 Oct 2026: *"for the month view calendar, we need much more granular control. I think
> just for custom phases, you need to be able to add phases by either a number of weeks, number of
> days, or by a specific date range ... this should only affect the month view."*

✅ **Ruling 1 (owner, 15 Oct 2026): "Waterfall shows these phases at week resolution, one
schedule."** So "only the month view" means *only the month view can SEE the difference*. There is
still one schedule, as MONTH-VIEW-PLAN §1 requires. Built-in phases are untouched, and Production
keeps its own shoot-day mode.

⛔ **AMENDED 15 Oct 2026, the same day: the five built-in Weeks phases get Dates mode too.** Owner
ruling 7 of MONTH-VIEW-PLAN §6.7, given while planning that plan's drag handles: the owner chose
"Add a Dates mode" so that Writer's Rm, Pre Prep, Prod Prep, Post and Localization have real
day-level edges to drag. The picker said this reversed this plan's scope and added permanent ids to
the save format, so it was chosen with both in view.
- **What it reverses:** the sentence *"Built-in phases are untouched"* above.
- **What it does NOT reverse:** ruling 1 itself. One schedule, with the waterfall at week
  resolution, governs a built-in in Dates mode exactly as it governs a custom phase. (MONTH-VIEW-PLAN
  §6.7 first called this "reversing ruling 1"; that wording was wrong, and is corrected there.)
- **Production is still untouched here.** Its handles are MONTH-VIEW-PLAN ruling 9.
- **Days mode stays custom-only.** The ruling named Dates. See §7a for what the built-ins need.

The owner then supplied an example production calendar as *"an example of the functionality the
calendar needs to have"*. ⛔ It is a real show's calendar and is **not in the repo**: do not add it,
do not copy its dates, and keep any fixture made from its patterns synthetic (see
`tests/fixtures/README.md`). §2 describes what it shows in general terms only.

---

## 2. What the example shows, and where each piece lands

It is a month calendar, one page per month, Sunday to Saturday, with coloured bars. **Nothing in it
is ever drawn on a Saturday or Sunday.**

| What the example shows | Today | Under this plan |
|---|---|---|
| The shoot as one bar **per episode**, episodes back to back, most starting mid-week | ✅ Production with Show Info schedules exactly this (`episodeDayMap()`). The month view draws one pill per week labelled *Production Week N*, with the episodes in grey text | Not this plan. MONTH-PILL-LABEL-PLAN adds "label by Episode". ⚠️ **But the example splits a week's bar at each episode change** (one bar for the episode wrapping on Monday, another for the one starting Tuesday). That plan as written keeps one bar per week listing both episodes. Noted here for that plan; not solved here, and that file was not edited |
| A **prep run per episode**: a fixed number of working days ending the day before that episode's first shoot day, so it overlaps the previous episode's shoot in a second lane | ⛔ Not possible | Possible by hand, one Dates-mode custom phase per episode. ✅ **Ruling 6: a derived "Episode prep" setting, in its OWN plan, written after this one** |
| Day-counted runs **step over a union holiday** (a Monday holiday is skipped and the run picks up on Tuesday) | Production only | ✅ **Ruling 5**: Days mode skips holidays the way Production does |
| A whole-week phase **runs straight through** a Monday holiday | ✅ Weeks mode today | Unchanged |
| **Weekly countdown markers**: a one-day bar on each Monday before the shoot (*N Weeks Out* … *One Week Out*) | Only by hand, as day notes, which do not move when the shoot does | ✅ **Ruling 7: no feature.** A user who wants them adds one-day custom phases (Days mode, 1) or day notes |
| **Wrap in whole weeks**, labelled with spelled-out numbers (*Wrap Week One*) | ✅ Post, or a Weeks-mode custom phase. Labels read *Week 1* | Spelled-out numbers are a pill-label change (`segPillLabel()`), not this plan |
| **Holidays drawn as grey bars** | Holidays are notes in the day cell | The look is frozen `renderMonthView`. Not this plan |
| A **winter hiatus** of whole weeks | ✅ The default hiatus | Unchanged |
| A **two-day holiday hiatus** around a Thursday holiday | ✅ For US regions these are union holidays, so Production already skips them and they show as holiday notes. Hiatuses themselves are whole weeks | A true day-level hiatus is separate save-format work (MONTH-VIEW-PLAN §6.4). Not this plan |

⭐ **What this means for the request.** Taken literally, the three modes can reproduce the example's
prep runs and countdown markers. But they can only do it by hand: about one custom phase per
episode, plus one per marker. None of them follow the shoot when it moves, and under ruling 1 each
is a phase in the waterfall. Two preps touching one week row count as two concurrent phases there
(`computeSchedule` sets `maxConcurrent` to the most phases active in any week, read 15 Oct), so the
waterfall and Excel grow a column. That is why ruling 6 makes per-episode prep a derived feature of
its own. Ruling 7 leaves countdown markers to the user, as custom phases or notes. **The three modes
are worth building either way**: a scout, a table read or a stage build-out is a one-off with its
own dates.

---

## 3. The model (ruling 1)

One schedule, two resolutions, exactly as MONTH-VIEW-PLAN §1:

| Output | A Dates-mode phase entered as Wednesday to Friday of one week |
|---|---|
| Month view, month PDF | A pill on Wednesday, Thursday and Friday |
| Waterfall, Excel, waterfall PDF | That whole week row, labelled *Name wk 1* |

A waterfall row is a week, so it cannot show part of one. That is the trade already accepted for
snap-off starts and half days (MONTH-VIEW-PLAN §4.6), not a disagreement between the views.

⛔ **Rejected: phases that exist only in the month view.** The month PDF and the Excel file would
list different phases, which is the two-schedules split MONTH-VIEW-PLAN §1 rules out.

---

## 4. Why the three modes are cheap: no frozen edit is planned

Each of these was checked by reading the code on 15 Oct 2026:

- **`computeSchedule` already gives day-accurate segment bounds.** A snap-off phase's `start` is
  the typed day, and its `end` is `start + weeks × 7` (via `extendEndForHiatus`).
- **The month view draws whatever `[start, end)` it is given, day by day.** That is
  `segCoversDate` and `pillRunsForWeek`, neither of them frozen. Verified for non-Monday starts in
  MONTH-VIEW-PLAN §2.
- **The waterfall already copes with mid-week starts and ends.** Audit H-4 snaps the grid's
  geometry to Mondays and rounds ends up. A phase is active in a week row whenever it overlaps
  Monday to Sunday at all.
- **The month PDF writer parses `renderMonthView`'s output**, so it follows with no change.
- **Custom phase rows are rebuilt on every restore,** and every id ending `-custom<n>` is re-keyed
  by `applyStateSnapshot()`'s regex. New ids inside the row are re-keyed for free, and a previous
  calendar's values cannot leak into them (the M-2/M-5 trap does not apply to custom rows).

---

## 5. The three modes

| Mode | Inputs | Segment end (exclusive) | Hiatus | Snap to Mon |
|---|---|---|---|---|
| **Weeks** (default) | Start date, Weeks | Unchanged: `extendEndForHiatus` | Pushes the end out (today) | As today |
| **Days** | Start date, Days | The day after the Nth counted day. A counted day is a Mon–Fri day (ruling 2) that is not an enabled union holiday (ruling 5) and not in a hiatus (ruling 4) | Pauses: the end moves out (ruling 4) | Not shown. The typed start is used as typed |
| **Dates** | Start date, End date (inclusive) | End date + 1 day | Stays on its dates; hiatus days drawn blank (ruling 4) | Not shown |

Weekends are blank in every mode (ruling 3), which is what custom phases already do.

- **Days mode needs its own day walk,** a small sibling of `simulateProductionSchedule` for one
  phase with no overrides. ⛔ Days mode must not reuse `dayOverrides`. That store belongs to
  Production's shoot days (MONTH-VIEW-PLAN §4.3).
- Ruling 5 skips holidays, so a holiday inside a Days-mode run must draw **blank**, as the example
  does. Today `segCoversDate` draws every weekday in `[start, end)` for a non-Production phase. So a
  Days-mode segment carries its counted days as an array, the way Production carries `shootDays`,
  and `segCoversDate` reads it when present. That is not frozen, and it is inert for every existing
  phase.
- **Switching mode never moves the phase.** The new boxes are prefilled from the current segment:
  Weeks → Days counts the working days it covers, Weeks → Dates takes its last workday, and Days or
  Dates → Weeks rounds up to whole weeks. A mode switch is one undo step.
  - ✅ **As built:** a box is prefilled only when it is EMPTY, so a value from an earlier visit to that unit
    comes back. The start is rewritten to the start AS SCHEDULED (a snapped Monday, or a Days phase's first
    counted day), since Days and Dates use the typed start as typed. Back to Weeks on a non-Monday start
    turns Snap to Mon off, the month-view drag's rule (MONTH-VIEW-PLAN §6.3).
- ✅ **As built, a Days segment STARTS on its first counted day,** not the typed one, so a start typed on a
  weekend or holiday gives the waterfall no empty week row. The hint says *First working day …*.
- ⭐ **19 Oct 2026: a custom phase's "wk N" can be switched off** ("Number weeks", [`PHASE-NUMBERING-PLAN.md`](PHASE-NUMBERING-PLAN.md)).
  Going to Days or Dates unticks it, so a one-day Days phase reads as its bare name.
- **Validation:** an end date before the start date, or a day count below 1, puts a red hint on the
  row and leaves the phase unscheduled. That matches what a week count of 0 does today.

---

## 6. The sidebar row (chrome)

```
[■] Location Scout                                ×
Length  [ Dates ▾ ]
Start date [ 10/07/2026 ]   End date [ 10/09/2026 ]
3 days · Wed 10/7 → Fri 10/9
```

- **`Length` is a native `<select>` with Weeks, Days and Dates,** matching the `#show-mode`
  "Schedule by" control. A `select[id]` is swept by `collectFieldValues()`, so it saves and undoes
  with no extra code.
- Weeks mode shows Weeks and Snap to Mon, as today. Days mode shows a Days box. Dates mode shows an
  End date box. **Hidden boxes keep their values**, so switching back restores them.
- ⚠️ **The hint line (`meta-<key>`) is written by frozen `render()`.** ⛔ **CORRECTED when built:** the plan
  said `update()` would overwrite it after `render()`. That does not hold, because about 30 paths call
  `render(currentSchedule)` directly, and a Load left the weeks-style text showing (measured). As built, a
  Days or Dates phase's line is a SIBLING element, `unitmeta-<key>`, which frozen code never writes, and CSS
  shows whichever line matches the unit. That is the real shape of the half-day note's route, a separate
  element. Its text depends only on the schedule, which only `update()` changes.
- ⚠️ **`addCustomPhaseRow()` binds every `input` in the row to `update`, but not `select`s.** The
  new select needs a `change` listener of its own, or it will look broken.
- ⭐ Before calling the select usable, assert `document.elementsFromPoint()` at its centre contains
  it (MONTH-VIEW-PLAN §8 step 5).

---

## 7. Save format: ⛔ these ids become permanent

Three new ids per custom phase, chosen once:

| Id | Holds | Absent means |
|---|---|---|
| `unit-<key>` | `weeks` / `days` / `dates` | **Weeks**, so every file saved before this opens unchanged |
| `days-<key>` | the day count | — |
| `end-<key>` | the inclusive end date, ISO | — |

Checked free on 15 Oct 2026. `days-per-block` and `days-per-episode` exist, but no id matches
`days-custom<n>`, and nothing uses the `unit-` or `end-` prefixes.

- **`captureSnapshot()` does not change.** There is no new store, because the three are DOM fields
  swept into `fields.byId`.
- ⚠️ **Setting `.value` fires no event,** so a restore never runs a mode-change handler. ✅ **As built, nothing
  needs re-showing:** which boxes show is pure CSS off the select's checked option (the `#show-mode`
  pattern), so no restore, undo or load path can leave them disagreeing with the unit.
- **`SNAPSHOT_VERSION` stays 1.** v1.4.3 ignores ids it does not know and would drop a Days or Dates
  phase entirely. So the row also keeps `weeks-<key>` filled with the rounded-up whole-week
  equivalent, and an older copy shows the phase in whole weeks instead of losing it. ⛔ That is
  written in the row's input handler, **never in `update()`**: writing a field during `update()`
  would add a phantom undo step to every render.
- ⚠️ **Shift re-keying is not needed.** The new fields are dates inside the row, not a week-keyed
  store. But they DO have to move with the phase: see §8.

### 7a. ⛔ Dates mode on the built-ins (MONTH-VIEW-PLAN ruling 7, 15 Oct 2026). Ids not yet chosen

The built-in rows are STATIC markup, not built by `addCustomPhaseRow()`. Three things in §4 and §7
are true of custom rows only, and each one fails for a built-in:

- ⛔ **The restore trap DOES apply.** §4's "a previous calendar's values cannot leak in" holds
  because custom rows are rebuilt on every restore. Built-in rows are not. A file saved before this
  ships has no `unit-prePrep`, and the `fields.byId` replay leaves a field it does not mention ALONE.
  So the previous calendar's Dates mode would survive into it, and the phase would move with no
  edit. That is audit M-5 exactly, which `snap-<key>` hit on 25 Sep. ⛔ Each new built-in id gets an
  explicit **absent → Weeks** default in `applyStateSnapshot()`, beside the `.phase-snap-cb` line
  ("Explicit constants, never defaultChecked/defaultValue"). It also goes into New's reset.
- ⚠️ **Built-in rows bind inputs by id** (MONTH-VIEW-PLAN §8 step 1), so a new control there is inert
  until bound explicitly. `addCustomPhaseRow()`'s blanket `input` binding does not reach them.
- ⚠️ **Re-keying by regex does not apply.** The ids are fixed: `unit-prePrep`, `end-prePrep`, …
- **How many ids, an open point for the owner.** MONTH-VIEW-PLAN §6.7's option text said "five new
  permanent ids". It is five PHASES:
  - **Parity with custom phases** is `unit-<key>` + `end-<key>` per phase, ten ids. This shares one
    code path, and keeps "hidden boxes keep their values" (§6).
  - **Five ids** is possible only with `end-<key>` alone, blank meaning Weeks. Switching back to
    Weeks then loses the end date.
  - Recommended: ten, for one code path. ✅ **RULED 15 Oct 2026 (MONTH-VIEW-PLAN ruling 9d): ten.**
    `unit-<key>` + `end-<key>` per built-in phase, and switching back to Weeks keeps the end date.
  - ✅ **Question 1 was RE-CONFIRMED the same day.** The owner had also typed "1a" (no edge handles
    on the built-ins) to the step-7 session, probably by clicking a stale button. Asked directly, the
    owner picked **"Dates mode (1c)"**. This section stands (MONTH-VIEW-PLAN §6.7).
- ⚠️ **An older build** ignores both ids and shows the phase in whole weeks, from `weeks-<key>`. The
  §7 rule therefore applies unchanged: keep `weeks-<key>` filled with the rounded-up equivalent,
  written in the row's input handler.
- ✅ **AS BUILT (15 Oct 2026):**
  - `buildPhaseRows()` gives the five rows a Weeks/Dates select, an End date, and the sibling `unitmeta-<key>`
    hint, with the custom rows' classes, so the same CSS swaps apply. Production gets none.
  - The new controls are bound by id in the `PHASES.forEach` block, beside `snap-<key>`.
  - `unitPhaseKeys()` (every phase with a unit select) replaces `customPhaseDefs` in `refreshCustomUnitMeta()` and
    `syncAllCustomUnitFallbacks()`. The "Custom" in those names predates step 6.
  - `applyStateSnapshot()` defaults an absent `unit-`/`end-` to Weeks/'', beside the `.phase-snap-cb` line, and New's
    reset does the same.
    ⭐ **Proven by mutant:** without the two default lines, a v1.4.3 calendar loaded after `builtindates` kept the
    previous file's Dates mode, and its Pre Prep ran *Mon 4/6/26 → Tue 2/23/27 (47 wk)*.
  - ⛔ **One more mover, which §8 missed:** "Start after previous phase" and Close all gaps (`autostartPhase`)
    reach the built-ins, so they now write through `setPhaseStart()`. A Dates built-in starts on the next weekday,
    as Rebuild forwards does.
  - Verified by leg `builtindates`: LIVE 17 checks, RESTORE 15, each mover with one undo, and the M-5 load and New.
  - The pre-step-6 build opens `builtindates.sptcal` with the Dates phases in whole weeks, so neither vanishes.
- ⚠️ **Gate 5 WILL move** for this half, unlike the custom-only plan (§12). ✅ **Re-cut 62 → 72 on the owner's
  sign-off** (picker, 15 Oct 2026). The ten added ids are all Weeks/'', none was lost, and no value changed;
  baselines README. `v1.0.0-saved.html` has
  no custom phases, but it has all six built-in rows, so the `fields.byId` key set grows by the new
  built-in ids. That is an expected, deliberate re-cut, like 53 → 59 for `snap-<key>`
  (MONTH-VIEW-PLAN §8 step 1). It goes to the owner as such, never quietly.

---

## 8. The movers: every path that writes a phase's start date

A Dates-mode phase is two dates. Any tool that moves `start-<key>` alone will **stretch** it
instead of moving it. These are all the writers, found by reading on 15 Oct 2026:

| Writer | Used by | Custom phases? |
|---|---|---|
| `shiftCalendarDates` → `shiftDateFieldValue` | Shift All, Shift From, Anchor To | ✅ |
| `rebuildForwards` / `rebuildBackwards` | Rebuild From | ✅ |
| The month-view pill drag (`mousedown`/`mousemove` on `#table-wrap`) | Dragging | ✅ |
| `autostartPhase`, `closeAllGaps` | Start after previous, Close all gaps | ⛔ Excluded by design (`PHASE_CHAIN`) |

- **One helper,** used by all three: in Dates mode, move `end-<key>` by the same number of days.
  Days and Weeks modes need nothing, because their length is a count.
- ⚠️ **Rebuild reads `phaseWeeksFor()`,** which reads `weeks-<key>` (the old-build fallback in
  Days and Dates modes). It must branch on the mode:
  - **Forwards** already writes a start and asks the live scheduler for the end, so it works once
    the end is right.
  - **Backwards** inverts week arithmetic (`startForWeeksEndingAt`). For Days mode, search the real
    scheduler, the way `productionEndFor()` does, rather than writing a second copy of the walk.
    For Dates mode the length is fixed.
- **The drag stays one undo step.** `end-<key>` is an id'd input, so it is swept into the same
  snapshot as `start-<key>`. That is the same reason `snap-<key>` costs nothing (MONTH-VIEW-PLAN §6.3).

### 8.1 ✅ As built (15 Oct 2026)

- **`setPhaseStart(key, iso)` is the one writer.** It is used by `shiftCalendarDates` (Shift All, Shift From and
  Anchor To), both Rebuild directions (their pins too), the drag's `mousemove`, and, since `main` was merged in
  (`9a04a6d`), Production's first-shoot-day grip from MONTH-VIEW-PLAN step 7 (`applyCount()`, its move and its
  return to where it began). ⛔ A new mover must use it. `probeShootDays()` writes `start-production` too, but as a
  scratch value it restores before returning: a probe, not a move, so it is left alone.
- **`phaseSnapped()` returns false for a Days or Dates phase.** Their Snap to Mon box is hidden and ignored by the
  scheduler, so the tools must ignore it as well. Otherwise `chainedStart()` pushed them to a Monday, and Rebuild
  pinned them to one. The drag likewise leaves their hidden box alone.
- **Rebuild backwards, Dates:** keeps its calendar length and ends the day before the cursor, back to back. Ending on
  the last WEEKDAY was tried first: a Wed–Tue range then began on a Saturday, an empty waterfall week row.
- **Rebuild backwards, Days:** counts N working days back from the day before the cursor, with `isUnitWorkDay()`.
  ⚠️ **This deviates from the plan above,** which said to search the scheduler. That search is needed for
  Production, whose length depends on its overrides. Here the predicate is the whole rule, so the forward walk from
  the start found this way counts exactly those days. The leg checks the result against the scheduler's own hint
  line.
- **A snapped Weeks predecessor ends by the cursor's MONDAY.** Cursors were always Mondays until Days and Dates
  phases could be placed to the day. Every existing rebuild is unchanged.
- **Rebuild forwards:** a Days or Dates phase never starts on a weekend. A Friday finish hands off on the next
  Monday, not the Saturday.
- **The old-build fallback is re-synced** inside each tool's undo bracket (`syncAllCustomUnitFallbacks()`), and at
  the drag's end.
- **Verified** by the `customunits` RESTORE run, each with one undo putting every date back:
  - Shift All +1 wk: Stage Build 2/17–3/2;
  - Anchor To: 2/24–3/9;
  - Rebuild forwards from Scout: Read-through 1/27, Stage Build 2/4–2/17, Rigging 2/25 past the hiatus;
  - Rebuild backwards to Rigging on 3/1: Stage Build 2/15–2/28, Read-through 2/5–2/12, Scout 1/22, Pre Prep
    12/7/26;
  - the drag +2 days: 2/12–2/25.

---

## 9. Found in passing: `{key.close}` names the wrong day for a phase that ends mid-week

In `buildHeaderCtx()` (not frozen), `{<key>.close}` is `seg.end − 3 days`. That gives the Friday of
the final week **only when `seg.end` is a Monday**. A snap-off Weeks phase starting on a Wednesday
ends on a Wednesday, so the token names the Sunday before, two days before the phase's last
working day. ✅ **Reproduced 15 Oct 2026** on the pre-change build with `customunits.sptcal`: a Snap-off phase
from Wed 1/13/27 for 2 weeks closed on `1.24.27`, a Sunday, where its last day is Tue 1/26. The three new modes make mid-week
ends normal, so this plan fixes it with `phaseLastWorkday()` (audit L-13), which already exists for
exactly this. Calendars whose phases all end on a Monday print the same text as before.

---

## 10. Rulings

All seven were received from the owner on 15 Oct 2026, by picker.

| # | Question | ✅ Ruling | The example's evidence |
|---|---|---|---|
| 1 | One schedule, or phases only in the month view? | **One schedule; the waterfall shows these phases at week resolution** | — |
| 2 | Does a Days count mean working days (Mon–Fri) or calendar days? | **Working days** | Every day-counted run is Monday to Friday |
| 3 | Weekends inside a date range: blank, or drawn? | **Blank in every mode**, as custom phases are today | Nothing is ever drawn on a weekend |
| 4 | Hiatuses: does a Days phase pause through one? Does a Dates phase? | **Days pauses** and its end moves out, like Weeks. **Dates stays on its dates**, with hiatus days drawn blank | Nothing runs through the winter hiatus |
| 5 | Holidays in Days mode: skip union holidays like Production, or count them like Weeks mode? | **Skip them.** Weeks mode is unchanged. ⚠️ This reverses the first recommendation given in the conversation, before the example was seen | A day-counted prep run steps over a Monday holiday. A whole-week wrap runs through one |
| 6 | Per-episode prep: by hand, as Dates-mode custom phases, or a derived "Episode prep" setting (N working days before each episode's first shoot day, generated from `episodeDayMap()`)? | **Derived, in its own plan, written after this one.** One setting, and it follows the shoot. ⚠️ *Refined the same day in [`EPISODE-PREP-PLAN.md`](EPISODE-PREP-PLAN.md) P1: prep is drawn in the MONTH VIEW ONLY, never in the waterfall* | The example's main content after the shoot itself |
| 7 | Weekly countdown markers (*N Weeks Out*): by hand, or automatic? | ⛔ **No feature.** Owner: *"dont produce this feature, if they want it they can add it as custom phases or notes"* | One marker per Monday before the shoot |
| — | *(15 Oct 2026, from MONTH-VIEW-PLAN §6.7)* Built-in Weeks phases: drag handles? | **Ruling 7 there: "Add a Dates mode" to the five built-ins.** Reverses §1's scope line, not ruling 1 above. Needs §7a. Ruling 8 there: the month drag on a Weeks custom phase's edge switches it to Dates | — |

---

## 11. Steps

Nothing here touches frozen code.

1. ✅ **BUILT 15 Oct 2026. Fields and UI, no schedule change yet.** Add `unit-` / `days-` / `end-` to
   `addCustomPhaseRow()`, with show/hide, the select's `change` listener, prefill-on-switch, the
   `weeks-<key>` fallback and the `refreshAfterRestore()` reflect. **Cut the fixture here**
   (MONTH-VIEW-PLAN's rule: cut one whenever the save format moves).
2. ✅ **BUILT. The math.** `readState()` reads the mode. `computeSchedule()` computes the end for Days
   (working days, pausing through hiatuses, skipping enabled union holidays) and Dates (fixed dates,
   hiatus days blank). A Days segment carries its counted days, and
   `segCoversDate` reads them.
3. ✅ **BUILT. The hint line and the `{key.close}` fix** (§6, §9). The bug is reproduced on the pre-change
   build: the fixture's Snap-off Weeks phase closed on Sun 1/24/27; it now closes on Tue 1/26/27.
4. ✅ **BUILT 15 Oct 2026. The movers** (§8, §8.1).
5. ✅ **DONE. The leg, then the full gate** (§12): `customunits`, 51 checks; 1,318 PASS on steps 1–3, 1,331 PASS on
   step 4, both 0 FAIL.
6. *(Added 15 Oct 2026.)* ✅ **BUILT 15 Oct 2026. Dates mode on the five built-ins** (§7a, as built there). Then **MONTH-VIEW-PLAN step 7's phase edge handles** (rulings 7 and 8 there). Dates and
   Days phases get both handles, and a Weeks phase's edge drag switches it to Dates.
   ✅ **The handles were BUILT 16 Oct 2026:** `installPhaseEdgeHandles()`, recorded in full in MONTH-VIEW-PLAN §6.7
   ("the phase handles").
   - ⛔ **CORRECTED: an edge handle is NOT a mover.** This step used to say the handles "are this plan's movers as
     much as body-drag is", because they write `end-<key>` / `days-<key>`. They write those fields, but they hold the
     other end, so they change a LENGTH. That is why they must NOT go through `setPhaseStart()`, which carries a Dates
     phase's end along with its start. A Dates start-edge drag writes `start-<key>` directly, and `phaseedge` F5
     proves the end stays (it went red on a mutant that used `setPhaseStart()`).
   - **§8's rule still holds for every MOVER.** The list of movers is unchanged.
   - `onCustomUnitChange()`'s last-weekday prefill is now `segLastWeekday()`, shared with the drag's Weeks → Dates
     switch. The one deliberate difference: the drag always writes the end, even over an older value, because the
     held edge must not move.
   - **Verified:** `tests/harness/phaseedge.mjs` (13 cases, every edge × unit, custom and built-in), in `gate.sh`;
     `pilldrag` 20/20 on the same build. **Full gate on build `a198d0a6…`: 1,451 PASS, 0 FAIL**, with every existing
     output unchanged (§12): gates 1–5 at 72 ids, gate 10 identical, and gate 13 byte-identical.

⚠️ **Overlap with MONTH-PILL-LABEL-PLAN.** Both reach the month view's pill text path, and both are
held to gate 13. This plan does not change `segPillLabel()`. Whichever lands second re-runs gate 13
on top of the first.

---

## 12. The gate

- **Every existing baseline unchanged, with no re-cut:** gates 1–5, 10 and 13. No existing calendar
  uses Days or Dates mode, so any output that moves is a regression. ⛔ **If one moves, stop and
  report. Do not re-cut.**
- **Gate 5 should not move.** Its calendar, `tests/fixtures/v1.0.0-saved.html`, has no custom
  phases (`"customPhaseDefs":[]`). Legs that load a fixture with custom phases (`carry-rich`,
  `custom-nondense`, the `stintswap-*` set) will count three more field ids per custom phase,
  which is expected. Check each one rather than assuming.
- **A new fixture, `customunits.sptcal`, synthetic** (made-up dates, no real show's shape), with:
  one phase per mode, a Days phase crossing a hiatus, a Days phase crossing a union holiday, and a
  Dates phase ending mid-week.
- **A new leg asserting:**
  - the month pill columns for each mode;
  - the waterfall rows and the Excel rows;
  - Shift All and Anchor To move both ends of a Dates phase;
  - Rebuild From in both directions, and the drag;
  - a restore round trip;
  - a mode switch is one undo step;
  - the select is reachable by `elementsFromPoint`.
- **The new fixture's month PDF goes to the owner** as `monthbase.py sheets` contact sheets before
  any commit. That follows the month-PDF writer's ruling 4 for a deliberate change to the month PDF.
