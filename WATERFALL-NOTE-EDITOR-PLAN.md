# WATERFALL-NOTE-EDITOR-PLAN.md: the waterfall's note editor says what a line is, and hides it

**Status: RULED, 4 Nov 2026 (owner, by picker: R1(a), R2(b), R3(a)). Nothing built.** Branch `wf-note-editor` (worktree
`.claude/worktrees/wf-note-editor`, from `main` at `c5fd2ce`; its `node_modules` is a symlink, so unlink it before
`git worktree remove`). Tracker cards `wf-hide-auto-note` and `wf-holiday-editor-mode`.

- **The asks** (owner):
  - 30 Oct 2026, on the waterfall editor open over National Day for Truth and Reconciliation, which read "NOTE ·
    9/28/26": *"why does this still show as Note in the waterfall"* (card `wf-holiday-editor-mode`).
  - 4 Nov 2026, after the month view's button became Hide Auto-Note: *"Should there be an equivalent hide auto note
    button in the waterfall view?"*, then *"Yes, plan both"*.
- **The short answer:** one change to one editor. It names what the cell holds, and lists the cell's automatic notes and
  holidays under the text box, each with its own Hide. No frozen code (`.note-pop` is a body-level panel, outside
  `#table-wrap`), no save-format change.

---

## 0. How it works today (read this first)

- **One text box for the whole cell.** A waterfall Notes cell is one week. Double-click, Enter or typing opens
  `openNoteEditor`: the heading "Note · <the week's Monday>", one text box holding everything the cell shows, a Day
  picker, the note palette and (since 4 Nov 2026, `noteviews`) a "Show in month view" switch for the week's TYPED lines.
- **A cell can hold four kinds of line:**
  - an automatic note ("Start Principal Photography 6/29/26"), a kind's (`isKindNote`);
  - a holiday the user ticked for the waterfall ("Independence Day (Observed) 7/3/26");
  - a month note switched on for the waterfall ("Crew party 11/6/26", `dayNotes[day][i].waterfall`);
  - text the user typed.
- **What the save does with them** (`commitActiveNoteEditor` → `wfMonthLineEdits`, then `wfLineEdits`):
  - same number of lines, one changed: an automatic note's or holiday's line is RENAMED and stays automatic;
  - only lines taken out: each one is HIDDEN FROM THE WATERFALL (an automatic note through `hideAutoNoteIn(kind,
    'sheet')`, a holiday through `hideHolidayInWaterfall`; per view since 4 Nov 2026, AUTO-NOTES-PER-VIEW-PLAN.md R4);
  - ⚠️ **anything else saves as typed text.** Rename a line AND add one in the same save, and the rename is lost (the
    line is frozen as text under the old name). Take a line out AND type something, and the note is not hidden: the
    week's typed text simply lacks it, so it vanishes from that week and comes back in its new week after a move.
- **So the editor already CAN hide a line** (take it out of the box), and so can Delete on the cell and the right-click
  Clear. Nothing on screen says so, and the heading calls every cell a "Note".
- **The month view is already done this way:** a click on an automatic note opens "6/29/26 · Auto Note" (its name, its
  own month colour, Hide Auto-Note); on a holiday, "7/3/26 · Holiday" (its name and colour, no button, owner's picker
  of 2 Nov 2026: the month view is a holiday's home).

---

## 1. What it would look like

A cell holding ONE automatic note:

```
 AUTO NOTE · 6/29/26
 ┌──────────────────────────────────────┐
 │ Start Principal Photography 6/29/26  │   the box still holds the cell, so a line can be added
 └──────────────────────────────────────┘
 [■ ■ ■ ■ ■ ■ ■ ■ ■ ■]  colours (the cell's highlight)
 Hide Auto-Note                              hides it from the Waterfall, Excel and the waterfall PDF
 Renames it wherever it shows · Its date follows the schedule · Tab to save · Esc to cancel
```

A cell holding several lines:

```
 NOTE · 6/29/26
 ┌──────────────────────────────────────┐
 │ Start Principal Photography 6/29/26  │
 │ Independence Day (Observed) 7/3/26   │
 │ Table read                           │
 └──────────────────────────────────────┘
 Day [Mon (default) ▾]   [■ ■ ■ ■ ■ ■ ■ ■]   Show in month view [✓]
 In this cell:
   ↻ Start Principal Photography     Hide
   ⚑ Independence Day (Observed)     Hide
```

- The heading names the cell when it holds one thing: "Auto Note · <its date>", "Holiday · <its date>"; otherwise
  "Note · <Monday>", as today.
- ↻ and ⚑ are the month view's marks (frozen edit NS1's icons), so the two views speak alike.
- Hide acts at once (ruling R2(b)): its line leaves the cell, the editor saves what else is in it, as Tab would, and closes.
  Ctrl/Cmd+Z brings it all back in one step.

