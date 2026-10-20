# SIDE-BOXES-PLAN.md

**Status: BUILT 20 Oct 2026** (`55cce8d`, `9efd62a`), leg `sideboxes` 58/58, red on the pre-change build. The owner
answered all eight questions in §9 by picker, each as recommended, and approved the frozen edits E1–E6 (§6). Full gate:
see HANDOFF. Nothing is merged or pushed. §10 records where the build departs from the plan, §11 what was proven.
**Branch:** `claude/side-boxes-129c72` (worktree `.claude/worktrees/side-boxes-129c72`).
**Written against:** `670a591`.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) (top entry, "RULED, NOT YET PLANNED", ruling 7)
→ [`MANTINE-SEAM.md`](MANTINE-SEAM.md) §1, §4, §5.3 → this file.
**Mock-up:** [`mockups/side-boxes.html`](mockups/side-boxes.html). It shows the screen, the printed page and the
workbook. Its calendar is made up.

---

## 1. The request

Owner ruling 7, 20 Oct 2026, by picker:

> **Side boxes:** any number of boxes left or right of the grid. Each is a **colour key** (one entry per colour,
> editable names, drawn as a bordered key) or a **titled text box** with per-line styling (the header's controls).
> Boxes grow as you type and stack per side, drag to reorder. They are edited on screen beside the grid, never in
> its cells, and printed in Excel and the waterfall PDF (the grid prints smaller to make room). Not in the month
> view.

Relayed with it: each side's width can be dragged; a box can be dragged to the other side; the colour key is titled
"Color Key", one row per distinct phase colour plus the hiatus red, each row filled with its colour and carrying a
bold, centred name; phases that share a colour share one row; a text box is a title plus free text, styled per line
with size, bold, italic, colour, highlight and alignment.

Why: the owner rebuilt a reference waterfall in the app. Every phase, label and week count matched, but the reference
also prints a colour key and free-text notes beside the grid, and the app had no way to make them.

---

## 2. What it is, in one picture

```
 SCREEN (waterfall view only)
 ┌ preview toolbar ─────────────────────────────────────────────────────────────────────┐
 │ [Export Waterfall to PDF] [Export to Excel]  …              [▦ Side boxes ▾]          │
 └──────────────────────────────────────────────────────────────────────────────────────┘
 ┌ left side ──────┐┃┌ #table-wrap (frozen, unchanged) ─────────────────┐┃┌ right side ─────┐
 │⋮⋮ Notes       × │┃│  header bar                                      │┃│⋮⋮ Color Key   × │
 │ Locations TBC   │┃│ ┌──────┬───────────────────────────┬──────────┐ │┃│ Writer's Rm     │
 │ Table read 3/1  │┃│ │ Date │           2027            │  Notes   │ │┃│ Pre Prep        │
 │ [B I A A ≡ ∅]   │┃│ ├──────┼──────────┬────────────────┼──────────┤ │┃│ Prod Prep       │
 │  ← format bar   │┃│ │ 1/4  │Writer's… │                │          │ │┃│ Production      │
 └─────────────────┘┃│ │ …    │          │                │          │ │┃│ Post            │
        ⇔ drag       ┃│ └──────┴──────────┴────────────────┴──────────┘ │┃│ Hiatus          │
                     ┃└──────────────────────────────────────────────────┘┃└─────────────────┘
                                                                             ⇔ drag
 PRINTED (waterfall PDF and Excel, one page, as today)
 ┌──────────────────── page ─────────────────────┐
 │ date        Show Title / Planning Calendar    stats │  ← header, in the top margin, over grid + boxes
 │ ┌──────┐ ┌───────────────────────┐ ┌──────┐ │
 │ │Notes │ │                       │ │Color │ │
 │ │…     │ │   the grid, scaled    │ │ Key  │ │
 │ └──────┘ │   to make room        │ │ …    │ │
 │          │                       │ └──────┘ │
 │          └───────────────────────┘          │
 └──────────────────────────────────────────────┘
```

The mock-up draws all three outputs properly. Every box is calendar data, saved in the file, and every box is
optional: a calendar with none looks, saves and exports exactly as it does today, byte for byte (§7).

---

## 3. The two kinds of box

### 3.1 Colour key

- A bordered box. Its first row is the title, **"Color Key"** by default and editable.
- One row per **distinct colour the waterfall actually shows**, read from the computed schedule (the cells the
  three outputs draw), so the key cannot list a phase the calendar does not show or miss one it does.
  - Phases that share a colour share one row.
  - The hiatus red is a row of its own (§9 Q2: when it shows).
  - New colours from ruling 5 (the appended `PHASE_COLOR_OPTIONS` entries) arrive with no extra work.
- Each row is filled with its colour, its name **bold and centred**, black or white for contrast (`textColorFor()`,
  the rule the hiatus bands already use: every phase pastel gets black, the hiatus red gets white).
- **Names default from the phases and are editable** (click a row, type). An edited name is stored against the
  colour, so it survives renaming the phase and moving the calendar. Clearing an edit (empty text) goes back to the
  default. §9 Q1 settles the default name of a shared row and the row order.
- One row per entry, the grid's row height, in every output.

### 3.2 Text box

- A bordered box. Its first row is the title, **"Notes"** by default and editable.
- Under it, free text. **Enter starts a new line; the box grows as you type.** A long line wraps inside the box.
- **Every line carries its own format, set with the header's controls**: size, bold, italic, colour, highlight,
  alignment, and ∅ to clear. The title is a line like any other (bold and centred by default).
- A line takes as many grid rows as its text needs at its size (§5.2), so a 16 pt line or a wrapped line is two rows
  tall, never squeezed.

### 3.3 Arranging

- **Add**: a **Side boxes ▾** menu in the preview toolbar, waterfall view only: *Color key on the left / right*,
  *Text box on the left / right* (§9 Q7).
- **Stack**: boxes on one side stack top to bottom, one empty row between them, starting at the grid's top edge.
- **Reorder / move side**: drag a box by its ⋮⋮ grip. While dragging, both side columns show a drop line, including
  an empty side (a dashed drop zone), so a box can cross to the other side.
- **Delete**: × on the box's title bar. Undo brings it back.
- **Width**: each side has one width, dragged on its inner edge (the edge beside the grid). Double-click resets it
  to the default, as every other drag handle in the app does. The width is stored in Excel's column units (the
  unit every grid column already uses), so the screen, the workbook and the PDF read one number.

