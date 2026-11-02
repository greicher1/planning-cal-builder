# AUTO-NOTES-PER-VIEW-PLAN.md: automatic notes shown per view, and automatic notes for custom phases

**Status: RULED, 2 Nov 2026 (owner, by picker: R1(a), R2(a), R3(a), R4(a), every one the recommendation). Nothing
built. Next: step 1, on a branch, once the owner says go.** Tracker cards `auto-notes-per-view` and
`custom-phase-auto-notes`. Related, already ruled and not built: [`AUTO-NOTE-RENAME-PLAN.md`](AUTO-NOTE-RENAME-PLAN.md)
(card `rename-auto-notes`), which this plan has to fit (§2 R4, §7).

- **The asks** (owner, 2 Nov 2026):
  - *"Can automatic notes be seperated like holidays so you can indepentenly show/hide them in the waterfall and
    month view"*
  - then *"Can we also add automatic notes for all custom phases too"*
  - then *"Write the plan"*.
- **The short answer given in chat:** both are possible. The per-view part needs one small frozen edit
  (`notesForWaterfallDate`) so that weeks whose waterfall note was typed in behave. The custom-phase part needs no
  frozen code.

---

## 0. How it works today (read this first)

- **One tick per kind, both views.** Settings ▸ Preferences ▸ Automatic notes (`AutoNotesCard`, Sidebar.jsx) has one
  plain, id-less checkbox per kind (`data-autonote="<kind>"`). Two stores answer "is this kind on?"
  (`autoNoteKindShown`):
  - `autoNotesOff`: absent = shown. Holds ruling 9's three kinds (`writersRoomOpens`, `principalStart`,
    `principalWrap`).
  - `autoNotesOn`: absent = hidden. Holds the nine phase edges (`AUTO_NOTE_PHASE_EDGES`, 27 Oct 2026), which start off.
  - Both are PERMANENT snapshot keys, written only while non-empty.
- **Holidays are per view already.** `holidayView[hid] = {sheet, month}`, default hidden in the waterfall and shown in
  the month view (`HOLIDAY_VIEW_DEFAULT`), with Waterfall and Month boxes in the Holidays list (`.hv-cb`,
  `data-view`).
- ⭐ **There is ONE filter, and it already takes the view:** `autoNotesForView(list, view)`. Every reader of
  `schedule.notesByIdx` goes through it:
  - `'sheet'`: the waterfall, Excel, the waterfall PDF, `sheetColumnWidths` and the waterfall note editor's pre-fill.
  - `'month'`: the month view (through `notesForWaterfallDate`), so both month PDFs, which read that view's HTML.
  - The four raw readers left (`mvHolidayLineInfo`, `wfHolidayRenames`, `writeActiveMvNote`'s `weekAuto`,
    `weekAutoTexts`) either take holidays only or filter right after.
  - It also drops a phase's notes from `'sheet'` while that phase is hidden in the waterfall (`phaseHiddenIn`).