---

## 2. Rulings (RULED, owner, by picker, 4 Nov 2026)

- ✅ **R1(a)** Hide Holiday too, waterfall only. **R2(b)** Hide acts at once and closes the editor (not the
  recommendation). **R3(a)** a list under the box. The options as they were put:


- **R1. A holiday's line: Hide too?** In the waterfall a holiday is opt-in (unticked there by default), so hiding one
  undoes the user's own tick, and Delete on the cell already does exactly this.
  - **(a) Yes, "Hide Holiday", waterfall only (recommended).** It stays in the month view and stays a day off.
  - (b) No: the list shows holidays without a button, as the month view's holiday editor has none.
- **R2. When Hide acts.**
  - **(a) It takes the line out of the box at once and applies on save (recommended).** Like the swatches, nothing is
    final until Tab / click-away; Esc undoes; several can go in one save, and that save is one undo step.
  - (b) At once, saving and closing the editor, as the month view's Hide Auto-Note does.
- **R3. A cell with several lines.**
  - **(a) The list "In this cell:" under the box, one row per automatic note and holiday, each with Hide
    (recommended).**
  - (b) No list; a one-line hint ("Take an automatic line out to hide it from the Waterfall") under the box.

---

## 3. Defaults taken (no ruling needed; say if any should change)

- **D1. The box always holds the whole cell**, its date included, so a line can always be added (the revised proposal
  on card `wf-holiday-editor-mode`, 30 Oct 2026). The month view's Auto Note editor holds the name only; the waterfall's
  cannot, because a waterfall cell is a week and the owner wants to add lines there.
- **D2. A rename and an added line in one save both stick.** `wfLineEdits` matches the box's lines to the cell's by
  content (a longest-common-subsequence alignment), not by count: an automatic or holiday line missing from the box,
  with a new line in its place, is a rename (unless the new line carries another date, the rule today); one with nothing
  in its place is hidden; every other new line is typed text. Today's two cases (same count; only removals) are the
  special cases of that, so they behave exactly as now.
