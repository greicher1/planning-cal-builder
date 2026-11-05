# PHASE-WEEK-ARROWS-PLAN.md: move one phase a week at a time from its card

**Status: RULED, BUILT on branch `phase-arrows` (4 Nov 2026); not merged, not pushed. §5 (the month drag) not started.**
- **Layout D** (owner: *"lets go with D"*): two buttons beside the Starts box, always shown.
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
  (`autoNoteBaseline`). ⚠️ It does NOT move the phase's own hiatus or its `<week>|<key>` stores (§5).
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
> lost a worked holiday otherwise), so `undo()` / `redo()` end a running burst first; and the arrows' 68 px needed
> the date column widened to keep the cards' 112 px date floor, so below a ~348 px sidebar Starts stacks over Length.
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
| D2 | Where the arrows sit | **D, beside the box** | *"lets go with D"* (A was recommended) | A, B, C, E, F |
| D3 | When they show | **Always** | Follows from D | On pointing at the card |
| D4 | A burst of clicks | **One undo step** | Picker, as recommended | One per click |
| D5 | The "Pulled 2 wks" label | **Keep** | Picker, as recommended | Drop |
| D6 | "Waterfall only" | **Waterfall only**; the date change shows in both views | The owner's own words | Shown in both views |
| D7 | The month drag (§5) | **Yes, as its own change after the arrows** | Picker, as recommended | In the same build; leave it |
