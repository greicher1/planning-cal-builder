# PREP-GRIP-PLAN.md: a start grip on each prep pill

**Status: BUILT, MERGED INTO LOCAL `main` AND GATED (1,860 PASS / 0 FAIL on `314f7722…`, 19 Oct 2026); not pushed.** Record in §8. Rulings Q1(a) and Q2(a), and "Build it", by the owner's picker the same day. Owner, 19 Oct 2026, asked whether a prep's start can be changed by
hand: *"will you be able to change when exactly each episode prep starts or is it always n number of days until the
day before first shoot day"*. Then, on the proposal: *"plan a start grip on each prep pill in the month view that
writes that episode's (or block's) prep length, with the end staying tied to the shoot. Plan it and ask me before
building."*

Read [`EPISODE-PREP-PLAN.md`](EPISODE-PREP-PLAN.md) first. This plan adds a gesture to it and changes nothing it
ruled.

---

## 1. What it does

In the month view, each prep run gets **one grip, on the left edge of the pill that holds its first day**. Dragging
it moves that prep's start by the working day. The end does not move: a prep always ends the working day before its
episode's (block's) first shoot day (EPISODE-PREP-PLAN §1). What the drag writes is that unit's **own prep length**,
`episodeDefs[].prepDays` or `blockDefs[].prepDays`, exactly what typing in its box in the Prep row writes.

- **Left** = more prep days, **right** = fewer. The Prep row's box for that episode shows the new number as the drag
  moves (`refreshPrepUI()` already runs from `update()`).
- **No end grip, ever.** The end is the shoot's to decide (owner's words above).
- **No body-drag.** Pressing the middle of a prep pill still does nothing, as today: body-drag needs a `start-<key>`
  field and prep has none (EPISODE-PREP-PLAN §3).
