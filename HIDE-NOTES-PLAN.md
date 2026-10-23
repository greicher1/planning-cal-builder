# HIDE-NOTES-PLAN.md: hide a year's Notes column in the waterfall

**Status: BUILT on branch `hide-notes` (worktree `.claude/worktrees/hide-notes`), 22 Oct 2026.** The owner's picker
the same day: *"Sign off all"*, which approves every frozen edit in §6, including the on-screen strip, with §6's gate.
Then *"build it"*. The `notescols` leg passes 48/48 and is red on the pre-change build. §9 records what changed in
the build from the plan. Nothing is merged or pushed without asking.
⚠️ **Superseded in part the same day by [`HEADINGS-EDITABLE-PLAN.md`](HEADINGS-EDITABLE-PLAN.md):** the Custom Column
Headings switch is gone, so the headings-off Notes panel (`openNotesColPop`, §2/§4 below) is retired. Every heading
opens the heading editor, which carries the same "Has notes" badge and Hide column button.

Owner, 22 Oct 2026:

> *"we need an option to be able to hide unused notes collumns"*

Four options were put to the owner. They chose **B, hide each column by hand**, from two clickable mockups in chat. On
the second they ruled:

> *"you can just flag that a collumn contains notes, you dont need to specificy. we want to keep things clean and
> elegant and in mantine style."*

On the tracker as `hide-notes-columns`.

⚠️ **Not to be confused with** HANDOFF §2c ("Split and extra notes columns", held since 29 Aug 2026). That one changes
what a Notes column contains. This one only takes a whole Notes column off the page, and with nothing hidden every
output is byte-identical to today's.

⚠️ **It relaxes owner ruling 2 (20 Oct 2026),** "A Notes column stays on every year", but only for a calendar where
someone has hidden one.

---

## 1. How the Notes column works today

- **One Notes column per year block** (`computeYearBlocks`), so a three-year calendar has three. Single Column Mode
  has one in total, keyed by the first year.
- **An empty one still costs width.** `sheetColumnWidths()` floors it at 8 characters (`clampChars(…, 8,
  COL_MAX_CHARS_NOTES)`), and it prints its "Notes" heading in Excel and in the PDF.
