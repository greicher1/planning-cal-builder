# SHIFT-WRAP-FOLLOW-PLAN.md — Shift keeps every phase's distance from the wrap

Status: **built on branch `shift-wrap-follow`, not merged** (20 Nov 2026). Tracker card `shift-keeps-wrap-gap`. Leg `shiftwrapfollow`.

## 1. The ask and the rulings

The owner raised it on 20 Nov 2026: Shift moves Production, Production lands on new holidays, its length changes by a week, and
now there is a one-week gap or a one-week overlap between Production and Post. Should the app close it?

| # | Ruling | Owner's words |
|---|---|---|
| R1 | Every phase whose place depends on Production's length counts, not just Post | *"it applies to any phase that production is around and productions length affects, not just post"* |
| R2 | Any cause counts: union holidays, days marked Off, holidays marked as shoot days, weekends marked as shoot days | *"this would apply not just to holidays but days marked off or holidays or weekends marked shoot days"* |
| R3 | A phase running ALONGSIDE the shoot follows the wrap only if it ended in the wrap week. Otherwise it stays tied to the shoot's start, as Shift moves it today | *"a if it ends at wrap"* (option A of the alongside question) |
| R4 | Production's own ▲ / ▼ arrows stay one-phase-only, and the rule is always on (not tied to Ripple Hiatus Periods) | the two proposed defaults, accepted with *"Yes, plan it"* |
| R5 | The hiatus ripple follows the wrap too, by the same rule | picker, 20 Nov 2026: *"Yes, same rule"* |
| R6 | To a date with Production landing by its END lands ON or BEFORE the date even when the shoot grows over a holiday, in this build | picker: *"Fix it in this build"* (recommended: later) |
| R7 | A phase that starts during the shoot and ends after the wrap stays where Shift puts it | picker: *"No, it stays"* |

Not a gap-closer: a phase keeps the distance from the wrap that it HAD. A phase that started three weeks after wrap still starts three weeks after
it. Build Around stays the tool that closes gaps (CLAUDE.md: *Shift keeps the gaps, Build Around closes them*). This plan makes Shift keep
that promise when Production's length moves under it.

## 2. What happens today

- `shiftCalendarDates()` moves every ticked phase's START by the same N working weeks (`stepOverHeld`). Production's wrap is not a stored
  date: `computeSchedule()` → `simulateProductionSchedule()` works it out again from the shoot-day count on the new dates.
