# TEXT-STYLE-BAR-PLAN.md

**One styling bar for every piece of text in the waterfall**, always on screen, under the Waterfall / Month toggle and
the shift buttons, outside the calendar. Owner request, 21 Oct 2026: *"the styling bar the header uses sits above and
outside the viewport of the calendar and is permanently there … This menu should allow you to individually style any
and all text throughout the entire waterfall calendar"*, with a determination of *"the cost/impact of allowing a user
to edit the text size of any and all text as I'm the most worried about the impacts of this change."*

**D1, D2 and D3 ruled by the owner (picker, 21 Oct 2026); D4 and D5 open. No code written.** §1 holds the owner's
decisions, §2 the choices this plan makes unless the owner overrules them, §3 what exists today, **§4 the font-size
determination**, and §5 onwards how it would be built.

**The short answer on size (§4):** colour, bold, italic and alignment are cheap and safe. **Size is not a styling
change, it is a layout change.** A waterfall row is exactly tall enough for 11 px text: at 12 px it just fits, and at
13 px and up every row holding the text must grow or the text is cut off (measured, §4.1). Bigger text also needs wider
columns, and every taller row or wider column makes the printed PDF and Excel page shrink everything else to fit. So
this plan recommended sizes **6 to 12** in the grid (no change to how the grid is sized), keeping the door open to
larger sizes later without changing the file format, **and the owner ruled exactly that (D1 A).**

## 1. Decisions for the owner

Each had a recommendation, listed first. The rulings are recorded under each, verbatim.

### D1 · How big grid text may get (the size question)

✅ **RULED, owner's picker, 21 Oct 2026: "6–12, grid never moves (Recommended)"**, i.e. option A below.

Header lines and side-box lines keep the sizes they have today (8–22 waterfall header, 10–30 month header, 8–22 boxes):
they sit outside the grid's rows, and each already handles its own sizes in all three outputs. This decision is about text **inside the grid**:
dates, column headings, phase labels, Sim Post, hiatus bands and notes.

- **A · Sizes 6 to 12; the grid never changes size (recommended).** Smaller text and up to 12 px fit the row as it is.
  The grid's columns, rows, page orientation and print scale are untouched by any style. Cheapest and safest (§4.3),
  and it covers emphasis through bold, italic and colour. Larger grid text comes later as C if real calendars need it;
  the saved format is the same, so C would only lift the cap.
- **B · Any size; the app makes room once, the way a drag does.** Picking 16 makes the row taller and the column wider
  by writing the same hand sizes a drag writes. Nothing in the width model changes, but the sizes stay behind when the
  text moves or the style is cleared, and a row is shared by every year on the page (§4.2). **Not recommended.**
- **C · Any size; the grid follows the text.** Rows and columns grow to the biggest styled text and shrink back when it
  goes. Right long-term if big grid text is wanted, but it edits the heart of the frozen width model and every styled
  calendar prints smaller (§4.3).

### D2 · What the bar styles

✅ **RULED, owner's picker, 21 Oct 2026, in their own words (neither offered option):** *"You can higlight any any all
text in the spreadsheet (header is seperate) and style all that text based on selections from the styling menu. just
like excel"*.

