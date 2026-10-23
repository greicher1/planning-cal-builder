# WATERFALL-CONTEXT-MENU-PLAN.md

**Status: BUILT AND GATED 23 Oct 2026** on branch `claude/goofy-austin-fa2c05` (`d4e5654`; full gate 2,976 / 2, both
fails load timeouts green alone), not merged, not pushed. §10 has
what the build changed from this plan. Tracker card `waterfall-right-click-menu`.
**Mockup:** [`mockups/waterfall-context-menu.html`](mockups/waterfall-context-menu.html) (22 Oct 2026). ⚠️ The mockup is the
LONG menu the owner then cut down (§1). Read §2 of this plan for what is built, not the mockup.
**Written against:** `8cc8357` (the 23 Oct landing, live at `b7d5307`).
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) → [`MONTH-CONTEXT-MENU-PLAN.md`](MONTH-CONTEXT-MENU-PLAN.md)
(the month day menu, whose engine this reuses) → [`WATERFALL-KEYS-PLAN.md`](WATERFALL-KEYS-PLAN.md) (the clipboard
actions this calls) → [`UI-CONVENTIONS.md`](UI-CONVENTIONS.md) §6, §6a and §10.

---

## 1. The request, and the cut

Item 5 of the owner's "what Excel features are we missing" list (22 Oct 2026): a right-click menu on waterfall cells.
A mockup was built and four questions were ruled the same day (HANDOFF, "THE EXCEL-GAPS LIST…"):

- **R1** the clipboard row (Cut · Copy · Paste · Clear) stays at the top, as Excel's Paste Options row;
- **R2** Clear can remove an automatic note (stored as the explicit clear, `userNotes[week] = {text:''}`);
- **R3** the Size section stays (reset row height / column width);
- **R4** the last line is *Show this DAY in the month view* on a dated note or a holiday line, *Show this week*
  everywhere else.

Then, before any code, the owner (23 Oct 2026, in chat):

> *"I want you to be more cautious in adding extra buttons to the right click menu. I want you to think very carefully
> about which buttons we actually need in each right click menu. For example, we really dont need the swap collumn
> feature in the right click menu. We dont need an add notes button at all. right now the right click menu especially
> on phases is huge"*

The mockup's phase-week menu ran to about 17 lines. This plan cuts it to four.

### 1.1 The test every item had to pass

An item is in the menu only if **both** hold:

1. it is what someone reaches for on **that** cell, and
2. the cell has **no one-gesture way** to do it already.

The gestures that already exist on a waterfall cell, and so knock items out:

| Gesture | Already does |
|---|---|
| double-click a Notes cell / a hiatus band / a heading | edit the note / rename and recolour the band / edit the heading |
| double-click a phase cell (or a highlighted block) | expand into the empty columns beside it, or pull back |
| ⌥← / ⌥→ on a selected run | swap its column |
| Delete, ⌘X / ⌘C / ⌘V | clear / cut / copy / paste notes |
| drag a highlighted note | move it to another week |

### 1.2 What the cut removed from the mockup, and why