- ⚠️ **A typed waterfall note REPLACES its week's automatic text** (`userNotes[week]`, `effectiveNoteText`). That is
  what makes per-view harder than one filter:
  - The waterfall editor opens on the waterfall's automatic text and saves the whole cell as typed text.
  - The month view then draws the typed text's lines (`notesForWaterfallDate`'s override branch) instead of the
    week's automatic notes.
  - Holidays hit exactly this, and audit M-13 (frozen edit, 25 Sep 2026) fixed it two ways. Under a typed note, the
    month view puts back any holiday it shows that the waterfall does not. And the month editor leaves those lines
    out of what it saves (`writeActiveMvNote`'s `monthOnly` set).
  - The same hole is already on record for hidden phases (HANDOFF, PHASES-TAB-PLAN entry). A waterfall note typed
    into a hidden phase's week removes that phase's notes from the month view too.
- **Custom phases are never auto-noted.** `computeSchedule` dates the nine edges from `AUTO_NOTE_PHASE_EDGES` with
  its `drawn()` helper (the first or last day the month view draws the bar, outside every hiatus), built-ins only.
  Custom keys are `custom<n>`, never renumbered on removal. An undo can lower `customPhaseCounter`, so the next Add
  mints the same key again.
- **Dragging a waterfall line to another day in the month view** goes through `moveWfLine`, which reads the
  WATERFALL's lines. A line the waterfall does not have makes it return false, and the drop already puts everything
  back (`restore()`).

---

## 1. What it would look like

**Per view:** the Automatic notes card gets a Waterfall box and a Month box for every note, as the Holidays list
has. Unticking both is the same as switching the note off today. Examples:
- "Post Begins" only in the month view, where the bars already show the phases: it stays out of the waterfall's Notes
  column, and out of Excel and the waterfall PDF too. The Notes column gets narrower.
- "Start Principal Photography" only in the waterfall.

**Custom phases:** every custom phase gets a Begins and an Ends note, "<its name> Begins 7/5/27", dated as the
built-in phases' are. Its card rows appear and disappear with the phase, and a renamed phase's notes follow its name.

---

## 2. Rulings (all RULED, owner, by picker, 2 Nov 2026)

- ✅ **Answered:**
  - **R1(a)** grouped by phase;
  - **R2(a)** approve N1 and N2 with the gate, hidden phases included;
  - **R3(a)** custom-phase notes start off;
  - **R4(a)** a delete hides the note from the view you are in. That amends AUTO-NOTE-RENAME-PLAN rulings 4–6 for
    automatic notes; that plan carries the note.
- The options as they were put:

- **R1. The card's layout.** It has ~245 px in a narrow window (measured 27 Oct 2026).
  - **(a) Grouped by phase (recommended).** A Waterfall | Month heading row, then each phase's name, then its
    two notes ("Opens", "Closes"; "Begins", "Ends"; "Starts", "Wraps"), each with two boxes. Short words, so nothing
    wraps at 245 px. Custom phases follow, in their calendar order.
  - (b) One row per note with its full name ("Start Principal Photography"), as the Holidays list does. Long names
    wrap to two lines at 245 px.
  - (c) Keep today's grid and add a "Show in: Waterfall | Month view" switch above it. Fewest boxes, but which view
    you are editing is hidden state, which goes against "every setting easy to understand".
- **R2. The frozen edit in `notesForWaterfallDate`** (§4.3). Without it, a note shown only in the month view
  disappears from the month view as soon as anyone types in that week's waterfall note.
  - **(a) Approve N1 and N2 with the gate in §6 (recommended).** N1 also fixes the hidden-phase hole in §0.
  - (b) Approve, but leave hidden phases as they are (N1 for the new ticks and holidays only).
  - (c) No frozen edit. The ticks then hold only in weeks nobody typed in.
- **R3. Custom-phase notes start:**
  - **(a) Off, like the other phase starts and ends (recommended).** No saved calendar changes.
  - (b) On. Every calendar with a custom phase gains notes when it opens, and its Notes column and exports widen.
- **R4. Delete Auto-Note (AUTO-NOTE-RENAME-PLAN rulings 4–6), now that a note can be in one view:**
  - **(a) A delete hides the note from the view you are in (recommended).** The waterfall's Delete key already does
    this for a holiday (rename-plan ruling 6). Ticking its box brings it back.
  - (b) Keep ruling 4 as ruled: a delete in either view switches the note off in both.

---

## 3. Defaults taken (no ruling needed; say if any should change)

- **D1. The save format.** New PERMANENT key **`autoNotesView`**, shaped like `holidayView`:
  - `{<kind>: {sheet: false}}` or `{<kind>: {month: false}}`, meaning that kind is not shown in that view.
  - Written only while some kind is shown in exactly one view (sorted keys), so a calendar that never splits a note
    saves byte for byte as before.
  - On and off stay in `autoNotesOff` / `autoNotesOn`: both boxes unticked writes "off" there and deletes the
    kind's `autoNotesView` entry; both ticked writes "on" and deletes it; one ticked writes "on" plus the entry.
  - So an older build opening a file with a split note shows it in both views rather than in neither.
  - Sanitized: only a plain object holding exactly one of `sheet` / `month` set to `false`; anything else is dropped
    (a hostile entry shows the note in both views). Unknown kind words are kept, as the other two stores keep them.
  - Restored unconditionally, cleared by `resetAll()`. No `SNAPSHOT_VERSION` bump.
- **D2. A phase hidden in the waterfall** dims that phase's Waterfall boxes and keeps their value (hiding the phase
  takes its notes out of the waterfall anyway). Unhiding brings the ticks back as they were.
- **D3. Custom kind words** follow the permanent pattern already declared (`<phase key>Start|End`): `custom3Start`,
  `custom3End`. They are opt-in (absent = hidden), stored in `autoNotesOn`, which already keeps unknown words. A
  removed custom phase's entries are pruned in `removeCustomPhaseRow` (with `autoNotesView`'s, and the rename plan's
  names once that exists), beside `phaseHidden` and `phaseEnds`.
- **D4. A custom note's words** are "<name> Begins" / "<name> Ends", the name as typed in the Phases tab, else the
  default "Custom phase". Days and Dates custom phases are dated by the same `drawn()` rule. Episode prep bars are not
  custom phases and get no notes.