---

## 4. On screen

### 4.1 Where the boxes live, and why that is not a frozen edit

`#table-wrap`'s children are frozen, so the boxes are **not** inside it. Two new containers sit **beside**
`#table-wrap` inside `main.preview-panel` (the shell, MANTINE-SEAM §3.1):

```
main.preview-panel                      (a CSS grid only while a box exists, waterfall view, width > 960 px)
  #span-hint        — spans all three columns
  #gap-warning      — spans all three columns
  .view-toggle-row  — spans all three columns
  #table-wrap       — the middle column, children untouched
  .side-col.side-left   — first column  (placed by grid-column, so DOM order stays as the contracts need)
  .side-col.side-right  — third column
```

- **The sibling contract holds**: `#table-wrap` stays the element immediately after `.view-toggle-row`. The two side
  columns come AFTER it in the DOM and are placed left and right by CSS grid. Nothing is wrapped or re-parented.
- **The month view is untouched.** `body:has(#view-month-btn.active) .side-col{display:none}`, and the panel goes
  back to its plain block layout. ⛔ This matters because **`#table-wrap`'s width repaginates the month PDF**
  (MANTINE-SEAM §5.3: `mvNoteBoxWidth()` measures it). The button's `active` class is set before `update()` in both
  `setViewMode()` and `applyStateSnapshot()`, so the side columns are gone before `renderMonthView()` measures.
  The leg asserts it: `#table-wrap`'s width in the month view is identical with and without boxes.
- **The app shell's grid fit is untouched.** It measures `.sheet-scroll`'s top and what is below it, both inside
  `#table-wrap`; a side column beside it changes neither. Each side column scrolls on its own, capped at the grid
  box's height, so the window still never scrolls.
- Below the 960 px stack point the side columns stack under the grid (left boxes, then right boxes).
- With no boxes, no side column is rendered and the panel's layout is exactly today's.

### 4.2 What the boxes look like

They are drawn like the grid, not like the chrome, because they print: Carlito 11 px, the grid's 20 px row pitch,
the grid header's grey for the title row, a thin dark frame. Each text line has a minimum height of its row count ×
20 px (§5.2), so the screen shows how many rows a line will take in print. The chrome around them (grip, ×, the
format bar, the width handle, the Side boxes menu) is Mantine-styled chrome.

### 4.3 Editing