- **D3. Hide is explicit, and saves the rest (R2(b)).** Pressing a row's Hide (or the single item's button) takes that
  line out of the box, hides its note through `hideAutoNoteIn(kind, 'sheet')` / `hideHolidayInWaterfall(hid)`, then
  commits the editor exactly as Tab does, so a line typed or a colour picked before pressing it is saved, not lost
  (the month view's button discards a typed rename; there the box holds only the name, here it holds the whole cell).
  The hide is applied whatever else the save does, so "type a line, then Hide" hides it, which removing the line by
  hand today does not (§0). One gesture, one undo step.
- **D4. The Day picker is hidden while the cell holds only automatic notes and holidays**: their dates are their own,
  and picking a day would stamp a second date onto their line. It shows as soon as the box holds a typed line.
- **D5. "Show in month view" is hidden while the cell holds no typed text**: it governs typed lines only
  (`noteviews` R3), so on an automatic note or a holiday it would do nothing. The month view's Holiday and Auto Note
  editors have no switch either (the owner's picker on `noteviews`, R4); the Settings card and the Holidays list are
  where those are split per view.
- **D6. The colour row is the cell's highlight**, as now (one waterfall cell, one fill). An automatic note's or
  holiday's own month colour stays the month view's.
- **D7. Month notes shown in the waterfall are not listed.** They are the user's own notes (`noteviews` R2: take the
  line out to switch it off for the waterfall), and the ask was about automatic notes and holidays.
- **D8. Hint line.** One automatic note: "Renames it wherever it shows · Its date follows the schedule". One holiday:
  "Renames this holiday wherever it shows". Otherwise today's.
- **D9. No right-click item** (lean right-click menus). Delete and Clear keep doing what Hide does.
- **D10. Help text** (`src/index.html`, the notes paragraph): the waterfall editor names automatic notes and holidays
  and has Hide.

---

## 4. How it works

- **`openNoteEditor`** (not frozen): classify the cell's lines once, from `sheetAutoNotesFor(weekKey)` (kinds and
  holidays, by `autoNoteLine`), `wfMonthLinesFor(weekKey)` (month notes) and the rest (typed). Pick the heading (D1/§1),
  hide the Day picker (D4) and the switch (D5) when there is no typed line, and render the list (R3) from the automatic
  and holiday lines, each row `data-kind` or `data-hid`, no ids. Store the classification on `activeNoteEditor`.
- **A row's Hide** (`mousedown` prevented, as the swatches'): remove its line from the text box (the first line equal to
  it, trimmed), set `activeNoteEditor.hide = {kind | hid}`, and call `commitActiveNoteEditor()`.
- **`commitActiveNoteEditor`**: when `hide` is set, hide that note first (D3), then run the existing path with
  `sheetAutoNotesFor(weekKey)` re-read (so the hidden line is no longer "automatic text" the save compares against),
  then D2's `wfLineEdits`. A hide always ends in `update()` (a switch moved), which banks the one undo step.
- **The heading is fixed when the editor opens**: it names what the cell held then, as the month view's heading does,
  and does not change as the box is edited.
- **CSS** in `legacy.css` beside `.note-pop`: the list (the month view's `.note-pop-delete` look for Hide), the ↻ / ⚑
  icons reused from NS1's data URIs. All under `.note-pop`, which is a body-level panel: `buildSavedHtml()` already
  strips it.

---

## 5. Steps

1. **The heading, the Day picker and the switch** (§1, D1, D4, D5, D8). Leg `wfnoteeditor`: each heading on a fixture
   cell (one automatic note, one holiday, a mix, a typed note, a month note shown in the waterfall), the Day picker and
   switch shown and hidden, no id in the popover, nothing saved by opening and closing.
2. **The list and Hide** (R1-R3, D3, D7). Leg cases: Hide on each kind of row (an automatic note, a holiday), the
   single item's button, then the waterfall cell, the month view and the saved stores; the editor closed; one undo puts
   it all back; a line typed before Hide is saved too; Hide on a note the month view already hides switches it off.
3. **Rename + add in one save** (D2). Leg cases: rename a holiday and add a line, rename an automatic note and add a
   line, both stick; take a line out and add one: hidden (D3 covers the explicit Hide; this is the box path).
   - Red on a build without D2 for these cases.
4. **Help text, HANDOFF, README, tracker.**
- Neighbours to hold: `wfkeys`, `wfmenu`, `holidayrename`, `autonoterename`, `autonoteview`, `noteviews`, `textstyle`,
  `notewrap`. No full-gate baseline can move: no output changes for any calendar whose editor is not used, and the leg
  drives the editor. The full gate still runs before a push.

---

## 6. Risks

- **The box and the list can disagree** if the user edits a listed line by hand and then presses its Hide: Hide removes
  the first line equal to the row's text; a line already changed no longer matches, so the edited line is saved as the
  user's own text and the note itself is hidden (the hide wins over the rename).
- **A long cell** pushes the list down; the popover already moves above the cell when there is no room below (`place`).
- **Two identical lines** (a holiday twice in one week cannot happen; a typed copy of an automatic line can): the first
  match is the automatic one, as N2 and `wfLineEdits` already assume.
