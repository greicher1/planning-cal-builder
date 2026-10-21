# HEADER-ROW-PLAN.md — the waterfall's header text and its dates

Owner rulings **2, 4 and 10** of 20 Oct 2026 (HANDOFF, "RULED, NOT YET PLANNED"). Branch
`claude/header-row-fe6f32`. Status: **✅ SIGNED OFF by the owner, 20 Oct 2026, by picker: "Yes, build
it"**, with all three questions in §5 answered (a), the recommended option. Building in the order of §7.

All three are **frozen edits** (CLAUDE.md's symbol list). Each one is **inert by default**: a calendar
that never uses it saves, renders and exports byte for byte as it does today, so the gate's existing
baselines (waterfall PDF, every Excel part, the clipped-cell count, `fields.byId`, both month PDFs)
must stay green without a re-cut.

---

## 1. What is hard-coded today

| Output | Header row | Date column | Title block |
|---|---|---|---|
| Screen (`renderSpreadsheetView`) | `<th>Date</th><th colspan=N>2026</th><th>Notes</th>` per year block | `fmtShort(w.date)` → `1/6/25` | `.cal-header-bar`, nine lines from `headerLine()` |
| Excel (`exportExcel`) | row 1: `Date`, the year merged over the phase columns, `Notes` | real dates, `numFmt:'mm-dd-yy'` | the page header `&L/&C/&R` (`oddHeader`), margins top 0.75″ / header 0.3″ |
| Waterfall PDF (`buildWaterfallPdf`) | `put('Date')`, `put(year)` over the phase columns, `put('Notes')` | `fmtShort(w.date)` | drawn in the top-margin band (54 pt) from `headerLine()` |
| Print fallback | is the screen markup (`#print-root`) | same | same |
| Width model (`sheetColumnWidths`) | headings are **not** measured | measured from `fmtShort(w.date)` in bold | — |

⚠️ **Found while mapping: Excel's date cells do not print a fixed `1/6/25` today.** `'mm-dd-yy'` is
ExcelJS's name for built-in format **14** (checked in the baseline workbook's `styles.xml`), which
Excel draws in the **reader's system short-date format**. On a machine whose short date has a
four-digit year (US Windows's default), the workbook already shows `1/6/2025`. Not changed here,
because the default must stay byte-identical; flagged for a later call.

---

## 2. Header: Off (ruling 10) — smallest, built first

- **Where:** a fourth row in the waterfall's Header mode menu (the toolbar's Header button): *Off — No
  title block. The grid starts at the top; Excel and the PDF print no header.* The month view's
  menu does not get it (the ruling names the waterfall).
- **State:** a flag `headerOff`, **not** a third value of `headerMode`. The frozen renderer gates on
  `headerMode === 'manual'`, and decision H3 keeps that variable two-valued on disk and in memory,
  exactly as Template is `manual` + `headerTemplates`. Off sits on top of whatever mode was there:
  choosing Manual or Template from Off brings back the lines you had; choosing Auto discards them,
  as Auto always does. Each change is one undo step.
- **Save:** `headerOff: true`, written only when on (the `prepPauseOff` absent-key shape), restored
  unconditionally (`=== true`), dropped by `sanitizeSnapshot` if not boolean, cleared by New. An
  older build ignores the key and shows the header (forward-only, as every key).
- **How each output drops it — mostly WITHOUT editing a frozen body (sanctioned pattern 1):**
  - `headerLine()` (not frozen) returns `''` while `headerOff`. The PDF writer's `if(hdrLines)` then
    draws nothing, with no edit inside it.
  - Screen and print fallback: a class on `<body>` hides `.cal-header-bar` (CSS only, the way
    `#hdr-mode-btn` is hidden today). The app shell's grid fit already re-measures on re-render.
  - Excel: **one frozen edit in `exportExcel`** — no `oddHeader` at all while off (today an empty
    header still writes `&L&B&12&"Calibri,Bold"`).
  - **Q3 below:** whether the top margin is reclaimed. If yes, `SHEET_PAGE_MARGIN_PT.t / .hdr` become
    getters that read `headerOff` (pattern 1: `buildWaterfallPdf`, `sheetPageOrientation` and Single
    Column's fill all read that one object, so the PDF and the workbook turn the page the same way),
    plus the workbook's `pageMargins` in the same `exportExcel` edit.

## 3. Date format (ruling 4)

- **Where:** a new card in the sidebar's Settings tab, **Waterfall Layout** (re-homed by the Settings
  window session when the branches merge). A select, *Dates: 1/6/25 · 1/6/2025*. Inside
  `.prefs-card` with an id, the `#one-col-btn` arrangement, so `fields.byId` stays at 74 ids.
- **Save:** `dateFormat: 'm/d/yyyy'`, written only when chosen; absent = `1/6/25`. Any other value
  is treated as absent. One undo step; New clears it.
- **One formatter, `fmtWeekDate()`**, used at exactly three frozen call sites, one expression each:
  `renderSpreadsheetView`'s date cell, `sheetColumnWidths`' date measurement (so the column widens
  through the frozen width model, never around it), and `buildWaterfallPdf`'s date cell. It returns
  `fmtShort()` unchanged while the key is absent. The ~30 other `fmtShort` uses (sidebar meta,
  popover titles, messages) stay as they are.
- **Excel:** one frozen expression, `numFmt: 'mm-dd-yy'` → `'m/d/yyyy'` when chosen. The cells stay
  real dates and the formula chain is untouched.
- **Q2 below:** whether dates inside automatic notes follow it.

