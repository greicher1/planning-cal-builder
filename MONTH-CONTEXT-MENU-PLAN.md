# MONTH-CONTEXT-MENU-PLAN.md

**Status: STEP 1 BUILT, 19 Oct 2026** (§10; branch `claude/gifted-ramanujan-f162cf`, gated, not merged). Steps 2–5 are
not built. ✅ **All rulings received 19 Oct 2026, by picker** (§9). ⭐ Ruling L1 makes it more than a right-click menu: **left-clicking a day's number opens the same menu**,
and it replaces the Full day/Off popover.
**Mockup:** [`mockups/month-context-menu.html`](mockups/month-context-menu.html). It shows the real month view with a
working menu on it (§12). It is not the app: each item only describes what it would do.
**Written against:** `6ad9e42`.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) → [`MONTH-VIEW-PLAN.md`](MONTH-VIEW-PLAN.md).
That plan covers the pill drag and the edge handles, which share the month view with this menu. Then read
[`UI-CONVENTIONS.md`](UI-CONVENTIONS.md) §6 (overlays) and §6a (the pointer budget).

---

## 1. The request

Owner, 19 Oct 2026:

> *"If we were to have a right click menu in the month view (when youre hovering over the calendar) what could the
> options be. One i know i want is to right click to add a custom phase starting on the day youre hovering over."*

Then, after a list of options: *"write the plan and build a mockup of the menu"*. And while it was being written:

> *"I think i dont want to add the shift from, anchor to and rebuild from in this right click menu"*