| Removed | Why |
|---|---|
| Swap column left / right | The owner, by name. ⌥← / ⌥→ do it. |
| Add note | The owner, by name ("at all"). Double-click the Notes cell. |
| Edit note…, Rename or recolour…, Edit column headings… | Double-click does each. |
| Expand cells | Double-click does it (and the grid's own hint says so). |
| Colour…, Show in Phases card (phase and hiatus) | The sidebar row's own controls. |
| Note colour… | The note editor's colour row. |
| Lock in place | The hiatus row's own box in the sidebar. |
| The holiday section (Enabled, Show in month view, Show in waterfall) | A holiday belongs on its own DAY, and the month view's day menu has all three there. On a holiday line, *Show this day in the month view* (R4) lands on that day. |
| A menu on the column headings | Double-click edits a heading. A hand-set column width is reset from any cell in that column (§2). |
| The footer line ("Shift + right-click opens the browser's own menu") | Nothing in the grid needs the browser's menu; Shift + right-click still opens it, unadvertised. |

---

## 2. What the menu is

**One menu, for the cell under the pointer** (or for the whole highlight, when the right-click lands inside it). A
header names the week and what is in it, for example "Week of Mon 6 Jul 2026 / Production wk 2 · Ep. 101". Then:

| Cell right-clicked | Items, in this order |
|---|---|
| **A phase week** | **Start ‹phase› this week** · **End ‹phase› this week** · Add 1-week phase here · Add hiatus ▸ · *Size* · Show this week in the month view |
| **A Notes cell** | **[Cut] [Copy] [Paste] [Clear]** · Back to automatic text · *Size* · Show this day / week in the month view |
| **A hiatus band** (all-phase, or one phase's own) | Remove hiatus… · *Size* · Show this week in the month view |
| **A date, an empty cell, or Sim Post** | Add 1-week phase here · Add hiatus ▸ · *Size* · Show this week in the month view |
| **Inside a highlight of several cells** | [Cut] [Copy] [Paste] [Clear] (when the highlight holds a Notes cell) · *Size* · Show this week in the month view |
| **A column heading, the title block, a padding row** | no menu: the browser's own |

*Size* is **Reset row height** and/or **Reset column width**, each shown only when that row or column was resized by
hand (§3.8). On a typical phase week the menu is the header plus four lines plus the way out.

### 2.1 ✅ Ruling R6 (owner, 23 Oct 2026, by picker): an item that cannot act on the cell is LEFT OUT

*"Leave it out"*, over *"grey it with its reason"*. So:

- the clipboard row shows only where it can act: on a Notes cell, or inside a highlight that holds one. (The clipboard
  actions act on notes only: WATERFALL-KEYS-PLAN ruling Q1, "nothing else touched".)
- *Size* shows only after a hand resize;
- *Back to automatic text* shows only on a note that has an automatic text and differs from it.

**Start and End stay as a pair**, greyed with their reason when one is refused (End Production: "Its end comes from
the shoot days", the month menu's ruling Q3; "It already starts this week"; "It already ends this week"). That is the
standing greyed-with-reason rule (owner ruling 1, 18 Sep 2026), kept for the one place where an item missing from a
pair would read as a bug.

Inside the clipboard row, the four buttons are one unit: on a Notes cell all four show, and Cut / Copy / Clear are
greyed when no highlighted note shows text, with the reason as a line under the row ("The note is empty").

### 2.2 ✅ Ruling R5 (owner, 23 Oct 2026, by picker): a week offers Add 1-week phase here and Add hiatus ▸

*"Both"*, over *"Neither"* (recommended) and *"Add hiatus only"*. The question was asked about a phase week. **This
session's call, cheap to change:** the two also show on a date, an empty cell and Sim Post (the same week, and an empty
cell is where a new phase most naturally goes), and NOT on a Notes cell or a hiatus band, whose menus are about the note
and the band.

### 2.3 ✅ Ruling R7 (owner, 23 Oct 2026, by picker): trim the month menu too, as its own task

*"Trim the month menu too"*. Once this is built, the month view's day menu gets the same test (§1.1) as a separate task
with its own short list for the owner to approve. Tracker card `month-menu-trim`. Not this branch.
✅ **Done, 23 Oct 2026** (MONTH-CONTEXT-MENU-PLAN.md §13, rulings T1–T4, branch `claude/adoring-chaum-0206c1`, which
carries this branch merged in). Two things there touch this menu: the month menu now closes on scroll by this menu's rule
(§10 item 1), and *Move ‹phase›'s hiatus here*, in the Add hiatus ▸ submenu both menus share, is left out rather than
greyed in the week its hiatus already starts (this plan's own R6).

---

## 3. Each item, and what it calls

Every item is ONE undo step (pushUndoSnapshot() before and after, the month menu's idiom), except the way out, which
is a view switch and banks NONE (the `undo-keys` rule, 22 Oct 2026).

### 3.1 Start ‹phase› this week (a mover)

- On a phase week only, never on a band. Moves the phase by **whole weeks** so its first week is this row. Its weekday
  and its length stay: a phase that started on a Wednesday starts on this week's Wednesday. That is the month menu's
  "Start here" (a mover: "Moves it. Its length stays"), in the waterfall's unit, the week.
- **Calls** `setPhaseStart(key, iso)`, the one writer for movers, so a Dates phase's end moves with it.
  ⛔ Production runs inside `asShootDayMove()` (owner ruling R2, v1.3.1): its day marks travel by shoot-day number.
- R5 of the auto-note work: an edited automatic note follows its date (`autoNoteBaseline` /
  `reapplyAutoNoteBaseline`), as the month menu's Start here does.
- **Greyed** "It already starts this week" when this row is the phase's first (`type:'phase'` row of the whole
  calendar, `wholeCalendar()`, so a calendar range cannot hide the real first week).
- ⚠️ Offered on the phase's own cells only, so it moves a phase LATER (or nowhere). Moving earlier is the month view's
  drag, the shift tools or the sidebar. The month menu has the same shape and the owner accepted it there.

### 3.2 End ‹phase› this week

- **Production: greyed**, "Its end comes from the shoot days" (month ruling Q3).
- **Weeks:** keeps its start and its unit, and gets a new week count. A waterfall row is a whole week, so no unit
  switch is needed (the mockup's promise; the month menu switches Weeks to Dates only because a DAY is not a whole
  number of weeks). The count drops by the phase's `type:'phase'` rows after this one (a paused week is not one, so a
  hiatus inside the phase is stepped over as the scheduler steps over it). Then `update()`, and the scheduler's own
  verdict: if the phase's last row is not this one, the fields are put back (`phaseEdgeLanded`'s reason: a silent
  wrong date in someone's plan is the outcome to refuse).
- **Days / Dates:** the end handle's own rule. `phaseEdgePlan(key, 'end')`, then the LAST day of this week the phase
  can be drawn on (`plan.lands`, scanning back from Sunday), `phaseEdgeWrite`, `update()`, `phaseEdgeLanded`, put back
  on a disagreement. The same calls the month menu's End here makes.
- **Greyed** "It already ends this week" on the phase's last row, and "It can't be shorter than one week" where the
  count would reach 0.
- Offered on the phase's own cells only, so it SHORTENS (or does nothing), as §3.1's note says.

### 3.3 Add 1-week phase here

- The month menu's own `addPhaseHere(ctx, 'week')` with the week's **Monday** as the day, so Snap to Mon stays on and the
  phase is the week. The sidebar switches to Phases with the cursor in the new row's name box. The row's ids are
  exactly + Add phase's.

### 3.4 Add hiatus ▸

- The month menu's own submenu (`hiatusSections`): **All phases** (`addHiatusRow(monday, 2)`), then one item per phase
  running that week, "‹phase› only", or "Move ‹phase›'s hiatus here" on a phase that already has one (month ruling Q2).
- ⚠️ "Running" changes for the waterfall: a phase runs in a week when it overlaps the Monday-to-Sunday span, which is
  the scheduler's own row test (`computeSchedule`, audit H-3). The month menu asks about one day. So `hiatusSections`
  takes the span length from its context (1 day or 7), and the month menu's answers are unchanged.

### 3.5 [Cut] [Copy] [Paste] [Clear]

The `wf-keys-paste` actions, on the highlight as it stood when the menu opened (`keys`):

- **Copy:** `wfNotesCopy(keys)`, then `navigator.clipboard.writeText(clip.text)`. `wfNoteClip` keeps the look, so a
  paste of the same text back into SPTCal brings it.
- **Cut:** `wfNotesCopy(keys)`, then the clipboard write, then `wfNotesClear(keys)` **only if the write succeeded.**
  ⚠️ Deliberately not `wfNotesCut()`, which clears first: a menu's write goes through the async clipboard, which can be
  refused, and a cut whose copy never landed would lose the note. (The ⌘X path writes through the clipboard EVENT,
  which cannot fail that way, so it keeps `wfNotesCut()`.)
- **Paste:** `navigator.clipboard.readText()` (Chrome asks permission the first time), then `wfNotesPaste(text, null,
  keys)`. A menu's paste has no clipboard event, so no SPTCal data type; `wfNoteClip` brings the look back when the text
  matches the last copy. A refused read says so on the grid ("Paste needs clipboard access: press ⌘V instead").
- **Clear:** `wfNotesClear(keys)`. On an automatic note this is R2's explicit clear.
- Each is one undo step (`wfNoteStep`). Copy changes nothing and banks nothing.

### 3.6 Back to automatic text

- On a Notes cell whose week has an automatic note and a stored override (an edit, or R2's clear). Deletes
  `userNotes[week]` through `wfNoteStep`, so it is one step and renders once. Text only: the note's highlight and style
  stay, as they would under the note editor. Reset Notes does every week at once; this is the one week.

### 3.7 Remove hiatus…

- On an all-phase band: the covering `#hiatus-list` row (the month menu's `bandSpan`), then the month menu's own
  `removeHiatusHere(row)`: the row's question first ("Remove this hiatus?", month ruling Q4), one undo step after the
  answer. Two hiatuses over one week get one item each, named by their dates.
- On a phase's own band: `removePhaseHiatusHere(key)`, no question (unticking it in the sidebar asks none).

### 3.8 Size: Reset row height · Reset column width

- Exactly what a double-click on the frozen resize handle does (`installGridResizers`' dblclick), written from outside:
  delete `rowHeights[r]` and `rowHeightsByWeek[weeks[r]]`, or `colWidths[ckey]` for each column the cell covers
  (`colgroup col[data-ckey]`), then `render()`. Banked as one step.
- Inside a highlight: every hand-set row and column the highlight covers, as one step.
- Shown only when there is something to reset (R6).

### 3.9 Show this day / week in the month view (R4)

- **The day:** on a Notes cell, the first line of the text the cell shows whose trailing date falls inside the note's
  week (the rule `notesForWaterfallDate` places lines by), else the note's pinned day. A holiday line ("Thanksgiving
  11/26/26") is such a line, so a holiday shown in a Notes cell lands on its day. Everywhere else, the week (its
  Monday to Sunday).
- `monthCursor` to that month, then `setViewMode('month')`. **No undo step** (the view switch rule). The day, or the
  week's days, are ringed for a moment by a body-level ring laid OVER the cells (`.day-menu-ring`, the class the month
  menu already rings a day with), never written into the frozen month grid. It fades and goes, and goes at once on a
  scroll or a render.

---

## 4. How it fits without a frozen edit

⭐ **Nothing on the frozen list changes.** The menu reads `#table-wrap`'s waterfall for WHERE things are (the cell under
the pointer, its `data-week` / `data-pkey`, its row's `data-row`, its columns' `data-ckey`) and the schedule for every
fact. It writes only stores that already exist and already save, and calls `render()` / `update()`.

- **One engine with the month menu.** It is built inside `installMonthDayMenu`: the panel, its look, the submenu, the
  keys and the close rules are shared, and the waterfall adds its own context reader and sections. The `mvmenu` leg
  guards the shared half.
- **The listener** is the month menu's `contextmenu` listener on `document` (bubble phase, `preventDefault` on that
  event only, never `stopPropagation`). In the waterfall it acts when `viewMode === 'sheet'`, not Shift, and the point is
  on a body cell of `#table-wrap .sheet-table` (`hitTextCell`, which walks past the resize handles and stops at any
  body-level panel). A heading, the title block, a padding row and anything outside the table get the browser's menu.
- **The highlight first.** Outside the highlight, the right-clicked cell becomes the highlight (as a plain click would,
  and the phase selection is retired as a plain press retires it). Inside it, the highlight stays and the menu acts on
  all of it. An empty cell has no text key, so the highlight is cleared. Done BEFORE the panel opens, and its records
  dropped from the close observer.
- **Close on render, only.** The month menu closes on any mutation under `#table-wrap`. In the waterfall the highlight,
  the phase selection and the swap verdicts paint layers inside `.sheet-grid-wrap` at any time, so the waterfall menu
  closes only on a DIRECT child change of `#table-wrap` (a render), the rule every waterfall observer already follows.
- **Capped at the window height, and scrolls inside** (`max-height`, `overflow-y:auto`, `overscroll-behavior:contain`
  on `.day-menu`, so the month menu gets it too). The close-on-scroll listener already skips a scroll inside the menu
  (`inMenu`).
- **No id on any control**, no `.mv-*` or `.sheet-*` class. `.day-menu` is already in `OVER_PANEL` and in
  `buildSavedHtml`'s strip list.
- ⚠️ **macOS Ctrl+click.** Chrome sends a button-0 press with `ctrlKey`, then `contextmenu`. The text highlight and the
  phase selection treat Ctrl as ⌘, so the press would toggle the cell OUT of the highlight under the menu. Both pointer
  handlers return early on `isMacCtrlClick(e)` (neither is frozen). ⛔ Proven with synthetic events only; the OS half
  needs a real trackpad.

---

## 5. Keyboard

The month menu's: ↑ ↓ move, → opens a submenu and ← closes it, Enter / Space choose, Esc closes, Tab closes. Plus the
clipboard row: ← → move along it, ↓ leaves it. The menu opens on the first line BELOW the clipboard row, so Enter on a
fresh menu never cuts or clears.

---

## 6. Save format: nothing new

No snapshot key, no id'd control, no version bump. Every item writes a store that already saves: the phase rows'
fields, `customPhaseDefs`, the hiatus rows and `phaseHiatuses`, `userNotes` / `noteColors` / `noteFontSize` /
`textStyle.note`, `rowHeights` / `rowHeightsByWeek` / `colWidths`. Opening and closing the menu leaves `fields.byId`
exactly as it was. `monthCursor` is session UI and was never saved.

---

## 7. Rulings

| # | Question | Ruling |
|---|---|---|
| ✅ R1 | Clipboard row at the top, or inside the Note section? | **Top** (22 Oct 2026). |
| ✅ R2 | Can Clear remove an automatic note? | **Yes**, as the explicit clear (22 Oct 2026). |
| ✅ R3 | Keep the Size section? | **Keep** (22 Oct 2026). Shown only when there is something to reset (R6). |
| ✅ R4 | The way out | **Show this day** on a dated note or holiday line, **Show this week** elsewhere (22 Oct 2026). |
| ✅ C1 | (in chat, 23 Oct 2026) | **Be cautious: no Swap column, no Add note; the phase menu is too big.** §1. |
| ✅ R5 | Add hiatus / Add 1-week phase on a week? | **Both** (by picker, 23 Oct 2026). |
| ✅ R6 | An item that can't act: leave out or grey? | **Leave it out**; Start / End stay a greyed pair (by picker, 23 Oct 2026). |
| ✅ R7 | Trim the month menu the same way? | **Yes, as its own task** after this one (by picker, 23 Oct 2026). |

This session's calls, each cheap to change: Start moves by whole weeks keeping the weekday (§3.1); End keeps a Weeks
phase in Weeks (§3.2); the two add items also show on dates, empty cells and Sim Post (§2.2); Cut writes the clipboard
before it clears (§3.5); Back to automatic restores text only (§3.6).

---

## 8. Steps

1. **The engine, shared.** `installMonthDayMenu` learns a second context (the waterfall cell), the clipboard row
   (`strip` sections and their keys), the render-only close rule, and the height cap. `hiatusSections` takes a span.
   The Mac Ctrl guard on the two waterfall press handlers.
2. **The sections** of §2 and the items of §3.
3. **The leg** `wfmenu` (below), red on the pre-change build.
4. **The gate**, then HANDOFF, README, the tracker.

---

## 9. The gate

- **Every frozen output identical**: the full `tests/harness/gate.sh`, no re-cut. The menu changes no cell, no width
  and no writer.
- **New leg `wfmenu`** (`?test=`, `halfdays.sptcal`, in `gate.sh`'s audit-fix block beside `mvmenu`). Every
  right-click is dispatched on `document.elementFromPoint()` at a point on the cell (mvmenu's rule: only hit-testing
  proves a user can reach it). It asserts, per cell kind, the exact item list of §2 (so a returning Swap or Add note
  is red), Start / End greyed with their reasons, each item's effect and its ONE undo step, the way out banking NONE
  and ringing the day / week, Cut keeping the note when the clipboard write is refused, the highlight rule (outside
  re-highlights, inside acts on all), no menu on a heading, Shift + right-click left to the browser, a render closing
  the menu while a highlight repaint does not, a scroll inside the capped menu not closing it, no id in the menu, and
  `fields.byId` unchanged by opening and closing it.
- **`mvmenu`** must stay green: it guards the shared engine (and `hiatusSections`' one-day answers).
- **`wfkeys`, `wfkeysreal`, `textstyle`, `undokeys`** stay green: the Ctrl guard touches the highlight's press.
- **`npm run check`.** The menu loads nothing, so the CSP is untouched.

---

## 10. As built (23 Oct 2026, `d4e5654`)

Everything in §2 and §3 as written, inside `installMonthDayMenu` (`wfContextAt`, `wfPrepare`, `wfMenuSections` and
the `wf*` items beside the month menu's own). Where the build differs or adds:

1. ⚠️ **The close-on-scroll rule had to change for the waterfall menu.** Measured in the `wfmenu` leg: Chrome
   delivered scroll events LATE (under headless virtual time), after the menu had opened. One reported the grid's
   box at exactly the scroll position it had at the right-click; another came from the SIDEBAR, settling after an
   earlier step's undo. Each closed the menu under the pointer, a different case each run. So the open waterfall
   menu remembers where every box around its cell stood (`scrollBoxes`), and only a scroll that MOVED one of them
   closes it (`movedSinceOpen`). A sidebar scroll moves no cell. In the app pane, a real browser, no scroll fired
   after a right-click on any of four kinds of cell, so users never saw it; the rule is robustness, not a fix for
   something they hit. ~~⛔ **The month menu keeps "any scroll outside it"**: its `mvmenu` C1 dispatches an unmoved
   scroll and expects a close, and the place to change a live menu is its own trim (tracker `month-menu-trim`).~~
   ✅ **The month menu takes this rule too since its trim** (owner ruling T4, 23 Oct 2026, MONTH-CONTEXT-MENU-PLAN.md
   §13): one rule for both menus. `mvmenu` C1 now scrolls the month's panel for real and expects a close; C4 holds that
   an unmoved event and a sidebar scroll leave it open.
2. **Render-only close.** As planned (§4): the waterfall menu closes only on a direct child change of `#table-wrap`.
3. **One more item kind in the header:** inside a highlight of several cells the header reads "N cells highlighted"
   and "Weeks of … – …".
4. **`mvmenu` G3 flipped.** It asserted that the browser kept its own menu in the waterfall; it now asserts that a
   right-click there opens the WATERFALL menu (`data-view="sheet"`, no `data-day`), never the day menu.
5. **Help:** one sentence at the end of "Moving around, and moving notes" in `src/index.html`.
6. **The `wfmenu` leg** (38 cases) waits for scrolling to go quiet before each right-click, and records any
   prevented right-click that left no menu in `out.lost`; that record is how item 1 was found. It stubs
   `navigator.clipboard` (headless Chrome grants neither read nor write). Red on the pre-change build
   (`d2ac914e…`, the live file): it stops at V1, no menu.
7. **Not done, deliberately:** no mutants beyond the pre-change build. The exact item lists (H-cases) are what holds
   the owner's cut.