- Names, titles and lines are `contenteditable` elements. ⛔ **No `id` on any of them, and no `input` / `select` /
  `textarea` with an id**, so `collectFieldValues()` never sweeps them into the file or the undo stack (CLAUDE.md;
  the same rule as the note editor). The box state lives in the new store (§7), not in `fields.byId`.
- The format bar is the header's: the same controls, in the same order, built from the same markup helpers and
  the same CSS classes where those are free (`alignIcon()`, `alignMenuHtml()`). Its handlers are new: the header's
  are delegated on `#table-wrap` and must not be touched.
- One committed edit is one undo step: a name or line commits on blur or Enter, a format click immediately, a drag
  on release (the `pushUndoSnapshot()` bracketing the day menu uses, not the 500 ms debounce).
- The colour key's rows re-derive after every render: a `MutationObserver` on `#table-wrap` (CLAUDE.md sanctioned
  pattern 3), so a phase recoloured or added in the sidebar appears in the key at once.

---

## 5. Printed: Excel and the waterfall PDF

Both outputs are built from ONE layout function, `sideBoxLayout(schedule, rowHeightsPt)`, new and not frozen. It
returns, per side, a list of segments (`title`, `key row`, `text line`, `gap`) with the number of grid rows each
occupies. Excel turns rows into merged ranges; the PDF turns them into rectangles. Computing it once is the lesson of
the column model (PROJECT-CONTEXT §9a): three independent layouts never agree.

### 5.1 Excel

```
      A          B    C      D … G           H    I      J
   ┌──────────┐      ┌──────┬──────────┬────┐      ┌──────────┐
 1 │ Notes    │      │ Date │   2027   │Note│      │Color Key │
 2 │Locations…│      │ 1/4  │Writer's… │    │      │Writer's Rm│
 3 │ (2 rows, │      │ 1/11 │ …        │    │      │ Pre Prep  │
 4 │  merged) │      │ …    │          │    │      │ …         │
 5 │          │      │      │          │    │      │ Hiatus    │
   └──────────┘      └──────┴──────────┴────┘      └──────────┘
   left side  spacer  the grid, shifted right      spacer  right side
```

- **Each side is ONE Excel column** at the side's width, with **one empty spacer column** between it and the grid
  (§9 Q3). A left side shifts the whole grid right by two columns; a right side adds two columns after it.