- **Only working days.** Prep counts Monday to Friday, skipping enabled union holidays and all-phase hiatus days
  (`isUnitWorkDay()`). The edge lands on the working day nearest the pointer; a weekend, holiday or hiatus day under
  the pointer is stepped over, never stored. Ties go to the smaller change (the phase grips' rule).
- **Floor: 1 working day** (ruling Q2). Dragging past the end stops at one day. Removing a prep (0) stays in the
  box, where it is today.
- **One undo step per gesture.** A drag out and back puts back exactly what was there, blank included, and banks
  nothing; so does Escape (MONTH-9's rule, as every grip).

Nothing else moves. Prep is appended after every date is built (`appendEpisodePrep()`), so a prep length moves no
shoot day, no other phase, no note and no holiday note. The waterfall, Excel and the waterfall PDF never read prep
(P1), so a grip cannot change them.

## 2. Which prep a pill belongs to (the one real design problem)

A prep pill carries only `data-ph="episodePrep"`. Nothing in the markup says WHICH prep it is, and that comes from
frozen `renderMonthView`, so it cannot be added without a frozen edit.

**Dates cannot tell them apart.** In `episodeprep.sptcal` Prep 304 (8 days) and Prep 303 (10 days) both have a pill
starting **Monday 3/1/27** in the row of Sun 2/28. 304's is a continuation (it started 2/24), 303's is its first day.
A grip chosen by date would sit on whichever pill came first, and half the time drag the wrong prep.

**The pills' ORDER tells them apart, and that contract already exists.** Frozen `renderMonthView` calls
`pillRunsForWeek()` and then `place()`s its runs in order; `place()` pushes into `placed`, and `placed` is emitted in
push order. So within one week row, the `episodePrep` pills appear in exactly the order `prepRunsForWeek()` returns
its runs. `takePrepRun()` already depends on that call order to put the right name on each pill (its comment calls it
"the second place this file leans on the frozen loop's call order").

So the grip's lookup, `prepOfPill(pill)`, will:
1. take the pill's week row and its Sunday (`pillRange()`'s `rowSun`);
2. recompute that row's runs with `prepRunsForWeek(currentSchedule, rowSunday, prepSeg)` (pure: it sets no state);
3. list the row's `.mv-pill[data-ph="episodePrep"]` in DOM order;
4. ⛔ **cross-check before trusting it:** the two lists must be the same length, and every pill's
   `gridColumnStart/End` must equal its run's `startCol + 1` / `endCol + 2`. On any mismatch, return null and show no
   grip (`cellDate()`'s rule: refuse rather than guess);
5. return the matched run's `prep` (its unit, its `first`, its `last`, its `days`).

A pill carries the grip only when its first day is its prep's `first`.

⚠️ If the frozen loop is ever re-ordered, the worst case today is two overlapping preps swapping names. With the
cross-check, the worst case for the grip is that no grip shows. It can never drag the wrong prep, unless the order
changes AND the columns still line up; the leg's mutant (§5) covers that.

## 3. How a step is solved: ask the real derivation, never re-walk it

The project's rule for Production's grips is *"Row grips ask the real scheduler … Never re-implement the walk"*
(HANDOFF, month-view step 7). The same here:

- **At the press, one probe.** Set the unit's `prepDays` to its current length + 80, run
  `computeSchedule(readState())`, read that unit's prep `days` from the result in date order, and put `prepDays`
  back in a `finally`. Nothing renders. That list is every working day the derivation itself would count, ending on
  the prep's `last` (80 working days is past anything a month page can reach).
- **On each move,** the day under the pointer (`dayAtPoint()`) snaps to the nearest entry of that list (ties to the
  smaller change). The new length is the count of entries from there to `last`, floored at 1.
- **⛔ The guard, after each `update()`:** the unit's prep in the new `currentSchedule` must start on the chosen day
  and end on `last`. If not, put everything back and let the gesture go inert, as every grip does. A silent wrong date
  in someone's plan is the outcome to refuse.

## 4. Code shape (no frozen code, no save-format change)

- **`installPrepEdgeHandles()`**, a new IIFE right after `installPhaseEdgeHandles()`, the same shape:
  - its own pool of the shared body-level `.phase-edge-handle` (`data-edge="start"`, `data-ph="episodePrep"`) and the
    shared `.phase-edge-shield`. Print CSS already hides both, and `buildSavedHtml()` already strips both;
  - hover through its own `document` `mousemove`, which shows its grip only over an `episodePrep` pill. The other two
    grip blocks already hide theirs over a pill that is not theirs (`hasUnit()` is false for prep);
  - it reuses the module-scope `pillRange()`, `visibleRect()`, `dayAtPoint()` and `cellDate()`;
  - its tooltip names the prep and says what holds: "Drag to change when Prep 303 starts. It still ends the day before
    Ep. 303's first shoot day; its prep days change (now 10)."
- **The write:** `def.prepDays = String(n)` on `episodeDefs.find(e => e.id === unit.id)` or `blockDefs[unit.i]`.
  Back at the press length, it restores exactly what was there: deleting the key if the box was blank (ruling Q1).
  Then `update()`, `cancelPendingUndoPush()` and the guard. The leading `pushUndoSnapshot()` is at the press, and the
  trailing one at release only if the stored value changed. `prepDays` is already in `captureSnapshot()` through
  `episodeDefs` / `blockDefs`, and its restore maps (EPISODE-PREP-PLAN §4.3).
- **Untouched:** `fields.byId` (the per-episode boxes have no ids, so gate 5 stays at 74 ids); `SNAPSHOT_VERSION`;
  every frozen function. The DOM order in §2 is READ, never changed.
- **Notes (R5):** a prep drag rewrites no note. Prep makes no auto-note, and `computeSchedule` builds the holiday
  notes before prep is appended, so prep's span adds none.

## 5. Tests: `phaseedge.mjs` G0–G8, trusted CDP input

`phaseedge.mjs` is the leg for the grips on everything but Production (trusted input, each press where
`elementsFromPoint` has the grip topmost). The cases use `episodeprep.sptcal` and its Blocks twin, unmodified.
Their dates come from `t/episodeprep.js`'s hand trace: Prep 302 Fri 2/12 + 2/16–2/19 (Presidents' Day 2/15 skipped),
Prep 304 2/24–3/5, Prep 303 3/1–3/12 (the hiatus week 3/15 lies between it and the shoot), all 2027.

| Case | What it holds |
|---|---|
| G0 | February/March: Prep 303's pill from Mon 3/1 carries a start grip (topmost, a child of `<body>`); Prep 304's pill from the SAME Monday carries none (a continuation); no end grip anywhere |
| G1 | Prep 303's start left one working day (Mon 3/1 → Fri 2/26): its box 10 → 11, its end still 3/12; every other prep's days, every phase's dates and the Production meta line unchanged (the planned G9, folded in); ONE Ctrl+Z → 10 |
| G2 | Prep 302 (blank, the default 5) right onto Mon 2/15 (Presidents' Day): lands Tue 2/16, box 4, end 2/19 held; the Undo button off before and on after (so G3/G6's probe can see a banked step) |
| G3 | Prep 302 out a day and back in ONE gesture: the box is BLANK again (not "5"), nothing banked (the Undo button stays off: `episodeprep` is saved in the month view, so F9's view-switch probe has no step to find) |
| G4 | Prep 302 right onto Sat 2/13 or Sun 2/14: no change (Fri 2/12 is nearer, or ties with Tue 2/16 and the smaller change wins); left onto Thu 2/11: box 6 |
| G5 | floor: Prep 302's start dragged past its end: 1 day, Fri 2/19, box 1 |
| G6 | Escape mid-drag: put back (blank), the shield gone, nothing banked (Undo still off) |
| G7 | Blocks (`episodeprep-blocks`): Prep Block 3 (from Thu 3/4) left a working day: Block 3's box 12 → 13, from Wed 3/3; the other blocks' boxes unchanged |
| G8 | print media + `body.printing-calendar`: the grip is `display:none`; none in `#print-root` or `#table-wrap` |

**Mutants, each must turn a case red before the leg is wired in:**
- choose the pill by date alone (§2): G0;
- write the default instead of the unit's own length: G1, G2;
- write the number when back at the start: G3;
- no floor: G5.

**Gate:** the full gate. Gates 10 and 13 stay byte-identical, since nothing draws differently. Gate 5 stays at 74 ids,
and `episodeprep` stays green.

## 6. Rulings (✅ both ruled by picker, 19 Oct 2026, as recommended)

- ✅ **Q1 → (a), "Store it as its own".** A drag that lands on the DEFAULT length (an episode with its own 8, default 5, dragged to 5).
  - (a) **Recommended:** store 5 as that episode's own length. A drag is a statement about that episode, so a later
    change to the default does not move a prep you placed by hand. The box shows 5, marked edited.
  - (b) Clear the box, so the episode follows the default again.

  Either way, a drag that ends where it began restores exactly what was there.
- ✅ **Q2 → (a), "1 working day".** The floor.
  - (a) **Recommended:** 1 working day. Removing a prep stays a deliberate 0 typed in the box.
  - (b) Dragging past the end removes the prep (0). The pill vanishes mid-gesture, and the grip with it, so the gesture
    could not come back.

## 7. Order and dependencies

- Built on `main` as of `c4bf9d5` (prep merged at `e50583b`), in its own worktree. It touches `src/legacy/app.js` next
  to `installPhaseEdgeHandles()`, which `autonote-grips` also edits (`apply()` and `beginDrag()`), and
  `tests/harness/phaseedge.mjs` (that branch adds F13). Both are additive and in different places, so a merge is
  mechanical. Land `autonote-grips` first if it is ready.
- Steps: (1) `prepOfPill()` and the hover with the cross-check, then G0 and G8; (2) the probe, the drag, the write and
  the guard, then G1–G7; (3) mutants; (4) the full gate; (5) README, HANDOFF and this plan's record; then the
  commit and push pickers.

## 8. Built (19 Oct 2026)

- **Code:** `installPrepEdgeHandles()` in `src/legacy/app.js`, right after `installPhaseEdgeHandles()`. It has `prepOfPill()`
  (§2), `probeDays()` and `solve()` (§3), the write with Q1(a) and the press-length restore, the guard, `follow()`,
  Escape, and the leading and trailing undo pushes. Nothing else changed.
- **Tests as built:** G0–G8 (§5). G9 became part of G1. "Nothing banked" in G3 and G6 is the Undo button staying off,
  because `episodeprep` is saved in the month view. `phaseedge` 22/22, in 1 min 55 s alone. All four mutants were red
  first.
- **Gate:** Full gate on build `70005deb…`: **1,788 PASS, 1 FAIL** (75 min, under other sessions' load). The one failure is `pilllabel (dayoverrides-onhalf)` producing no result file at all. Run alone on the same build afterwards, that leg passes 29/29: the same 29 checks as before, with 74 ids (prep's two) for 72. Everything else is green: G0–G8, the waterfall PDF and Excel identical, `fields.byId` at 74 ids, gate 10's ten print documents identical, gate 13's twenty written month PDFs byte-identical.
- **Merged gate:** after merging `main` (the live note fix beside it), build `314f7722…`: 1,860 PASS, 0 FAIL, every
  frozen output identical.
