# MONTH-ORDER-PLAN.md: drag bars and notes up and down in the month view, and see what you drag

**Status: §1–§8 BUILT AND LIVE (22 Oct 2026, `ff128dd`).** Rulings R1–R4 by the owner's picker on 21 Oct; R4
approved frozen edits E1 and E2 with the gate in §6. **§9 (23 Oct 2026) is round two**: the owner's bug report and
two new asks, two more frozen edits (E3, E4) approved by picker, built on branch `month-drag-fix`. Nothing is merged
or pushed without asking.

Owner, 21 Oct 2026:

> *"we need the ability to drag and reorder how phases and notes are sorted up and down on the month view"*

and, while this was being mapped:

> *"I think we actually need to see the phases/notes visibly dragged animation when we drag either for the purpose of
> reordering them top to bottom or for changing a phases timing"*

On the tracker as `month-reorder` and `month-drag-preview`.

⚠️ **Not to be confused with** the sidebar phase-list reorder (the ⋮⋮ handles in the Phases card, HANDOFF §"№3 phase
reorder", still unbuilt) or the waterfall's column swap (COLUMN-ORDER-PLAN). This plan changes only the month view's
TOP-TO-BOTTOM order, and with it the month PDF. The waterfall, Excel, the waterfall PDF and the sidebar never read it.

---

## 1. How the month view stacks things today

All of it is in frozen `renderMonthView`, per week row:

1. **All-phase hiatus bands** first.
2. **Phases, by start date** (`laneSegs = segs.slice().sort((a,b)=> a.start - b.start)`). Each phase brings its own
   pieces with it: Production's episode pills, and the phase's own hiatus band.
3. **Sim Post.**
4. **Notes last**, day by day: the waterfall's lines for that day (`notesForWaterfallDate`), then the day's own notes
   in `dayNotes[iso]` array order.

Each item takes the FIRST lane where all its columns are free (`takeLane`). So order is priority, not position: two
phases only stack where their days overlap. A Prep that ends Tuesday and a Production that starts Wednesday share
lane 0 whatever their order.

⭐ **The month-PDF writer follows the screen's order by itself.** `buildMonthLayout` parses `renderMonthView`'s HTML
and `mvlPackLanes` re-packs every week in DOCUMENT order, which is placement order. So changing the order in which
`renderMonthView` places things changes the PDF the same way, with no writer edit. §6's new leg proves it.

⚠️ **Why the bar itself can't be the reorder handle.** Pressing a phase bar and dragging already moves its dates
(`installMonthPillDrag`): sideways is days, and one row up or down is a week (owner, 18 Sep 2026, "drag day by day").

## 2. The rulings (owner's picker, 21 Oct 2026)

| | Question | Ruled |
|---|---|---|
| R1 | How do you grab a bar to reorder it? | **A grip on hover.** A ⋮⋮ grip appears on the bar, beside the start grip. Drag the grip up or down to reorder. Dragging the bar's body still moves dates, unchanged. |
| R2 | Can a note go above the bars? | **Yes.** A note can be dragged to the top of its day. A bar crossing that day then drops a line for that week. (The option said this is a second frozen edit; see §6.) |
| R3 | While a phase is dragged to new dates, what does the calendar under the moving copy do? | **Update live**, as it does now, so the landing spot is always the truth. |
| R4 | The frozen edits | **Approved with the gate** in §6. |

## 3. What it does

### 3.1 Phase order (R1)

- Hover any phase bar that carries `data-ph` (phases, Production's episode bars, prep bars) and a **⋮⋮ grip** appears
  inside its **left** end, just right of the start grip's 10 px, on the bar's own fill, so it covers the label's
  first letter while hovered. ⚠️ It was first built at the right end to spare that letter; the owner moved it back
  the same evening: *"Move the reorder grip to the left end, beside the start grip, even though it covers the first
  letter of the label while hovering."* Sim Post and hiatus bands get none. Bars under 46 px get no grip rather than
  one over the start grip.
- Drag the grip **up or down**. A copy of the bar lifts and follows the pointer vertically (§3.3). As it passes the
  middle of another phase's bar in that week, the order changes and the calendar redraws live: the real bar is
  always where it will land.
- **One order for the whole calendar** (default D1). Moving Production above Prep in March moves it above Prep in
  every week where they overlap, on screen and in the month PDF. That keeps the rule the frozen comment states, "a
  phase sits at the same height all month", which is what lets the eye follow a bar across weeks.
- **What a drop means.** In the week being dragged in, the phases present are listed top to bottom by lane. The
  dragged one moves in that list, and the global order puts it right before the phase it now sits above (or right
  after the one it now sits below). Phases not in that week keep their places.
- **Back to date order:** the bar's right-click menu gets "Back to date order", shown only while an order is set.
- Episode bars, prep bars and a phase's own hiatus band move with their phase, as they are placed with it today.
- The all-phase hiatus band stays on top of the phases and Sim Post stays under them (default D2).

### 3.2 Note order (R2)

- **Press a note and drag it up or down** within its day. Notes have no drag today, so no grip is needed. A click that
  does not move still opens the editor, exactly as now (it opens on `click`; a drag swallows the click that follows).
- A note can be dropped **among that day's notes**, or **above the bars**, at the top of the day. A note on top is
  placed before everything in that week row, so every bar crossing its day drops one line for that week (R2's own
  wording). Dropping it back below the bars puts it back.
- **Both kinds of note drag:** a day's own notes, and the waterfall's lines shown on that day (auto-notes such as
  "Start Principal Photography", and a waterfall edit's lines).
- **A note's place travels with the note** (default D3):
  - An own note is dated and never moves, so its place lives in its own entry (§5).
  - A waterfall line moves when its phase moves. Its place is keyed by its text with the trailing date removed, so
    "Start Principal Photography" stays on top when Production is dragged a day later. Editing the text drops the
    place, and the line goes back to its default spot (first under the bars), which is never wrong, only default.
  - Two waterfall lines on one day with the same text share one place. That is acceptable.
- Not in scope: dragging a note to ANOTHER day (D4). It is a separate feature if wanted.

### 3.3 The moving copy (owner's second message; R3)

- **Every month-view drag shows a copy of what is being dragged, following the pointer**: a reorder (vertical only),
  a note (vertical only, in its day), a phase's body drag (both ways, as the drag reads both), and the hiatus body
  drag (default D5). The copy is lifted: a shadow, the item's own fill, text and size, slightly see-through.
- The calendar underneath keeps redrawing live (R3). The copy is what your hand holds; the redrawn bar is where it
  lands.
- ⚠️ **D6 dropped while building:** the start and end grips (phases, Production, prep, a hiatus's first and last
  week) keep stepping with their edge a day (or week) at a time. That is how a resize normally feels, the edge and
  its grip stay together, and `pilldrag`/`phaseedge` read a grip's position mid-gesture. The moving copy is for
  MOVES: a reorder, a note, a phase's body drag, a hiatus band's move.
- **The copy is body-level chrome, never inside `#table-wrap`** ("anchored to, never injected into"). It is built at
  the press from the item's measured box and computed style, because the live redraw destroys the element it came
  from. It reads the box with `getBoundingClientRect()`, which already includes the calendar zoom, and scales its
  font size by `currentCSSZoom`.
- It, and the grip, join the shareable copy's strip list in `buildSavedHtml`, beside `.phase-edge-handle` and
  `.hiatus-grip`, for the same reason those are there: a ⇧⌘E export can fire mid-hover.

## 4. Defaults taken (each reversible in one place; tell me to change any)

| | Default | Why |
|---|---|---|
| D1 | One phase order for the whole calendar | The stable-lane rule above; per-week order would make a bar hop rows |
| D2 | The all-phase hiatus band stays on top of phases, Sim Post under them | Neither has a grip; both are bands, not phases |
| D3 | A note's place travels with the note (own notes in their entry; waterfall lines by text) | An auto-note on top should stay on top when its phase moves |
| D4 | Notes move up and down within their day only | The ask was up and down |
| D5 | The hiatus body drag gets the moving copy too | "all drags feel the same" |
| D6 | ~~Start/end grips glide between days~~ **Dropped** (§3.3): a resize keeps its grip on its edge | — |
| D7 | A phase added after you reorder goes in by date: right after the ordered phase that comes before it by start date (top if none) | Keeps a new phase near where date order would put it |
| D8 | Deleting a custom phase removes its key from the order | No dead keys in the file |

## 5. Save format (calendar data, in `captureSnapshot()`)

- **`mvPhaseOrder`**: an array of phase keys, top to bottom. Written only while an order is set; **absent = date
  order**. Restored unconditionally (`Array.isArray(snap.mvPhaseOrder) ? … : []`), cleared by New, carried by undo
  and the crash backup like everything in the snapshot. Not date-keyed, so the shift tools leave it alone.
- **`top: true`** on a `dayNotes[iso]` entry (beside `text`, `lane`, `color`): that note sits above the bars.
  Written only when true. Order among a day's own notes is the array's order, which is already saved.
- **`mvWfNotePlace`**: `{ "<line text without its date>": { top?: true, at?: n } }`: whether a waterfall line sits
  above the bars, and after how many of that group's own notes (absent = 0, first). Written only while non-empty.
- **No `SNAPSHOT_VERSION` bump.** An older build ignores all three, so a newer file opens there in date order with
  notes under the bars, which is today's look, never a misreading (the `'onhalf'` precedent).
- `sanitizeSnapshot()` validates each (keys are strings matching a phase key's shape; `top` is `true` or dropped;
  `at` a small non-negative integer; text keys capped in length and count), and the `hostile` leg gets cases.
- No new id'd control. The grip and the copy carry no id, so nothing enters `fields.byId`.

## 6. The frozen edits (approved, R4) and the gate

| | Edit in `renderMonthView` | Inert when |
|---|---|---|
| **E1** | `laneSegs` comes from `mvLaneOrder(segs)`, a helper outside the frozen code. With no `mvPhaseOrder` it returns `segs.slice().sort((a,b)=> a.start - b.start)`, the same expression. | No order is set: every calendar ever saved |
| **E2** | The notes loop asks `mvDayNoteBlocks(schedule, d, group)` (outside the frozen code) for each day's notes in order, once for `'top'` BEFORE the hiatus bands and once for `'below'` where the loop runs today. Each block is placed with exactly the class, style, title, text and `data-note-*` attributes it gets now. With no places set, `'top'` is empty and `'below'` is the waterfall lines then the own notes in array order: today's loop. | No note has a place: every calendar ever saved |

Pattern: the one the "Number Production Days" edit used, "the rule lives outside the frozen code". Neither edit adds
an element, class or attribute; they only change WHICH item is placed first.

**The gate (R4):**

1. **Gates 10 and 13 byte-identical on every baseline**: the month print documents and the written month PDFs. No
   baseline has an order or a place, so any byte that moves is a bug.
2. **A new leg, `mvorder`**, on a fixture where phases overlap and a day holds several notes: set an order and places
   (through the real gestures, CDP mouse), then assert
   - the screen's lane order,
   - the writer's lanes (`buildMonthLayout`) stack in the same order,
   - a save → load round trip keeps it, undo takes it off in one step, New clears it,
   - an older calendar (`v1.0.0-saved.html`, `restore`) opens exactly as before,
   - a click on a note that did not move still opens the editor,
   - the copy and the grip exist only during a hover or drag, never inside `#table-wrap`, and never in a shareable copy.
3. **`pilldrag`, `phaseedge`, `hiatusdrag` (the three CDP gesture legs, `tests/harness/*.mjs`), `monthnotes` and
   `monthdragundo`** unchanged: the moving copy must not change a single day a drag lands on. `mvorder` is a CDP leg
   too, beside them.
4. The full `gate.sh` before any push (frozen edits and the save format; GATE POLICY).

## 7. Things that could go wrong, and the answer

- **A reorder that does nothing visible.** Two phases that never share a day in a week can't stack, so dragging one
  "above" the other there changes nothing in that week. The drop list in §3.1 only holds phases present in the
  week, and only those that overlap the dragged one, so the grip never offers a move it can't show.
- **The grip on a narrow bar.** At the smallest zoom a one-day bar is about 60 px. Start grip 10 px + reorder grip
  12 px + end grip 10 px still fit. Below that, the grip hides rather than covering the start grip.
- **The live redraw under a reorder drag.** It runs only when the order actually changes, not on every mouse move,
  as the body drag redraws only when the day changes.
- **The phase-outline branch** (`phase-outline`, darker outlines on phase bars) also edits `renderMonthView` and the
  writer, near the pill `place()` calls. E1 and E2 touch other lines. Merge order is the owner's; whichever lands
  second re-runs gates 10 and 13.

## 8. Build order (branch `month-order`, from local `main`)

1. **Phase order, no gesture:** `mvPhaseOrder` (snapshot, restore, sanitize, New, D7, D8), `mvLaneOrder`, E1, and
   "Back to date order" in the bar's right-click menu. Prove gates 10/13 identical, then the writer follows an order
   set through a fixture.
2. **The reorder grip and its drag**, with the moving copy and the live redraw. One undo step per drag.
3. **Note places, no gesture:** `top` on entries, `mvWfNotePlace`, `mvDayNoteBlocks`, E2. Same proofs.
4. **The note drag**, with the moving copy; the click-after-drag swallow.
5. **The moving copy on the timing drags** (body drag, hiatus drag) and the gliding start/end grips.
6. **The `mvorder` leg, `hostile` cases, Help text** (the month view's paragraph on dragging), README changelog,
   HANDOFF, CLAUDE.md's state table (three new keys), then the full gate.

---

## 9. Round two (23 Oct 2026): notes keep their bar, notes between phases, notes to another day

Owner, 23 Oct 2026:

> *"you need to really refine and debug the month view drag to resort order of phases/notes. its buggy and sometimes
> when you move one phase or note it moves others in adjacent days. obviously when you drag a multi week phase up or
> down its going to move that phase to the same position on every week but notes need to be able to individually
> move in or around phases on a per day basis. Additionally, i want the ability to drag notes from one day to another
> and for auto notes or notes with dates, have the date auto adjust"*

On the tracker as `month-reorder-fixes` and `month-note-day-drag`. Built on branch `month-drag-fix`.

### 9.1 The bug, found and measured

Frozen `renderMonthView` places every note FIRST-FIT: an untouched note takes the first free line of its day. So
anything that pushed a week's bars down a line opened an empty line above the bars on the week's OTHER days, and the
notes there rose into it, above the bars. Both triggers, reproduced on synthetic calendars (now
`tests/fixtures/mvdrag.sptcal`):

- **A note drag.** A note put on top of Wed 3/4 pushed Writer's Rm and Pre Prep down a line, and "Tue note" and
  "Thu note", untouched on other days, jumped from under the bars to the top line.
- **A phase reorder.** Prod Prep's grip dragged to the top in the week of 3/15. Being one order for the whole
  calendar (D1), it also re-stacked the week of 3/8, where Prod Prep runs only Thu–Fri: Writer's Rm and Pre Prep each
  dropped a line, and "Mon 9", "Wardrobe" and "Wed 11 a" jumped above both bars.

### 9.2 What it does now

- **An untouched note keeps the bar it sat under.** Once a calendar holds any order or note place
  (`mvIsArranged()`), each month render first asks frozen `renderMonthView` for the UNTOUCHED layout (date order, no
  places; `mvRefMode`, sanctioned pattern 2, "ask the frozen code for the verdict") and reads off, for every note, the
  bar directly above it on its day (`mvReferenceAnchors`). The real render then places that note no higher than the
  line under that bar. A note with nothing above it (on top of its day, or a day with no bars) is placed as it always
  was. Nothing is stored: it follows the dates as they change. Cost: about 6 ms → 15 ms per month drawn, only on a
  rearranged calendar.
- **A note can sit in or around the phases on its own day.** Dragging a note now reads where its copy's middle falls
  among the day's bars and notes: above every bar (`top`, as before), under a phase (`under: '<phase key>'`, new), or
  under every bar (`bottom: true`, new). A bar the note now sits above drops one line for that week, as R2 already
  ruled for `top`. When the drop lands, the day's notes are each written out at the place they are drawn in, so
  nothing else on that day moves either.
- **A note can go to another day** (sideways, or into another week). The day under the pointer is where it goes.
  - A month note (`dayNotes`) moves to the new day. Every date in its text that names its OLD day is rewritten to the
    new one, in the same form (1/6/26, 01/06/26, 1/6/2026); other dates name something else and are left alone
    (`mvRetimeNote`).
  - A waterfall line moves into the new week's WATERFALL note, through the note editor's own writer
    (`saveNoteEdit`), so the Waterfall, Excel and both PDFs say the same thing (`moveWfLine`). Its trailing date, which
    is what places it on a day, becomes the new day's; a line with no date gets one, as the note editor's day picker
    stamps one (`mvRetimeWfLine`). An AUTO-note moved this way becomes an edit of its week's note: "Start Principal
    Photography 6/29/26" dragged to Wed 7/1 reads 7/1/26 in the Waterfall too, and Production itself does not move.
  - **Defaults taken** (each reversible in one place; tell me to change any):
    - **D9** A holiday stays on its day: it is the calendar's, not a note's. It still moves up and down there.
    - **D10** Letting go more than 24 px off the calendar puts the note back and banks nothing, rather than landing it
      on the nearest edge day.
    - **D11** A waterfall line is dropped only into a week the Waterfall has; over any other day it stays on its own.
    - **D12** One place per waterfall line TEXT (without its date), as D3 had: the same line arranged on two days keeps
      the last one's.
- **One undo step per drag**, and out-and-back or Escape banks nothing, as every month drag. Every redraw starts from
  the calendar as it was at the press, so a long drag over many days cannot drift.

### 9.3 The frozen edits (owner-approved by picker, 23 Oct 2026: "Approve with that gate")

| | Edit in `renderMonthView` | Inert when |
|---|---|---|
| **E3** | `takeLane` / `place` take an optional `minLane`, the first lane the search may try; the notes loop passes the block's `minLane` and writes `data-note-anchor="<row index of the bar above>"` on a note that has one. | No order and no note place: every block comes back without either, and the search starts at 0 |
| **E4** | Each phase's iteration records where its bars begin in the row (`notesFrom`) and ends with `placeNotes('u:' + key, notesFrom)`, which places the notes that sit under that phase right after it. | No `under` place: that call places nothing |

The month-PDF writer is not frozen; it gained the same rule in two lines: `mvlParseItem` reads `data-note-anchor`,
and `mvlPackLanes` starts such a note's search at the line under that item as its own re-pack placed it.

### 9.4 Save format (calendar data, no `SNAPSHOT_VERSION` bump)

- `dayNotes[iso][i]`: besides `top: true`, now `under: '<phase key>'` or `bottom: true`, at most one, each written only
  as shown. An older build ignores both, so such a note opens there under the bars, which is today's look.
- `mvWfNotePlace[text]`: besides `top` and `at`, now `under`, `bottom`, and `day` (the ISO day the place was set on).
  The line on `day` keeps the place; only a line that has moved OFF `day` takes it along (D3's "a place travels with
  its note"). A place with no `day` (saved 22 Oct) applies wherever its text appears, as it did.
- `sanitizeSnapshot()` checks each (a phase key's shape, `true` only, an ISO date), and the restore rebuilds the store
  field by field.

### 9.5 The gate

1. **Gates 10 and 13 byte-identical on every baseline** (no baseline has an order or a place).
2. **`mvorder` grows ten cases, M1–M10** (on `mvdrag.sptcal`): M1 and M2 are the owner's two bugs, M3 a note between two
   phases on screen, in the save AND in the written month PDF (the writer's anchor), M4–M6 the three kinds of note to
   another day, M7 a holiday stays, M8 out and back banks nothing, M9 an untouched calendar draws no anchor, M10 a drop
   off the calendar. On the live build (`d2ac914e`) M1–M6 and M8 are red.
3. `pilldrag`, `phaseedge`, `hiatusdrag` unchanged.
4. The full `gate.sh`.