- **Boxes start on row 1** (the grid's header row), one empty row between boxes.
- A title is one row, filled with the grid header's `D9D9D9`, bold, centred. A key row is one row, filled with its
  colour. A text line is a merged range of as many rows as it needs, `wrapText` on, its format written as the cell's
  font (size, bold, italic, colour), its highlight as the cell's fill, its alignment as the cell's horizontal
  alignment. Each box gets a thin outside border.
- Rows below the grid's last row (a side taller than the grid) get the default 15 pt height explicitly.
- The print area grows to include the side columns and rows; `fitToPage` (1 × 1, already set) shrinks the whole
  sheet onto one page, as it does for a long grid today.

### 5.2 How many rows a line takes

In points, which is where it has to fit physically: the line's text is wrapped greedily at the box's width with the
grid's own measure (`measureTextPx`, scaled by size / 11), each wrapped line costs `size × 1.35` pt
(`SHEET_LINE_RATIO`), and the line takes rows, starting at its own row, until their heights cover it. At the default
11 pt every unwrapped line is exactly one row. The screen uses the same row counts at its 20 px pitch, which always
has more room than print's 15 pt, so the screen never shows a line fitting that print would clip.

### 5.3 The waterfall PDF

- **The grid prints smaller to make room**: the fit scale is computed over **grid + boxes together**, the same
  whole-percent rule (`Math.floor(raw × 100) / 100`) the grid uses today, so the workbook and the PDF stay the same
  size as each other. Width = left side + spacer + grid + spacer + right side; height = the taller of the grid and
  either side.
- The content is centred on the page as the grid is today. The grid's own drawing is unchanged; it just starts at
  a different x.
- The header band spans **grid + boxes**, from the left side's edge to the right side's (§9 Q5). Without boxes those
  are the grid's edges, which is exactly today.
- Boxes are drawn with the page API the writer already has (`rect`, `line`, `text` with its italic skew, `clipPush`)
  and the two embedded Carlito faces. Highlight is a filled rectangle behind the line; colour is the text colour.
- ⚠️ Characters outside WinAnsi print as the writer already prints them in notes. Nothing new there.
- ⚠️ The **print-fallback** waterfall PDF (`WF_PDF_MODE === 'print'`, the rollback, off) does not show boxes. It
  renders `#table-wrap`'s own markup, and the boxes are not in it. Stated, not fixed: it is a rollback path.

### 5.4 Orientation

Today `sheetPageOrientation(gridW, gridH, blockCount)` picks portrait for one or two year blocks, landscape for
three or more, unless the other way prints 15% larger. It is called by both writers, from shared metrics, so they
cannot disagree (that divergence was a real bug).

With boxes, both writers pass it **the grid + boxes extent** instead of the grid's (§9 Q4). The function itself is
not edited; its callers pass a wider and possibly taller box. So a narrow one-year calendar with a key on each side
may turn landscape and print larger, and the workbook turns the same way. A shared helper,
`sideBoxPageExtent(metrics)`, is the ONE place both writers get that extent from.

### 5.5 A page with no room

There is always room: the page shrinks. Boxes taller or wider than the grid are part of what is fitted, exactly as
a long grid is fitted today, so a very long text box makes the whole page print smaller (§9 Q4). Floors:

- A side's width is clamped to 8–60 column units (60 is about 6 inches).
- The fit scale keeps the writer's existing floor of 10%.
- Text never shrinks to fit inside a box; a line takes more rows instead (§5.2). That is what "grows as you type"
  means in print.

---

## 6. ⛔ The frozen edits this needs — owner sign-off required

Every edit is **inert when the calendar has no boxes**: the offsets are 0, the extents equal the grid's, no new code
path runs, and the bytes are identical. The measurement that proves it is the gate's own byte-compares.

| # | Frozen symbol | The edit | Inert because |
|---|---|---|---|
| E1 | `exportExcel` | The grid's first column becomes `1 + leftCols` (the `let cum = 1` that starts `blockStartCols`) | `leftCols` is 0 with no left box |
| E2 | `exportExcel` | The gridlines loop runs over the grid's columns, not from column 1, so the preference never rules the side columns | Starts at 1 when `leftCols` is 0 |
| E3 | `exportExcel` | Orientation and the print area read `sideBoxPageExtent()`; then one call, `writeSideBoxesXlsx(ws, …)`, writes the side columns | The extent is the grid's and the call returns at once with no boxes |
| E4 | `buildWaterfallPdf` | The fit scale and the centring are computed over grid + boxes; the grid's origin moves right by the left side's width | Width and height equal the grid's; the shift is 0 |
| E5 | `buildWaterfallPdf` | The header band spans grid + boxes | Its edges are the grid's with no boxes |
| E6 | `buildWaterfallPdf` | Orientation reads `sideBoxPageExtent()`; then one call, `drawSideBoxesPdf(page, …)` | As E3 |

**Not edited**: `sheetPageOrientation`, `sheetGridMetrics`, `sheetColumnWidths`, `computeBlockLayout`,
`computePhaseRowLayout`, `render`, `renderSpreadsheetView`, `renderMonthView`, the width-model constants, every
`.sheet-*` / `.mv-*` / `#print-root` rule, and the print paths. The month view and the month PDF see nothing.

**The acceptance gate:**

1. **Full `gate.sh`, green**: the waterfall PDF byte-identical to the baseline, every Excel part identical, 0
   clipped cells, v1.0.0 restores identically, gates 10 and 13 (the month PDF) identical, `fields.byId` still 74 ids.
   That is the proof every existing calendar is untouched.
2. **A new leg, `sideboxes`**, red on the pre-change build (`7054bec6…`) and green after, on a synthetic fixture
   with a key on the right and a text box on the left. It reads back the `.xlsx` (merged ranges, widths, fills,
   fonts, the shifted grid, the print area) and the PDF (scale, the grid's origin, the box text present, page
   orientation), checks the save round-trip, undo, the month view's `#table-wrap` width, and that no box control
   carries an id.
3. Before committing E1–E6, an A/B of both exports on the fixture, shown to the owner.

⚠️ The header-row session (ruling 2) also edits both writers' header row code. Our edits are in different lines
(the column origin, the fit and the end of each writer), so a merge conflict, if any, is textual and small.

---

## 7. Save format

One new top-level key, **`sideBoxes`**, in `captureSnapshot()` and `applyStateSnapshot()`.

```json
"sideBoxes": {
  "boxes": [
    { "side": "right", "kind": "key",  "title": "Color Key", "titleFmt": {},
      "names": { "#E2F0D9": "Shoot" } },
    { "side": "left",  "kind": "text", "title": "Notes", "titleFmt": { "align": "left" },
      "lines": [ { "t": "Locations TBC", "f": { "bold": true } }, { "t": "Table read 3/1", "f": {} } ] }
  ],
  "widths": { "left": 22 }
}
```

- **Absent means no boxes**, and the key is written **only when at least one box exists** (the `prepPauseOff` /
  `mvProdLabel` absent-key shape). A calendar that adds a box and deletes it again saves byte for byte as before.
- **Restored unconditionally**: no key → no boxes, never the previous file's boxes.
- `boxes` order is the stacking order; each box's `side` says which column it is in.
- `f` and `titleFmt` use the header format's keys and values (`size`, `bold`, `italic`, `color`, `highlight`,
  `align`), validated by the same rules `headerFormatCss()` applies (audit H-1): sizes 1–400, `#rrggbb` colours,
  three alignments. `sanitizeSnapshot()` drops anything else, caps the counts (boxes, lines, characters) and drops
  a box of an unknown `kind`, so a future kind cannot crash an older build.
