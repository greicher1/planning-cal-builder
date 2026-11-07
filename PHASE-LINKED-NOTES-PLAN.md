# PHASE-LINKED-NOTES-PLAN.md: a note that moves with its phase

**Status: RULED; STEPS 1–4 BUILT on branch `phase-notes` (step 1 committed `e13bf95`, step 2 `733a037`, step 3
`647690b`; step 4 on 6 Nov 2026, Delete / copy / paste / drag), steps 5–6 not started. R1–R9 all ruled 5 Nov 2026 by
picker, every one the recommendation (§2). The note editor's LOOK is ruled: A2 (below). §9–§12 are the as-built
records.**
- ⛔ **Do not ship steps 2–4 without step 5.** Linking a typed note takes it out of `userNotes`, and the month view
  reads a week's typed lines from `userNotes` through frozen `notesForWaterfallDate`; until step 5 draws linked notes
  there (through `mvWfLinesFor`), a note leaves the Month view the moment it is linked.
- ✅ **Refreshed against `main`** (5 Nov 2026, on `phase-notes`): Rebuild From became **Build Around**, **Close all
  gaps is gone**, Shift From / Anchor To are choices inside the one Shift form, and ▲ / ▼, the bar drag and the
  ripple are new movers (§0, §1.1, §1.3, step 1). ⚠️ Still open for the A2 overhaul (card `note-editor-overhaul`): the
  waterfall editor gained, live at `ac55bb7`, the Holiday / Auto Note headings, the Hide buttons and the per-line Hide
  list (WATERFALL-NOTE-EDITOR-PLAN.md), which A2 (§4.4) must make room for. Step 2 added its row to TODAY's editor.
- Mockup: [`mockups/phase-linked-notes.html`](mockups/phase-linked-notes.html). Its first tab is the note editor with
  the new row. Its second is a before/after of Production moved by typing its start date, with a linked note
  following and an unlinked note staying. The calendar is synthetic (2033, generic names).
- Tracker card `notes-linked-to-phase`.
- **The editor's look, ruled 4 Nov 2026** (tracker card `note-editor-overhaul`): look **A2** of
  [`mockups/note-editor-look.html`](mockups/note-editor-look.html), for both note editors, the waterfall's and the month
  view's. The owner: *"yes A2, but its an "Auto-Note""*. So the new Stays with row lands in A2's order (§4.4), and the
  month view's automatic-note editor is titled **Auto-Note**.

- **The ask** (owner, 4 Nov 2026): *"we do need a way to link certain notes to certain weeks relative to a phase. So
  basically link a certain note you write to a certain phase. Thoughts?"*
- **Where it came from.** It came out of the one Shift tool (ANCHOR-TO-DIRECTION-PLAN layout C, branch `shift-tool`).
  The owner asked whether Shift needed a "This phase only" choice, since the sidebar already moves one phase. The
  answer was that typing a date leaves that phase's notes behind. The owner liked fixing that at the root, by
  linking notes to phases.
- **The short answer:** yes. Store the link, not the week, so the note's week is worked out from the schedule each
  time, as the automatic notes' weeks already are. Every way of moving a phase then carries its linked notes with
  no code in any mover. Nothing frozen changes. One new row in the note editor; "the week" stays the default, so
  nothing changes for anyone who never touches it.

---

## 0. How it works today (read this first)

- **A typed waterfall note belongs to a calendar week.** It is `userNotes[<Monday ISO>]`:
  - `{text}`, or `{text, date}` when the editor's Day picker pinned it to a day, or `{notes: [...]}` for two notes a
    shift merged (read through `userNoteList`).
  - It may also carry `monthHidden: true` (NOTE-VIEWS, 4 Nov 2026).
  - It is the WHOLE cell. It replaces the week's automatic text, and it may hold that text word for word with a
    line added (`wfOwnNoteText`, `saveNoteEdit`).
- **The Day picker stamps the date into the text** ("Table read 6/15/33") and stores `date`. A note with a `date` is
  pinned: no shift ever moves it (`pinnedWeeks` in `shiftCalendarDates`).
- **Only the Shift tools move notes.** `shiftCalendarDates` re-keys `userNotes` by whole weeks
  (`shiftKeyedMap(userNotes, days, isPinnedWeek, mergeNoteValues)`), with the stores that make up a note's look:
  `noteColors`, `noteFontSize`, `rowHeightsByWeek` and `textStyle.note`. It decides by DATE, not by phase. Shift From
  moves every note on or after its cutoff week, including an earlier phase's notes in weeks it shares with the picked
  phase (ANCHOR-TO-DIRECTION-PLAN §2, "the edge it shares").