- **D5. Dragging a month-only line to another day** in the month view is refused and snaps back (`moveWfLine` already
  does this). Changing where it sits (above the bars, under a phase, at the bottom) still works.
- **D6. No right-click menu items** (lean right-click menus). The card is the one place to choose.
- **D7. Help text:** the card's InfoHint and the Help notes paragraph (src/index.html) say each note can show in either
  view or both, and that custom phases have them too.
- **D8. Column widths follow** (`sheetColumnWidths` reads `'sheet'`). Taking a note out of the waterfall can narrow
  its Notes column, and the orientation rule can then flip the printed page, as a holiday tick already can
  (MANTINE-SEAM §5.10). That is the point of the setting, not a regression.

---

## 4. How it works

### 4.1 The filter (not frozen)

- `autoNoteShownIn(kind, view)` = `autoNoteKindShown(kind)` and not `autoNotesView[kind][view] === false`.
- `autoNotesForView` asks it instead of `autoNoteKindShown`. That one line reaches every reader in §0, so every week
  nobody typed in is right in every view and every export.
- `autoNoteOptIn(kind)` = `AUTO_NOTE_OPT_IN.has(kind)` or `/^custom\d+(Start|End)$/`. It replaces
  `AUTO_NOTE_OPT_IN.has` in `autoNoteKindShown` and in the card's change listener.

### 4.2 Custom-phase notes (`computeSchedule`, not frozen)

- After the `AUTO_NOTE_PHASE_EDGES` loop, push one Begins and one Ends edge per custom phase segment into the same
  `edges` array, `{kind: key + 'Start' | 'End', phase: key}`, so all the edges are added in date order.
- The notes are always computed and the filter hides them while unticked, exactly as the nine built-in edges are.
  Every raw reader of `notesByIdx` (§0) was checked for that when the nine shipped.
- They are tagged with their phase, so a custom phase hidden in the waterfall takes them out of it.

### 4.3 Typed waterfall notes: frozen edits N1 and N2 (`notesForWaterfallDate`, the override branch)

- **N1, put back what the waterfall does not show.** Today the M-13 rule re-adds, under a typed note, each holiday
  the month view shows and the waterfall does not. N1 widens that test from holidays to every automatic note, through
  a non-frozen helper, `autoNoteMonthOnly(n)`: true when `autoNotesForView([n], 'sheet')` drops the note (the list is
  already the month's).
  - For a holiday this is exactly today's test, since a holiday note has no kind and no phase tag.
  - Under R2(a) it also covers a hidden phase's notes. Under R2(b) the helper ignores the phase tag.
  - The M-13 rule that a line is added once, never twice, stays as it is.
- **N2, leave out what the month view does not show.** A typed note opened on the waterfall's text, so it carries the
  waterfall-only lines word for word. N2 skips an override line that equals one of the week's waterfall-only
  automatic lines (non-frozen helper `wfOnlyAutoLines(schedule, weekIso)`: the week's notes `'sheet'` shows and
  `'month'` drops).
  - A line you edited no longer matches, so it is your note and shows in both views, as an edited note always has.
  - This also covers a holiday ticked for the waterfall and unticked for the month view, which today leaks into the
    month view under a typed note.
- Each is one line inside the frozen function. The helpers sit outside it.

### 4.4 The month view's note editor (`writeActiveMvNote`, not frozen)

- Its `monthOnly` set uses `autoNoteMonthOnly` instead of the holiday-only test, so a month-only note is never baked
  into the waterfall's text.
- The editor opens on the MONTH's lines, so the week's waterfall-only lines are not in what it saves, and saving would
  delete them from the waterfall. They are put back, in the order the waterfall's text had them.
- The "no text left, drop the week's colour" check reads the waterfall's text, not the month's.
- ⚠️ Until the rename plan lands, editing a month-only line in the month view saves it as typed text, which then shows
  in the waterfall too. §7 orders the work so that never ships.

### 4.5 The card

- The engine renders the whole note list into the card's `.autonote-list` (React keeps the heading and InfoHint and
  renders the list empty), as `#holiday-vis-list` is engine-rendered inside its React card. One renderer, because
  custom rows come and go with the phases and React does not know them.
- Still plain checkboxes with NO id (`collectFieldValues` must never see them), now `data-autonote` + `data-view`.
  The delegated change listener writes D1's three stores, then `update()`, and banks one undo step.
- Rebuilt only when the phase list or a name changes, so a box never re-renders under the pointer.

---

## 5. The frozen edits, in one place