- `names` is keyed by uppercase `#RRGGBB`. A name for a colour the calendar no longer shows is kept (the colour may
  come back) but not drawn.
- `widths` holds only dragged widths; absent = the default (§9 Q3).
- `SNAPSHOT_VERSION` unchanged: an older build ignores the key, which reads as no boxes.
- Not week-keyed, so the shift tools leave it alone. `resetAll()` (New) clears it. The shareable copy re-renders the
  boxes from state on boot, and `buildSavedHtml()` empties the two side columns in its clone, as it empties the
  React hosts.

---

## 8. Build steps

Each step is committed on this branch with its own leg cases.

1. **The store.** `sideBoxes`, capture, restore, sanitize, reset, the shareable-copy strip. Leg: round-trip, absent
   key, a hostile file, New. No UI, no export change.
2. **The screen.** The two side columns, the Side boxes menu, both kinds of box with editing and the format bar,
   drag to reorder and across, the width drag, undo. Leg: hit-tested clicks (`elementsFromPoint`, HANDOFF traps),
   no ids, the month view's width unchanged.
3. **`sideBoxLayout()` and Excel (E1–E3).** Leg: the workbook read back.
4. **The waterfall PDF (E4–E6).** Leg: the PDF read back.
5. **The gate, the docs** (README changelog, HANDOFF, UI-CONVENTIONS §10 if the gate list grows), and the owner's
   merge picker.

---

## 9. Rulings (owner, 20 Oct 2026, by picker)

✅ **Every answer was the recommended one**, so the plan above stands as written. The owner's picks, verbatim:
*"Grid order, joined"*; *"Hiatus red, if one shows"*, *"Sim Post yellow"*, *"Any row can be hidden"* (Notes purple
not picked); *"1 col + spacer, row 1"*; *"Grid + boxes together"*; *"Grid + boxes"* (header); *"Full line width"*;
*"Preview toolbar menu"*; *"Approve E1–E6"*.

| # | Question | ✅ Ruled | Not chosen |
|---|---|---|---|
| Q1 | Key rows: what order, and what does a shared colour say? | **Order the phases first appear down the waterfall; a shared colour reads "Pre Prep / Prod Prep"; hiatus last** | Sidebar order; first phase's name only |
| Q2 | Which rows besides the phases? | **Hiatus red when the calendar shows a hiatus; Simultaneous Post yellow when it shows; any row can be hidden (× on the row, restorable)** | Hiatus always; Notes purple too; no hiding |
| Q3 | Excel columns | **One column per side at the side's width, default 20 units (about 2 inches); one empty 2-unit spacer column beside the grid; boxes start on row 1** | No spacer; start on row 2 (under the header row) |
| Q4 | The page: what decides orientation and the fit? | **Grid + boxes together**: one page, whole-percent fit over both, orientation from both (a narrow calendar with boxes may turn landscape) | Orientation from the grid alone as today, boxes only shrink it; or clip boxes at the grid's bottom |
| Q5 | The PDF header band | **Spans grid + boxes** | Spans the grid only, as today |
| Q6 | A line's highlight | **Fills the line's full width**, in all three outputs (an Excel cell can only be filled whole) | Hugs the text on screen and in the PDF, as the header does; Excel then differs |
| Q7 | Where boxes are added | **A "Side boxes ▾" menu in the preview toolbar**, waterfall view only | In the Settings window (ruling 12); both |
| Q8 | The frozen edits E1–E6 (§6) | **Approved, with the gate in §6 as the proof** | Excel first, PDF after a separate A/B; not yet |