- **Every other mover changes phase dates and leaves the notes where they were:**

  | Mover | What it calls | Typed notes |
  |---|---|---|
  | Typing a start date | `update()` | stay |
  | The month view's body drag and edge grips | `installMonthPillDrag` → `setPhaseStart` | stay (an edited automatic line is rewritten, `autoNoteBaseline`) |
  | Build Around (Rebuild From until 5 Nov 2026) | `buildAround` → `workBackwardsFrom` / `workForwardsFrom` → `setPhaseStart` | stay |
  | ▲ / ▼ on a phase card | `nudgePhase` → `shiftCalendarDates(…, {part: {phases: [key], windows: <empty>}})` | stay (only the phase's own hiatus and `<week>\|<key>` stores travel) |
  | The month view's bar drag | carries what ▲ / ▼ carry (`month-drag-carry`) | stay |
  | A hiatus added inside a phase | the phase extends (`extendEndForHiatus`) | stay. A note can end up under the band, where the waterfall cannot show it (audit L-14). |
  | A hiatus edit with Ripple Hiatus on | `rippleAfterHiatusEdit` → Shift From from the hiatus | move by week, as below |
  | A Region change (Production's shoot days move) | `update()` | stay, which is why `confirmRegionChange` asks first |
  | The Shift form (What moves × How far; the ticked list) | `shiftCalendarDates(weeks, null, {part: {phases, windows}})` | move by week inside its windows |

  *(Refreshed 5 Nov 2026 against `main`: Close all gaps is gone, Rebuild From is Build Around, and Shift From / Anchor
  To are choices inside the one Shift form. The rows for ▲ / ▼, the bar drag and the ripple are new since the plan.)*

- ⭐ **Automatic notes never get left behind, because they are not stored.** `computeSchedule` works out their days
  every time it runs (`addAutoNote`, its `drawn()` helper), so wherever a phase goes, its notes go. This plan gives a
  typed note the same property.
- **Phase week numbers are handed out in `computeSchedule`'s week loop:** `weekCounters[key]++`, recorded as
  `seg.weekNo[<week ISO>] = num` (OFF-WEEK-PLAN step B). The month view reads that record (`prodWeekLabel`). The count
  covers WORKING weeks only:
  - All-phase hiatus rows, the phase's own hiatus and Production's off weeks do not advance it.
  - Every phase is counted, hidden ones included.
  - The counter starts at 1, except for Post while Simultaneous Post's "Number these weeks & continue Post's count"
    is on. Post then starts at K + 1, where K is Sim Post's count (`simPostTotal + 1`).
  - A custom phase's "Number weeks" off only drops the number from its label (its `template`); `weekNo` is still
    counted.
- **Where a Notes cell's text comes from:** `effectiveNoteText(weekKey, autoNotes)`. It returns the week's own text
  (`wfOwnNoteText`) plus the month notes switched on for the waterfall (`wfMonthLinesFor`, NOTE-VIEWS).
  - The frozen renderer, `exportExcel`, `buildWaterfallPdf`, `sheetColumnWidths` and `sheetRowCount` all call it by
    name. So a line added there reaches the screen, the workbook, the PDF, the widths and the row count with no
    frozen edit. NOTE-VIEWS proved this path on 4 Nov 2026.
  - ⛔ Code that WRITES a week's own note reads `wfOwnNoteText`, never `effectiveNoteText`.
- **The cell's look comes from four non-frozen helpers,** which all three writers call: `noteColorFor`,
  `noteFontSizeFor`, `textStyleOf('note', week)`, and `syncRowHeights` (`rowHeightsByWeek` → `rowHeights`).
- **The month view** takes a week's typed lines from frozen `notesForWaterfallDate`, which reads `userNotes` directly.
  But every non-frozen reader goes through the wrapper `mvWfLinesFor`: `mvDayNotePlan`, `mvWfKeysOn` and
  `monthHoldsSomething`. Both month PDFs follow, since the writer parses `renderMonthView`'s HTML and the print path
  IS it.

---

## 1. The proposal

### 1.1 What you see

- **One new row in the waterfall note editor, under the text box:** `Stays with [Week of 5/9/33 ▾]` (the words are
  R1).
  - The list holds the week, which is the default and today's behaviour, then each phase the row draws, by its cell's
    own label: `Production wk 2`, `Prod Prep wk 7`.
  - A one-line hint under it says what will happen: *"Moves when Production moves. Stays on its week 2."* or
    *"Stays on the week of 5/9/33, whatever the phases do."*
  - The row is hidden in a week where no phase runs, since there is nothing to link to.
- **Then every way of moving that phase carries the note:** typing its start date, the month drag, Build Around, the
  Shift form, ▲ / ▼ on the phase card, a hiatus added before it (rippled or not), a Region change, and any mover built
  later. None of them needs a line of code for it.
- **The grid looks exactly as it does today.** No mark goes in the cell, because a cell's look is frozen. The editor
  is the one place that shows a link (D6).

### 1.2 Store the link, not the week

- **A new store, `phaseNotes`, keyed `<phase key>@<n>`.** For example, `production@2` is Production's second week of
  work. Each value is the note: `{text}`, plus the optional fields in §5.
- **n counts the phase's own working weeks from 1** (D1). That matches the grid's "wk N" for every phase except Post
  while Sim Post continues its count, where the label is n + K.
- **`computeSchedule` places them after its week loop.** For each entry, the week is the one where `seg.weekNo` holds
  the phase's n-th number.
  - Its day: the picked weekday (`dow`), or with none, the phase's first day that week as its bar is drawn, using
    `drawn()`'s rule (R6). For Production that is the first shoot day.
  - The result goes on the schedule object, `schedule.phaseNotePlace = {<week ISO>: [{key, line, dayIso}]}`, built
    before the calendar range cuts the rows, and carried onto `fullRange`.
  - ⛔ **On the schedule object only, never in module state.** `computeSchedule` is called up to 300 times by
    Production's searches, by Rebuild From's trials and by the column-swap gate. A module-level placement would be
    whatever the last probe left.
- **What it costs per compute:** one pass over the entries, each a lookup in one segment's `weekNo`.

### 1.3 Every mover carries it, with no per-mover code

| Mover | Why the note follows |
|---|---|
| Typing a start date, the month drag, Build Around, ▲ / ▼ | the phase's start changes, so `weekNo` changes, so the place changes |
| A hiatus added before the note (all-phase or the phase's own, rippled or not) | that week is not a working week, so week n is one calendar week later. The note never lands under a band. |
| The Shift form, any choice | the phase moves, so its notes move. Its week windows go away for linked notes: a note follows ITS phase, not a window. |
| A Region change, a day mark, a half day | Production's weeks follow its shoot days, so the note follows (and with R4(b), a note linked to a shoot day follows that day) |
| Undo, redo, scenarios, Load | the store is in `captureSnapshot()`. Nothing is derived from the session. |

- ⛔ **`shiftCalendarDates` gets NO code for this.** It re-keys `userNotes`; linked notes are not in `userNotes`, so
  it never sees them. That is how "linked notes must be skipped there" is met.
  - Never add a `shiftKeyedMap` call for `phaseNotes`. It would move a derived week twice. Put that warning beside
    the existing one for `gridStintSwaps`.
- **The same is true of `rewriteMovedAutoNotes` / `autoNoteBaseline`** (R5 / audit M-10). They rewrite the
  automatic text inside a typed note that moved. A linked note never holds automatic text (§4.5), so they have
  nothing to do with it.

### 1.4 Where it is drawn

- **Waterfall, Excel, waterfall PDF, widths, row count:** `effectiveNoteText` gains one more part. The week's own
  text comes first, then its linked notes (in column order), then its month notes. A linked note's line is its text,
  plus " 5/11/33" when it has a picked day. That date is drawn fresh from the place every time, never typed, so it is
  never stale after a move.
- **Month view and both month PDFs:** `mvWfLinesFor(schedule, d)` adds each linked line on its day. It does not draw
  one whose note has "Show in month view" off, the NOTE-VIEWS switch, which the linked note carries for itself.
- **The look:** `noteColorFor`, `noteFontSizeFor`, `textStyleOf('note', …)` and `syncRowHeights` read the linked
  note's own look when the week has no typed text of its own (R7). These are the writers' declarations, not their
  bodies: the CLAUDE.md sanctioned pattern 1.

---

## 2. Rulings (all made)

✅ **RULED 5 Nov 2026, by the owner's pickers: every one is the recommendation.** R1(a) *Stays with*; R2(a) the
choice is for the cell as a whole; R3(a) a shorter phase parks the note on its last week, a removed custom phase
turns its notes into plain notes, a dateless phase hides them; R4(b) Production follows its shoot day when the picked
day is one; R5(a) no links outside a phase yet; R6(a) with no day, the phase's first drawn day that week; R7(a)
colour, size, style and row height all travel; R8(a) both editors, the month one in a later step; R9(a) one new key,
`phaseNotes`, no version bump. The options are kept below as the record of what was weighed.

Each has a recommendation. The mockup shows R1, R2, R3 and R7 working.

- **R1. The words.** The row's label, and the default option's.
  - **(a) `Stays with`: `Week of 5/9/33` | `Production wk 2` (recommended).** It reads true both ways: the note
    stays with the week, or stays with Production's week 2.
  - (b) `Moves with`: `Nothing (stays on 5/9/33)` | `Production wk 2`. It reads well for a phase, but the default has
    to say "nothing".
  - (c) `Linked to`: `This week (5/9/33)` | `Production wk 2`. Plain, but "linked" doesn't say what happens.
  - The mockup has a switch for all three.
- **R2. A cell holding more than one note.** A linked note can land in a week that already has typed text, or two
  linked notes in one week. The cell shows all of them, as a shift's merge does today, and never loses text. What
  does the editor's one choice apply to?
  - **(a) The choice is for the cell's typed text as a whole (recommended).** One cell, one home.
    - When the cell holds only one note, the row opens on that note's home.
    - When it holds a visiting linked note, the row opens on the week. A line under it names the visitor: *"Also
      here: 'Splinter unit 6/29/33' stays with Production wk 7."*
    - While you leave the choice alone, the visitor keeps its link. Its line goes by what happened to it, as
      NOTE-VIEWS' month lines do: kept, renamed when changed in place, deleted when taken out.
    - Changing the choice gives everything typed in the box that one home. The mockup's after view has this cell
      (6/27/33).
  - (b) One box per note. When a cell holds two notes, the editor shows two text boxes, each with its own row. It is
    exact, but the editor changes shape with what the cell holds, and Tab, copy and paste have to learn which box
    they are in.
- **R3. The phase gets shorter than the linked week, or goes away.**
  - **(a) Recommended:**
    - **Shorter:** the note waits on the phase's last week and keeps its link (wk 12 stays wk 12). Lengthen the
      phase and it goes back. The editor says *"Production has 10 weeks now. This note waits on its last week."*
    - **A custom phase removed:** its linked notes become plain notes on the week they were on. Nothing is lost, and
      it is part of the removal's undo step.
    - **A phase with no dates** (its start box cleared): its notes are not drawn, like its bars and its automatic
      notes. They come back with its dates.
  - (b) Shorter: the note stays on the last calendar week it sat on. That needs a remembered week, written on every
    compute, which is the stored-week problem this plan removes.
  - (c) Shorter: the note is hidden until the phase is long enough again. It is silent, and a note you can't see is
    one you think you lost.
- **R4. Production by shoot day ("Day 23").**
  - (a) Weeks only, for every phase. A picked day is a weekday of the linked week.
  - **(b) Production follows its shoot day when the picked day is one (recommended).** The Day list already names
    each day; for a Production week it adds the shoot-day number, `Wed 5/11 · Day 23`.
    - Picked, the note is stored as `production@day23` and sits on whatever date Day 23 falls on.
    - That matters when the shoot's days move inside the weeks: a holiday, a Region change, a day mark, a half day.
      Under (a), the note stays on Wednesday, which is then Day 22.
    - No extra control. Shorter than Day 23: R3's rule (the last shoot day).
  - (c) A separate `Production Day 23` entry in the Stays with list. It is the same thing as (b), but the list gets
    a long tail of days.
- **R5. Linking to a time outside the phase** ("2 weeks before Production starts").
  - **(a) Not now (recommended).** The list holds only the phases drawn in that row. Almost every week of a
    waterfall has a phase running, so a note before the shoot can stay with Prod Prep's week. The store leaves room
    to add (b) later (`production@-2`) without a format change.
  - (b) The list also offers `2 wks before Production` for each phase starting in the next 4 weeks, and `1 wk after
    Production` for each one that ended in the last 4. It is more exact for "tech scout 2 weeks before the shoot"
    when prep and shoot are moved separately, but the list grows to five or six entries.
- **R6. Which day the note sits on in the month view.**
  - **(a) The picked day; with none, the phase's first day in that week as its bar is drawn (recommended).** That is
    the first shoot day for Production, and a weekday for a week-based phase. A note on Production wk 1 when the shoot
    starts on a Wednesday sits on that Wednesday, not on a Monday before the camera rolls.
  - (b) The picked day; with none, Monday, as an unlinked note sits today.
- **R7. Does its look travel?** `noteColors`, `noteFontSize`, `rowHeightsByWeek` and `textStyle.note` are keyed by
  week today.
  - **(a) Colour, size, style and row height all travel (recommended).** They are written on the linked note itself.
    The cell takes its own typed note's look when it has one, else the first linked note's: the rule
    `mergeNoteValues` already follows ("the note that stayed owns it").
    - A row dragged taller on a week whose cell shows only a linked note stores that height on the note. The Shift
      tools already treat row height as the note's (audit M-12).
  - (b) Colour, size and style travel; row height stays on the week. A row dragged tall for a long note is then left
    behind, which is M-12's bug back.
  - (c) Nothing travels. A coloured note goes purple when its phase moves, and its colour is left on an empty week.
- **R8. The month view's note editor.**
  - **(a) Both editors get the row (recommended), the month one in a later step (§6).** In the month view the list
    holds the phases drawn on that day, with the shoot day for Production (`Production · Day 23` under R4(b)).
    - A month note linked to a phase moves into `phaseNotes`. It keeps its day as `dow` and its look, and it stays
      month-only unless "Show in waterfall" is on, as month notes start today (NOTE-VIEWS).
    - A choice that is in one editor and not the other is the kind of thing "easy to understand" rules out, and
      NOTE-VIEWS gave both editors its switch for that reason.
  - (b) The waterfall editor only. The month view draws linked notes and edits their text, but cannot link or unlink.
- **R9. The save key.**
  - **(a) One new top-level key, `phaseNotes`, with no version bump (recommended).** §5 has the details.
    - An older build opens the file without its linked notes, and if that build then saves, they are gone. Every
      new key since v1.3 has behaved this way (`mvTextStyles`, `autoNotesView`), and installed users are offered each
      update.
  - (b) Make an older build refuse a file that holds linked notes, rather than drop them. That needs a new file
    version number (2 is taken by scenario files), and every v1.3+ build would refuse the file whole.

---

## 3. Defaults taken (no ruling needed; say if any should change)

- **D1. n is the phase's own working-week count from 1, not its label's number.** They differ only for Post while Sim
  Post continues its count. If the shoot grows a week, Post's first week is relabelled from wk 5 to wk 6, and a note
  linked to Post's first week of work stays there. The editor always shows the label the grid shows ("Post wk 6").
  ⚠️ `mvTextStyle.phase` uses the same `<phase>@<n>` shape with the LABEL's number. The two are equal everywhere but
  that Post case; the comment on the new store says so.
- **D2. The list is the phase cells the row draws, in column order.** That means:
  - not a phase hidden in the waterfall (no cell);
  - not a phase paused that week by its own hiatus or an off week (its cell is a band);
  - not Sim Post (it is Production's);
  - not the episode prep bars (month view only).
- **D3. Linking a note that has a picked day:** its day becomes a weekday (`dow`), and the date the picker stamped at
  the end of the text is taken out, so it can be drawn fresh where the note lands. This is `wfNoteItem`'s `stamp`
  rule. A date typed in the middle of a sentence is left alone.
- **D4. A note linked to a phase hidden in the waterfall still shows there.** Hiding a phase hides its bars and its
  automatic notes, not what you typed. Today a typed note in that phase's weeks still shows too.
- **D5. A Region change needs to ask about linked notes no longer.** They follow Production's new dates.
  `hasNoteEdits()` keeps counting only `userNotes`, so a calendar whose notes are all linked no longer asks.
- **D6. No mark in the grid.** A link icon in the cell would be a frozen edit to the cell's look, on screen and in
  every export. The month view's ↻/⚑ symbol (frozen edit NS1, on screen only) is the nearest precedent; ask for it
  separately if wanted.
- **D7. One undo step per editor save.** The store is in `captureSnapshot()`, so undo, redo, scenarios, the crash
  backup and autosave carry it.
- **D8. Reset Notes, New and `resetAll()` clear the store.**
- **D9. No right-click item** (the lean right-click menus rule). The editor is the one place to set a link.
- **D10. The text style bar:** a cell showing only a linked note styles that note (its `style` field). A cell with
  typed text of its own styles the week, as today.
- **D11. Help text:** one sentence in the Help notes paragraph, and the row's own hint. Nothing in the toolbar.

---

## 4. How it works (engine; none of it frozen)

### 4.1 The placement (`computeSchedule`, after the week loop)

- For each `phaseNotes` entry, find its segment by key.
  - No segment (no dates): skip it, per R3(a).
  - `@day<n>` (R4(b)): the date is `productionInfo.shootDays[n − 1]`, or the last shoot day when there are fewer.
  - Otherwise, the week whose `weekNo` is the phase's first number + n − 1, or its last working week when there are
    fewer (R3(a)).
- The day: `dow` if set, else the phase's first drawn day that week (R6(a)).
- `line` = the text with its lines joined as typed, plus the day's `fmtShort` when `dow` or a shoot day is set.
- Then `schedule.phaseNotePlace` as in §1.2. A `parked: true` flag marks an entry that waits on a last week, for the
  editor's message.

### 4.2 Drawing (`effectiveNoteText`, `mvWfLinesFor`)

- `effectiveNoteText` reads `currentSchedule.phaseNotePlace[weekKey]`, as `wfMonthLinesFor` reads `dayNotes`. With no
  entry it returns exactly what it returns today, byte for byte.
- `mvWfLinesFor` adds the lines whose `dayIso` is that day, except one marked `monthHidden`.
- A new `mvLinkedLineInfo(schedule, iso, text)`, beside `mvHolidayLineInfo` / `mvAutoLineInfo`, tells the month editor
  and `moveWfLine` that a line is a linked note's.

### 4.3 The look (R7)

- **As built (`wfLinkedLook`):** a field comes from the week's FIRST linked note only when the week has neither typed
  text of its own nor a value of its own in that store. So a typed note keeps its look with a visitor under it ("the
  note that stayed owns it"), and a week of automatic text the user coloured keeps that colour. With no linked note
  in the week every function returns exactly what it did.
- `noteColorFor(week)`: the week's own colour, else (no typed text) the first linked note's `color`, else purple.
- `noteFontSizeFor`, `textStyleOf('note', …)`: the same rule.
- `syncRowHeights`: a week with no `rowHeightsByWeek` entry and no typed text takes its first linked note's `height`.

### 4.4 The waterfall editor (R1, R2)

- `openNoteEditor` adds the row (an id-less `<select class="note-link-select">`) after the text box, and the hint
  under it. Its options come from `currentSchedule.weeks[i].cells` of type `'phase'`.
- ⛔ **NO id on the select.** `collectFieldValues()` sweeps `select[id]`, and an id would bake the choice into every
  saved file and add phantom undo steps.
- The text box opens on `effectiveNoteText`, as today, so it shows the linked lines too.
- **The layout is A2** (owner's pick, 4 Nov 2026; `mockups/note-editor-look.html`). It is one list of rows, a name on
  the left and its value on the right, under the text box, in this order:
  1. Day (waterfall only, a dropdown);
  2. Stays with, with its one-line hint;
  3. Colour, all 18 of the note palette always out, ten then eight, with the picked colour's name at the right;
  4. Show in month view (Show in waterfall in the month editors);
  5. then a foot: *Esc to cancel* and a Save button, or Hide Auto-Note where the editor has it.
  The month view's editors have no Day, so they start at Stays with; the holiday and Auto-Note editors start at
  Colour. A2 also restyles today's rows, so it is its own piece of work (card `note-editor-overhaul`). If the overhaul
  lands first, it has no Stays with row until this plan's step 2 adds it in place 2; if this plan lands first, step 2
  adds the row to today's editor and the overhaul moves it.

### 4.5 The editor's save (`commitActiveNoteEditor`)

- It runs a new step, `wfLinkedLineEdits(weekKey, before, after)`, AFTER `wfMonthLineEdits` and before
  `wfLineEdits`. It is the same shape as the month one.
- **Choice unchanged:** a linked line still in the box is kept. One changed in place renames its note, with the
  drawn date taken out. One taken out deletes the note. What is left is the week's own text, which goes the usual way
  (`wfLineEdits`, `saveNoteEdit`).
- **Choice changed to a phase:** the typed lines become one linked note, `<phase>@<n>`. If that key already holds a
  note, the texts join.
  - Lines that equal one of the week's automatic lines are NOT copied in. They are left to the automatic note,
    which follows its phase anyway, and would otherwise show twice in the week it came from.
  - The week's own note is then emptied (`wfClearOwnNote`'s path), and its look moves onto the linked note (R7).
- **Choice changed to the week:** the typed lines, visiting linked lines included, become the week's own note. Each
  visiting note is deleted from `phaseNotes`, and its look moves to the week if the week had none.
- The Day row stores `dow` on a linked note and `date` on a week's note, as today.

### 4.6 Keys, copy, paste and drag (WATERFALL-KEYS-PLAN)

- **Delete and Cut:** `wfClearNote` deletes the cell's linked notes too.
- **Copy, then Paste:** the paste lands as a plain note of the target week. A copy that kept its link would be drawn
  back on its phase week, not where you pasted it.
- **A drag to another week:** `wfNoteDragEnd` keeps the phase when that phase runs in the drop week, re-linked to
  that week's n. Otherwise the note becomes a plain note there.
- **The month view's line drag (`moveWfLine`):** the same rule by day. The new day sets `dow`, or the shoot day under
  R4(b).

### 4.7 A custom phase removed (R3(a))

- `removeCustomPhaseRow` turns its linked notes into `userNotes` entries on the weeks `phaseNotePlace` shows them on.
  An existing note in the week is joined through `mergeNoteValues`. This runs inside the removal's own undo step,
  beside the existing prunes of `phaseHidden`, `phaseEnds` and the automatic-note kinds.

---

## 5. The save format

- **One new top-level snapshot key, `phaseNotes`.** ⛔ PERMANENT:
  - the key, and its key shape `<phase key>@<n>`, plus `@day<n>` under R4(b);
  - the field words `text`, `dow`, `color`, `size`, `height`, `style` and `monthHidden`, plus under R8(a) `waterfall`
    (a month-made note shown in the waterfall, `dayNotes`' own word).

  ```json
  "phaseNotes": {
    "production@2": {"text": "Stunt rehearsal"},
    "production@7": {"text": "Splinter unit", "dow": 2, "color": "#00B0F0"}
  }
  ```

- **Absent while empty, keys sorted.** A calendar with no linked note saves byte for byte as it does today, which is
  every gate fixture. That is the inertness argument for the gate (§6).
- **Each field is written only when set:** `monthHidden` and `waterfall` only as `true`, `size` only when not 11,
  `color` only when not the default purple.
- **Sanitized** (`sanitizeSnapshot`), on the same rules as the stores it mirrors:
  - The phase key is a built-in key or `custom<n>`.
  - n is an integer 1–600 (`MAX_WEEKS`), or `day1`–`day3000`.
  - `text` is a non-empty string, capped as a note is.
  - `dow` is an integer 0–6.
  - `color` passes `isHexColor` or is No fill.
  - `size` passes the rule `noteFontSize` is restored by.
  - `height` is a finite positive number (audit H-1's rule, since it reaches `<tr style>`).
  - `style` goes through `cleanTextStyleEntry('note', …)`, `textStyle`'s own sanitizer.
  - `__proto__` and anything else are dropped and counted.
  - An entry for a custom key with no phase is kept and drawn nowhere. That only happens with an undo or a hostile
    file, since a removal converts its notes (R3(a)).
- **Restored unconditionally:** `phaseNotes = snap.phaseNotes ? {...} : {}`, so a file without the key never keeps
  the previous file's links.
- **No `SNAPSHOT_VERSION` bump** under R9(a). An older build ignores the key: the linked notes are not shown, and a
  save from that build drops them. New file into old build is not supported (CLAUDE.md).
- **No new `fields.byId` id.** The select and its options have no id.
- **Considered and rejected:** keeping a linked note inside `userNotes`, with a `link` field and its current week as
  the key, so an older build would still show it where it last sat. A week holds one `userNotes` entry, so a linked
  note landing on a typed week would have to merge into it. The next move would then drag the typed text along, or
  leave the link behind. The key would also have to be rewritten on every compute: the stored-week problem again.

---

## 6. Build steps (after the rulings)

1. **Engine: the store and the placement.** Capture, sanitize, restore, the resets, §4.1, §4.2's waterfall part, and
   §4.3. No UI.
   - New leg `phasenotes` on a new fixture (synthetic, 2033).
   - It holds a linked note's week through each mover in §1.3's table: typing a start, Build Around, ▲ / ▼, the
     Shift form (All phases and Phase & after), an all-phase hiatus and a phase hiatus added before it, a Region
     change.
   - An unlinked note stays put through the same moves.
   - The Excel cell, the waterfall PDF's `Tj`, the Notes width.
   - Save/Load round trip; an older file opens unchanged; hostile entries; undo.
2. **The waterfall editor** (§4.4, §4.5; R1, R2, R3's message). Leg cases: link, unlink, rename, a visiting note kept
   while the choice is untouched, and the automatic lines left out of a link.
3. **The look travels** (§4.3; R7). Leg cases: colour, size, style, row height on a moved note. A cell with its own
   note keeps its own look.
4. **Keys, copy, paste, drag** (§4.6). Extend `wfkeys` and `noteviews`.
5. **The month view** (§4.2's month part, R6, then R8's editor). Extend `mvnotes` and `mvorder.mjs` (the line drag).
6. **Production's shoot days** (R4(b), ruled). Offsets (R5(b)) were NOT ruled in (R5(a), not now); the store leaves
   room for them (`production@-2`).

- **The acceptance gate for each step:** the full gate green, with the waterfall PDF, every Excel part, the restore,
  gate 10's print documents and gate 13's written month PDFs byte-identical. No gate fixture holds `phaseNotes`, so
  any moved baseline is a bug.
- **No frozen edit anywhere.** The waterfall readers go through `effectiveNoteText`, the month readers through
  `mvWfLinesFor`, and the look through four declarations. If a step finds it needs one, it stops and asks.

---

## 7. How it fits the work around it

- **The one Shift tool (`shift-tool`, ANCHOR-TO-DIRECTION-PLAN layout C):** no shared code. Linked notes ignore its
  `before` bound, as they ignore Shift From's cutoff, because they follow their phase. Its §2 table's "Notes" row then
  reads "follow their phase" for linked notes.
- **The phase week arrows (PHASE-WEEK-ARROWS-PLAN, tracker `waterfall-phase-drag`):** its §5 lists what the month body
  drag leaves behind. Linked notes are off that list for free.
- **The hiatus ripple (`hiatus-ripple`, HIATUS-RIPPLE-PLAN):** a rippled phase carries its linked notes for free.
- **NOTE-VIEWS (`note-other-view`, live):** this plan reuses its editor-save shape (`wfMonthLineEdits`) and its
  "Show in month view" switch, which applies to a linked note as to a week's note.

---

## 8. Risks

- **`effectiveNoteText` reads `currentSchedule`,** because its frozen callers pass no schedule. The column-swap gate
  measures candidate schedules through `sheetColumnWidths` while `currentSchedule` is the one before it. The gate
  never moves a phase, only columns, so the two schedules place every linked note on the same week. Step 1's leg
  holds a linked note through a swap.
- **A linked note's text grows a cell it lands on.** The Notes column can widen, and the page orientation can flip,
  as any longer note can. That is the note being shown, not a regression.
- **Older builds drop linked notes on save** (R9(a)). If an older build is still in use somewhere, that is a lost
  note. Installed users are offered each update.
- **R2(a)'s rename-in-place** matches lines by position, as NOTE-VIEWS does. Re-ordering the lines of a cell that
  holds a visiting note and editing one of them in the same save can read as a delete plus a new typed line. The text
  is never lost: it becomes the week's own.
- **A long-parked note (R3(a)) can sit on a phase's last week for a long time** while the phase stays short. The
  editor says so, but the grid doesn't (D6).

---

## 9. Step 1 as built (5 Nov 2026, branch `phase-notes`)

Owner: *"Start step 1"*. Engine only, no UI: a linked note comes from a file. All in `src/legacy/app.js`, none of it
frozen.

- **Store, beside `userNotes`:** `var phaseNotes` (a `var`, since `computeSchedule` far above reads it),
  `PHASE_NOTE_KEY` / `phaseNoteKeyParts` (a built-in key or `custom<n>`; weeks 1–`MAX_WEEKS`; `@day1`–`3000` on
  Production only), `phaseNoteCopy` (the fixed field order), `phaseNotesSnapshot` (keys sorted).
- **Placement:** `placePhaseNotes(segments, hiatuses)` is called in `computeSchedule` after the swaps and builds
  `schedule.phaseNotePlace = {<week ISO>: [{key, phase, n, day, line, dayIso, dated, parked}]}`. That key is ABSENT
  with an empty store. Weeks come from `seg.weekNo` in date order, the n-th or the last. A shoot day is
  `seg.shootDays[n-1]` or the last. The day is `dow`, else the first day `segCoversDate` draws that is outside every
  hiatus (`autoNoteEdgeDefs`' `drawn()` rule), else the first day of overlap. `sortPhaseNotePlace` orders each week by
  its phase's `col`, a phase with no cell last, then by schedule order, weeks before shoot days, then n.
- **Drawing:** `effectiveNoteText` = own + linked (`wfLinkedLinesFor`, reading `currentSchedule`) + month lines.
- **Look:** `wfLinkedLook` behind `noteColorFor`, `noteFontSizeFor`, `textStyleOf('note')` and `syncRowHeights`
  (§4.3 as built).
- ⚠️ **The row-height migration (found by the leg's M1):** `syncRowHeights` migrated index-keyed `rowHeights` into
  `rowHeightsByWeek` whenever the latter was empty, to catch pre-10-Sep-2026 files. A linked note's height made
  `rowHeights` non-empty with an empty by-week map, so the next `update()` baked the height onto the week the note
  had just left. Two fixes:
  - `rowHeightsSynced`: the migration now skips the very object the last sync wrote.
  - `rowHeightsForFile()`: the file's legacy `rowHeights` leaves out heights a linked note lent (`rowHeightsLinked`),
    so a Load cannot migrate them either. It is the same object, so the same bytes, on every calendar without one.
- **Save:** captured after `autoNoteColors`, before `colWidths`. Sanitized beside `userNotes` (§5's rules, every bad
  field counted). Restored unconditionally beside `autoNoteNames`. Cleared by `resetWaterfallNotes` and `resetAll`.
- **The editor's save (step 2's "choice unchanged" half, built now so a file with a link cannot be damaged):**
  - `wfLinkedLineEdits` runs after `wfMonthLineEdits`, line by line, since a linked note can hold several lines.
  - A line kept keeps its note. One changed in place renames it, with a dated one's drawn date taken out. One taken
    out leaves its note, and a note with no line left is deleted.
  - Any change to `phaseNotes` makes the commit run `update()`, not `render()`: the leg's E1 caught the stale line.
  - `openNoteEditor` counts linked lines as known, not typed, so the Day picker and the switch are not for them.
- **A custom phase removed:** `unlinkPhaseNotesOf(phase)` runs in `removeCustomPhaseRow` before `update()`.
  - Each placed note becomes `userNotes` on its drawn week: after the week's own text, or merged into a typed note
    through `mergeNoteValues`. A dated note is pinned to its day.
  - The week takes the look it was wearing.
  - A note placed nowhere goes with the phase.
- **Shift:** a ⛔ comment beside `gridStintSwaps`' in `shiftCalendarDates`. Nothing re-keys `phaseNotes`.
- **Not yet (later steps):**
  - the Stays with row, the hint and linking from the editor (step 2);
  - the look written onto the note by the editor's colour, the style bar and a row drag (step 3; today those write to
    the week, which then owns the look);
  - Delete / Cut / Copy / Paste / drag (step 4; Delete leaves a linked line, a drag copies it as typed text);
  - the month view (step 5; linked notes are not drawn there yet);
  - choosing a shoot day from the editor (step 6). Placement already honours `@day<n>`.
- **Proof:**
  - `phasenotes` 21/21 on the build: P1, L1, M1–M8, U1, X1, X2, W1, E1, C1, F1, F1b, F2, F3, E0.
  - M1 was red before the `rowHeightsSynced` fix, E1 before the `update()` fix.
  - `npm run check` 40/40. In `gate.sh`'s generic block as `phasenotes:phasenotes:900`.

---

## 10. Step 2 as built (6 Nov 2026, branch `phase-notes`)

Owner: *"can we start step 2"*. The waterfall note editor's **Stays with** row and its save (§4.4, §4.5). It is
chrome plus the editor's save. No frozen edit and no save-format change: the row writes the step-1 store.

- **The row** (`openNoteEditor`) goes in today's editor after the Day row, which is A2's place 2. The A2 overhaul will
  move it.
  - It is `<div class="note-link-row">` holding `Stays with <select class="note-link-select">` (NO id), a hint
    (`.note-link-hint`, `.is-wait` amber) and R2(a)'s "Also here" line (`.note-link-also`).
  - It shows and hides with the Day row: it is for typed text. Linked lines count as typed again; step 1 had them
    "known".
- **What it offers:** `wfLinkContext(weekKey)` gives the week (value `''`), then each `type:'phase'` cell of the row by
  column, valued `<phase>@<n>` and labelled with the cell's own label.
  - **Opening on a home (R2(a)):** `single` is the cell's one linked note when the week has no typed text of its own,
    and the row opens on its key. Otherwise the row opens on the week, and every linked note drawn there is a visitor.
  - **A single note the row does not draw** (R3(a) waiting, or its phase hidden) gets its own option, "Prod Prep wk 8
    (waits on its last week)". So opening and saving never moves it.
  - **The home label:** `phaseNoteHomeLabel(key)`, the phase's own `template` at its label number.
- **Hint wording (R1, R3(a)):**
  - The week: "Stays on the week of 7/6/26, whatever the phases do."
  - A phase: "Moves when Production moves. Stays on its week 2."
  - Waiting: "Prod Prep has 6 weeks now. This note waits on its last week, and goes back to Prod Prep wk 8 if it
    grows."
  - The Day list's empty choice reads "First day (default)" on a phase (R6(a)) and "Mon (default)" on the week.
- **The "Also here" line (R2(a)):** "Also here: “Visitor” stays with Production wk 6", then either "Leave the choice
  alone and it keeps its link." or "Saving with this choice gives it this one instead."
- **Opening a single note:** the Day picker opens on its day (`dayIso` when dated), and "Show in month view" on its own
  `monthHidden`.
- **The save** (`commitActiveNoteEditor`) compares `sel0` (what the row opened on) with `choice` (what it says now):
  - **Unchanged:** `wfLinkedLineEdits(…, single)`, which now also takes `{key, dayIso}` for the cell's one note. Its
    weekday follows the Day picker (`dow`; `''` deletes it). The date the picker stamped is taken off its last line
    (`stripTrailingDate`, D3), so a changed Day never freezes a date into the text. The week's own text is saved with
    no date, because the Day was the note's.
  - **To a phase:** each visiting note is deleted. Every line in the box that is not automatic (`autoNotesText(autoIn)`)
    or a month line (`wfMonthLineEdits` runs first) becomes ONE note at the chosen key, joined to any existing note
    there.
    - The Day's stamp comes off and becomes `dow`, and the switch becomes `monthHidden`.
    - The cell's look moves onto the note (`wfCellLook`: the week's own, else its first visitor's, field by field), and
      the week keeps none of it.
    - The automatic lines stay the week's, through the usual path, so an untouched automatic line goes back to plain
      automatic.
  - **To the week:** the visitors are deleted and their lines stay in the box as the week's typed text, through the
    usual path with the Day picker's date. Each linked look goes to the week where the week has none.
- **After any save:**
  - A colour picked in the editor goes where the cell takes its look from: the note while the week has no typed text,
    else the week.
  - Any change to `phaseNotes` runs `update()`.
  - `wfLinkedLinesFor` now drops a note deleted since the schedule was placed.
- **CSS:** `legacy.css`, beside `.note-day-row`; the select shares `.note-day-select`'s chevron. **Help:** one passage
  after the Day dropdown's (D11).
- **Proof:**
  - New leg `phaselink` 14/14 (R1, R2, L1–L4, U1, D1, C1, V1, W1, P1, F1, E0).
  - On the same build: `phasenotes` 21/21, `noteviews` 15/15, `wfnoteeditor` 13/13, `wfnotecolors` 14/14,
    `holidayrename` 14/14, `autonoterename` 24/24, `autonoteview` 18/18, `wfkeys` 84/84.
  - That build went to a separate `dist-step2/` while step 1's gate was reading `dist/`.
  - **Full gate on the step-2 build: 4,206 PASS / 1 FAIL, every baseline identical.** The FAIL is `phasesui` P1, a
    Load timeout on one of 46 fixtures, 8/8 alone. This is the acceptance gate for steps 1 and 2 together.
- **Not yet:**
  - writing the look onto a linked note from the style bar and the row drag (step 3);
  - Delete / Cut / Paste / drag (step 4);
  - the month view's drawing and editor (step 5, which steps 2–4 must not ship without, see the status);
  - picking a shoot day (step 6).

---

## 11. Step 3 as built (6 Nov 2026, branch `phase-notes`)

Owner: *"Start step 3"*. The look travels (R7(a), D10). Step 1 made the READS linked-aware; step 3 makes every WRITER
of a Notes cell's look write on the linked note when the cell takes its look from one. It also drops the week's own
copy of that field, which would otherwise win.

- **The rule, `wfLinkedLookKey(weekKey)`:** the cell's first linked note, when the week holds no typed text of its own;
  else null, and the week's stores are written as ever.
- **The text style bar:** `applyGridTextStyle` hands a note key with a linked look to `applyLinkedTextStyle`.
  - It follows the bar's own rules: a size of 11 is stored as nothing, and a bold that is not bold, an italic that is
    not and a centred alignment are no override.
  - It merges over what the cell shows now (`textStyleOf`) and writes `style` / `size` on the note.
  - It deletes `textStyle.note[week]` / `noteFontSize[week]`. Clear removes both.
- **The row drag**, inside frozen `installGridResizers`, is observed, never edited (sanctioned pattern 3):
  - A capture-phase `pointerdown` on a row handle copies `rowHeightsByWeek`.
  - A task after `pointerup` / `pointercancel`, so after the frozen release in either listener order, moves any height
    that changed on a week with a linked look onto that note, deletes the by-week entry, and runs `syncRowHeights` and
    `markDirty`.
  - The row looks the same, and the drag's undo step (its `markDirty`'s debounced push) holds the moved height.
- **Resetting a row's height:**
  - The handle's double-click (autofit, also frozen) is observed the same way: a task after it runs
    `clearLinkedRowHeights([row])`.
  - The right-click menu's Reset row height (`wfResetSize`, not frozen) calls it directly.
  - Either way, a row whose height a linked note lent it (`rowHeightsLinked`, from the last sync) takes it off the
    note. Without this the next schedule would draw it straight back.
- **The note editor's colour (step 2's) now also drops the week's own colour**, which would otherwise have won over the
  pick.
- **Proof:**
  - New leg `phaselook` 10/10 (S1–S4, H1–H3, U1, C1, E0).
  - On the same build: `phasenotes` 21/21, `phaselink` 14/14, `rowheight` 7/7, `rowmigrate` PASS (the pre-10-Sep
    migration), `wfmenu` 39/39, `zoomresize` 40/40, `calzoom` 26/26, `notewrap` 16/16, `textstyle` 51/51.
  - **Full gate on the step-3 build: 4,217 PASS / 0 FAIL, GATE PASSED, every baseline identical.**
- **Not yet:**
  - Delete / Cut / Copy / Paste / drag (step 4: `wfNoteItem` still reads and writes the week's look);
  - the month view (step 5; its text style, `mvTextStyle.wfnote`, is keyed by a line's text and needs no change);
  - shoot days (step 6).

---

## 12. Step 4 as built (6 Nov 2026, branch `phase-notes`)

§4.6's waterfall half: Delete, Cut, Copy, Paste and the note drag (WATERFALL-KEYS-PLAN's code). The month view's line
drag (`moveWfLine`, §4.6's last bullet) belongs with step 5, since the month view does not draw linked notes yet. No
frozen edit, no save-format change. All in `src/legacy/app.js`, plus one Help sentence in `src/index.html`.

- **Delete and Cut:** `wfClearNote` calls a new `wfLinkedNotesOff(wk)`, which deletes every linked note drawn in the
  week. The note's look and row height go with it; the week's own look goes as it always did.
- **What a copy carries:** `wfNoteItem` reads the cell's look as it is drawn (`wfLinkedLook`, field by field: the
  week's own, else the look-lending note's).
  - It adds `height` only when the note lends it, i.e. the week has no row height of its own. A plain note never
    carried a row height and still doesn't.
  - The note's day goes as `dow` / `stamp` when the week has no pinned date of its own, and so does its
    `monthHidden`. `wfCleanClipItem` accepts `height` on rowHeightsByWeek's rule (1–100000).
  - A cell with no linked note builds exactly the item it built before.
- **Paste (`wfPutNote`):**
  - **Replace:** the target's linked notes are deleted, as its month lines are switched off.
  - **Pasted back onto itself** (the text equals the cell's whole text): nothing is deleted, and only the week's own
    part is written. The look goes where the cell takes it from (`wfLinkedLookKey`): onto the note through
    `wfLookOntoNote`, never onto the week, whose copy would win and stay behind. An identical paste moves no store, so
    no undo step is banked.
  - **Plain text** (no SPTCal data) over a cell whose look a linked note lent: the look stays the cell's (`lend` →
    `wfLookToWeek`), including the row height and "Show in month view" off, as typing over it would. A blank paste
    is Delete and lends nothing.
  - **A rich paste:** the item's look replaces as before, and its lent `height` becomes the week's row height.
  - `wfLookToWeek` is now the one helper for "a linked note's look handed to the week where it has none". The editor's
    to-the-week save and `unlinkPhaseNotesOf` call it too; the same four lines were there twice.
- **Drag (`wfNoteDragEnd`):** `wfNoteParts(wk)` is taken for every dragged week before anything changes. It holds the
  week's own text (typed or automatic), its pinned date, its month lines, each linked note (copied), the look-lending
  note, and the look the week itself lends while a note is its look. It is null for a week with no linked note, which
  goes the old way (`wfPutNote`), unchanged.
  - **`wfRelinkKey`:** a note keeps its phase when the drop week's row draws a cell of that phase
    (`wfLinkOptions`, factored out of `wfLinkContext`), re-keyed to that week's n.
    - A shoot-day note goes by day: the same weekday of the drop week becomes `production@day<m>` when Production
      shoots it, else Production's week there with that weekday as `dow`.
    - Otherwise the note lands as plain text: its last line's drawn date is moved to the same weekday (`moveDay`,
      through `stripTrailingDate`).
  - **`wfPutLinked`:** the plain part (own text, flattened lines, month lines) goes through `wfPutNote` with the
    item's look, so the cell keeps the look it was drawn in.
    - The week's own pinned date is re-stamped wherever its line now sits.
    - A day or "Show in month view" that came from a note that stays linked is taken off the plain part: they
      travel on the note.
    - Then each re-linked note is written (two landing on one key join their lines). When the cell lands holding
      only re-linked notes, the look its week lent goes on the first of them in the drop week's column order.
- **`wfNoteStep`:** its signature also holds `phaseNotes` and `rowHeightsByWeek`. Either one moving runs `update()`, since
  `computeSchedule` places linked notes and `syncRowHeights` draws heights. A calendar with no linked note never moves
  either in these paths.
- **Why one store re-keyed in place is safe across a multi-week drop:** sources are cleared first, from the placement
  the drag began on. A key created for a drop week is that week's own n (or its shoot day), which the old placement
  draws in that same week, so a later drop week's "replace" can never delete it.
- **Help (D11):** "A note that stays with a phase keeps it when you drag it to a week that phase runs in, and becomes
  a plain note of the week anywhere else; a pasted copy is always a plain note of the week you paste it in."
- **Proof:**
  - New leg `phasekeys` 18/18 on the build (sha256 `cce7eb42…`): D1, D2, U1, X1, C1–C4, G1, GU, G2–G7, F1, E0. On
    the step-3 build, 14 of the 18 fail. The 4 that pass there: C4, GU, F1, E0.
  - Green on the same build: `phasenotes` 21/21, `phaselink` 14/14, `phaselook` 10/10, `wfkeys` 84/84, `noteviews`
    15/15, `wfnotecolors` 14/14, `wfnoteeditor` 13/13, `holidayrename` 14/14, `autonoterename` 24/24, `autonoteview`
    18/18, `wfmenu` 39/39, `wfkeysreal` 6/6, and `npm run check` 40/40.
  - In `gate.sh`'s generic block as `phasekeys:phasenotes:900`.
  - **Full gate on the step-4 build: 4,235 PASS / 0 FAIL, GATE PASSED**, alone on port 8957, finished 16:34 on 6 Nov. Every baseline is identical: gates 2 and 3, the restore and `fields.byId`, gate 10's print documents, and gate 13's written month PDFs (byte for byte). `phasekeys` was in it, 18/18.
- **Noticed, not changed (plain notes, before this step):** `wfCleanClipItem` drops `monthHidden`. So a note copied
  with "Show in month view" off pastes with it on, and a copy pasted back onto itself switches it on again. A drag is
  unaffected, since its items never pass the cleaner. A one-line follow-up if wanted.
- **Not yet:**
  - the month view, which draws linked notes through `mvWfLinesFor` and gets its editor row and the line drag
    `moveWfLine` (step 5);
  - picking a shoot day (step 6).