✅ **Ruling M1 (owner, 19 Oct 2026): Shift From, Anchor To and Rebuild From are not in the menu.** They stay in the
toolbar. (The draft had them as an "Adjustments ▸" submenu. Opened with the right-clicked phase and date already
filled in, they would have been the menu's biggest time-saver. That idea is withdrawn, not deferred.)

⚠️ **Shift From takes a phase and a number of weeks, not a date.** Its popover is *phase + N wks + Earlier/Later*.
Only Anchor To and Rebuild From take a date. This matters only if M1 is ever revisited.

---

## 2. What the menu is

**How it opens** (✅ ruling L1, owner, 19 Oct 2026):
- **Right-click anywhere on a day** opens it at the pointer.
- **Left-click on the day itself** opens it under the day number. That means the day-number strip at the top, which
  the frozen CSS already lights up in purple on hover, or anywhere on a hiatus day, which has no "+" slots. **This
  replaces the Full day/Off popover** (`openDayOvPop`). Days outside the shoot, where a click does nothing today, now
  get the menu too.
- **Unchanged:** a left-click on a "+" note slot opens the note editor, a left-click on a note edits it, and pressing
  on a bar drags it.

**One menu, for the day under the pointer.** A header names the day and what is on it, for example
"Wed 8 Jul 2026 / Shoot day 7 · Ep. 202 · Production Week 2". Below the header the sections run in this fixed
order, and each one shows only when it applies:

| Section | Shows when | Items |
|---|---|---|
| *(This day)* | always | Add note · **Add 1-day phase here** · **Add 1-week phase here** · Add hiatus ▸ (All phases / one phase only) |
| *<phase>* | the pointer is on that phase's bar | Start <phase> here · End <phase> here · Colour… · Show in Phases card |
| Note | the pointer is on a note | Edit note… |
| Shoot day N | the day is inside the shoot | the shoot-day popover's own choices, and only those |
| Hiatus | the day is inside an all-phase hiatus | Lock in place ☑ · Show in Phases card · Remove hiatus |
| Holiday · <name> | a holiday falls on the day | Enabled ☑ · Show in month view ☑ · Show in waterfall ☐ |
| *(last)* | always | Show this week in the waterfall |

- **"This day" always comes first**, so the two *Add … phase here* items (the owner's request) are always the second
  and third lines, whatever is under the pointer. A section for the thing that was clicked would ordinarily go first. That was
  rejected because it would make the most-used item move.
- **A choice the app refuses is greyed out with its reason, never hidden.** This is the project's standing rule; owner
  ruling 1 of 18 Sep 2026 is written up in `openDayOvPop`.
- **Double-click a marked day to clear it still works** (`#table-wrap` dblclick, unchanged). It works because a click on
  the day whose menu is open closes the menu, exactly as the popover's toggle does today. The popover's hint line,
  "Double-click a marked day to clear it", moves into the menu's footer on a shoot day.
- **Shift + right-click opens the browser's own menu.** The menu's footer says so.

---

## 3. Each item, and what it calls

None of these needs new state (§7). Several need a private rule lifted out where both the existing control and the
menu can call it, so that the rule exists only once (§10).

### 3.1 Add note

- **Calls** `openMvNoteEditor(anchor, weekKey, dayIso, 'day')`. The anchor is the day's own "+" (`.mv-note-add`).
  The editor takes the new note's lane from `anchor.style.gridRow`. Given any other element it opens nothing, without
  an error.
- **Greyed out on a day inside an all-phase hiatus:** "A hiatus day has no note lanes". The renderer draws no "+"
  there, so there is nothing to anchor the editor on. That is how the month view behaves today; the menu does not
  get round it.
- On a day whose lanes are full there is only the full-day "+" (`.mv-note-add-full`). Check at the build whether it
  opens a new note. If it does not, grey the item out as "This day's note lanes are full".
  ✅ **Checked at step 1 (from the code):** it does. The full-day "+" has no `grid-row`, so `openMvNoteEditor` gives the
  note a null lane and it takes any line. No grey-out is needed.

### 3.2 Add 1-day phase here · Add 1-week phase here (the owner's item)

✅ **Ruling Q1 (owner, 19 Oct 2026): offer both a one-day and a one-week phase.** They are two flat items, not a
submenu, so the most-used thing in the menu takes one click. *(Flat rather than a submenu was this session's call;
it is cheap to change.)*

- **Both call** `addCustomPhaseRow()`. It takes no arguments; the new key is
  `customPhaseDefs[customPhaseDefs.length-1].key`. Then, in the new row:
  - **1 day:** set `unit-<key>` to `dates`, and set both `start-<key>` and `end-<key>` to the day. The end is
    inclusive (`customUnitSpan`), so this is exactly that one calendar day. A Dates phase is never snapped.
  - **1 week:** leave the unit on Weeks, set `start-<key>` to the day and `weeks-<key>` to 1, and untick `snap-<key>`
    when the day is not a Monday.
  - Then both call `update()`, `setSidebarTab('phases')`, scroll the row into view, and focus `name-<key>`.
- ⚠️ **Why Dates and not Days for one day.** A Days phase counts working days from its start
  (`customUnitSpan`, `isUnitWorkDay`). A 1-day Days phase started on a holiday would therefore land on the next working
  day, not "here". A Dates phase covers the day it names.
- ⚠️ **1 day is greyed out on a weekend and inside an all-phase hiatus**, with the reason ("A phase can't be drawn on
  a weekend" / "… inside a hiatus"). `segCoversDate` never draws a non-Production phase on a Saturday or Sunday, and
  `pillRunsForWeek` draws nothing inside a hiatus, so the phase would exist in the sidebar and show nothing on the
  day you clicked. On a weekday holiday it is offered: a Dates phase is drawn there.
- **1 week on a weekend is offered.** It starts that day and its first drawn day is the Monday, which is how every
  Weeks phase that starts on a weekend already looks.
- ⚠️ **The length is part of the item, not optional.** A start with no length is not scheduled
  (`phases[key] = null`): the phase would exist in the sidebar and draw nothing.
- ⚠️ **Snap to Mon must come off on any day but a Monday** (1 week only). It is ticked on a new row, and
  `computeSchedule` moves a ticked phase's start back to its Monday, so the phase would not start "here". The body drag
  clears it the same way (owner, 18 Sep 2026: *"i want to drag day by day"*). *(Starting on the exact day rather than
  that week's Monday is this session's reading of "starting on the day youre hovering over". The owner's Q1 answer did
  not choose between the two.)*
- **The colour** is the new row's default, `customPhaseDefs.length % PHASE_COLOR_OPTIONS.length`, unchanged.
- **No new ids.** The row's ids are exactly the ones `+ Add phase` creates today, so `fields.byId` gains only what that
  button already adds.
- **One undo step**, with the tab switch inside it: `sidebarTab` is saved state, so switching tabs outside the
  bracket would bank a step of its own.

### 3.3 Add hiatus ▸

- **All phases:** `addHiatusRow(iso, 2)`, then `update()`.
  - A hiatus is a start plus a number of weeks, and `computeSchedule` snaps its start to the Monday. So it always
    covers whole Monday-to-Sunday weeks, and the item says "Week of Mon 7 Dec · 2 weeks". That way nobody expects
    it to start mid-week.
  - Locked by default (`addHiatusRow`'s `prefillLocked` left undefined), the same as a row added in the sidebar.
- **One phase only:** one item for each phase running that day.
  - "Running" uses the span rule, `d >= s.start && d < s.end`, rather than the drawn bars. A weekend inside a
    week-based phase therefore counts, although no bar is drawn on it.
  - Ticks `phiatus-en-<key>`, sets `phiatus-start-<key>` and `phiatus-weeks-<key>` (2), then calls
    `refreshPhaseHiatusUI()` and `update()`. This start also snaps to its Monday (`phaseHiatusRanges` in
    `computeSchedule`).
  - ✅ **Ruling Q2 (owner, 19 Oct 2026): on a phase that already has its own hiatus, the item moves it here.** A phase
    has exactly one, so the item reads "Move Post's hiatus here". It sets `phiatus-start-<key>` to the day, keeps
    `phiatus-weeks-<key>` as it is, and leaves the name alone.

### 3.4 Start <phase> here

- **A mover.** It calls `setPhaseStart(key, iso)`, the one writer for movers; it also carries a Dates phase's end
  along. On any day but a Monday it unticks Snap to Mon, as the body drag does. The result is the same as dragging
  the bar to that day (`installMonthPillDrag`).
- ⛔ **Production runs inside `asShootDayMove()`.** Owner ruling R2: a mover that skips it lets the day marks stay
  behind on their old dates, which brings back audit M-4.

### 3.5 End <phase> here

- **Not Production:** it uses the end handle's rule (`installPhaseEdgeHandles`):
  - **Dates** writes `end-<key>`, inclusive.
  - **Days** recounts `days-<key>` with `isUnitWorkDay`.
  - **Weeks** first switches the phase to Dates, then applies the Dates rule. A whole number of weeks cannot end on
    an arbitrary day.
  - It lands only on a day the phase can be drawn on (a weekday outside every hiatus, or a work day for Days). It uses
    the same ±400-day search, with ties going toward the old edge.
- ⚠️ **That rule is private today.** The handle's `apply()` reads its drag closure, so nothing else can call it.
  Step 3 lifts it into one module-scope function, `setPhaseEdge(key, edge, iso)`, called by both the handle and the
  menu. The handle keeps its gesture, and the rule exists once. This is not frozen code; the `phaseedge` leg is its
  gate.
- **Production: greyed out**, "Its end comes from the shoot days". Production's end handle changes the last episode's
  day count, and that runs through a search (`applyCount` → `probeShootDays` → `solveCount`) with no entry point.
  ✅ **Ruling Q3 (owner, 19 Oct 2026): it stays greyed out.** You drag the end handle instead.
- ✅ **Unchanged by the episode-grip work** of 19 Oct 2026 (HANDOFF, "Episode grips remove days, never push", which
  that session confirmed to this one). The wrap grip still runs `applyCount` → `probeShootDays` → `solveCount`. What
  changed is the `bound` grip, at the end of every episode or block except the last, which no longer pushes. That work
  also adds a `head` grip at every later episode's start. Both go through `boundSteps()` / `headSteps()` →
  `applyBound()`, never move the wrap or the first shoot day, and need no probe. Neither is in this menu.

### 3.6 Colour…

- **Calls** `openPhaseColorPop(anchorEl, currentIndex, onPick)`, with the bar as the anchor. The current index is
  `autoPhaseColorIndex()` for a built-in phase and `colorIndex` for a custom one. Its click-away listeners attach in
  `setTimeout(0)`, so the click that chose the item does not close it.
- The two `onPick` bodies are written inline today:
  - built-in: `phaseColorOverride[key] = i`;
  - custom: `cp.colorIndex = i`.

  Both repaint `#swatch-<key>` and call `update()`. Step 3 lifts them into one `setPhaseColor(key, i)`.
- ⛔ `PHASE_COLOR_OPTIONS`'s array order is file format (CLAUDE.md). This item only reads it.

### 3.7 Show in Phases card (on a phase, and on a hiatus)

- `setSidebarTab('phases')`, then scroll the row into view: the phase's row in `#phase-rows` / `#custom-phase-rows`,
  or the covering `.hiatus-entry` in the All-phase hiatus card.

### 3.8 Edit note…

- `openMvNoteEditor()` on the note element itself, which already carries `data-note-week/day/kind/index`. This is
  exactly what a left-click does.
- A waterfall note (`kind="wf"`) changes the waterfall too, and the item's second line says so.
- ✅ **Ruling Q5 (owner, 19 Oct 2026): Edit note… only.** There is no Delete note in the menu.

### 3.9 The shoot day

- **The menu offers exactly the rows `openDayOvPop` builds, built by the same code:**
  - On a weekday: **Full day / Off**.
  - On a weekend or holiday: **"Weekend — not shot"** or **"Holiday — not shot"**, plus **Work this day**, with the
    line "Overrides <holiday>" on a holiday.
  - Inside a hiatus: **Work this day**, greyed out with "Inside <hiatus> — shorten the hiatus to work these days"
    (ruling 1).
  - The withdrawn rows (Half day, Work half day) show only on a day that already holds one, as the popover does.
- ⛔ **Half-day marking was withdrawn by the owner on 15 Oct 2026** (*"We don't need a function to mark random days as
  half days"*). The menu must not bring it back. *(This session's first list of options offered "Half day" here; that
  was wrong.)*
- ⭐ **Since ruling L1 this section IS the popover's replacement, not a second copy of it.** `daySituation`,
  `setOverride` and the row list are private to the `installDayOverrideUI` block, and that block already owns the
  `#table-wrap` click that opens the popover. So the menu's shoot section is built there, from `openDayOvPop`'s row
  list. That list is lifted out as `dayOverrideRows(sit)`, and `openDayOvPop` itself retires. There is then exactly one
  set of row rules, and nothing to drift.
- **What moves over from the popover with it:**
  - each row's reason and warning lines, which become the item's second line;
  - the "Stored “…” — not in effect on this day" notice, which becomes a line under the section;
  - the "Double-click a marked day to clear it" hint, which moves to the footer;
  - the toggle: a click on the day whose menu is open closes it.
- ⛔ **Each shoot row keeps `data-ov="<value>"`**, the attribute the `halfdays` and `halfworked` legs read today. Their
  rewrite is then a selector change, and they keep asserting the same values.
- `setOverride` already banks exactly one undo step.

### 3.10 The hiatus section

- **Finding the hiatus:** walk `#hiatus-list .hiatus-entry` and compare each row's `mondayOf(start)` … `+ weeks×7`
  against the day. The rows line up index for index with `schedule.hiatuses` (`readState().hiatusRows`).
- **Lock in place:** the row's own `.hiatus-locked` box, plus an `input` event, which runs `update()`.
- **Remove hiatus:** clicks the row's own `.remove-hiatus`, so the question asked is the same "Remove this hiatus?".
  The undo bracket goes after the answer: the bracket is synchronous, so `await` first. ✅ **Ruling Q4 (owner, 19 Oct
  2026): it asks first**, as the sidebar's × does.
- **Two hiatuses on one day** get one section each, named by their dates. The month view's bands cannot tell them
  apart.
- **A phase's own hiatus** on that day gets a section "<phase>'s hiatus" whose only item is Remove (untick
  `phiatus-en-<key>`). Lock does not apply: a phase's own hiatus always travels with its phase.
- **Not offered: renaming or recolouring a hiatus.** `hiatusTexts` / `hiatusColors` are edited only by the waterfall's
  note editor (`openNoteEditor` on `td.sheet-hiatus-cell`). The month-view bands have no editor, no handler and no
  attributes. Building one would be its own piece of work.

### 3.11 The holiday section

- **Finding the holiday:** `fullHolidayList(effectiveRegionKey()).filter(h => h.date === iso)` gives
  `{name, hid, enabled, custom}`. A day can hold more than one, and each gets its own section.
- **The three items are the holiday list's three boxes** (`renderHolidayVisList`). Clicking those boxes keeps one
  handler for each, rather than copying it:
  - **Enabled** is the `.hv-en` box: `holidayOff[hid]`, after `await confirmHolidayRecompute()`. Turning a holiday off
    also removes its note. Off, on a weekday inside the shoot, means Production shoots that day, and the item's
    second line says so. A weekend holiday costs no shoot day (its *(Observed)* entry is the one that counts).
  - **Show in month view / Show in waterfall** are the `.hv-cb` boxes: `holidayView[hid]`, then
    `render(currentSchedule)`. They change only what is drawn, so the call is `render`, not `update`. Both are
    disabled while the holiday is off, as they are in the list.
- ✅ **Ruling Q6 (owner, 19 Oct 2026): the holiday section stays in the menu.**

### 3.12 Show this week in the waterfall

- `setViewMode('sheet')`, which is synchronous all the way through to `render`. Then scroll
  `td.sheet-note-cell[data-week="<Monday>"]` into view inside `#sheet-scroll-container`, both vertically and
  horizontally, because the year blocks sit side by side. Reading the frozen grid's DOM is allowed; nothing is written
  into it.
- The week is `mondayOf(day)`. A Sunday therefore belongs to the week of the Monday before it, although the month view
  draws Sunday as the first day of its row.

---

## 4. How it fits without a frozen edit

⭐ **Nothing on the frozen list changes.** The menu reads the month view's DOM for exactly two things: which day is
under the pointer, and which bar. Everything else comes from the schedule, the same data the renderer drew from.

- **One `contextmenu` listener, on `document`.** The edge handles are body-level, so a right-click on one never
  reaches `#table-wrap`. It acts only when all three hold:
  - `viewMode === 'month'`;
  - not `e.shiftKey`;
  - the point is inside `#table-wrap .mv-body`, or on a `.phase-edge-handle`.

  Anywhere else gets the browser's own menu. That covers the title, the month bar, and the header lines, which are
  contenteditable in Manual mode and want spellcheck.
- **The left-click** (ruling L1) is the existing `#table-wrap` click in `installDayOverrideUI`. It already matches
  `.mv-daycell` and checks `viewMode`, so it opens the menu instead of the popover, anchored under the `.mv-daynum`.
  It drops its `if(!sit) return`, so days outside the shoot open the menu too. "+" slots, notes and bars sit above the
  cell, so they never reach it. Placement is the popover's own `place()`: under the anchor, pulled in from the right
  edge, and flipped above when it would run off the bottom.
- **The day:** `dayAtPoint(x, y)`, which is at module scope. Check first that the point is inside `.mv-body`, because
  `dayAtPoint` clamps: a point below the grid returns the last week. Scope every selector to `#table-wrap`, because
  `#print-root` holds `.mv-daycell`s too.
- **The bar:** `e.target.closest('.mv-pill[data-ph]')` gives the key.
  - The phase edge handles carry `data-ph`.
  - Production's handles do not; their pill is in the `h._pill` expando.
  - The sim-post pill has no `data-ph`, so it gets no phase section.
- **Everything else comes from the schedule, not the DOM:**
  - **Hiatus bands can never be a pointer target.** `.mv-bars` is `pointer-events:none`, and the bands carry no
    attributes. Use `isHiatusDate(currentSchedule, d)` and `isPhaseHiatusDate(seg, d)`.
  - **Holidays have no DOM marker at all.** A holiday is drawn only as a waterfall note, and only while it is enabled,
    shown in the month view and inside some phase. Use `fullHolidayList()`.
  - **The shoot:** `daySituation(d)`. The shoot-day number is `productionInfo.shootDays.indexOf(iso) + 1`. The episode
    or block comes from `productionUnits(currentSchedule).byDay`, and the week label from `prodWeekLabel(seg, d)`.
  - **Phases on a weekend** have no bar, so use the span rule (§3.3).
- **The panel is a body-level `<div role="menu">` with a class of its own, never a `.mv-*` class**, because every
  `.mv-*` rule is frozen.
  - **No `id` on any control.** `collectFieldValues()` would sweep it into every saved file and the undo stack.
  - **Hand-rolled, like `.day-ov-pop` and `.hdr-mode-pop`, not Mantine's `Menu`.** The engine owns every fact the menu
    shows, and Mantine mounts its dropdown from an effect (UI-CONVENTIONS §6).
  - **Styled to match the app's Mantine menus**, measured from the File menu: 4 px padding, 10 px radius, a
    `0 8px 24px rgba(0,0,0,.12)` shadow, a `#e3e1da` border and 12 px items. It sits in the 300 tier of the z-index
    ladder ("every popover and menu").
- **Strip list:** add the class to `buildSavedHtml`'s strip list, or a shareable copy exported with the menu open
  carries it forever. Add it to `OVER_PANEL` too: only waterfall code reads that today, and it costs nothing.
- **It closes on** Escape, an outside mousedown, scroll (capture), resize, window blur, and any re-render of
  `#table-wrap`. The re-render is caught by a MutationObserver that only reads (sanctioned pattern 3: a subtree
  observer never writes inside `#table-wrap`). The menu does not re-anchor after a render, because the day under it
  may have changed.
- **Before it opens,** it closes an open `.day-ov-pop` (`closeDayOvPop`) and commits an open month note editor
  (`commitMvNoteEditor`). A right-click fires no `click`, so neither would close on its own. The editor's rule is that
  an outside click commits.
- **An item that opens another panel** (the note editor or the colour picker) must stop its click reaching
  `document`. Otherwise that panel's own click-away closes it in the same click.

---

## 5. The pointer budget (UI-CONVENTIONS §6a)

- ✅ **A right-button press starts no drag.** Every month drag start checks `e.button !== 0`: the pill body drag and
  both edge-handle `beginDrag`s. (Read from the code.)
- ⚠️ **macOS Ctrl+click is the risk.** Chrome sends `mousedown` with `button 0` and `ctrlKey`, then `contextmenu`, and
  no month drag checks `ctrlKey`. So a Ctrl+click would first arm a body drag on a bar, or append the
  `.phase-edge-shield` on a handle. Arming a body drag means `pushUndoSnapshot()`, `beginShootDayMove()` and
  `body.grid-swapping`. Step 1 makes those three drag starts (none frozen) ignore Ctrl on a Mac.
  ⛔ **This has to be checked with a real mouse or trackpad.** Synthetic events do not reproduce the OS turning
  Ctrl+click into a right-click.
- The listener runs in the bubble phase and calls `preventDefault()` on `contextmenu` only. **It never calls
  `stopPropagation()` from a capture listener** (§6a: that destroys uncommitted note text).

---

## 6. Keyboard

- **Inside the open menu:**
  - ↑ ↓ move;
  - → opens a submenu and ← closes it;
  - Enter or Space chooses;
  - Esc closes.

  Roles are `menu`, `menuitem`, `menuitemcheckbox` and `menuitemradio`. Focus moves into the menu, and goes back where
  it was when the menu closes.
- **Opening the menu from the keyboard is not offered.** No day in the month view can take focus: there is no
  `tabindex` in `renderMonthView`'s output, adding one is a frozen edit, and an observer may never write inside
  `#table-wrap`. Every item is also reachable from the sidebar, the note slots or the view toggle, except the shoot-day
  choices. Those were mouse-only before as well, because the popover the menu replaces (ruling L1) opened only on a
  click. Keyboard users therefore lose nothing they have today.

---

## 7. Save format: nothing new

- **No new key in `captureSnapshot()` and no new id'd control.** Every item writes a store that already exists and
  already saves:
  - `customPhaseDefs` and the new row's fields;
  - the hiatus rows and `phaseHiatuses`;
  - `dayOverrides`;
  - `holidayOff` and `holidayView`;
  - `phaseColorOverride` and `colorIndex`.

  Opening and closing the menu must leave `fields.byId` exactly as it was.
- **One item is one undo step.** It calls `pushUndoSnapshot()` before and after, which is `setOverride`'s idiom;
  `asOneHeaderStep(fn)` is the module-scope helper with that shape. An item that asks a question awaits the answer
  first and brackets after. Several of the controls the menu drives rely on `markDirty()`'s 500 ms debounce today, and
  that debounce can fold the step into typing that follows. The menu banks its steps explicitly.

---

## 8. Found while planning (reported, not this plan's work)

1. **A hiatus whose label was emptied on purpose makes the shoot-day popover offer Full day / Off on a hiatus day.**
   `daySituation()` returns `hiatus: ''`, which is falsy, so `openDayOvPop` treats the day as an ordinary weekday. The
   menu shares that code (§3.9), so it would share the bug. The fix is one test (`!= null`), and it fixes both.
2. **CLAUDE.md says the shareable-copy clone strips "five classes".** `buildSavedHtml`'s list holds eleven today.

---

## 9. Rulings: all received 19 Oct 2026

M1 came in chat while the plan was being written. Q1–Q6 were asked one at a time by picker.

| # | Question | Ruling |
|---|---|---|
| ✅ M1 | Shift From / Anchor To / Rebuild From in the menu? | **No.** They stay in the toolbar. |
| ✅ Q1 | *Add phase starting here*: how long, in what unit? | **Both a one-day and a one-week option** (the owner's own answer, in place of the three offered). Built as two flat items (§3.2). |
| ✅ Q2 | *Add hiatus ▸ <phase> only* on a phase that already has its own hiatus | **Move it here**, and say so in the item ("Move Post's hiatus here"). |
| ✅ Q3 | *End Production here* | **Greyed out**, "Its end comes from the shoot days". |
| ✅ Q4 | *Remove hiatus*: keep the "Remove this hiatus?" question? | **Ask first**, as the sidebar's × does. |
| ✅ Q5 | Notes: only *Edit note…*, or also *Delete note*? | **Edit note… only.** |
| ✅ Q6 | The holiday section: in the menu, or left to the holiday list? | **In the menu.** |
| ✅ L1 | Should left-clicking a day's number open this menu, in place of the Full day/Off popover? (The owner's question.) | **Yes, replace it.** The order stays fixed, so Full day/Off move from rows 1–2 to rows 5–6. Asked with the alternative "shoot choices first on a shoot day", which was not chosen. |

Two smaller calls inside Q1 were this session's, and each is cheap to change:
- **Flat items rather than a submenu.**
- **The 1-week phase starts on the exact day**, not that week's Monday.

---

## 10. Steps

Each step can be committed on its own, and one new leg, `mvmenu`, grows with each.

1. ✅ **The skeleton. BUILT 19 Oct 2026** (`installMonthDayMenu`; HANDOFF has the record). It adds a ring laid over
   the day, taken from the mockup, and the leg `mvmenu` (36 cases).
   - The listener and its guards.
   - Finding the day and the bar.
   - The panel, its close rules and its place in the strip list.
   - The macOS Ctrl+click guard on the three month drags.
   - Four items: Add note, **Add 1-day phase here**, **Add 1-week phase here**, Show this week in the waterfall.
2. **Add hiatus ▸**, both kinds.
3. **The phase section.**
   - Start here (a mover).
   - Lift `setPhaseEdge` out of `installPhaseEdgeHandles` for End here.
   - Lift `setPhaseColor` for Colour….
   - Show in Phases card.
4. **The shoot-day section, and the menu takes over the left-click** (ruling L1).
   - Lift `dayOverrideRows(sit)` out of `openDayOvPop`.
   - Point the existing day click at the menu, anchored under the day number, and retire the popover.
   - Rewrite the `halfdays` and `halfworked` legs' popover selectors.

   Until this step lands, left-click keeps opening the popover. Fix §8.1 at the same time, if the owner agrees.
5. **The hiatus and holiday sections.**

---

## 11. The gate

- **Every frozen output is identical.** Nothing frozen changes, so this is the full `tests/harness/gate.sh` with no
  re-cut: the waterfall PDF, every Excel part, gate 10's print documents, and gate 13's written month PDFs byte for
  byte.
- **The new `mvmenu` leg** (`?test=`) fires `contextmenu` with `clientX/clientY` on known days of `halfdays.sptcal`:
  - 8 Jul 2026: a shoot day on a Production bar;
  - 3 Jul 2026: a holiday inside the shoot;
  - 12 Jul 2026: a weekend inside the shoot;
  - 22 Dec 2026: a hiatus day;
  - 25 Dec 2026: a hiatus day and a holiday.

  For each day it asserts which sections are present and absent. For each item it asserts the effect, and that the
  item banked exactly one undo step. It also checks the two new phases:
  - *1 day* on 8 Jul is drawn on 8 Jul only;
  - *1 day* is greyed out on 12 Jul and on 22 Dec, and offered on 3 Jul;
  - *1 week* on a Wednesday starts on that Wednesday, not the Monday. It also asserts that Shift + right-click is not prevented, and that a render
  closes the menu.
- **Save hygiene:**
  - opening and closing the menu leaves `fields.byId` unchanged;
  - a shareable copy exported with the menu open contains no menu.
- **Left-click** (from step 4): a click on 8 Jul's number opens the menu under the number with Full day/Off in it, and
  `.day-ov-pop` never appears. A click on 12 Jul's number opens it too, although no popover opened there before. A
  click on a "+" slot still opens the note editor. Clicking 8 Jul twice closes it, and a double-click on a marked day
  still clears the mark.
- **Existing legs that must stay green:**
  - the CDP legs `pilldrag` and `phaseedge` (`tests/harness/*.mjs`);
  - `customunits`, `halfmarks`, `overrides`, `monthnotes`, `monthdragundo` and `sharecopy2`;
  - `halfdays` and `halfworked` (both read the popover today), rewritten in step 4 to read the menu's `data-ov` rows,
    with every value they assert unchanged.
- **One check by hand:** on a Mac, Ctrl+click on a bar and on an edge handle starts no drag (§5).
- **`npm run check`.** The menu loads nothing, so the CSP is untouched.
- ⚠️ Run any leg on its own with `HARNESS_PAGE=/dist/index.html`. `run.sh` defaults to the root `index.html`, which is
  the legacy app.

---

## 12. The mockup

- **What it is:** the month view's markup, and every CSS rule that applies to it, captured from the build in `dist/`
  on 19 Oct 2026. The calendar is `tests/fixtures/halfdays.sptcal` (synthetic), shown for July and December 2026. The
  captured parts are inlined verbatim; only the menu is new.
  - July has the shoot, a holiday on a shoot day, weekends inside the shoot, and a milestone note.
  - December has Post, a locked two-week hiatus, and Christmas Day inside the hiatus.
- **What it fakes:** the real menu reads the schedule, and the mockup has none. It reads the bars back out of the
  captured markup instead and keeps a fixed shoot window, so its shoot-day numbers are approximate. Choosing an item
  shows what it would do; nothing changes.
- **Where it is served:** nowhere. The deploy publishes `dist/` only. Open it from the file, or through the harness
  server at `/mockups/month-context-menu.html`. It loads Inter from Google Fonts, which the product's CSP never sees,
  because this is not the product.
- The side panel explains each item as you point at it, and lists what is left out on purpose.