---

## 10. Where the build departs from the plan

- **The format bar sits UNDER the line being edited**, not above it. Above, it hid the lines just typed, and for a
  box at the top of its column it covered the preview toolbar. It flips above only when the window has no room
  below. A right-side box's bar hangs from the box's right edge, so it opens over the grid.
- **The grip and × sit inside the title row**, shown on hover or focus, rather than outside the box: the side column
  scrolls, and anything outside the box would be clipped by it.
- **Key names shrink to fit one row** (`sideKeyScale()`, bold measure, floor 50%), as a phase label shrinks; they
  never wrap. Text lines wrap and take more rows instead.
- **A side's width is a grid column's unit end to end**: dragged in screen px, stored as `screenPxToChars()`
  clamped by `clampChars()` to 8–60 (which also steps off ExcelJS's 9.00 sentinel), drawn as `charsToScreenPx()`.
- **`OVER_PANEL` gained `.sb-fmt, .sb-menu, .sb-drop`**: the format bar can hang over the grid's edge, and the grid's
  hit test must stop at a body-level panel.

- **Checked against the owner's standing rule** (20 Oct 2026, relayed: *"The app needs to be easy for anyone to use"*):
  every string is plain words ("Side boxes", "Color key on the left", "Hide this row", "Show 1 hidden row", "Drop on
  the right"), no engine word (segment, row slot) reaches the screen, each control shows only where it applies (the
  button in the Waterfall view, grip and × on hover, Show hidden only when a row is hidden, the format bar only while
  editing), and moving and sizing are drags. No change was needed.

## 11. As built and proven (20 Oct 2026)

- **Code:** `src/legacy/app.js`, block "SIDE BOXES" after `let customHolidays = [];` (store, sanitizer, layout,
  writer helpers, screen editor) and the hooks named in §7; the frozen edits E1–E6 in `exportExcel` and
  `buildWaterfallPdf`, each commented in place. `src/index.html` (two hosts), `src/styles/legacy.css` ("Side boxes"
  after the app-shell block), `src/chrome/PreviewToolbar.jsx` (`#tb-side-boxes-btn`).
- **Leg `sideboxes`** (`tests/harness/t/sideboxes.js`, on `tests/fixtures/sideboxes.sptcal`, wired into `gate.sh`
  just before the Node provers): 58 checks in six groups, S (screen), X (workbook), P (PDF), M (month view), G
  (gestures, each hit-tested), F (file). Green 58/58 on build `b1accea4…`. Red on the pre-change build `7054bec6…`.
  Mutants, each red on its own check: the key written with no box (F5), E1 removed (X3), the month-view hide
  removed (M1; F4 stayed green because the panel's grid rule is ALSO scoped to the Waterfall view, a second guard).
- **What the leg measured:** the workbook's A = text box, B = 2-unit spacer, grid from C with its date chain `=C2+7`,
  the key in K with fills and white-on-red, merges `A3:A5` and `A8:A9`, print area `A1:K53`; the PDF's box text left
  of the grid (x 22.3 against the grid's Date at 121.9) and the key right of it (x 536.9), the italic shear, the
  three-line wrap, the band's left line at the box's edge; `#table-wrap` 1160 px wide in the month view with boxes and
  without; deleting the last box removes the `sideBoxes` key and gives back the identical PDF page content.
- `check-xlsx.sh` on the workbook: OK. The PDF rendered with `pdftoppm` and inspected.

## 12. Follow-up, not built: saved side-box presets

Relayed by the Settings-window session (20 Oct 2026), owner's words to it: *"maybe its a tab in settings that keeps both
presaved headers and presaved side boxes"*. Not part of ruling 7 as briefed, so not built here. If built:

- A card in the Settings window's **Presets** tab (`src/chrome/SettingsWindow.jsx`, `<Tabs.Panel value="presets">`,
  branch `claude/settings-window-30719d`, not merged), after `HeadersCard`.
- **Per machine**: the `sptcal.prefs` localStorage store, never `captureSnapshot()`. Any id'd control means the card
  carries `className="card prefs-card"`, or `collectFieldValues()` bakes the id into every saved file.
- A preset would hold the `sideBoxes` shape (§7) and pass `cleanSideBoxes()` on the way in, as header presets pass
  `cleanHeaderFormatMap()`. Open questions for the owner: what a preset holds (the whole arrangement, or one box), and
  whether applying one replaces the calendar's boxes or adds to them.