- **One column model, three renderings.** `sheetColumnWidths()` returns each block's `cols`
  (`[date, ...phase slots, notes]`). The on-screen `<colgroup>`, the drag handles, `sheetGridMetrics()` (and with it
  `sheetPageOrientation()` and the PDF's fit scale), the waterfall PDF's columns, the side boxes' placement and the
  custom headings (`headerRowRuns`) all walk it. ⭐ **So taking the Notes entry out of `cols` moves most of the
  outputs at once.** §6 lists the places that do NOT follow by themselves: they assume the Notes column is `cols`'
  last entry, or they write it by name.
- **Two writers name it directly:** `exportExcel` (`notesCol = labelColEnd + 1`, `widths.notes`) and
  `buildWaterfallPdf` (`cols[cols.length-1]` is the notes cell, and `cols.slice(1,-1)` is the year label's span).
- **The print fallback is the screen's renderer.** `exportWaterfallPdf` (the rollback for `WF_PDF_MODE`) puts
  `renderSpreadsheetView()` into `#print-root`, so anything drawn only on screen needs a way to stay out of print.

## 2. What the owner approved (the mockup, v2)

- **Hide.** The Notes heading's panel gets a **Hide column** button (a Mantine default button, full width, with an
  eye-off icon), under a divider below the existing heading controls. With Custom Column Headings off, the panel
  holds only that button and the title "Notes · 2031".
- **The flag.** A column with anything in it gets a small violet dot: a **Has notes** badge (Mantine `dot` variant) in
  the panel, a dot on the hidden column's strip, and a dot on its pill in Settings. There are no counts and no note text.
- **No confirmation.** Hiding takes one click. Nothing is lost: the notes stay saved and come back with the column,
  and it is one undo step.
- **On screen** a hidden column becomes a **14 px strip**: warm gray (`gray-0`, `gray-1` on hover), an eye-off icon in
  its heading cell, and the dot when it has notes. A click on the strip shows the column again.
- **In Excel and the PDF** the column is gone, and the year ends at its last phase column.
- **Settings › Preferences › Waterfall** gets a row, **Hidden Notes columns**: one Mantine pill per hidden year, each
  with an × that shows it again, plus **Show all** once two or more are hidden. With none hidden, the row reads
  "None".
- Styled with the app's own theme (`src/theme.js`: Inter, navy primary, warm grays, 7 px / 10 px radii).

## 3. Defaults taken (each reversible in one place; tell me to change any)

| | Default | Why |
|---|---|---|
| D1 | **Double-click** the Notes heading opens its panel (the mockup showed a single click) | The app's own rule since 21 Oct 2026 (TEXT-STYLE-BAR-PLAN D5): a click picks grid text for the style bar, and a double-click edits it. The custom heading editor already opens this way |
| D2 | **Excel hides the column; it does not delete it.** The hidden column keeps its width and its notes | It prints exactly like a removed column, but someone working in Excel can unhide it and find the notes. It is also the smaller edit (§6, E1–E3), because every column after it keeps its letter |
| D3 | **The month view and the month PDF don't change.** Waterfall notes still show on their days there | The ask was about the waterfall's columns. The notes still exist |
| D4 | **Keyed by the width model's column key**, `y<year>:notes`, like a dragged width (`colWidths`) and a custom heading (`headerRowLabels`) | One key scheme for everything a column carries. The shift tools leave it alone, as they leave those alone |
| D5 | **Single Column Mode** hides its one column under the first year's key, and the remaining columns grow to fill the page as they already do | The post-pass already does the filling; it only must not treat the last phase column as Notes (W2) |
| D6 | A hidden column's **custom heading, dragged width and text styles are kept** and return with it | Nothing is deleted by hiding |
| D7 | **A heading that covers Notes and a phase column** (Custom Column Headings, merged) shows **Hide Notes column**. Hiding leaves the heading over the phase column alone | The button must say which column goes |
| D8 | **Saved in the calendar file** (calendar data, like the headings), not a per-computer preference | It changes what the exports contain, so it must travel with the calendar |
| D9 | The strip **can't be resized**, and the style bar can't pick it | It holds nothing |
| D10 | Settings lists only years that are in the calendar now. A key for a year the calendar range or a shift has left behind is kept but not shown | It works like a dragged width: if the year comes back, so does its setting |

## 4. What it does, in detail

- **Hiding:** the panel's button adds `y<year>:notes` to `hiddenNotesCols`, pushes one undo step, re-renders and
  marks the calendar dirty. The panel closes.
- **"Has notes"** is `blockHasNotes(schedule, block)`, outside the frozen code: true when any week of the block has
  `effectiveNoteText(wk, autoNotesForView(notesByIdx[i], 'sheet'))`. It is the same test `sheetColumnWidths()` uses to
  measure the column, so automatic notes count, a note cleared to `''` doesn't, and a kind switched off in Automatic
  notes doesn't.
- **Showing:** a click on the strip, a pill's ×, or Show all removes the key(s). This is one undo step.
- **The panel with Custom Column Headings off** is a new body-level `.note-pop` (so `buildSavedHtml()` already strips
  it), anchored under the heading like `openHeaderRowPop`'s, with the same `.hdrrow-ring` over the heading. The
  heading is found by `headingColKey(th)`, so the frozen markup needs no new attribute. With headings on,
  `openHeaderRowPop` gets the Hide row when its run covers a `:notes` key.
- **The strip's click** is a new delegated listener on `#table-wrap` (guarded, like the others). `textCellKey()`
  returns null for a strip cell (D9). A CSS rule outside the frozen blocks hides the strip's resize handle:
  `.grid-resize.is-col[data-ckey$=":notesoff"]{display:none}`. The handle element still exists, so
  `repositionColHandles()`'s index pairing of handles to `<col>`s holds.
- **`pdfUnprintablePlaces()`** (L-6's check, not frozen) skips the notes of hidden columns, since they are not drawn.
- **No new id'd control.** The pills, buttons and strip carry no id, so nothing enters `fields.byId`, and gate 5's id
  count stays 76.

## 5. Save format (calendar data, in `captureSnapshot()`)

- **`hiddenNotesCols`**: an array of column keys, e.g. `["y2031:notes"]`. It is written only while non-empty; **absent
  means every Notes column shows.** It is restored unconditionally
  (`Array.isArray(snap.hiddenNotesCols) ? [...] : []`), cleared by New, and carried by undo and the crash backup like
  everything in the snapshot.
- `sanitizeSnapshot()` keeps only strings that match `/^y\d{4}:notes$/`, deduplicated and capped at 64. The `hostile`
  leg gets cases for it.
- **No `SNAPSHOT_VERSION` bump.** An older build ignores the key, so it shows every column, which is today's look and
  never a misreading (the `'onhalf'` precedent).
- Not date-keyed, so the shift tools leave it alone (D4).

## 6. The frozen edits (signed off by the owner, 22 Oct 2026, "Sign off all") and the gate

Every edit is guarded so that with `hiddenNotesCols` empty, the code runs exactly as it does today. The baselines prove
that byte for byte (§6, gate 1).

### The width model: `sheetColumnWidths`

| | Edit | Inert when |
|---|---|---|
| **W1** | After `out` is built and **before** the Single Column post-pass: for a block whose `y<year>:notes` is hidden, drop that entry from `cols` and set `notesHidden: true`. `notes` keeps its measured width, for Excel's hidden column (D2). Everything that walks `cols` follows: the screen's columns, the grid metrics, the page orientation, the PDF's fit scale and frame, the side boxes and the custom heading runs | Nothing is hidden: the loop is skipped |
| **W2** | The Single Column post-pass re-derives `bk.notes` and `bk.labels` from `cols`, assuming Notes is last (`cols[cols.length-1]`, `slice(1,-1)`). With `bk.notesHidden` it takes `labels = cols.slice(1)` and leaves `notes` alone | `notesHidden` is never set |

### The on-screen grid and the print fallback: `renderSpreadsheetView`, `exportWaterfallPdf`

| | Edit | Inert when |
|---|---|---|
| **R1** | The heading row draws the Notes `<th>` only for a shown column. For a hidden one, it draws the strip's `<th>` on screen (the icon, plus the dot when it has notes) and nothing in print. The custom-headings path needs no change for the hiding itself (its runs come from `cols`, W1); it only appends the strip `<th>` on screen | Nothing is hidden |
| **R2** | The `<colgroup>` gets the strip's `<col data-ckey="y<year>:notesoff" style="width:14px">` on screen | Nothing is hidden |
| **R3** | The body uses `notesColspan = 0` for a hidden block. That covers the two `colspan="${mc+notesColspan}"` sites: the blank row past a block's end, and the all-phase hiatus band, whose fit width already comes from `cols`. It skips the notes cell, and on screen it adds one empty strip `<td>` **per row**. ⛔ Never a `rowspan`: `applyCellFitLive` and the span handles map cells to columns by walking each row, and a rowspan would shift every block to its right by one column | Nothing is hidden |
| **R4** | **The grid's right edge.** The 2 px end rule lives on the last block's Notes cells today (inline `isLast` styles, `th.sheet-blockend`). When the last block's Notes column is hidden, the table gets the class `wf-notes-end`, and one new rule draws the edge on whatever cell is last in each row, the strip on screen and the last phase column in print: `table.sheet-table.wf-notes-end tr > :last-child{border-right:2px solid var(--text)}`. The strip's own look is two more new rules (`.wf-notes-strip`). All three rules are new, and none edits an existing frozen rule | The class is never set, and no strip cell exists |
| **R5** | `renderSpreadsheetView` reads a module flag, `wfPrintRender`, to choose between the strip (screen) and nothing (print) | Nothing is hidden |
| **X1** | In `exportWaterfallPdf` (the print fallback), set `wfPrintRender = true` around its one `renderSpreadsheetView` call, in a `try/finally` | Without R1–R3 the flag changes nothing |

⚠️ X1 is the cost of the on-screen strip. Without the strip, the screen would draw exactly what prints and X1, R2,
R5, the strip half of R1 and R3, and two of R4's three rules would go. The owner approved the strip in the mockup,
so it is in.

### Excel: `exportExcel`

| | Edit | Inert when |
|---|---|---|
| **E1** | `ws.getColumn(notesCol).hidden = true` for a hidden block. The column keeps its width (`widths.notes`) and its notes, so unhiding it in Excel brings both back (D2). Nothing else about the column changes, so every column after it keeps its letter, and the date formula chain, the side boxes' columns and the print area are untouched | Nothing is hidden |
| **E2** | The all-phase hiatus band **merges only to the last phase column** for a hidden block (`bandEnd`), and its text fit adds `widths.notes` to `hAvail` only for a shown column. ⚠️ Changed while building: the plan had the band stay merged across the hidden column, but Excel draws a merged range's edges from its edge cells, so the band would have lost the block's right rule (§9) | Nothing is hidden: `bandEnd` is `notesCol` |
| **E3** | **The block's right rule.** Excel draws it on the Notes column's cells (`right:thin`), which a hidden column doesn't show. After a hidden block is written, one pass adds `right:thin` to the cells in `labelColEnd`, header row included, merging into their existing borders | Nothing is hidden |

The workbook's page orientation already comes from `sheetGridMetrics()`, so it follows W1 and stays the PDF's.

### The waterfall PDF: `buildWaterfallPdf`

| | Edit | Inert when |
|---|---|---|
| **P1** | The heading row: the year label spans `cols.slice(1)` and no "Notes" is drawn for a hidden block. Unedited, `slice(1,-1)` would drop the last phase column from the year's span, and "Notes" would land over that column. (The custom-headings path follows `cols` already) | Nothing is hidden |
| **P2** | The interior rules (Grid Lines in Exports on): `nSlots = cols.length - 2` becomes `- 1` for a hidden block | Nothing is hidden |
| **P3** | The notes cell is skipped for a hidden block. Unedited, it would be drawn over the last phase column | Nothing is hidden |

The frame, the block rules, the band widths, the fit scale and the orientation all come from `blockCols`/`gridW`,
so they follow W1 with no edit.

### The gate

1. **Every baseline byte-identical with nothing hidden:** the waterfall PDF, every Excel part, gates 10 and 13's month
   PDFs, 0 horizontally clipped cells, and 76 ids. No baseline hides a column, so any byte that moves is a bug.
2. **A new leg, `notescols`**, on a synthetic fixture of three year blocks (two with notes, one without, an all-phase
   hiatus in a hidden year, a phase spanning into the last slot), run four ways: plain, Custom Column Headings on,
   Grid Lines in Exports on, and Single Column Mode. It drives the real double-click and click and asserts:
   - **screen:** the strip's column and cells exist, no rowspan, its resize handle hidden, the dot only on the year
     with notes, the 2 px right edge on the last cell, and 0 horizontally clipped cells;
   - **Excel:** the column is `hidden`, keeps its width and its notes, `right:thin` moves to the last phase column,
     the band's fit excludes the hidden width, and the orientation matches the PDF's;
   - **PDF:** no "Notes" label and no note text for a hidden block, the frame width equals the sum of the remaining
     columns, and with gridlines on, the rule count is what the layout implies;
   - **print fallback** (the `WF_PDF_MODE` rollback): no strip in `#print-root`, and the edge rule is present.
     ⚠️ `WF_PDF_MODE` is a `const` with no test route today, so step 2 adds a localhost-only one to the button
     handler (not frozen), shaped like `monthPdfMode()`'s `sptcal.mvPdfTest`: `localStorage 'sptcal.wfPdfTest' =
     'print'`;
   - **file:** save → load keeps it, undo and redo are each one step, New clears it, and `v1.0.0-saved.html`
     (`restore`) opens exactly as before.
3. **Existing legs unchanged:** the custom-heading legs, the Single Column legs, `sideboxes`, `winansi`
   (`pdfUnprintablePlaces`), the text style bar legs, `colreuse`, and the gridlines legs.
4. **The full `gate.sh` before any push** (frozen edits and the save format; GATE POLICY).

## 7. Things that could go wrong, and the answer

- **A hidden column gains a note** (Paste notes, or the month view's waterfall lines). The note is saved, the strip's
  dot appears, and showing the column shows it. Nothing asks.
- **Hiding the last block's Notes column** moves the grid's right edge. R4 (screen and print), E3 (Excel) and the
  PDF's `gridW` frame each handle it. The leg checks all three.
- **The column swap and column reuse** read `y<year>:s<n>` keys only, so `:notes` and the strip's `:notesoff` never
  match them.
- **An old build opening a new file** shows every column (§5). That is today's look, so nothing is misread.
- **The `--header-h` grid fit and the calendar zoom** measure the rendered grid, so a narrower grid needs nothing.

## 8. Build order (branch `hide-notes`, from local `main`)

1. **State, no UI:** `hiddenNotesCols` (snapshot, restore, sanitize, New), plus W1 and W2. Prove gate 1 identical,
   then that a fixture with a key set drops the column from the metrics.
2. **The screen and the print fallback:** R1–R5, X1, the CSS (R4's three rules, plus the handle rule in §4), and the
   localhost-only `sptcal.wfPdfTest` route (§6, gate 2). Prove gate 1, then the screen and print assertions of
   `notescols`.
3. **The writers:** E1–E3 and P1–P3. Prove gate 1, then the Excel and PDF assertions.
4. **The chrome:** the Notes panel (headings off), the Hide row in `openHeaderRowPop`, the strip's click,
   `blockHasNotes` and the dot, the Settings row with its pills, `textCellKey`, and `pdfUnprintablePlaces`.
5. **The rest:** the whole `notescols` leg, the `hostile` cases, the Help text (the waterfall's paragraph on
   headings), the README changelog, HANDOFF, CLAUDE.md's state table (one new key), then the full gate.

## 9. As built (22 Oct 2026): what differs from the plan above

- **E2 merges the band to the last phase column** instead of across the hidden one (the row in §6 says why).
  `notescols` X5 and X5b check both the merge and the rule.
- **The print fallback's test route** is `waterfallPdfMode()`, the twin of `monthPdfMode()`. The waterfall PDF
  button asks it instead of reading `WF_PDF_MODE` directly. Users can't reach it.
- **The strip's label is `::after` text**, and its first cell carries the dot, so every frozen reader that skips an
  empty cell (`applyCellFitLive`, `clippedCells`, `textCellKey`) skips the strip. The label overflows the first
  cell (`position:relative; overflow:visible` on strip cells only) and runs down the strip.
- **The strip's hover** is one body-level ring (`.wf-notes-ring`) over its whole column, like `.hdrrow-ring`. It
  joined `buildSavedHtml()`'s strip list.
- **The panel and the heading editor share `placeHeadingPop()`**, factored out of `openHeaderRowPop()`. The editor's
  three buttons now bind with `.hdrrow-btn[data-act]`, so the Hide button (`.wf-notes-hide`) is not mistaken for one.
- **The Settings row is React** (`HiddenNotesRow` in `Sidebar.jsx`, bridge key `hiddenNotes`), fed after every
  grid rebuild by a `#table-wrap` childList observer (sanctioned pattern 3). Its × and Show all carry
  `data-shownotes`, which the engine catches on document, as it does on the strip. It uses no new Mantine
  component (`CloseButton` and `Button` were already loaded), so `main.jsx`'s CSS import order is untouched.
- **Owner, mid-build:** *"remove the custom column headings toggle in settings and just make it editable all the
  time"*. That is a separate change (tracker `headings-always-editable`), ruled the same day: untouched calendars
  keep Date | year | Notes. It will make the headings-off Notes panel redundant, since every heading would open the
  heading editor, which already carries Hide column.