## 4. The header row (ruling 2)

- **Labels are per column**, keyed by the column keys the width model already emits
  (`y2026:date`, `y2026:s0` … `y2026:notes`): store `headerRowLabels`, only typed labels. A blank
  typed label is kept as blank.
- **Defaults:** date column = the block's year (Q1), phase columns = the year (as today), Notes =
  `Notes`. **Neighbours with identical text merge** into one cell, so the defaults draw
  `[ 2026 over Date + phases ][ Notes ]`, and typing labels splits it:

  ```
  today                    custom, untouched              custom, two phase labels typed
  | Date | 2026     |Notes|  | 2026            |Notes|      | 2026 | WRITERS | PREP |Notes|
  ```
- **Editing:** click a heading → a small panel anchored to it (body-level, **no ids**, the
  `.note-pop` pattern): one text field, Enter commits, Esc cancels, *Reset* returns the default. One
  undo step per commit. A merged heading edits its first column; the panel says which columns it
  covers. Nothing is injected into the cell.
  - *(As first built it showed one field PER COLUMN of a merged heading, and a heading split when two
    fields were typed differently. ⛔ **Superseded 20 Oct 2026**: the owner found that convoluted, *"Why
    would that be intuitive? we need a better way"*, and picked "Split/Merge buttons". Now ONE field edits
    the whole heading and only **Split**, **← Merge** and **Merge →** change what it covers; typing never
    does. A split between same-text neighbours is the new key `headerRowSplits` (an array of the
    right-hand column keys, absent = v1.6.0's merging). `headerRowRuns()` is the only reader, so no
    frozen body changed. README, "Column headings: one box per heading".)*
- **Too long a heading shrinks to fit, as a phase label does; it never widens a column** (the width
  model is untouched by headings). Screen: the label's scale from the width model's own measure
  (bold, `chars × EXCEL_MDW`), floor 0.6, then clip. PDF: the same scale on its 8.25 pt heading.
  Excel: `shrinkToFit` on the heading cells.
- **Frozen edits:** `renderSpreadsheetView`'s header loop, `exportExcel`'s row 1, and
  `buildWaterfallPdf`'s header-row loop each gain a **second path**, taken only when the calendar has
  custom headings. The existing three lines run unchanged otherwise, so the default markup, workbook
  and PDF stay byte-identical by construction rather than by argument.
- **Save:** `headerRowLabels` (and, if Q1 is "opt-in", `headerRowCustom: true`), absent-key shape,
  restored unconditionally; only string values survive `sanitizeSnapshot`; New clears them.
- Single Column Mode uses the same keys (its one block is the first year's), so labels typed in one
  layout show on the matching key in the other. Stint swaps move phases, not labels.

---

## 5. Questions for the owner

✅ **Ruled 20 Oct 2026, by picker: 1 (a) "Opt-in switch", 2 (a) "Keep 1/6/25", 3 (a) "Reclaim it".**

1. **Where the year goes.** (a) *Recommended:* only on a calendar that turns **Custom column headings**
   on (a switch in the Waterfall Layout card; off = `Date | year | Notes` exactly as today). (b) Every
   calendar: the year moves over the Date column everywhere, and the waterfall PDF, Excel and `base`
   baselines are re-cut on your sign-off.
2. **Dates inside automatic notes when 1/6/2025 is chosen.** (a) *Recommended:* they keep `1/6/25`.
   The same notes feed the month view and both month PDFs, which ruling 4 leaves out, and the month
   view places an edited note's line by a two-digit-year date in its text. (b) They follow the
   setting everywhere (that regex learns four-digit years; the month view changes with the setting).
3. **Header: Off in Excel and the PDF.** (a) *Recommended:* reclaim the top margin, so the grid starts
   0.25″ from the top like the sides and prints larger. (b) Keep the 0.75″ margin: the header text
   goes, and a blank band stays above the grid.

## 6. Measurements (the acceptance gate)

- **Inert:** the full `gate.sh` green with **no re-cut** — 0 clipped cells, the waterfall PDF and every
  Excel part identical, v1.0.0 restores, `fields.byId` 74 ids, gate 10's ten print documents and gate
  13's twenty written month PDFs identical.
- **New leg `hdrrow`** (registered in `gate.sh`, red on the pre-change build, green after; mutants for
  the save/restore and undo halves):
  - **Off:** the menu row; the bar hidden on screen and in the print fallback; Excel has no
    `oddHeader` (and the margins per Q3); the PDF has no header string and its grid top moves per Q3;
    one undo step; Save writes `headerOff: true`, Load brings it back, Auto restores the header; a
    file with no key is unchanged.
  - **Dates:** every date cell `m/d/yyyy` on screen, in the PDF's text and as Excel's `numFmt`; the
    date column wider through the width model; **0 horizontally clipped cells**; notes per Q2; key
    saved, loaded, undone, cleared by New.
  - **Headings:** defaults and merging as drawn above; a typed label on screen, in Excel row 1
    (values + `mergeCells`) and in the PDF's text; identical neighbours merge in all three; a label
    too long for its column shrinks with **0 clipped cells** (past the 0.6 floor it clips, as a phase
    label does — corrected while building: a 60-character label in one column is past the floor); the
    panel carries no id; key round trip, one undo step, New clears.
- `npm run check`, `check-refs.py`, and the CSP proof (nothing new loads).

## 7. Build order

Off → date format → header row, then one full gate over the three, then the owner's merge picker.
Never pushed from here. *(As built: the three were built in that order but committed together, with
one README entry and one HANDOFF entry; the plan is its own commit.)*