- So the wrap moves N weeks **plus or minus** whatever the new dates change:
  - holidays gained or lost (`productionInfo.holidaysHit`)
  - days marked Off that now cost a shoot day (`offsHit`)
  - worked holidays and weekend days (`holidaysWorked`, `addedDays`): marks travel by shoot-day number (`asShootDayMove`), and a worked
    weekend mark that lands on a weekday stops adding a day (`takeShootDayMoveNote`'s "inert")
- Every phase after it moved exactly N, so the handoff opens or closes. The code knows: the arrows' comment says *"Production's wrap can travel
  by more or less than the weeks requested"*, and the result line only prints the new wrap (`productionWrapText()`).
- ⚠️ Production on **Ends** (`productionEnds`) is no exception: `setPhaseStart` moves its start and the next `update()` takes the wrap it lands
  on as the held one (`prodEndsForward`). So the rule applies there too.

## 3. The rule

### 3.1 Which phases follow (decided from the calendar BEFORE the move)

Read each phase's run with `phaseRunsNow()` (first and last working day) and the wrap with `productionInfo.lastShootDay`, before anything moves.

| The phase before the move | Follows the wrap? |
|---|---|
| starts after the wrap day (Post, Localization, a custom phase after the shoot) | **yes** |
| starts before or on the wrap and its last working day is in the **wrap week** | **yes** (R3) |
| starts before or on the wrap and ends in any other week, including one that runs on past the wrap | no: it stays where Shift put it |
| Production itself, anything derived from it (Simultaneous Post, episode prep, Tandem days) | not a phase with its own start: nothing to do |

AND it must be moving in this Shift (ticked). An unticked phase never moves (the ticks decide the move, `shiftPlan()`).
AND Production must be moving. If Production is unticked its start stays put, so its length cannot change because of this move.

A phase that straddles the wrap (starts during the shoot, ends weeks after it) does NOT follow (R7, confirmed).

### 3.2 How far

- `expected` = the old wrap moved the way the shift moved everything (the same `stepOverHeld` mapping, so held breaks are stepped over).
- `actual` = the wrap after the move, read once the day marks are re-derived (§4).
- `extra` = `workingWeeksBetween(expected, actual, held)`: signed, in working weeks, so a locked break between the two does not count.
- `extra === 0`: nothing more happens. This is most shifts, and it keeps every existing calendar's result byte for byte.
- Otherwise every follower moves `extra` more working weeks: pushed when the shoot grew, pulled when it shrank.

### 3.3 What travels with a follower

The followers move as a part move does today (`shiftCalendar(extra, null, {part: {phases, windows}, stepHeld: true})`): one window per follower,
its start week to its last week, measured after the first move (owner's T2 rule for hand-picked sets). So their own hiatuses, their
`<week>|<key>` stores, the typed notes inside their runs and the unlocked all-phase hiatuses inside those runs travel with them. Locked
hiatuses, holidays and date-pinned notes never move, as on every mover.

Production is not in that second move, so its day marks stay exactly where the first move put them.

## 4. Where it runs

| Mover | Follows the wrap? |
|---|---|
| The toolbar ← / → arrows (`runShift`) | yes |
| Shift form, By weeks, Earlier / Later (`shiftBy`) | yes |
| Shift form, To a date, Go | yes; with Production landing by its END, the landing is searched first (§4a, R6) |
| Phase card ▲ / ▼ (`nudgePhase`) | **no** (R4): it means one phase |
| Month-view phase drag (`carryPhaseDrag`) | no: a drag of one phase, same reason |
| Build Around | not needed: it builds every phase from Production's real wrap already |
| Hiatus ripple (`rippleAfterHiatusEdit`) | **yes** (R5): §4b |

### Engine shape

As built: `wrapFollowBefore()` / `wrapFollowAfter()` beside `shiftCalendar`, and `shiftWithWrapFollow(weeks, held, move)` around the three
Shift callers' `shiftCalendar` calls:

1. Before: the wrap, every phase's run, the set of followers (§3.1), and the held weeks (`shiftHeldWeeks(part)`).
2. `shiftCalendar(weeks, fromIso, opts)` as today.
   ✅ (Corrected while building.) The plan said the wrap could only be read after the bracket closed and a further `update()`. Not so:
   while `overrideMove` is set, `update()` re-derives the day marks from their shoot-day pins before it schedules, so the schedule the move
   leaves behind already has R2's Off days and worked days in it (leg F6 / F7 / F9 hold it).
3. `extra` (§3.2). If non-zero and there are followers, the second `shiftCalendar` (§3.3), then `update()`.
4. Return the first result with a `wrapFollow: {weeks: extra, keys: [...], cause: ...}` added, for the line.

All of it is inside the caller's one undo step (`asOneUndoStep`, or `runShift`'s two `pushUndoSnapshot()` calls). One Undo puts everything back.

### 4a. To a date, Production landing by its END (R6)

Today `workingWeeksToFinishBy(current wrap, target, held)` gives the delta from the wrap as it is now. If the shoot then grows over a holiday
(or an Off day lands on a shoot day), the wrap lands past the date and the line warns *"Still past your date"*.

- **Search, don't invert** (the same reason Build Around searches Production, PROJECT-CONTEXT §7a): the wrap a start gives depends on the
  holidays and marks of that start's own dates. After the first move, while the wrap is past the target, move the same ticked set one more
  working week earlier and read the wrap again. Bounded (a few tries: one week per holiday the shoot can gain), and it stops at the first
  wrap on or before the date. Pulling earlier can also SHRINK the shoot, so the first wrap that fits is the latest one that fits.
- The phases ticked with Production (the ones before it, typically) move with it, as they do today. The followers (§3) then follow the
  FINAL wrap, so the phases after it keep their distance too.
- The line drops *"Still past your date"* when the search succeeded and says instead, e.g., *"Production starts a week earlier than the
  shift alone would put it: Thanksgiving falls in the shoot."* If the bound is reached and it still overshoots (a date the shoot cannot
  meet), the old warning stays.
- One undo step, as today.

### 4b. The hiatus ripple (R5)