So it is **Excel's model**: highlight any cells in the grid, of any kind and in any mix, and every press on the bar
styles every text in the highlight. The header's lines are **not** part of a grid highlight; a header line is picked
on its own and styled the same way. How the highlight works is §2a. This replaces both offered options ("this one, or
all like it", "this one only"): sweeping the date column styles every date, which is what *All like this* was for, so
there is no kind-wide style and no such switch.

### D3 · Header lines in Auto and Template mode

✅ **RULED, owner's picker, 21 Oct 2026: "Every mode (Recommended)".** This replaces the styling half of the
10 Sep 2026 Template ruling: header lines are styled from the bar in Auto, Manual and Template. Template text is still
edited only in the header editor.

Today the header's bar shows only in **Manual** mode. On 10 Sep 2026 the owner ruled that in Template mode the header is
edited only in the header editor, *"This means also remove the styling menu view from there."*

- **Style header lines in every mode (recommended).** A style changes how a line looks, never its words, so it is safe
  in Auto (the line keeps following the sidebar) and in Template (the words stay editable only in the editor, as ruled).
  One rule for every text. This **replaces the styling half of the 10 Sep ruling**, so it needs the owner's word.
- **Keep it Manual-only.** In Auto and Template the bar says *"Switch the header to Manual to style it"*.

### D4 · In the month view (⏳ open)

- **The bar stays, and styles the month header lines only (recommended):** what the month header's own strip does
  today, moved out of the calendar the same way. Month notes are a separate request already on the tracker
  ("Note styles", gap-report item 20).
- **Waterfall only:** the bar hides in the month view and the month header keeps its in-calendar strip.

### D5 · How a note opens once a click highlights (⏳ open, raised by D2)

Today a single click on a note or a hiatus band opens its editor. In Excel a click highlights and a **double-click**
edits, and D2 makes a click highlight.

- **Double-click edits, as in Excel (recommended).** A click highlights the note like any other cell; a double-click,
  Enter, or starting to type opens its editor. Phase cells keep their own double-click (fill the empty columns beside
  them), which notes and bands never had, so nothing collides. Users lose a habit: one click no longer opens a note.
- **A click still opens the editor, and the note is highlighted too.** Keeps the habit, but a drag that starts on a
  note has to be told apart from a click that opens it, and Shift-click and ⌘-click on notes must not open it.

## 2. Decided in this plan unless the owner says otherwise

- **Where it sits:** a full-width second line of the toolbar row, under the Waterfall / Month toggle and the shift
  buttons, above the calendar. It never scrolls with the grid and never prints. It costs one toolbar line of calendar
  height at every window size (roughly 30–40 px; measured in step 2); the app shell's grid fit already re-measures when
  the toolbar row changes height, so the grid still ends exactly at the bottom of the window.
- **The controls are the header bar's, in the same order:** Size, **B**, *I*, text colour, alignment, clear. Highlight
  shows only when a header line or a side-box line is picked (grid cells already have a fill, set where it is set today).
  No underline, no font choice: the grid's typeface (Carlito) is what the width model measures (CLAUDE.md, "Two fonts").
- **It says what it is styling** ("12 cells", "Header: Centre 1"), and when nothing is highlighted it is greyed with
  *"Highlight any text to style it"*, as the header strip is today. Its controls show the highlight's current look, and
  a mixed one (some bold, some not) shows the control half-lit; pressing B then makes them all bold, as Excel does.
- **One bar, everywhere.** The header's strip inside the calendar and the side boxes' floating bar both retire; this bar
  does both of their jobs through the code they use today (`applyHdrFmt`, `applySideFmt`), so header and box styles are
  stored exactly as now.
- **The note editor's Size picker moves to the bar.** One place sets size. A note already saved at 14 or 16 keeps it
  and shows it; the bar just does not offer those for new text under D1 A.
- **Fill colours stay where they are:** the note editor's swatches, the phase colour picker.
- **Reset notes clears note styles too** (it already clears their colours and sizes). Undo takes each style change as
  one step; dragging a colour well is one step, as in the side boxes.
- **Styles move with what they style** when the calendar shifts: a phase week's style travels with its phase, a note's
  with its note, a date's stays on its date.

### 2a. The highlight (from D2's ruling)

- **Excel's gestures, over the whole grid:** click a cell; drag to sweep a rectangle; Shift-click to extend to a
  rectangle; ⌘-click to add or remove one cell; ⌘A inside the grid for everything. Any kind of cell, in any mix: dates,
  column headings, phase weeks, Sim Post, hiatus bands, notes. It spans year blocks the way a drag across them would.
- **Only text is styled.** An empty cell can be swept up but has nothing to style and stores nothing. (An empty note
  cell is the one place Excel would keep a format for later; here a note's style goes with its text when it is
  cleared, as its colour and size do today, so there is nothing to keep.)
- **The header is separate.** A click on a header line picks that line alone (and clears the grid highlight); a click
  in the grid clears the header pick. Side-box lines work like header lines.
- ⛔ **The existing phase selection keeps its meaning.** `gridSel` (phase cells, `"<weekIso>|<phaseKey>"`) still feeds
  fill-across (double-click / Enter), the column swap (Alt+←/→) and moving a run, exactly as today. The other kinds go
  in a separate set beside it, so none of those actions can ever receive a date or a note. The chip that names the
  phase selection's keys stays as it is.
- **What stays as it is:** a phase cell's double-click still fills across; a drag that starts on a highlighted phase
  run still moves it; the resize handles still own their bands; a Manual header line still takes the caret. A custom
  column heading's editor, which opens on a click today, follows whatever D5 rules for notes.

## 3. What exists today

Three copies of the same styling idea already exist, and none reaches most of the grid:

| Text | Where it is drawn | Styling today | Store |
|---|---|---|---|
| Header lines (10 slots) | inside the grid, frozen `renderSpreadsheetView` (`hline`) | size, B, I, colour, highlight, align; Manual mode only | `headerFormat` |
| Side-box titles and lines | beside the grid | size, B, I, colour, highlight, align | `sideBoxes` |
| Notes, hiatus bands | grid cells | size 6–16 from the note editor; fill colour | `noteFontSize`, `hiatusFontSize` |
| Week dates | grid | none (bold 11 px) | — |
| Column headings | grid header row | none (custom headings shrink to fit) | — |
| Phase labels, Sim Post | grid | none (shrink to fit, one line) | — |

- The header's strip (`headerFmtToolbarHtml`) is emitted **inside `#table-wrap`** by the frozen renderer, and its
  handlers are delegated on `#table-wrap`. The side boxes' bar (`buildSideFmt`) is body-level with its own handlers.
- All three outputs already draw per-text styles where they exist: `exportExcel` writes a font per cell,
  `buildWaterfallPdf` draws bold from the embedded Carlito Bold and italic as a slant (no new font), and the print
  fallback is the screen's DOM.
- ⛔ The header bar's controls carry **no ids**, deliberately: `collectFieldValues()` would sweep them into every saved
  file. The new bar keeps that rule. It **cannot be a Mantine Select or SegmentedControl** for the same reason
  (generated ids, PreviewToolbar.jsx's lead comment).
- In flight: **"Header ends where the calendar ends"** (branch `header-zoom`, building) changes the header and the
  Manual strip above it. This work starts after that lands.

## 4. The font-size determination

### 4.1 Measured (21 Oct 2026, the build, fixture `carry-rich`: one year block, 50 rows, three phase columns)

A read-only probe set every text of one kind to each size in turn, counted what was cut off and which rows grew, and
put the page back. Nothing was saved.

**The row arithmetic.** A row is 20 px; 2 px padding above and below and the 1 px rule leave **15 px for text**, and a
line is 1.35 × the font size. 11 px needs 14.85 (fits), 12 needs 16.2 (1 px over), 13 needs 17.55.

| Size | Phase labels (90) | Dates (50) | Notes (3) | Heading row height |
|---|---|---|---|---|
| 11 (today) | fits | fits | fits | 20.3 px |
| 12 | fits; 2 rows grew 1 px | fits; 4 rows grew | fits | 21.7 |
| 13–14 | fit, but **47 of 50 rows grew** | **49 of 50 rows grew** | 2 of 3 **cut at the bottom** | 23–24.4 |
| 16 | **48 cut short**, by up to 10 px | rows grew | cut at the bottom and the side | 27.1 |
| 18 | 57 cut, up to 25 px | 9 cut | cut | 29.8 |
| 22 | 77 cut, up to 54 px | **all 50 cut** | cut by up to 119 px | 35.2 |

- **"Rows grew" is the problem, not a fix.** On screen a table row stretches to its tallest text, but Excel and the
  PDF draw every row at its stored height. A grown row is the screen no longer matching the exports, which is the
  divergence the width model exists to prevent.
- **It already happens today.** `carry-rich` has a hiatus band at 13 in a standard row: 18 px of text in a 15 px box,
  cut by 3 px. The note editor offers 14 and 16, so any user can cut a note today without dragging the row first.
- **Bold and italic alone cut nothing** on this calendar (90 labels, 50 dates, 3 notes, 2 bands). Bold is 6–7 % wider
  ("Production wk 22": 104.2 → 110.5 at the 11 pt measure), which the columns' built-in slack (`COL_PAD_CHARS`)
  absorbs for ordinary labels; a very long custom phase name could lose its last letters. Italic is no wider. Dates'
  digits are the same width bold or not.

### 4.2 Why bigger text cannot stay local

- **A row belongs to every year on the page.** One `<tr>` carries row *r* of every year block side by side, so a taller
  row for a 2027 note is equally taller beside 2026's and 2028's weeks (`rowHeights` is index-keyed for exactly this
  reason).
- **A column belongs to a whole year.** Phase columns in a year are sized together, to the widest label, so they read
  as an even split (`sheetColumnWidths`). Widening one for a bigger label means widening all, or breaking that look.
- **The page fits the whole grid.** The PDF and Excel (`fitToWidth`/`fitToHeight` 1) scale the grid to one page. Any
  taller row or wider column shrinks **every** text on the printed page. Estimated from the measured widths: making one
  phase's labels 16 px on `carry-rich` needs its year's three phase columns about 45 % wider (16/11), the grid goes from
  625 to about 780 pt wide, and the portrait page's scale drops from 0.89 (bound by height today) to about 0.74 (bound
  by width): **everything on the page prints about 17 % smaller** for one phase's bigger labels.
- **Orientation is decided from standard rows** (`sheetGridMetrics`), so a grid made much taller by styles could keep an
  orientation that no longer suits it unless that is edited too.
- **Size and the auto-shrink fight.** Phase labels and notes shrink to fit by design (`cellTextFit`). A size the user
  picks is honoured outright and allowed to clip, as notes are today; that is why 16 px labels were cut above.

### 4.3 Cost of each option

| | A · 6–12 (ruled) | B · make room once | C · grid follows text |
|---|---|---|---|
| Frozen code edited | renderer, Excel, PDF read the styles (§6 F1–F4) | same as A | A, plus the width model (F5) and the heading row (F6) |
| Grid can change size | never | yes, once, as hand sizes | yes, both ways, automatically |
| Unstyled calendars | byte for byte unchanged | unchanged | unchanged |
| Styled calendars print | same scale as unstyled | smaller | smaller |
| Main risk | someone wants big grid text | sizes left behind after a shift or a clear | the width model's core changes; new baselines for styled calendars |
| Size of the size work | none beyond the common work | a little | about one more session |

Common to all three: the bar, the highlight, one new save key, the sanitizer, the shift re-key, undo, and the three
writers drawing bold, italic, colour and alignment for every kind of grid text.

## 5. The save format

- **One new key, `textStyles`, written only when a style exists** (the `sideBoxes` shape), so every calendar without a
  style saves byte for byte as before. One entry per styled text, `{ "<kind>:<key>": fmt }`, and nothing kind-wide
  (D2's ruling made that unnecessary). Kinds: `date`, `heading`, `phase`, `simpost`, `hiatus`, `note`. Keys: a date,
  Sim Post, all-phase band or note by week (`2027-01-04`), a phase week or per-phase band by `week|phaseKey` (the
  `cellSpans` shape), a heading by its first column's key (`y2027:s0`, the `headerRowLabels` shape).
- `fmt` is the header's shape: `{size, bold, italic, color, align}`, checked by the existing `cleanHeaderFormatEntry`.
  ⛔ **A note's and a band's size stay in `noteFontSize` / `hiatusFontSize`** (permanent keys), never copied into
  `fmt`, so the note editor's old files and the bar can never disagree. Header lines stay in `headerFormat`, boxes in
  `sideBoxes`.
- `captureSnapshot` writes it; `applyStateSnapshot` restores it **unconditionally** (absent = no styles); `sanitizeSnapshot`
  drops bad entries and counts them; `newFile`/`resetAll` clear it; the shift tools re-key it with the predicates
  their siblings use (`hiatusKeyStays` for `week|phase`, `isPinnedWeek` for notes; dates never move).
- **Older builds** ignore an unknown key, so a styled file opened in v1.6.0 opens unstyled. No `SNAPSHOT_VERSION` bump,
  for the `'onhalf'` reason. To be confirmed by opening the new fixture in `releases/v1.6.0.html`.
- No new id anywhere: gate 5's `fields.byId` set must stay at its current count.

## 6. Frozen edits (each needs the owner's sign-off, with the measurement named)

Each is written so that **with no style set it runs exactly today's code**, which the byte gates prove.

- **F1 · `renderSpreadsheetView`:** append each text's style after its own inline style (the 31 Aug 2026 `hline`
  precedent): dates, headings, phase labels, Sim Post, bands, notes. A styled one-line text gets the same height cap a
  note has, so a row can never stretch on screen. The print fallback is this DOM, so it follows. Acceptance: gate 7's
  fence identical for unstyled fixtures; clipped cells 0 on a fixture with every kind at 12 px and bold.
- **F2 · `exportExcel`:** each cell's font (`size`, `bold`, `italic`, `color`) and alignment from the style. Acceptance:
  every Excel part identical unstyled; the styled fixture's cell fonts read back from the workbook.
- **F3 · `buildWaterfallPdf`:** each text drawn with Carlito Bold or Regular, its size, colour, slant and alignment
  (`drawLines` gains left and right). Acceptance: waterfall PDF byte-identical unstyled; on the styled fixture
  `pdftotext` finds every text and the font tags match the screen.
- **F4 · `wrapLineCount` / `cellTextFit`:** an optional bold flag, so a bold note wraps where its bold words actually
  break (today the wrap is counted in regular weight, which would cut a bold note's last line). Off by default.
- *Only with D1 C:* **F5 · `sheetColumnWidths`** measures each text at its style, and `syncRowHeights` (not frozen)
  raises a row to its tallest styled text; **F6 ·** both writers size the heading row from its styles; and
  `sheetGridMetrics` reads the real row heights for orientation.

## 7. Not frozen

- **The bar:** a host inside `.view-toggle-row` (so `.view-toggle-row` → `#table-wrap` stays the sibling pair the
  contracts need), filled by the engine with class-only controls, built once; in `buildSavedHtml()`'s emptied hosts;
  hidden in print.
- **Retiring the two old bars:** the in-calendar `.hdr-fmt` hidden by a chrome rule (as the three header buttons were on
  30 Sep 2026), the side boxes' floating bar no longer shown. Their code stays as the paths the new bar calls.
- **The highlight (§2a):** a second selection set beside `gridSel`, drawn by the same overlay layer
  (`redrawGridOverlay`, chrome, not frozen) and hit-tested from the same geometry helpers (zoom-aware since the
  calendar zoom). Pointer handlers on `#table-wrap` are added, never replaced, and stand aside for the resize handles,
  the span grips and a move, as the marquee does today. If D5 is "double-click edits", the note and band editors'
  open moves from click to double-click / Enter / typing; the editors themselves are unchanged.
- **Store, sanitizer, snapshot, resets, shift re-key, undo** (§5).

## 8. Proof

- **New leg `textstyle`** on a synthetic fixture minted by its own Save: every kind styled each way, one cell at a time
  and through a swept, Shift-extended and ⌘-built highlight that mixes kinds and crosses year blocks; a mixed
  highlight's half-lit controls; fill-across, swap and move still receiving only phase cells; the screen's computed styles; the workbook's cell fonts; the PDF's text and font tags; clipped cells 0;
  the bar has no id and is absent from a shareable copy; `fields.byId` unchanged; one undo step each; Save and Load; a
  shift carries a phase week's style with its phase and leaves a date's on its date; Reset notes clears note styles;
  bad entries dropped and counted; the file opens in `releases/v1.6.0.html`.
- **The grid fit:** the bar showing, the grid still ends at the panel's bottom at the usual window sizes and zooms.
- **Byte gates:** waterfall PDF, every Excel part, gates 10 and 13 unchanged on every existing fixture.
- **Mutants**, each expected red: a writer ignoring a style; the cap missing on a one-line text (a row stretches); a
  style written as an empty object; a phase style left behind by a shift; an id on a bar control.
- The full gate, then the owner's picker to merge, and a separate one to push.

## 9. Steps

0. After "Header ends where the calendar ends" (`header-zoom`) lands, since both change the header strip.
1. ✅ D1, D2, D3 recorded (§1). ⏳ D4 and D5 before step 4.
2. **The bar, for what is already stylable:** header lines (every mode, D3) and side-box lines, the two old bars
   retired. No frozen edit, and on its own already "the bar, permanently there".
3. The store and the save format (§5); nothing drawn yet.
4. The highlight over every kind of grid text (§2a, §7), and D5's way of opening a note.
5. F1, with the fence and clipped-cell numbers shown to the owner.
6. F2, F3 and F4.
7. The leg, the mutants, the full gate.

Size: L, about three sessions (the highlight is most of the added work). D1 C, if it is ever wanted, adds F5 and F6
and new baselines for styled calendars, about one more.
