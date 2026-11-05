# PHASE-WEEK-ARROWS-PLAN.md: move one phase a week at a time from its card

**Status: RULED. The arrows LIVE since `4a90017` (4 Nov 2026). §5 (the month drag) BUILT on branch `month-drag-carry` (5 Nov 2026), not merged, not pushed; §5a is the as-built record.**
- **Layout C2** (owner, 4 Nov 2026, after D was built and every layout was drawn on the real card at three window
  widths: *"show me a version of C where you make the up and down button slightly taller and wider (expand the box
  every so slighly if necessary"*, then *"C2, but make sure the buttons aren't actually touching the top or bottom lines
  of the box"*): two 24 x 15 buttons stacked inside the date box, 2 px clear of its lines, the box 37 px tall. §2a.
- ~~**Layout D** (owner: *"lets go with D"*): two buttons beside the Starts box, always shown.~~ Built first, then
  replaced by C2: on the real card it narrowed the date box and stacked Starts over Length below a ~1450 px window.
- The rest by picker, each as recommended (§7): ▲ = earlier; a burst of clicks = one undo step; keep the "Pulled 2 wks"
  label; and the month drag gets the same mover **as its own change, after the arrows** (§5).
- "Waterfall only" stands as the owner said it (D6), so the arrows show only while the waterfall is on screen.

Mockup: [`mockups/phase-week-arrows.html`](mockups/phase-week-arrows.html), six layouts (A to F) on one page, opening
on D. Tracker cards `waterfall-phase-drag` (the arrows) and `month-drag-carries-phase` (§5).

- **The asks** (owner, 4 Nov 2026):
  - *"come with ways that it could be theoretically possible to drag individual phases up or down. Should we even do
    this?"* Answered in chat (§6 keeps the record): yes, modestly, built on a "just this phase" mover.
  - *"Write the plan"*, interrupted by *"Or maybe on the phases in the leftside column, above and below the date box,
    little up and down arrows appear allowing you to shift up or down by a week at a time. Waterfall only"*, then
    *"mock it up"*.
  - then, mid-build: *"mockup a few version of this idea with the arrows in differnt places"*. That became layouts A
    to F (§2).
- **Read as:** on each phase card in the sidebar, a ▲ and a ▼ by the Starts date box. One click moves THAT phase one
  week. "Waterfall only" = the arrows show only while the waterfall is on screen (the month view already has the bar's
  body drag). The date they change is the calendar's, so the month view follows it.

---

## 1. What is true today (read from the code, 4 Nov 2026)

- **The card** is engine-drawn (`src/legacy/app.js`): `.ph-starts` holds `.ph-starts-cap` (the Starts/Ends select)
  and `label.ph-start-box > input[type=date]#start-<key>`. The head is `.custom-phase-header`. Measured in the pane:
  the caption line is 14 px with 3 px under it, the box is 30 px, and the Length line starts 8 px below the box. So
  there is no free row above or below the box; arrows there must straddle its edges (layouts A and B) or the card
  grows.
- **`setPhaseStart(key, iso)` is the one writer** of a moved phase's date. A Dates phase's end and an Ends phase's
  held end move with it; Production in Ends sets `prodEndsForward`.
- **The shift engine, `shiftCalendarDates(weeks, fromIso)`, decides stay-or-go with a DATE cutoff** (`inRange`). For
  a phase that moves it also moves the phase's own hiatus (`phiatus-start-<key>`), and every store keyed
  `<week>|<phase key>` follows the phase through `hiatusKeyStays` / `stayingPhases`: `hiatusTexts`, `hiatusColors`,
  `hiatusFontSize`, `textStyle.phase`, `cellSpans`, `gridColSwaps`. `shiftCalendar()` wraps it in `asShootDayMove()`,
  so Production's `dayOverrides` keep their shoot-day numbers. There is no "just this phase" mode.
- **The month view's body drag (`installMonthPillDrag`) is the only single-phase mover today.** It writes
  `setPhaseStart` only, binds the day overrides (`beginShootDayMove`), and lets edited automatic notes follow
  (`autoNoteBaseline`). ⚠️ It does NOT move the phase's own hiatus or its `<week>|<key>` stores (§5; built 5 Nov 2026, §5a).
- **The toolbar's ← 1 wk / 1 wk →** is Shift All by one week: everything moves.
- **No class says which view is on screen.** `setViewMode()` only toggles the view buttons' `active`. The arrows need
  one (`body.view-sheet`, say).

## 2. The layouts (mockup)

| | Where | For | Against |
|---|---|---|---|
| **A** | Above and below the box, centred, straddling its edges. The owner's idea | Reads as up/down around the date it changes. Nothing on the card moves | Small targets (30 × 15). Shown on hover, so less discoverable |
| **B** | Above and below, at the box's right end | Same, and away from the date text | Crowds the box's calendar button |
| **C** | Inside the box, stacked, left of the calendar button | Compact; looks like a number box's spinner | Smallest targets (20 × 13). A spinner on a date reads as "next day" |
| **D** | Beside the box, two 30 × 30 buttons, always shown | Biggest targets; always visible | Narrows every box; adds 12 buttons to a six-phase sidebar |
| **E** | On the Starts line, right end | Tidy; nothing moves | Further from the up/down sense; shares the line with the label |
| **F** | On the coloured header, stacked at the right | Reads as "move this phase". Works on a FOLDED card, so a sidebar of folded cards becomes a list you can nudge | Covers the end of a long phase name (the name is an input across the head) |

Recommended was A, as first asked. ✅ **Ruled: D** (owner, 4 Nov 2026). So the arrows are always shown and hold their
space: the Starts box (and the Ends box, when a phase is held by its end) narrows by 68 px on every card, and the two
buttons are 30 × 30, the box's own height. D3 (when they show) is settled by the layout.

### 2a. On the real card: why D became C2 (4 Nov 2026)

The mockup's cards were simplified: Starts and Length stacked, in a narrower sidebar. The real card puts them side by
side in a sidebar of 24% of the window (320 to 440 px; 415 on a 1728 window, 346 on 1440, 333 on 1280). Drawn there
(each layout as CSS over the built markup, captured at 2x by a headless-Chrome script; nothing in the app changed):
- **D** was the only layout that changed the card's shape: its 68 px narrowed the date box, and keeping every box at
  the 112 px floor (`phasesui` P6) stacked Starts over Length below a ~1450 px window (55 px taller).
- **B** and **E** crowd the Starts line (B cut "Starts" and the label to "Star…" and "Pushe…" at 1440 and 1280); **A**'s
  ▲ runs into the label.
- **C, C2, C3** (buttons 20 x 13, 24 x 15, 28 x 17; boxes 30, 34, 38 px) keep the card's shape at every width.
- **Ruled: C2, with the buttons clear of the box's lines.** Inside the box, top to bottom: its 1 px border, 2 px clear,
  ▲ 15, 1 px gap, ▼ 15, 2 px clear, its border, so the box is 37 px (not C2's 34). Length's box grows with it, so the
  two stay level, and only while the arrows show (the month view's card is unchanged). 3 px clear at the right, and the
  date text stops 32 px from the right edge, which leaves "mm/dd/yyyy" its ~73 px in the narrowest side-by-side box.

## 3. Behaviour (as ruled; §7 lists the calls)

- **One click = one week, this phase only.** The gaps either side change; the Shift tool keeps gaps.
- **▲ = earlier** (the phase moves up the waterfall). ▼ = later.
- **Moves with it:** its own hiatus; every `<week>|<key>` store (spans, column swaps, text styles, band names and
  colours); its automatic notes (they are computed) and edited automatic notes (as the month drag does); Production's
  Off/half/on marks by shoot-day number.
- **Stays:** every other phase, typed notes, holidays, all-phase hiatuses (locked or not), the calendar range.
- **Can change, as typing the date would:** the waterfall's column count, the year blocks, page orientation.
- **Phase kinds:** a Snap-off phase keeps its weekday (±7 days). Dates and Ends phases go through `setPhaseStart`.
  Production moves its first shoot day a week; the shoot is worked out again around holidays, so its wrap can move
  by more or less than a week. A phase with no start date shows no arrows.
- **Feedback:** the meta line updates, and a label on the Starts line reads "Pulled 2 wks" / "Pushed 1 wk" for a burst
  (owner wording, 23 Oct 2026: a moved date is pushed or pulled, never + or −). The mockup also outlines the moved cells and scrolls the grid to them.
- **Keyboard:** Alt+↑ / Alt+↓ in the date box. Each arrow is a real button with an `aria-label` ("Move Prod Prep 1
  week earlier").
- **Undo:** a burst of clicks is one step; a pause or any other edit ends it.

## 4. How it would be built (no frozen edit)

> ✅ **As built (4 Nov 2026, branch `phase-arrows`):** on the merged Shift tool's `part` with one phase and an EMPTY
> week window, not a new `{onlyPhase}` (the Shift session's advice, and the same result), plus `opts.keepView`. Two
> things the plan did not foresee: Production's day marks had to be bound for the whole BURST, not per click (▼ ▲
> lost a worked holiday otherwise), so `undo()` / `redo()` end a running burst first; and on the real card D's 68 px
> stacked Starts over Length below a ~1450 px window, which is why the layout became C2 (§2a).
> The leg is `phasearrows` (26 cases). HANDOFF has the rest.

1. **Engine:** give `shiftCalendarDates` a third argument, `{onlyPhase: key}`. Phases: only that key moves. All-phase
   hiatuses and the calendar range: stay. Notes: stay (`isPinnedWeek` true for every week). `<week>|<key>` stores:
   unchanged code, since `stayingPhases` already decides them. Run it inside `asShootDayMove()`. ⚠️ The ruled Shift
   tool merge (ANCHOR-TO-DIRECTION-PLAN.md, layout C, unbuilt) generalises the same predicate for Phase & before /
   Phase & after. Whichever is built first should add the predicate in the shape both use.
2. **Edited automatic notes:** follow with `autoNoteBaseline()`, as the month drag does. Check it against R5's
   `rewriteMovedAutoNotes` (that one is for notes that MOVE, and none do here).
3. **Chrome:** two `<button>`s in the card markup, NO id, one delegated listener on the phase-row containers. Buttons are
   not swept by `collectFieldValues()` (it reads input/select/textarea), and no id keeps it that way. A view class set
   by `setViewMode()` hides them outside the waterfall. CSS sits beside the `.phase-row` rules, never in a frozen block.
4. **Undo:** `pushUndoSnapshot()` before the first click of a burst; the existing markDirty debounce banks the burst
   as one step.
5. **Proof:** a new leg `phasearrows`: one phase moves and no other does; its own hiatus, a span, a column swap and a
   phase text style travel; a typed note, a holiday and a locked hiatus stay; Production's marks keep their shoot-day
   numbers; a Dates, an Ends and a Snap-off phase; a burst is one undo; Alt+arrows; hidden in the month view. Then the
   full gate (it is a mover, not chrome-only CSS), with every baseline identical.

Nothing in the snapshot changes: no new key, no new id. Every saved calendar opens as before.

## 5. The mismatch the month drag already has

The month body drag moves only `start-<key>` (§1). After a month drag, the phase's own hiatus stays on its old dates
and its waterfall spans, column swaps and phase text styles stay on its old weeks. The Shift tools carry all of them.
If the arrows are built on `{onlyPhase}`, the month drag could use the same mover and the two would agree. It is a
separate, small change, and the owner's call (D7). ✅ **Ruled: yes, as its own change, right after the arrows** (by
picker, 4 Nov 2026), with its own tests, so the drag is changed and checked on its own. ⚠️ The drag applies a new
date on EVERY increment, so it cannot simply call the mover each time: an out-and-back must return every re-keyed
store exactly, and `shiftKeyedMap`'s last-writer-yields would drop a store entry that a mid-drag step lands on. Move
from the press-time state each increment, or re-key once at the drop. Its legs are `pilldrag`, `monthdragundo`,
`phaseedge` and `hiatusdrag`.

### 5a. As built (5 Nov 2026, branch `month-drag-carry`)

- **From the press, every step** (not at the drop). Re-keying once at the drop would leave the own hiatus on its old
  dates in the live month view until the release. So `beginPhaseCarry` copies, at the press, the ten stores
  `shiftCalendarDates` re-keys by `hiatusKeyStays` (`hiatusTexts`, `hiatusNameSyncedKeys`, `hiatusColors`,
  `hiatusFontSize`, `cellSpans`, `gridColSwaps`, `textStyle.hiatus` / `.phase` / `.simpost`, `mvTextStyle.band`) and
  the phase's `phiatus-start-<key>`. Each time the drag's weeks change, `carryPhaseDrag` puts them back to those
  copies and, unless the weeks are 0, runs the arrows' call once: `shiftCalendar(weeks, null, {part: {phases: [key],
  …NUDGE_NO_WEEKS}, keepView: true, carryOnly: true})`. ⚠️ A store added to that step 3 must be added to
  `phaseCarryStores()` too.
- **`carryOnly`** (new, with `part` only): the part's phases keep the date their caller wrote; their own hiatus and
  stores move. The drag still writes its date day by day through `setPhaseStart` and the snap rule, unchanged.
- **The weeks** are the waterfall rows the run moved: the Monday difference of the start (Production too; its
  `startDate` is `mondayOf(start)`), or for an Ends phase the nearest whole week of the drag (what `setPhaseStart`
  moves its end by). So a drag inside a week carries nothing, and a Thursday drop a week on carries one week, keeping
  the own hiatus on its Monday.
- **Unchanged:** Production's day marks bound from press to release, edited automatic notes (`autoNoteBaseline`), one
  undo step at the release, typed notes staying. One `update()` per step: on a weeks change it is the mover's own
  (`refreshAfterRestore`).
- **Proof:** new leg `mvdragcarry` (15 cases) on `mvdragcarry.sptcal` (this plan's `phasearrows.sptcal` plus one stale
  band label on 7/6/26, a week above the locked Summer Break). Red on `origin/main` on all eight carry cases (7/15); red
  on a "carried step to step" mutant (O2, O3: the stale label lands on 7/13, yields, and never comes back) and a "by
  days" mutant (K1). Neighbours green: `phasearrows`, `monthdragundo`, `anchorside`, `pilldrag`, `phaseedge`,
  `hiatusdrag`, `hiatusripple`, `mvorder`, `npm run check`. Full gate (5 Nov 2026): 4,043 PASS, 1 FAIL (the known
  `scenariocompat` v1.2.0 load flake, green alone), every baseline identical. Without the stale label the step-to-step mutant PASSES: a phase's own `<week>|<key>` entries all move
  together and cannot collide, so only a plain band key on no band can be dropped.
- ⚠️ **Found here, NOT fixed (shared with the arrows and the Shift tool):** a one-phase move re-keys a plain-keyed band
  store that sits on no band. `hiatusKeyStays` keeps a plain key only on a held all-phase band's week, and with an empty
  window every other plain key moves. So ▲ / ▼ (and now the drag) move a stale band label a week, or drop it onto a held
  band. Likewise Shift From moves one from before its cutoff. A one-line fix (a plain key also stays when `!inRange`)
  changes the Shift tools' behaviour, so it is its own change. ✅ **Fixed in §5b**, but not by that one line.

### 5b. A stale band key stays put (5 Nov 2026, branch `stale-band-key`)

- **The bug, reproduced on `origin/main`** (`ca794cc`, leg `stalebandkey`). A label typed on an all-phase band whose
  hiatus is later retyped to other dates is left keyed on a week with no band. That key is ignored, never destroyed (the
  rule `applyCellSpanOverrides` and the stint swaps follow). But step 3's `hiatusKeyStays` kept a PLAIN key only on a
  held band's week, so every other plain key moved:
  - **Post ▼** carried "Old Break Name" from 7/6 onto Summer Break's 7/13, where it YIELDED (`shiftKeyedMap`) and was
    gone. Its colour, size 9 and both styles landed on Summer Break, so **nudging Post recoloured Summer Break.**
  - **Production ▲** carried it to 6/29. The month drag did the same (`mvdragcarry` W1 now checks).
  - **Shift From** (Phase & after Post) carried it from 7/6, three months BEFORE its 11/2 cutoff, onto Summer Break.
    That is the claim the month-drag session read off the code, confirmed in the running build. A hand-picked set did
    the same outside its windows.
- **Rulings that settle it** (no new question for the owner):
  - ANCHOR-TO-DIRECTION-PLAN.md §2: band labels *"follow their band or phase"*. A stale key has neither.
  - Shift From's own definition: *"everything earlier stays exactly where it is"*.
  - §3 here: the arrows leave *"all-phase hiatuses (locked or not)"* alone.
  - A stale key that moves can only end up dropped, or drawn on a band it never belonged to.
- **Why not the one line.** "A plain key also stays when `!inRange`" judges a band's label by its WEEK, but a band is
  judged by its START, and band labels are keyed on EVERY week of the band (`syncHiatusNamesFromSidebar`). A band that
  moves can run past the move's window.
  - The case: a Dates phase (a hiatus never lengthens one, CUSTOM-PHASE-UNITS ruling 4) with an unlocked band starting
    in its last week. Tick only that phase and the band moves, but under the one-liner its second week's typed label and
    colour stay behind on a week with no band, and the band's moved second week shows the synced name.
  - The leg proves it: P1 is red on that mutant.
- **The rule as built** (`shiftCalendarDates`, steps 2 and 3; about 15 lines, no frozen code, no save-format change):
  - Step 2 records the weeks of every band that MOVES (`movingHiatusWeeks`), from its pre-shift dates, beside the held
    bands' `stayingHiatusWeeks`. Both go through one `recordBandWeeks(row, set)`.
  - A plain key on a held band's week stays.
  - A plain key on a moving band's week moves, every week of the band.
  - A plain key on NO band goes by its week, as a note does: carried by a whole-calendar shift and inside a part move's
    windows, left where it is outside them.
  - ▲ / ▼ and the month drag pass an EMPTY window, so a stale key never moves on them.
- **Unchanged:** a whole-calendar shift (everything is in range); every `<week>|<key>` store; every band that exists.
  ⚠️ Known and NOT changed: on a whole-calendar shift a stale label one week above a LOCKED band still moves onto it
  and yields, exactly as on `origin/main`. Nothing ruled says a stale key should be held while everything moves.
- **The month drag's "from the press":** with this fix no store a one-phase move touches can collide, so carrying step
  to step would lose nothing either, and `mvdragcarry`'s step-to-step mutant now passes. From the press stays: it is what
  protects a store added to step 3 later.
- **Proof:** new leg `stalebandkey` (9 cases, in gate.sh after `mvdragcarry`) on new fixture `stalebandkey.sptcal`.
  - Fixture = `phasearrows.sptcal`, plus the stale label's five stores on 7/6/26, a second stale label "Late Stale" on
    2/8/27, the Dates phase Stage Build 5/3-5/14/27, and the unlocked two-week "Strike Break" from 5/10/27 with a typed
    "Strike wk 2" and a colour on 5/17.
  - `origin/main`: 5/9 (N1 N2 F1 P1 red). The one-liner mutant: 8/9 (P1 red). The fix: 9/9.
  - `mvdragcarry` W1 now also holds the plain band labels: red on `origin/main`, 15/15 on the fix.

## 6. The other ways considered (the first answer, kept as the record)

- **An up/down knob on a selected phase in the grid**, beside the swap knobs: the best DRAG form. It needs a hit test
  for the week row under the pointer (years sit side by side), and a preview-then-commit, because a live redraw can
  move columns under the pointer.
- **Alt+↑/↓ on a selected grid cell:** cheapest; kept as the keyboard half of §3.
- **"Just this phase" in the merged Shift tool:** the non-drag twin. Not proposed here.
- **Rejected:** dragging the run's top/bottom edge (collides with the row resize handles, and reads as a resize);
  Option-drag or a move mode (invisible, and fails "keep the app simple").

## 7. Owner calls — ALL RULED, 4 Nov 2026

| | Call | ✅ Ruled | How | Not chosen |
|---|---|---|---|---|
| D1 | Which way ▲ goes | **Earlier** (up the waterfall) | Picker, as recommended | Later, like a number box |
| D2 | Where the arrows sit | **C2, inside the box** (first D, beside it) | *"lets go with D"*, then, on the real card at three widths, *"C2, but make sure the buttons aren't actually touching the top or bottom lines of the box"* | A, B, C, D, E, F |
| D3 | When they show | **Always** | Follows from D | On pointing at the card |
| D4 | A burst of clicks | **One undo step** | Picker, as recommended | One per click |
| D5 | The "Pulled 2 wks" label | **Keep** | Picker, as recommended | Drop |
| D6 | "Waterfall only" | **Waterfall only**; the date change shows in both views | The owner's own words | Shown in both views |
| D7 | The month drag (§5) | **Yes, as its own change after the arrows** | Picker, as recommended | In the same build; leave it |