`rippleAfterHiatusEdit` runs `shiftCalendarDates` from the hiatus inside its own `asShootDayMove` bracket, then `update()`. The follow step
goes after that `update()`, by the same §3 rule, but only when the ripple moved Production (`prodMoved`). When it did not, the shoot's
length changed because of the hiatus itself, which is what the ripple's push already accounts for. Followers are the phases the ripple
moved (it has no ticks: every phase starting on or after the hiatus). The readout under the hiatus adds the follow in its own words:
*"Pushed 2 wks: Production · Post, Localization 1 more wk (Thanksgiving now in the shoot)"*. Inside the ripple's one undo step
(`bankRippleWithEdit`).

⚠️ The ripple puts the day marks back on their dates when Production did NOT move. Production moving is exactly when the follow runs, so
the two never meet; but the leg must hold that.

## 5. What the line says

Shift's result line (`describeShift`), after the wrap, in the owner's pushed / pulled wording:

> Shifted 2 weeks later. Wrap Fri 12/4/26: Thanksgiving falls in the shoot now. Post and Localization were pushed 1 more wk to keep their
> distance from the wrap.

The cause comes from comparing `productionInfo` before and after:
- holidays gained or lost, BY NAME ("Thanksgiving falls in the shoot now", "Good Friday no longer falls in the shoot")
- more or fewer Off days costing a shoot day ("2 more Off days fall on shoot days")
- worked days that stopped adding a day (already said by `takeShootDayMoveNote`, which stays)
- none of those identifiable: "the shoot takes a week longer on its new dates"

The arrows' flash readout has room for a few words only: `1 wk later · wrap 12/4/26 · Post & 1 more pushed 1 wk`.

## 6. The freeze and the save format

- Nothing frozen is edited. `shiftCalendar`, `shiftCalendarDates`, `computeSchedule` and the Shift form are not on CLAUDE.md's frozen list.
  The outputs change only because the dates change.
- Nothing is saved: no new snapshot key, no new id'd control. The rule has no switch (R4).
- A shift whose wrap moves by exactly N weeks is unchanged byte for byte. So a full gate should come out identical except for any leg that
  shifts a calendar across a holiday boundary, and each such difference is this feature working: read each one before re-cutting.

## 7. Steps

1. **Engine:** `shiftKeepingWrap` (§4), the follower test (§3.1), `extra` (§3.2). Wire the three Shift callers.
2. **Line:** the cause (§5) in `describeShift` and the short form in `runShift`.
3. **Leg `shiftwrapfollow`** (new), on a fixture with Thanksgiving near the shoot's end, all against `/dist/index.html`:
   - W1 a shift that pulls Thanksgiving into the shoot: Post and Localization pushed 1 more wk, the gap before Post unchanged
   - W2 the reverse (a holiday leaves the shoot): pulled 1 more wk
   - W3 Off days (R2): marks that land on more shoot days lengthen the shoot; Post follows
   - W4 a worked weekend day that lands on a weekday (R2): the shoot shortens; Post follows
   - W5 a phase alongside the shoot ending in the wrap week follows; one ending a week earlier does not; one straddling the wrap does not (R3)
   - W6 Post unticked: it stays, the overlap shows, nothing follows
   - W7 Production unticked: nothing follows
   - W8 one Undo puts the whole move back
   - W9 a locked hiatus between the wrap and Post: `extra` counts working weeks
   - W10 a shift whose wrap moves exactly N: the calendar and the line are as before
   - W11 the arrows and To a date run it; the phase card's ▲ / ▼ does not (R4)
   - W12 Production on Ends (`productionEnds`)
   - W13 To a date, Production ends by a date the old delta overshoots over a holiday: it now lands on or before the date; the phases
     before it come with it; Post follows the final wrap (R6)
   - W14 a date the shoot cannot meet: the bound stops the search and the old warning shows
   - W15 the hiatus ripple pushing Production onto a holiday: Post follows, one undo step (R5); a break inside the shoot (Production not
     moved): no follow, marks stay on their dates
4. **Existing legs** to re-run: `anchorside`, `shiftbandline`, `panelstale`, `paneldrag`, `buildaround`, `hiatusripple`, `finishbefore`.
5. **Try it in the browser** for the owner before docs or a push (owner's working rule).
6. **Full gate**, then HANDOFF, README "Unreleased", and a What's New entry (users notice this: "Shift keeps your phases in step with the
   wrap when holidays change the shoot's length").

## 8. Open questions

None. The three raised with the plan were ruled the same day: R5 (the ripple follows), R6 (fix "ends by" Production in this build), R7
(a straddling phase stays).