| Edit | Where | What | Inert when |
|---|---|---|---|
| N1 | `notesForWaterfallDate`, override branch | M-13's re-add widened from holidays to `autoNoteMonthOnly(n)` | no note is month-only except holidays (every calendar saved today, unless R2(a) and a hidden phase has a typed week) |
| N2 | `notesForWaterfallDate`, override line loop | skip a line in `wfOnlyAutoLines(schedule, weekIso)` | no note is waterfall-only (a holiday ticked for the waterfall and not the month is the one existing case) |

Nothing in `renderMonthView`, the width model, `exportExcel`, `buildWaterfallPdf` or the month-PDF writer changes.

---

## 6. Steps

1. **Custom-phase notes** (§4.2, D3, D4; card rows in today's layout). No frozen code. Can ship alone.
   - Leg: extend `autonotephases`.
     - A custom phase's notes are off by default; ticked, they show on the first and last drawn day in the waterfall
       and the month view.
     - They follow a rename; Weeks, Days and Dates units.
     - Hidden in the waterfall: gone there, kept in the month view.
     - Removed: pruned. Undo, and an Add on the re-minted key, starts unticked.
     - Save and load round trip, and an old file opens unchanged.
   - Neighbours: `autonotekinds`, `settingswin`, `hidewf`, `customunits`, `phasesui`, `monthnotes`. Full gate: the
     notes are off by default, so every baseline must stay byte-identical.
2. **The per-view store and the card** (§4.1, §4.5, D1, D2, R1). No frozen code.
   - New leg `autonoteview`.
     - Each split shows in its own view only: waterfall, Excel cells, waterfall PDF text and the Notes width for
       `'sheet'`; the month view and the written month PDF for `'month'`.
     - Both unticked = off, both ticked = no entry. Byte-identical save for an unsplit calendar.
     - Hostile file (malformed entries, `__proto__`).
     - Undo is one step per tick.
     - An older file opens unchanged.
3. **N1 + N2 + the month editor** (§4.3, §4.4, R2). Frozen, owner sign-off. Ships WITH step 2: step 2 alone makes a
   month-only note vanish from the month view under any typed waterfall note.
   - Leg `autonoteview` grows the typed-week cases:
     - typed in the waterfall: the month-only line stays in the month view, once;
     - waterfall-only line in a typed week: not in the month view; edited, it shows in both;
     - edited from the month view: no month-only line reaches the waterfall, no waterfall-only line is lost.
     - Red on two mutants (N1 removed; N2 removed).
   - `monthnotes` (M-13) unchanged.
   - **Acceptance gate:** the full gate green. The waterfall PDF and every Excel part byte-identical. Gate 10's print
     documents and gate 13's written month PDFs byte-identical. If any baseline moves (only possible under R2(a)
     with a hidden phase in a typed week, or a waterfall-only holiday in a typed week), it moves only by those lines,
     checked line by line and shown before any re-cut, as HT1 was.
4. **The rename plan's Delete per view** (R4), built with AUTO-NOTE-RENAME-PLAN.md.

---

## 7. Order, and how this fits AUTO-NOTE-RENAME-PLAN

- **Recommended:** step 1, then AUTO-NOTE-RENAME-PLAN, then steps 2 + 3 + 4.
  - The rename plan makes every edit of an automatic note keep it automatic: typing over its line in the waterfall,
    or editing it in its "Auto Note" editor in the month view. Its view ticks then keep holding after an edit, which
    closes the one leak §4.4 can't (a month-only line edited in the month view and saved as typed text).
  - The rename plan's name store is keyed by kind, so custom kinds (step 1) join it with no extra work; build step 1
    first so they exist.
- If steps 2–3 must come first, the month editor saves an edited month-only automatic line as a month DAY note on its
  day instead, so it stays out of the waterfall. That is a stopgap; the rename plan replaces it.

---

## 8. Risks

- **A typed line identical to a waterfall-only automatic line** ("Post Begins 7/5/27" typed by hand in that same
  week) is treated as the automatic one by N2 and hidden from the month view. They can't be told apart; it matches
  the automatic text word for word.
- **An older build** shows a split note in both views (D1). New files into old builds are not supported, and this
  fails toward showing.
- **The card gets taller:** 6 phases × 3 lines plus 3 per custom phase. Measure it in the Settings window at its
  narrowest before choosing R1(a)'s spacing.
- **Shift tools and grips** (`rewriteMovedAutoNotes`, `autoNoteBaseline`) already compare against both views' text
  (`weekAutoTexts`), which differ once a note is split, as they do for holidays. The tie rule ("the sheet's, unless
  the month's also matches and is longer") was written for exactly that. Step 3's leg holds a shift and a grip drag
  over a typed week with a split note.
