# MANTINE-SEAM.md

> Written 29 Aug 2026, after a six-agent partition of `index.html` and an adversarial re-check of
> every "safe to change" call. `HANDOFF.md` points here for the vocabulary; this is that file.
> Read it **after** `HANDOFF.md` and `CLAUDE.md`, **before** you touch anything for a Mantine stage.
>
> It cites symbols, never line numbers. `grep -n` finds them; the numbers rot.


### What in here was verified by hand

This document was produced by six agents partitioning the codebase, followed by an adversarial pass
that **overturned 26 of the 36 classifications it re-checked** — it was deliberately weighted
against false "safe to change", because a wrong *safe* is a broken printout nobody notices until a
user prints, while a wrong *frozen* costs only a conversation.

Agents are not evidence. These claims — the ones with the highest cost of being wrong — were then
checked by hand against the source, and every one held:

| Claim | Verified |
|---|---|
| **Seven** `document.getElementById('table-wrap').addEventListener(...)` calls, all unguarded, all at IIFE-body scope | ✅ seven, all at indent 2, none null-checked |
| The print selectors are **child** combinators — `body.printing-calendar > *:not(#print-root)` and the `printing-waterfall` twin | ✅ both, exactly as written |
| `#sheet-scroll-container` is emitted by `renderSpreadsheetView`, so a print-fallback export puts **two** elements under that id | ✅ one id, one renderer, injected into `#print-root` too |
| `.card.tab-hidden{display:none !important}` is why an inactive sidebar tab still has live inputs, and `computeHeaderDefaults` has **three unguarded** field reads | ✅ `show-title`, `shoot-days-per-ep`, `num-episodes` — all bare `.value` |
| `--header-h` is written by a `ResizeObserver` on `document.querySelector('header.app-header')` | ✅ |
| `font-carlito-400` / `font-carlito-700` are **element ids read at runtime** by the font loader | ✅ `document.getElementById('font-carlito-' + weight)` |
| `*{ print-color-adjust:exact !important }` is what keeps fills in both PDFs | ✅ one rule, on `*` |
| `exportExcel` has **three** real `document.` references, not four | ✅ — see below |

⚠️ **One correction this document made to an earlier claim of mine, and it was right.** I reported
`exportExcel` as having four `document.` references. It has **three**. The fourth grep hit was the
substring `officedocument.` inside the xlsx MIME type — a false positive from matching `document\.`
without a word boundary. Corrected in `HANDOFF.md` §4. The conclusion is unchanged and slightly
stronger: the Excel writer touches the DOM only to create the download anchor, read `#show-title`
for the filename, and append the anchor.

Everything **not** in that table came through the adversarial pass but was not independently
hand-checked. It is cited by symbol, so `grep -n` settles any of it in seconds. Do that before
betting a stage on one.

---

## 1. THE ONE RULE

**A change is safe if and only if it cannot reach any of the four outputs.** There are four, not
two: the Excel workbook (`exportExcel`), the direct waterfall PDF (`buildWaterfallPdf` →
`exportWaterfallPdfDirect`), the print-fallback waterfall PDF (`exportWaterfallPdf`, live when
`WF_PDF_MODE === 'print'`), and the month PDF (`exportMonthPdf`). The first two never read the
DOM. **The last two ARE the DOM** — they inject `renderSpreadsheetView()` / `renderMonthView()`
into `#print-root`, style it with the app's own stylesheet, measure it with
`getBoundingClientRect()`, and print it. So the test is not "did I edit a frozen function"; it is
**"can this markup, this CSS rule, this constant, or this element id be seen by one of those four
paths — directly, through a shared module store, or through a measurement?"** If yes, it is
frozen no matter how much it looks like styling. If you cannot answer that question in under a
minute, the answer is frozen, and the cost of being wrong is asymmetric: a false "safe" is a
broken printout nobody notices until a user prints; a false "frozen" is a conversation.

---

## 2. Vocabulary — fix this before anything else

The project and the owner both said "the grid" and meant different things. The owner (29 Aug):
*"the full calendar system (the grid, is that what we're calling it?) can be redesigned under
MANTINE."* `CLAUDE.md`'s freeze rule says "Never touch the grid" and means something much
narrower. Both statements are true under their own definitions and contradictory under the other's.
Use these five names instead, and never write "the grid" again in this project's docs.

| Name | What it is | Symbols | Status |
|---|---|---|---|
| **the waterfall view** | The on-screen table: the HTML string `renderSpreadsheetView()` returns, written into `#table-wrap` | `renderSpreadsheetView`, `#table-wrap`, `.sheet-*` CSS, `installGridResizers`, `beginSpanDrag`, `applyCellFitLive` | **Frozen** — it is also the print-fallback PDF's document |
| **the month view** | The on-screen month calendar: the HTML string `renderMonthView()` returns, into the same `#table-wrap` | `renderMonthView`, `.mv-*` CSS, `mvNoteLineCount`, `mvNoteBoxWidth` | **Frozen** — it is the month PDF's document |
| **the width model** | The unit system and the layout decisions shared by all four outputs | `EXCEL_MDW`, `EXCEL_CELL_PAD`, `COL_PAD_CHARS`, `SHEET_ZOOM`, `ROW_DEFAULT_PX`, `ROW_PX_TO_PT`, `SHEET_LINE_RATIO`, `ROW_TEXT_PAD_PX`, `charsToPx`, `pxToChars`, `charsToScreenPx`, `screenPxToChars`, `clampChars`, `measureTextPx`, `cellTextFit`, `sheetColumnWidths`, `computeBlockLayout`, `computePhaseRowLayout`, `applyCellSpanOverrides`, `sheetRowCount`, `sheetGridMetrics`, `sheetPageOrientation` | **Frozen** |
| **the writers** | The two DOM-blind byte producers | `exportExcel`, `buildWaterfallPdf` (+ `pdfSerialize`, `pdfPage`, `ttfRead`…) | **Frozen** |
| **the print paths** | The two DOM-dependent exporters that render HTML and call `window.print()` | `exportWaterfallPdf`, `exportMonthPdf`, `setWfPageStyle`, `removeWfPageStyle`, the whole `@media print` block | **Frozen** |
| **the shell** | Everything outside `#table-wrap` and `#print-root`: header, toolbar, file menu, sidebar cards, tabs, popovers, notices, help | `header.app-header`, `.app-toolbar`, `.form-panel`, `.preview-panel`, `.tools-menu`, `.note-pop` | **Redesignable, with the catches in §3** |

**`CLAUDE.md`'s "the grid" = the waterfall view + the month view + the width model + the writers +
the print paths.** Its frozen-surface list names them individually — `#table-wrap` and everything
inside it, `#print-root` and everything inside it, the width constants, `render` /
`renderSpreadsheetView` / `renderMonthView`, the export functions, and "every `.sheet-*` / `.mv-*`
/ `#print-root` rule". **The owner's "the grid" = the whole app**, i.e. what he was granting
permission to redesign is **the shell**, plus how the waterfall view is *framed* — not what it
emits.

One correction the vocabulary exposes: the month view is not listed anywhere in
`MANTINE-MIGRATION.md` §2's surface table, neither as in scope nor as excluded. It looks like
ordinary card-and-grid chrome, it lives inside `#table-wrap`, and it *is* the month PDF's
renderer. That omission is how it gets redesigned by accident. Treat it as named-frozen.

---

## 3. May be redesigned

Every entry here survived the adversarial pass. Every one has a catch, and the catch is the
reason it is written down rather than left implicit.

### 3.1 The shell, wholesale

`header.app-header`, `.app-toolbar`, `.tb-btn*`, the file menu, `.save-status`, `#legacy-notice`,
`#update-notice`, `.layout`, `.form-panel`, `.preview-panel`, `section.card`, the side tabs, the
phase rows, hiatus rows, episode rows, the holiday grid, `#help-*`, the empty state, and the dead
CSS (`footer.assumptions`, `table.week-table`, `.badge*` — no renderer emits any of those class
names).

**Catches, all of which fail silently:**

- **`header.app-header` must stay matchable and must stay a direct child of `<body>`.** A
  `ResizeObserver` IIFE does `document.querySelector('header.app-header')` and writes
  `--header-h`; and both print paths hide the app with `body.printing-calendar > *:not(#print-root)`
  / `body.printing-waterfall > *:not(#print-root)` — **child combinators**. A React root wrapping
  the app makes those selectors match the wrapper and the printed page comes out blank.
- **`#print-root` must stay a direct child of `<body>` and must stay last**, for the same
  selectors, and because `captureScroll` resolves `#sheet-scroll-container` by
  `getElementById` — which returns first-in-document-order, and during a print-fallback export
  two elements carry that id.
- **`#table-wrap` and `#print-root` must exist in the served HTML before the script runs.** Seven
  delegated listeners are attached with an unguarded
  `document.getElementById('table-wrap').addEventListener(...)` at IIFE evaluation time. If React
  creates that node on mount, all seven throw and take the rest of the IIFE with them.
- **`.form-panel` is a class contract.** The sidebar anti-jump guard arms only on
  `e.target.closest('.form-panel')`, and `setSidebarTab` queries
  `.form-panel section.card[data-tab]`. Lose the class and the preview starts jumping again and
  the tabs stop hiding cards — no error either way.
- **Sidebar tab panels must stay mounted.** `setSidebarTab` hides with
  `classList.toggle('tab-hidden', …)` against `.card.tab-hidden{display:none !important}`. That is
  the only reason `computeHeaderDefaults` — called from *both* writers — can read `show-title`,
  `season-num`, `shoot-days-per-ep`, `num-episodes` and `start-writersRoom` no matter which tab is
  showing. A Mantine `Tabs` that conditionally renders inactive panels throws a `TypeError` inside
  `exportExcel`/`buildWaterfallPdf` (three of those five reads are unguarded).
- **The toolbar's rendered height is measured by the print fallback.** `--header-h` feeds
  `.sheet-scroll{max-height:calc(100vh - var(--header-h) - 140px)}`, and `exportWaterfallPdf`
  measures the injected copy in **screen** media, where `#print-root .sheet-scroll{max-height:none
  !important}` (inside `@media print`) does not apply. Changing toolbar height can therefore change
  the measured `hRect.width`, which crosses the hard threshold `W <= PAGE.portrait.w` and flips the
  page orientation. This is a real, cheap constraint to remove: lift the `.sheet-scroll`
  neutralisation out of `@media print` and the measurement stops caring. That is an edit to frozen
  print CSS and needs the owner's sign-off, so until it lands, treat toolbar height as
  export-affecting.
- **`#export-btn` is a dispatcher, not an Excel button.** Its handler opens
  `if(viewMode === 'month'){ exportMonthPdf(); return; }` before the ExcelJS guard — it is the sole
  entry point to the month PDF. Splitting it into two semantic buttons decouples the month PDF
  unless the `viewMode` dispatch is reproduced. Both export buttons ship `disabled` in markup and
  are enabled only inside `render()`; drop that and exports become unreachable. And the handler
  uses the DOM as its own state store (`const original = btn.textContent; … finally
  { btn.textContent = original }`) while `render()` writes the same property — that body cannot
  survive a React-controlled label and must be ported to component state, not "called unchanged".
- **See §6 for the id rules.** No shell redesign is safe without them.

### 3.2 Popovers

`.note-pop`, `.mv-note-pop`, `.phase-color-pop`, `.note-editor`, `.color-swatch`,
`.note-day-select`, `.note-size-select`. Already body-level (`document.body.appendChild(pop)`),
already anchored to cells rather than injected into them — the exact shape Mantine `Popover` wants.
`MANTINE-MIGRATION.md` calls this the biggest deletion in the project and it is right.

**Catches:** the controls carry **classes and no ids**, deliberately, and the code says why —
`collectFieldValues()` sweeps every `input[id]/select[id]/textarea[id]` into the save file and the
undo stack. Mantine `Select` / `NumberInput` generate ids by default; suppress them. Reposition on
capture-phase `scroll` and on `resize`, and tear down when the anchor dies. `buildSavedHtml()`
strips exactly `.note-pop, .mv-note-pop, .phase-color-pop` from its clone — keep those class names
or a stray popover exports into a shareable copy.

### 3.3 Feedback and affordance *inside* the waterfall view — layout-neutral properties only

Hover tints and rings (`td.sheet-note-cell:hover:not(.has-note):not(.editing)`,
`.has-note:hover{box-shadow:inset …}`), the `.editing` outlines, the live colour preview
(`td.style.background` during editing, thrown away at `commitActiveNoteEditor`), cursors and
`body.grid-resizing*`, the `.span-preview` ghost, and the paint of the `.grid-resize` handles.

**Catch — this is the whole reason those rules use `box-shadow: inset` and `outline` rather than
`border`.** Anything that changes a cell's laid-out box changes `scrollWidth`/`clientWidth` (the
quantity the acceptance gate counts as clipping) and changes `tr.getBoundingClientRect().height`
(the quantity a row drag seeds from — see §5.7). Permitted: `background`, `color`, `box-shadow`,
`outline`, `opacity`, `cursor`. Forbidden: `border`, `padding`, `font-size`, `line-height`,
`display`, `box-sizing`, `transform`, `zoom`.

**Second catch on the handles:** their *paint* is free, their *geometry* is not.
`COL_HANDLE_CLEARANCE = 9`, the `+4 / -11` span insets, `ROW_SNAP_PX = 4` and the z-index order
4 < 5 < 6 are each a recorded fix for a hit-testing failure ("a full-width row handle would sit on
top of every note cell and swallow the click that opens the editor"; "you end up with a 21 beside a
20 — invisible on screen, obvious in print"). Restyle; do not re-derive.

**Third catch on `.span-preview`:** whatever replaces it must not mutate `colSpan` or a `<col>`
width per `pointermove`. The comment says why — that reflows the whole table on every move — and a
half-applied width is what the next drag reads as its starting value.

### 3.4 Individual values that are genuinely free

| Value | Why it is free | Catch |
|---|---|---|
| `table.sheet-table th { background:#F2F2F2 }` — **the colour only** | Excel writes `HEADER_FILL='D9D9D9'`, the PDF writes `HEADER_FILL_PDF='#D9D9D9'`, and `.wf-print .sheet-table th{background:#D9D9D9}` overrides the screen for the print copy. `getComputedStyle` appears **zero times** in the file, so no CSS colour enters any computation. STAGE-8 item 12 rules on exactly this. | The override wins by **one class** — `(0,2,1)` vs `(0,1,2)` — with no `!important`, from a rule ~330 lines *earlier* in the same sheet. Any new screen selector at `(0,2,1)`+ (`.sheet-table.is-modern th`), any inline/CSS-module style, or any `@layer` split defeats it. If you unify the screen value to `#D9D9D9`, **keep `.wf-print .sheet-table th` verbatim** with a comment saying it is deliberately redundant — deleting it moves that colour from the frozen side of the seam to the mutable side. The **rest** of the `th` rule (`font-size`, `font-weight`, `font-family`, `color`) is frozen: it sets the print copy's header row height under `.wf-print{height:auto; line-height:1.3}`, which is a term in `H`, which is the fit `scale`. |
| `--grid-line: #D4D4D4` — **the colour only** | The screen paints a 1px solid interior line on every cell; the direct PDF draws none (`interior = SHEET_GRIDLINES === 'none' ? null : …`) and Excel sets `showGridLines = false`. | `--grid-style: solid` is **frozen** — the `wf-grid-none` print variant overrides only the colour, so `solid` is inherited straight into the print copy, and `--grid-style:none` zeroes the used border width, taking 1px out of every cell box in both axes. That 1px is part of `EXCEL_CELL_PAD = 5`. Keep the variable *named* `--grid-line` and keep it consumed by the `td`/`th` border shorthand — the three `.wf-grid-*` variants bind to both. |
| `MILESTONE_TEXT` | Exactly one occurrence in the file: its own declaration. Dead. | If you delete it, delete only it. |
| `PHASE_COLOR_OPTIONS[].name` | Sole reader is `sw.title = o.name` in `openPhaseColorPop` — a swatch tooltip. | `.color` and `.text` are **not** free (§4.5), and the array's **order and length** are save-format (§6.4). |
| `title="Click to edit this note"` etc., and `title` on `.phase-cell-label` / `.grid-resize` | Nothing reads a `title` attribute anywhere — no `getAttribute('title')`, no `[title]` selector, no `.title` in read position. `title` does not render in print. | A Mantine `Tooltip` must **own its target element**, which is forbidden inside `#table-wrap` (§4.2). Anchor a body-level tooltip against the cell's `getBoundingClientRect()`; mount nothing inside the `<td>`, because `applyCellFitLive` refits from `const txt = td.textContent` and the harness signature is built from the same. |
| `phiatus-label-<key>` content | Write-only sink, three writes, zero reads. `computeSchedule` derives the band label independently as `(ph.label \|\| 'Phase') + ' Hiatus'` from `getAllPhaseDefs()` → `name-<key>`. | `name-<key>` stays frozen as the source. |
| `data-notefit`, `data-notelines` | Written at five sites, read at none. | They are the only externally visible record of what `cellTextFit` decided. Cheap; keep them for the gate. |
| `spellcheck="false"` on `.hdr-line` | No output counterpart. | — |

---

## 4. May NOT be touched

Grouped by the reason, because the reasons are different and the wrong reason leads to the wrong
exception.

### 4.1 They produce the bytes

`exportExcel`, `buildWaterfallPdf`, `exportWaterfallPdfDirect`, `pdfSerialize`, `pdfPage`,
`pdfEscape`, `pdfRgb`, `pdfDeflate`, `ttfRead`, `ttfGlyph`, `ttfAdvance`, `ttfTextWidth`.
Zero DOM contact in `buildWaterfallPdf`; three real `document.` references in `exportExcel`, all in
its last five lines (anchor, `#show-title` for the filename, `body.appendChild`). Also **the
ExcelJS CDN pin** (`exceljs@4.4.0`): it decides the actual bytes, so a build step that turns it
into an npm import is an export change wearing a tooling disguise.

> **Correction to a widely repeated fact:** `exportExcel` has **three** `document.` references, not
> four. The fourth grep hit is the substring `officedocument.` inside the xlsx MIME type.

### 4.2 They are *also* export renderers

`renderSpreadsheetView`, `renderMonthView`, `render`, and every class name they emit that appears
in a `#print-root …` or `.wf-print …` selector: `sheet-scroll` (+ id `sheet-scroll-container`),
`sheet-grid-wrap`, `sheet-table`, `sheet-date`, `sheet-empty`, `sheet-note-cell`,
`sheet-hiatus-cell`, `sheet-phase-cell`, `has-note`, `cell-body`, `phase-cell-label`,
`note-add-hint`, `sheet-blockstart`, `sheet-blockend`, `cal-header-bar`, `hdr-tools`, `hdr-line`,
`grid-resize-layer`, and the `.mv-*` family (`mv-week`, `mv-bars`, `mv-bar`, `mv-body`,
`mv-header`, `mv-daygrid`, `mv-daycell`, `mv-monthbar`, `mv-dowrow`, `mv-arrow`, `mv-tools`,
`mv-note-add`, `mv-note-add-full`, `mv-row-expand`, `mv-note-click`, `month-empty`).

They must keep returning **HTML strings**, because `exportWaterfallPdf` does
`host.innerHTML = '<div class="wf-print wf-grid-' + SHEET_GRIDLINES + '">' +
renderSpreadsheetView(currentSchedule) + '</div>'` and `exportMonthPdf` does
`html += '<div class="print-page">' + renderMonthView(currentSchedule) + '</div>'`. A React element
cannot be concatenated into either. And do **not** swap either for a React render into
`#print-root`: React 19 commits asynchronously and both paths measure on the same tick, which puts
you on the `W=0, H=0` path described in §5.1.

Named-frozen inside these renderers even though they read as chrome: `#hdr-mode-btn`,
`#notes-reset-btn`, `#mv-hdr-mode-btn`, `#mv-prev`, `#mv-next`. All are emitted by a frozen
renderer, all are handled by delegation matching on the id, and all are exactly the things a
toolbar redesign wants to promote.

### 4.3 The print CSS

The whole `@media print` block, the `/* ---------- Calendar PDF export ---------- */` block, the
`/* ---------- Month view ---------- */` block, and the five `.wf-print` rules that sit
**deliberately outside** `@media print` — the comment says why: *"so the off-screen fit-to-page
measurement sees exactly the size that will print."*

Two rules in there are load-bearing beyond appearance:

- `*{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }` — without
  it Chrome strips every phase fill, hiatus band and note highlight and both PDFs print as an empty
  grid. It wins today because the app's CSS is unlayered and `!important`. Put the app's stylesheet
  into a `@layer` and it loses.
- `#print-root .mv-week{display:grid !important}` + `#print-root .mv-daygrid{position:static
  !important; grid-area:1/1 !important}` — the comment records that Chrome's print rasteriser drops
  1px lines from the composited absolute layer *non-deterministically*, "which is why exporting the
  same month twice gave different missing dividers." The screen `.mv-*` rules and these print rules
  are two halves of one mechanism.

Also `@page{ size:landscape; margin:8mm }` (the month PDF's page box, re-derived arithmetically in
JS — §5.4) and `<style id="wf-page-style">` with `setWfPageStyle`/`removeWfPageStyle`. At-rules
resolve by source order and `setWfPageStyle` expects to be last; a leaked `#wf-page-style` prints
the month PDF at 5mm margins while its fit was computed for 8mm.

### 4.4 The width model

`EXCEL_MDW = 7` (floored, not 7.4336), `EXCEL_CELL_PAD = 5`, `COL_PAD_CHARS = 1.15`,
`SHEET_ZOOM = 0.75`, `ROW_DEFAULT_PX = 20`, `ROW_PX_TO_PT = 0.75`, `SHEET_LINE_RATIO = 1.35`,
`ROW_TEXT_PAD_PX = 5`, `NOTE_SHRINK_FLOOR`, `COL_MAX_CHARS`, `COL_MAX_CHARS_NOTES`,
`COL_MIN_CHARS`, `SHEET_PAGE_MARGIN_PT`, `SHEET_PAPER_PT`, `HF_MAX = 255`; and
`charsToPx`, `pxToChars`, `charsToScreenPx`, `screenPxToChars`, `clampChars`, `measureTextPx`,
`wrapLineCount`, `cellTextFit`, `sheetColumnWidths`, `computeBlockLayout`, `computePhaseRowLayout`,
`phaseRunBounds`, `applyCellSpanOverrides`, `sheetRowCount`, `computeYearBlocks`,
`sheetGridMetrics`, `sheetPageOrientation`.

Plus the CSS that mirrors them: `table.sheet-table td, th { padding:2px 1.5px; height:20px;
line-height:1.35; border:1px var(--grid-style) var(--grid-line) }`,
`table.sheet-table { table-layout:fixed; border-collapse:collapse; font-size:11px; font-family
'Carlito','Calibri',… }`, the inline `style="width:${gridPxTotal}px"` on the table,
`overflow:hidden; text-overflow:ellipsis`, `.cell-body`, `.sheet-table .phase-cell-label{
display:block }`, `td.sheet-date{ font-weight:600 }`, `*{box-sizing:border-box}`.

Each of those CSS numbers is a measured answer, and each fails silently and differently:

- `padding:2px 1.5px` — 1.5px each side + the 1px collapsed border ≈ 3.75px =
  `EXCEL_CELL_PAD × SHEET_ZOOM`. Overspending has ellipsis-clipped **64 of 255** filled cells once
  and **9 of 52** date cells again.
- `line-height:1.35` **is** `SHEET_LINE_RATIO`, and the constant's comment says it was measured
  from the live grid ("computed line-height is 14.85px on an 11px base"). The CSS is the source;
  the constant is the copy.
- vertical `2px + 2px + border` **is** `ROW_TEXT_PAD_PX = 5`, the number `cellTextFit` subtracts
  before dividing a row into lines.
- `height:20px` **is** `ROW_DEFAULT_PX`, which is also the PDF's row pitch, Excel's row height, the
  line-budget denominator, the drag snap target, and the height term in the orientation decision.
- `font-size:11px` is the fitter's contract: `cellTextFit` returns `scale` **always relative to
  11**, every call site writes `11 * fit.scale`, and `renderSpreadsheetView` *omits* the inline
  font-size when `Math.abs(fitPx - 11) > 0.01` is false. Change the CSS size and every unshrunk cell
  renders at the new size while the model still believes 11 — screen-only clipping, invisible to
  the PDF diff.
- `display:block` on `.phase-cell-label` is not a style choice: an `inline-block` sits on the text
  baseline and made every phase row 21px against everyone else's 20px. "Twelve rows of 21 and forty
  of 20 is exactly the 'ever so slightly different heights' that makes a printed grid look wrong."
- `.cell-body` exists because an inline height on a `<tr>` is only a **minimum**; without a wrapper
  carrying `max-height`, dragging a row shorter than its text just springs back.
- `table-layout:fixed` + the explicit table width are what make the `<colgroup>` authoritative. A
  `width:auto` table in a narrower container **compresses** rather than overflowing, so the declared
  widths silently stop applying the moment the grid outgrows the pane and every drag handle drifts
  off its boundary. `HANDOFF` §3 records that this was the entirety of "the dragging feels weird".

### 4.5 The measurement font

`measureTextPx`'s hardcoded `_measureCanvas.font = (bold?'bold ':'') + "11pt Carlito, Calibri,
sans-serif"` on a **detached** canvas — CSS-immune, which is the property that makes a Mantine
baseline safe for the workbook. Do not trade it for `getComputedStyle` or an in-document probe.

But it is not document-independent: it resolves against the `FontFace` that `loadCarlito()`
registers by reading `document.getElementById('font-carlito-' + weight)` for 400 and 700. **Those
two element ids are part of the Excel and PDF output contract**, exactly like `fields.byId`'s ids.
Drop the script blocks and `buildWaterfallPdf` throws on its own guard (loud). Drop only the
`document.fonts.add(ff)` and every column width in every output moves with **no error at all**
(quiet, and far worse). `carlitoReady.then(()=>{ _measureCache.clear(); … render(currentSchedule); })`
exists precisely because a first render against a fallback face bakes wrong widths in.

### 4.6 Direct manipulation, and the stores it writes

`installGridResizers`, `beginSpanDrag`, `spanHandleGeometry`, `applyCellFitLive`,
`repositionColHandles`, `repositionRowHandles`, `scheduleLiveUpdate`, `captureScroll`,
`restoreScroll` — and `colWidths`, `rowHeights`, `cellSpans`.

This is the one place where **the screen is a write path into export geometry**. The drag reads
the DOM and writes module state; the state is in `captureSnapshot()`; both writers read it:
`sheetColumnWidths`'s `const pick = (k, auto) => (colWidths[k] !== undefined ? colWidths[k] : auto)`
(a hand override bypasses `clampChars` entirely, so the 8 / 8.43 auto floors do **not** bound it),
`applyRowHeight`'s `row.height = Math.round((rowHeights[r] || ROW_DEFAULT_PX) * ROW_PX_TO_PT * 100)
/ 100`, `buildWaterfallPdf`'s `rowPt.push(…)`, and `applyCellSpanOverrides`'s
`cellSpans[weekIso + '|' + seg.cell.key]`.

The markup contract those handlers read is therefore frozen too: `.sheet-grid-wrap`,
`table.sheet-table`, `.grid-resize-layer`, `colgroup col[style.width][data-ckey]`,
`table.tHead.rows[0]`, `table.tBodies[0].rows`, `td.sheet-phase-cell` and its eight `data-*`
attributes (`week`, `pkey`, `own`, `lmin`, `rmax`, `a`, `b`, `nphases` — "own/lmin/rmax are the
span drag's whole world"), and the key format `y<year>:date | y<year>:s<n> | y<year>:notes` parsed
by `/^(y\d+):s(\d+)$/`.

Every entry guard in `installGridResizers` is a **silent early return** (`if(!wrap) return;`,
`if(!table || !layer) return;`, `if(!cols.length || !head) return;`). A Mantine table with no
`<colgroup>` removes column resizing, row resizing and cell spans from the product with no error
anywhere, while old saved files keep restoring values the writers still honour — calendars whose
widths can no longer be reproduced or edited.

> **Stale comment, do not trust it:** `colWidths`' declaration says the keys are
> `'date' | 'notes' | 'y2027:s0'` and that date/notes are shared across blocks.
> `sheetColumnWidths` builds `'y' + b.year + ':date'` and `':notes'` **per block** and carries its
> own comment saying they *used to* share one width.

### 4.7 State that is export content

`userNotes` (including the `text:''` explicit-clear semantics), `dayNotes`, `dayNoteColors`,
`noteColors`, `noteFontSize`, `hiatusTexts`, `hiatusColors`, `hiatusFontSize`, `holidayView`,
`holidayOff`, `customHolidays`, `headerMode`, `headerManual`, `mvHeaderMode`, `mvHeaderManual`,
`mvExtraLanes`, `customPhaseDefs`, `phaseColorOverride`, `episodeDefs`, `viewMode`.

Note the composite key shapes are contract: `hiatusFontSize` is keyed by bare week ISO for a
full-width band and by `week|phaseKey` for a per-phase band, and `exportExcel` rebuilds that key
itself with a comment saying it "must be byte-identical to the key the screen builds … or a size
set in the editor would never be found by the export."

`viewMode` is not UI selection: it is the export selector (`if(viewMode === 'month'){
exportMonthPdf(); return; }`), it gates `#export-wf-pdf-btn`'s visibility, and it is snapshot state
with a legacy `'list'` → `'sheet'` migration.

### 4.8 Palette and page literals

`PHASES` (`.key`, `.color`, `.label`, `.template`, `production`'s `inputMode:'days'`),
`PHASE_COLOR_OPTIONS[].color` and `[].text`, `SIMPOST_COLOR`, `SIMPOST_TEXT`, `HIATUS_COLOR`,
`MILESTONE_COLOR`, `HEADER_FILL`, `HEADER_FILL_PDF`, `FRAME`, `HDR_RULE`,
`EXCEL_STANDARD_COLORS`, `textColorFor`, `GRID_TEXT_COLOR`, `SHEET_GRIDLINES`,
`HDR_TITLE_PT`, `HDR_SUB_PT`, `HDR_GAP_PT`, `MARGIN_MM`, `MV_LANE_PX`, `MV_ROW_CHROME`,
`PAGE_PAD`, `MV_MIN_LANES`, `fmtShort`, `simPostLabel`, `HIATUS_DEFAULT_LABEL`, `colLetter`,
`isoOf`, `SHOOT_DAYS_PER_WEEK`, `rawInputToWeeks`.

Two of these are less obvious than the rest. `PHASES[].textColor` and `PHASE_COLOR_OPTIONS[].text`
look screen-only because `exportExcel` overrides them with `GRID_TEXT_COLOR` — but
`renderMonthView` inks every phase pill and every episode pill with `const fg = s.textColor ||
textColorFor(bg)`, and `renderMonthView` is the month PDF. Same for `SIMPOST_TEXT`, whose only live
reader is the month view's Simultaneous Post pill. And `HIATUS_TEXT` has no live reader today
(`computePhaseRowLayout` overwrites it with `textColorFor(hCol)`) but is still assigned onto a cell
object both the screen and the direct writer walk — leave it, or remove the assignment in
`computeSchedule` in the same change so nothing can quietly start reading it.

### 4.9 The schedule inputs

`readState`, `computeSchedule`, `simulateProductionSchedule`, `extendEndForHiatus`, `addNote`,
`effectiveNoteText`, `autoNotesText`, `autoNotesForView`, `holidayVisibleIn`, `fullHolidayList`,
`HOLIDAYS`, `effectiveRegionKey`, `normalizeRegionSelection`, `getAllPhaseDefs`,
`computeHeaderDefaults`, `headerLine`, `showInfoStatus`, `refreshDerivedInfo`, `refreshSnapNotes`,
`shiftCalendar`.

`computeHeaderDefaults` deserves its own line: **it is the single bridge by which DOM ids reach a
frozen writer.** It reads five element ids and is called from `renderSpreadsheetView`,
`exportExcel` (into `ws.headerFooter.oddHeader`, under the 255-char cap that Excel reports as file
corruption) and `buildWaterfallPdf` (into `hLeft`/`hCentre`/`hRight`, and via `hdrLines` into the
header shrink factor `hS = bandH/needAt1`, so the *number* of non-empty header lines changes the
point size and every baseline on the page). "Zero `document.` references" is a statement about
tokens, not about DOM independence. Use call-graph reachability.

---

## 5. The traps

Things that look like styling or chrome and are load-bearing. Ordered by how expensive they are to
get wrong.

### 5.1 The print fallback renders the on-screen waterfall — and degrades silently

`exportWaterfallPdf` is dormant (`const WF_PDF_MODE = 'direct'`) and is one token from live;
`MANTINE-MIGRATION.md` schedules `WF_PDF_MODE` as a Settings-menu tenant, i.e. a *planned stage of
this migration* makes it user-selectable. It does:

```
host.innerHTML = '<div class="wf-print wf-grid-' + SHEET_GRIDLINES + '">' + renderSpreadsheetView(currentSchedule) + '</div>';
const tools = host.querySelector('.hdr-tools'); if(tools) tools.remove();   // never on paper
host.style.cssText = 'display:block; position:absolute; left:-99999px; top:0; width:auto;';
const table = host.querySelector('.sheet-table');
const hdr   = host.querySelector('.cal-header-bar');
const W = Math.ceil(Math.max(tRect.width, hRect.width));
const H = Math.ceil(hRect.height + tRect.height);
orientation = (W > 0 && W <= PAGE.portrait.w) ? 'portrait' : 'landscape';
scale = Math.min(Math.min(page.w / W, (page.h * 0.96) / H), 2) * 0.99;
```

If `.sheet-table` or `.cal-header-bar` stops matching, `tRect`/`hRect` fall back to
`{width:0, height:0}`. Then `W = H = 0`, orientation goes landscape, both divisions are `Infinity`,
`Math.min` clamps to 2, and `scale = 1.98`. `if(natW > 0)` skips the width pin. Result: a
**198%-zoomed grid spilling across many landscape pages**, with no throw, no alert, no console
message. If `.hdr-tools` stops matching, "Reset Notes & Hiatus" and "Header: Auto/Manual" print on
the page *and* inflate `H`. If `.note-add-hint` stops matching, a grey `+` prints in every empty
note cell — that rule is the only suppression; unlike `.hdr-tools`, nothing removes it in JS.

**And the measurement runs under SCREEN CSS.** Every screen rule `.wf-print` does not override —
`table.sheet-table{table-layout:fixed; font-size:11px; font-family}`, `td.sheet-date{font-weight:600}`,
`.cell-body`, the 2px `var(--text)` block borders, `.sheet-grid-wrap{width:max-content}`,
`.cal-header-bar` flex/gap/border-bottom, `.hdr-line{padding:0 3px; min-height:14px}`,
`.hdr-line.hdr-title{font-size:13px}` — feeds the fit scale. This is the concrete reason
`CLAUDE.md` demands the `@layer` fence: not because Mantine would change the direct PDF (it
cannot), but because the fallback's scale is measured under the screen cascade.

### 5.2 The month PDF is the month view

`exportMonthPdf` builds pages by calling `renderMonthView` in a loop, then reaches back into the
rendered HTML: `page.querySelectorAll('.mv-week')`,
`wkEl.querySelectorAll('.mv-bar:not(.mv-note-add):not(.mv-row-expand)')`, and — the fragile one —
it parses each bar's **inline style** with

```
String(b.style.gridRow || '').match(/^\s*(\d+)(?:\s*\/\s*span\s*(\d+))?/)
```

to derive `maxLane`. `renderMonthView` emits exactly the matching string
(`grid-row:${p.lane+1} / span ${span};`). A CSS-in-JS or CSS-grid-class rewrite that stops emitting
inline `gridRow` yields `maxLane = 0` for every week and silently mis-paginates every month PDF —
no error, just a wrong printout. It also measures `.mv-bars`'s `scrollHeight` after forcing
`gridAutoRows = 'minmax(17px, auto)'`, measures `.mv-header` against the first `.mv-week` for
`reserve`, and writes `flexGrow/flexShrink/flexBasis/minHeight` onto `.mv-week` plus
`transform:scaleY()` onto `.mv-body` — inline styles that are inert without the `#print-root`
print rules that establish the flex column and the 1×1 grid stack.

The measurement runs in screen media with `#print-root` off-screen at `width: PRINT_W`, and it
hand-patches exactly **one** print difference (`gridAutoRows`). It does **not** patch
`#print-root .month-view{padding:0}`, so `.month-view`'s screen `padding:18px` + 1px border eat
38px of the pinned print width during measurement — the notes wrap slightly harder while being
measured than they will when printed, making `reqH` conservative. Whether that is deliberate or
accidental, it is v1.0.0's behaviour, and "tidying" it changes every month PDF's row proportions.

> The comment in `exportMonthPdf` claiming "(printing-calendar was already set above, before
> measuring.)" is **stale and false of the code** — the only `classList.add('printing-calendar')` is
> after the whole fit block. Behaviour is unaffected; do not act on the comment.

### 5.3 `#table-wrap`'s on-screen width changes the month PDF

```
function mvNoteBoxWidth(){
  const cell = document.querySelector('#table-wrap .mv-daycell');
  if(cell) colW = cell.getBoundingClientRect().width;
  if(!colW || colW < 20){ const tw = document.getElementById('table-wrap');
    const w = (tw && tw.clientWidth) ? tw.clientWidth : 980; colW = Math.max(70, (w - 30) / 7); }
  return colW - 2;
}
```

`renderMonthView` calls it and passes the result to `mvNoteLineCount`, whose return value becomes
each note bar's lane `span`, which `exportMonthPdf` reads back to paginate. So the live width of
the on-screen container — or a virtualised/hidden container returning `clientWidth === 0`, which
clamps `colW` to 70 — repaginates the printed month calendar. `_mvNoteLineCache` is keyed
`Math.round(boxW) + '|' + t`, so the screen-derived value is cached and reused for the print.

**`#table-wrap` may be repositioned and re-chromed; its rendered width may not change** without a
month-PDF diff. The cleanest fix, if it must change, is to give `mvNoteBoxWidth()` an explicit
print width instead of a live measurement — and that is an export change, not a layout change.

### 5.4 Four CSS numbers are hand-copied into JS with nothing checking them

| JS constant | CSS it mirrors |
|---|---|
| `MV_LANE_PX = 19` | `.mv-bars{ grid-auto-rows:17px; gap:2px 0 }` |
| `MV_ROW_CHROME = 38` | `.mv-bars{ padding:24px 3px 14px }` |
| `PAGE_PAD = 4` | `#print-root .print-page{ padding:2px }` |
| `PAGE_H = (8.5 - 2*8/25.4) * 96`, `PRINT_W = round((11 - 2*8/25.4) * 96)` | `@page{ size:landscape; margin:8mm }` |

`tools/check-refs.py` verifies line numbers, not these. Restyle the bar layer or the print page
without updating them and every month PDF fits wrongly — sparse months under-fill the sheet, dense
months clip.

### 5.5 `mvNoteLineCount` is a hand-written duplicate of the note bar's CSS

```
_mvNoteMeasureEl.style.cssText = … "font-family:'Inter',-apple-system,sans-serif; font-size:10px;
  font-weight:500; line-height:1.3;" + 'padding:2px 4px; border:1px solid transparent; …';
const h = _mvNoteMeasureEl.offsetHeight;   // = lines*13 + 4 (padding) + 2 (border)
const lines = Math.min(3, Math.max(1, Math.round((h - 6) / 13)));
```

13 is `10 × 1.3`; 6 is `4px padding + 2px border`. `.mv-bar` and `.mv-note-block` declare **no
font-family** and inherit it from `body`. So an unfenced `body{font-family:…}` from Mantine's
`global.css` makes the measured element and the rendered element different typefaces: lane counts
go wrong, notes clip or run tall, and the month PDF's `reqH` fit is computed from the wrong
numbers. It will not look like a CSS problem; it will be blamed on the month renderer.

Latent and pre-existing, worth fixing while you are there: the measure element's fallback chain is
`'Inter',-apple-system,sans-serif` while `body`'s is
`'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`. They agree only while Inter
resolves — and Inter is loaded from `fonts.googleapis.com`, **not** embedded like Carlito. On
Windows, offline, or from `file://`, the measurement falls to `sans-serif` while the render falls to
Segoe UI. The month PDF's text metrics currently depend on network availability; the waterfall's do
not.

### 5.6 Specificity is not the risk; source order and layers are

Computed against the actual selector inventory: `table.sheet-table` (0,1,1) beats `table` (0,0,1);
`table.sheet-table td, th` (0,1,2) beats `td`/`th`/`table td` (0,0,2); every `.sheet-*`, `.mv-*`,
`.wf-print`, `#print-root` rule beats any element rule; and Mantine's own component rules are
wrapped in `:where()` at specificity 0 targeting `.mantine-*` classes that match nothing here.

What *can* lose are ties broken by source order, and Mantine's styles are injected into `<head>`
**after** the app's static `<style>`: (1) `body{}` at (0,0,1) — font-family, font-size, line-height,
color; (2) `*{}` at (0,0,0) — box-sizing; (3) `@page{}`, resolved by source order; (4)
`*:focus-visible` (0,1,0) tying with `.hdr-line{outline:none}`; (5) anything Mantine marks
`!important`. Of those, **(1) and (3) can change an export** — (1) via §5.5, (3) via the month PDF's
page box. (4) is genuinely cosmetic; do not spend the fence's credibility arguing about focus rings.

The `@layer` fence is still mandatory despite the narrow list, because layer order beats specificity
**unconditionally** and is the only mitigation that survives a Mantine version bump. Corollary: the
app's own grid and print rules must **never** go into a layer, or
`*{print-color-adjust:exact !important}` and every `.wf-print` override lose at once.

### 5.7 A CSS change can permanently alter both exports, through one user gesture

The row-resize drag seeds from a **real rendered height**:

```
const startH = tr ? tr.getBoundingClientRect().height : 0;   // rows
const startW = col ? (parseFloat(col.style.width) || 0) : 0; // columns — the DECLARED value
```

Columns are CSS-immune. Rows are not. If a CSS change inflates a rendered row — extra cell padding,
a taller line-height, an `inline-block` phase label, a taller `+` affordance — the user's next row
drag starts from the inflated number and `rowHeights[rowIdx] = Math.round(parseFloat(tr.style.height)
|| ROW_DEFAULT_PX)` stores it into snapshot state that `exportExcel` and `buildWaterfallPdf` read
forever after, in their file. `ROW_SNAP_PX = 4` around `ROW_DEFAULT_PX` mitigates and does not
close it. This is not written down anywhere else in the project.

### 5.8 The line budget and the PDF's real capacity coincide at exactly one row height

`cellTextFit` budgets in **screen pixels**: `Math.floor((opts.rowPx - ROW_TEXT_PAD_PX) / (px *
SHEET_LINE_RATIO))`. The PDF's actual capacity is `rowPx * ROW_PX_TO_PT`. Those are equal iff
`rowPx - 5 = 0.75 rowPx`, i.e. `rowPx = 20` — exactly `ROW_DEFAULT_PX`. For any hand-dragged taller
row the screen budgets more lines than the PDF can hold: at an 80px row the screen grants
`75/14.85 = 5` and the PDF has room for `60/14.85 = 4.04`, so the fifth line is clipped in print and
visible on screen. Changing the default row height moves this coincidence off its fixed point.

### 5.9 Two constants that look like screen knobs

- **`SHEET_ZOOM = 0.75`** is the *only* multiplier inside `charsToScreenPx`, whose return value is
  simultaneously the screen `<col>` width in px, the PDF column width in **points**, and the `gridW`
  term in `sheetGridMetrics` that `sheetPageOrientation` reads. Nudging it to make the preview more
  readable rescales the PDF and can rotate workbooks.
- **`SHEET_GRIDLINES`** is **exports-only today**. The live grid hardcodes
  `--grid-line:#D4D4D4; --grid-style:solid` and never reads it; only `exportExcel`,
  `buildWaterfallPdf` and the `.wf-print.wf-grid-*` variants do. A Settings-menu gridlines toggle
  built naively would change the printout and leave the preview unchanged — the inverse of what a
  visible control implies. Decide this deliberately. Also: the class is built by concatenation
  (`'wf-grid-' + SHEET_GRIDLINES`), so any fourth value produces a class no rule matches and the
  screen's solid `#D4D4D4` becomes the printed default.

`GRID_TEXT_COLOR` and `SHEET_GRIDLINES` both follow the shape `HANDOFF` §2b already settled: **keep
the identifier, change only the declaration** (`const` → a `let` hydrated from `localStorage`).
Refactoring them into a `settings.gridlines` object edits `renderSpreadsheetView`, `exportExcel`
and `buildWaterfallPdf` — which is what the freeze forbids. And restyling grid text in CSS instead
of through `GRID_TEXT_COLOR` makes the screen and the workbook disagree without touching frozen
code: permitted by the letter of the freeze, forbidden by the appearance rule.

### 5.10 Two surprises about "display-only" state

- **`holidayView` reaches the workbook's column widths.** `autoNotesForView(list,'sheet')` filters
  on `holidayVisibleIn(n.hid,'sheet')`, and `exportExcel` calls it through `effectiveNoteText`.
  Because `sheetColumnWidths` measures the same strings into `notesMax`, and `notesMax` feeds
  `sheetGridMetrics().gridW`, and `gridW` feeds `sheetPageOrientation` — **a holiday checkbox in the
  sidebar can reflow the printed page.**
- **`episodeDefs` reaches Production's length**, and its own declaration comment says it does not
  (`// Episodes (month view)`). `showInfoStatus()` sums `episodeDefs[].days` into `totalShootDays`;
  `readState()` does `if(p.key === 'production' && info.complete) rawValue = info.totalShootDays;`.
  That sets Production's span, the workbook's row count, its `Production wk N` labels and its
  measured phase-column width. An episode-list rewrite that changes when `days` is committed, or
  drops a row's `days` while the name is being edited, silently re-lengthens Production in the
  export. `refreshDerivedInfo()` exists specifically so the derived total updates **without**
  rebuilding the episode inputs — rebuilding them mid-keystroke destroys focus and the caret.

### 5.11 `notesColspan` has four mirrors

`renderSpreadsheetView` has `const notesColspan = 1;`. `exportExcel` independently hardcodes
`blockMaxConcurrent.map(mc => 1 + mc + 1)`. `sheetColumnWidths` builds `cols = [date] ++ labels ++
[notes]` — exactly one trailing notes column. `buildWaterfallPdf` reads that shape **positionally**:
`cols[0]`, `cols.slice(1,-1)`, `cols[cols.length-1]`. This is the hinge of the held Stage 7
(`HANDOFF` §2c) and it is a four-site change, not a two-site one. Do not touch it as part of a
visual restyle.

### 5.12 The two byte-level facts

- **Two exports from the same build are never byte-identical.** The Excel bytes come from
  CDN-pinned `exceljs@4.4.0` and the header carries the export date. The gate has to be a
  *structural* diff (column widths, merges, fills, `pageSetup`), not `cmp`.
- **"The waterfall PDF" is not one document.** The direct writer uses
  `SHEET_PAGE_MARGIN_PT {l:18,r:18,t:54,b:18}`, `sheetPageOrientation`'s block-count rule, and a
  whole-percent scale capped at 100%. The fallback uses `MARGIN_MM = 5`, a width-only orientation
  rule, and scales **up** to 2×. Both are byte-identical to v1.0.0 individually. "Looks exactly like
  v1.0.0" is a per-mode promise, and the moment Settings exposes `WF_PDF_MODE` users can produce two
  visibly different PDFs from one calendar.

### 5.13 Preserve these disagreements; do not "unify" them

- `cellTextFit` and `buildWaterfallPdf` budget at `SHEET_LINE_RATIO = 1.35`;
  `.wf-print .sheet-table td` renders at `line-height:1.3`.
- `drawLines` in `buildWaterfallPdf` splits **only on `\n`** and never word-wraps, while the screen
  uses `white-space:pre-wrap` and Excel sets `wrapText`. A long note with no newline shows two
  wrapped lines on screen and in the workbook and is drawn as one clipped line in the PDF.
- `fmtShort` sizes the workbook's Date column (`measureTextPx(fmtShort(week.date), true)`) but is
  not what Excel prints — `exportExcel` writes a real date with `numFmt:'mm-dd-yy'`. Width is
  measured from `1/5/26`; Excel renders `01-05-26`.
- The PDF's column-header row draws at `S(HDR_ROW_PT*0.55)` = 8.25pt against an 11pt body, while
  the screen and Excel use the body size bold. The PDF disagrees with the screen **and** with the
  app's own workbook. Existing internal inconsistency, worth surfacing to the owner, not worth
  fixing inside a chrome stage.

All four are v1.0.0 behaviour. Changing either side of any of them changes an export.

---

## 6. The id contract

### 6.1 The rule, in one sentence

**An `id` on a form control is a declaration that this value belongs in every user's saved calendar
forever.** `collectFieldValues()` sweeps `document.querySelectorAll('input[id], select[id],
textarea[id]')` and writes `{value}` or `{checked}` under the element id into `fields.byId` — which
is consumed by `captureSnapshot()`, which feeds the save file, the IndexedDB crash backup **and**
the undo stack. So an id leak costs a polluted file format *and* a phantom undo step, in one change.

Therefore:

1. If the control **is calendar data**, it must carry its exact historical id, unchanged.
2. If it **is not**, it must carry **no `id` at all** — the pattern the note editor, the episode
   rows, the hiatus rows and the holiday grid already follow.
3. If (2) is impossible because a component demands an id (label wiring, `Popover` targets), it must
   sit inside an element carrying a class that `collectFieldValues()` excludes. Today the only such
   class is `.tools-menu`; adding a second means editing `collectFieldValues()` deliberately, in the
   same commit, with the class named in a comment.
4. **Never exclude by id.** The existing exclusion is `if(el.closest('.tools-menu')) return;` and
   the comment says why: there is one popover per tool now, so an id-based test *"silently stops
   matching the moment the markup is reorganised"* — and it says that already happened. A redesign
   **is** a markup reorganisation.

### 6.2 The 48 ids in the format today

Verified against `tests/fixtures/v1.0.0-saved.html`, a real pre-`.sptcal` calendar:

- **Singletons (9):** `show-title`, `season-num`, `shoot-days-per-ep`, `num-episodes`,
  `union-country`, `union-usregion`, `union-subregion`, `custom-hol-name`, `custom-hol-date`.
- **Sim-post (3):** `simpost-enabled`, `simpost-offset`, `simpost-count`.
- **Six per phase × six built-in phases (36):** `name-<key>`, `start-<key>`, `weeks-<key>`,
  `phiatus-en-<key>`, `phiatus-start-<key>`, `phiatus-weeks-<key>`.

Custom phases add the same six under `custom<n>`. Hiatus rows, episode rows and holiday rows carry
**no ids** — they travel as `fields.hiatuses` (an ordered array matched by
`.hiatus-entry`/`.hiatus-start`/`.hiatus-weeks`/`.hiatus-locked`), as `episodeDefs`, and as
`holidayView`/`holidayOff` keyed by `data-hid`. Those are the safest surfaces in the sidebar and the
model to copy.

**The six built-in phase keys — `writersRoom`, `prePrep`, `prodPrep`, `production`, `post`,
`localization` — are file-format constants**, because `buildPhaseRows()` interpolates them into
every generated id. Renaming one silently drops that phase's date, duration, custom name and
per-phase hiatus from every existing calendar.

### 6.3 Ids that reach an export

Beyond the save format: `show-title`, `season-num`, `start-writersRoom`, `shoot-days-per-ep`,
`num-episodes` (via `computeHeaderDefaults` into both writers' printed headers — three of the five
reads are **unguarded**, so a missing id is a `TypeError` surfacing as "Something went wrong…", not
a blank line); `font-carlito-400` and `font-carlito-700` (§4.5); every scheduling input via
`readState()` → `computeSchedule()`; `table-wrap`; `print-root`; `sheet-scroll-container`;
`saved-state` (literally in the on-disk format for every legacy `.html`, found by regex in
`parseCalendarText()`).

**A missing id is a crash, not a lost setting.** There are 38 unguarded dereference sites —
`readState`'s `getElementById('start-'+p.key).value`, `getElementById('simpost-enabled').checked`,
`render()`'s `metaEl.textContent`, `readCfgForMeta`, `buildPhaseRows`, `applyStateSnapshot`'s
`getElementById('hiatus-list').innerHTML` and `getElementById('custom-phase-rows').innerHTML`, and
the wire-up's `addEventListener` calls at IIFE time. Since `readState()` runs on every keystroke,
deleting one id makes the app throw on every edit. Loud, which is good for review — but it means a
partial migration cannot be shipped mid-stage.

### 6.4 Four specific hazards

- **`weeks-production` is a hidden input and is in the format** (the fixture stores `'80'`). It is
  also the single place the app reads the shoot-day total from, written by `refreshDerivedInfo()`.
  A component-state replacement must keep an element with that id and that value — and must not let
  a `NumberInput` reformat it, since the stored string is what old files carry.
- **Custom-phase re-keying is a regex over ids.** `applyStateSnapshot` does
  `row.querySelectorAll('[id]').forEach(node => { node.id = node.id.replace(/-custom\d+$/, '-' +
  saved.key); })`. Every id inside a phase row must end in `-<key>` or it is skipped; any unrelated
  id ending in `-custom<digits>` will be rewritten.
- **`custom-hol-name` / `custom-hol-date` are already leaking.** They are transient add-form fields,
  not in `.tools-menu`, and the fixture carries both as empty strings — a half-typed holiday name
  can travel inside someone's calendar today. Give the replacements **no id**; dropping the keys is
  backward-compatible because `applyStateSnapshot` does `if(!node) return`.
- **`color-` is a reserved prefix.** `applyStateSnapshot` still carries an
  `id.indexOf('color-') === 0` branch pointing at `swatch-<key>`, from a `select.color-select`
  markup shape nothing emits any more. It is unreachable today. A Mantine `ColorSwatch` innocently
  given `id="color-post"` would be swept into the save file **and** resurrect that branch with
  unknown effect. **Genuinely unknown:** whether it is dead compatibility code or the migration path
  for files older than the v1.0.0 fixture. What would settle it: a saved calendar from a build
  predating the swatch picker, or the git history of `applyStateSnapshot`.

Also index-addressed by saved state and therefore frozen in **order and length**:
`PHASE_COLOR_OPTIONS`. `phaseColorOverride[p.key] = i` and `customPhaseDefs[].colorIndex` are
indices into it, restored by index. Reordering or inserting an entry repaints previously saved
calendars — and since `.color` is the Excel `setFill` value and the PDF fill, that moves the
workbook and both PDFs. Appending at the end is the only safe growth.

### 6.5 Keeping the ids is necessary and **not sufficient**

`applyStateSnapshot()` step 3 restores with `node.value = v.value` / `node.checked = …` on the raw
DOM node — the exact write React ignores, because it tracks the last value it set and treats a
direct assignment as unchanged. `MANTINE-MIGRATION.md` §4.2 prescribes the native-setter fix for the
**test harness**; the same defect is in the **shipping restore path**. If a Mantine-controlled input
carries `start-production`, Open finds the node, writes `.value`, React overwrites it on the next
render, and the calendar restores **blank** — no thrown error, after the app has already reported
the file as opened. Fix the restore path in the same stage as the first controlled sidebar input.

### 6.6 Class contracts that break with no error

`.form-panel`, `.tools-menu`, `.hiatus-entry` + `.hiatus-start`/`.hiatus-weeks`/`.hiatus-locked`
(`locked` missing reads as `true` — pre-lock saves behaved that way; keep the asymmetric default),
`.ep-name`/`.ep-days` + `data-id`, `.hv-en`/`.hv-cb`/`.hv-del`/`.hv-bulk` + `data-hid`
(`holidaySlug()` output; `migrateHolidayViewKeys()` exists for it), `.phase-row` + `row.dataset.key`,
`.side-tab-btn`/`.side-tabs-track` and the three `sidebarTab` values (`'show' | 'phases' |
'settings'`, with the `'holidays'` → `'settings'` migration), `.phase-hiatus-fields` +
`.snap-note` (read by `refreshSnapNotes()`, called from `render()`'s second line).

None of these throws when lost — the feature just stops. They need their own review checklist item;
a crash-based smoke test catches none of them.

### 6.7 Ids that must move with their behaviour, not on their own

`autostart-<key>`'s controller lives inside `render()` (frozen) and its handler writes
`.value` directly into `start-<key>` (export-bearing). `phiatus-fields-<key>` is a mount container
for two export-bearing inputs — hide with CSS, **never** unmount, because `shiftCalendar` shifts
`phiatus-start-<key>` unconditionally of the toggle (`getAllPhaseDefs().forEach` → no
`phiatus-en-` check) and `collectFieldValues` is a live-DOM sweep. `#holiday-vis` is the delegated
event host for the only UI writers of `holidayView`, `holidayOff` and `customHolidays` deletion,
i.e. §5.10's first surprise. `#prod-total-readout` / `#show-info-note` / `#union-lock-hint` /
`#custom-hol-err` are cosmetic but are painted by functions whose *other half* is export-critical
(`refreshDerivedInfo`, `reflectCountryLock`, the custom-holiday IIFE).

---

## 7. How faithful the screen is today

The on-screen waterfall is a **schematic** of the printout, not a preview of it. It gets the column
proportions and every colour, label and shrink decision right; it gets the row proportions wrong by
exactly one third. That number sets how little fidelity a restyle actually costs.

### 7.1 The arithmetic, forward

Columns: `renderSpreadsheetView` emits `<col style="width:${charsToScreenPx(c.chars)}px">`;
`buildWaterfallPdf` builds `blockCols` as `{ w: charsToScreenPx(c.chars) }` **in points**, with the
comment *"charsToScreenPx() converts an Excel column width at 0.75, which IS its width in points."*
Same function, same numbers → **1 screen px = 1 PDF pt**.

Rows: `renderSpreadsheetView` emits `<tr style="height:${rh || ROW_DEFAULT_PX}px">` = 20px;
`buildWaterfallPdf` does `rowPt.push((rowHeights[r] || ROW_DEFAULT_PX) * ROW_PX_TO_PT)` = 15pt →
**1 screen px = 0.75 pt**.

The two axes do not share a scale. `1 / 0.75 = 4/3`.

### 7.2 The arithmetic, backward — the model closes exactly

From `tests/baselines/2026-08-29-stage-7/base.json`:
cols 2026 = 53 + 88 + 88 + 179 = **408**; 2027 = 53 + 86 + 86 + 164 = **389**; total **797**, and
`gridWidthPt = 797`. Rows = 52 body + 1 header = **53**.

Feed those into `buildWaterfallPdf`: `gridW = 797`; `gridH = 53 × 20 × 0.75 = 795`; portrait Letter
612 × 792, margins `{l:18, r:18, t:54, b:18}` → `availW = 576`, `bodyH = 720`.

```
raw   = min(576/797, 720/795) = min(0.722710, 0.905660) = 0.722710
scale = floor(0.722710 × 100)/100 = 0.72
gridDrawnW = 797 × 0.72 = 573.84      gridDrawnH = 795 × 0.72 = 572.40
originX = 18 + (576 − 573.84)/2 = 19.08     gridRight = 592.92
gridTop = 792 − 54 = 738                    gridBottom = 738 − 572.40 = 165.60
```

`base.pdf.json` records **573.84 / 572.40 / 19.08 / 592.92 / 738 / 165.6** — every figure to the last
decimal. Nothing is estimated. Because `gridH` came out at exactly `53 × 15`, no row in the fixture
was dragged, so every screen row is `ROW_DEFAULT_PX`.

### 7.3 The mismatch, two ways

Implied screen→print scale per axis: horizontal `573.84 / 797 = 0.7200` pt per screen px; vertical
`572.40 / 1060 = 0.5400`. Ratio **1.33333**.
Aspect ratio: screen `797:1060 = 0.7519`; printed `573.84:572.40 = 1.0025`. Ratio **1.33333**.

The screen grid is exactly **33.3% taller per unit width** than the printed one — a distinctly
portrait block on screen, a near-square block on paper. Physically at 96 dpi / 100% zoom the screen
grid measures 597.75 × 795 pt against the print's 573.84 × 572.40: **4.2% wider, 38.9% taller.**
Column widths are near-correct by accident of this fixture's 72% fit; row heights never are, since
the ratio is `1/scale` for rows against `0.75/scale` for columns — scale-independent.

**What the 4/3 looks like:** the line box is `11 × SHEET_LINE_RATIO = 14.85` in both unit systems.
On screen that is 14.85px in a 20px row = **74%**, with ~2.6px of air above and below. In the PDF it
is 14.85pt in a 15pt row = **99%**, edge to edge. The print is a third denser vertically and text
nearly touches the rules. That is the single perceptual difference a user would name.

### 7.4 What agrees, what differs, what is screen-only

| | |
|---|---|
| **Agree across all outputs** | body font 11 and family (Carlito/Calibri, metric-compatible); phase fills, `SIMPOST_COLOR` `#FFFF00`, `MILESTONE_COLOR` `#7030A0`, `HIATUS_COLOR` `#FF0000`, `textColorFor()`; `GRID_TEXT_COLOR` `#000000` for phase and sim-post ink; horizontal centring; line-height ratio 1.35; the shrink decision itself (`cellTextFit` called with the same `chars` by all three); horizontal text-to-column ratio |
| **Differ** | interior gridlines (screen `1px solid #D4D4D4`; PDF none; Excel `showGridLines = false`) · header fill (screen `#F2F2F2`/`#C6C6C6`; PDF `#D9D9D9`/`#BFBFBF`; Excel `D9D9D9`) · header type (screen 11px/600; Excel Calibri 11 bold; PDF 8.25pt) · year-block separators (screen none internally, only outer `sheet-blockstart`/`blockend`; PDF `FRAME` 1.2pt between blocks; Excel thin borders per block) · outer frame (screen 2px `var(--text)`; PDF 1.2pt) · wrapping (screen `pre-wrap`, Excel `wrapText`, PDF `\n` only) · overflow (screen ellipsis, PDF hard clip, Excel spill-or-clip) · vertical padding (screen 2px, exports 0) · date text (`1/5/26` on screen and in the PDF; `01-05-26` in Excel) |
| **Screen-only, no export counterpart** | the `+` add-note hint (zero `+` strings in `base.pdf.txt`) · the `.cal-header-bar` white bar with its 52px min-height and bottom rule · `.hdr-tools` · the `.sheet-scroll` bordered, rounded, viewport-capped pane · the sticky header · `.grid-resize-layer` · hover rings and `.editing` outlines |
| **Not shown at all** | page, orientation, fit scale, page break. `sheetPageOrientation` and `sheetGridMetrics` are called only from `exportExcel` and `buildWaterfallPdf`; `buildWaterfallPdf` already returns `{bytes, orientation, scale, gridW, gridH, pageW, pageH}` and `exportWaterfallPdfDirect` discards everything but `bytes`. This is the largest fidelity gap **and** the cheapest to close — nothing frozen has to change to display numbers the code already produces |

### 7.5 The code already enumerates the gap

The `.wf-print` block exists solely to make the screen renderer look like the export, and it is a
five-line list of exactly the differences above: `--grid-line:transparent`,
`th{background:#D9D9D9; border-color:#BFBFBF}`, `td,th{height:auto; padding:0 1.5px;
line-height:1.3}`, `.cal-header-bar{padding:5px 12px; min-height:0}`,
`.phase-cell-label{max-width:none}`. That is a primary-source admission that the live grid does not
look like the printout — and a warning, because it means restyling those exact properties is the one
kind of screen change that reaches the print fallback.

> **Correction to `HANDOFF` §2d:** it states flatly that "the app is height-bound". This fixture is
> **width-bound** — 147.6pt of vertical slack against 2.16pt horizontal. `STAGE-8.md` already
> qualifies it correctly. Which axis binds depends on the calendar; any reasoning about row pitch
> that assumes height binds is wrong here.

---

## 8. How to prove a change was safe

The committed harness is `tests/harness/`; the committed baseline is
`tests/baselines/2026-08-29-stage-7/`.

### 8.1 What exists

`tests/harness/t/base.js` is "the acceptance-gate measurement: grid, clipping, Excel, waterfall
PDF". It captures `base.json` (a DOM `sig` per row, `headers`, `hClipCount`, `gridWidthPt`, plus
`xlsx`/`xlsxLen` and `pdf`/`pdfLen`) and `base.pdf.json` (`textOps`, `rectOps`, `gridDrawnW`,
`gridDrawnH`, `originX`, `gridRight`, `gridTop`, `gridBottom`) and `base.pdf.txt`.
`clippedCells()` probes `.cell-body` → `.phase-cell-label` → the `<td>` and counts
`scrollWidth - clientWidth > 1`. The committed value is `hClipCount: 0`. `gridWidthPt()` sums the
declared `<col>` widths. `document.fonts.check('11pt Carlito')` is checked as a health gate.

### 8.2 What it does **not** cover — and this is the gap that matters

- **The month PDF is not measured at all.** There is no month-view row in the baseline, and the
  month PDF is the one export CSS can break most easily (§5.2, §5.3, §5.5).
- **The print-fallback waterfall PDF is not measured.** `T.captureExport` waits on
  `captureDownload()`; `exportWaterfallPdf` produces no blob and no download — it calls
  `window.print()`. The committed `base.pdf.json` numbers are direct-writer geometry. **There is no
  baseline for the fallback.** `MANTINE-MIGRATION.md`'s gate says "a generated PDF diffs clean" —
  that is ambiguous and in practice means the direct one.
- **The fixture round-trip is not asserted.** `tests/fixtures/v1.0.0-saved.html` exists; nothing in
  the gate opens it and checks the 48 keys land.
- If a test stubs `window.print()`, it must dispatch `afterprint` — otherwise the `printing-*` body
  class sticks, the app is hidden, and the next print silently does nothing.

### 8.3 The gate any Mantine stage must pass

**Structural, not `cmp`** — see §5.12.

1. **Direct waterfall PDF** — export before and after, diff `gridDrawnW`, `gridDrawnH`, `originX`,
   `gridTop`, `gridBottom`, `orientation`, `scale`, `textOps`, `rectOps`.
2. **Excel workbook** — diff column widths, merges, ARGB fills, `pageSetup.orientation`,
   `printArea`, row heights, and `headerFooter.oddHeader`. Run it once with header mode set to
   **Manual** and one header line blanked, to catch the `hdrLines` / `hS` path.
3. **Clipped cells** — `hClipCount` stays 0 across a full grid.
4. **Print-fallback waterfall PDF** — temporarily set `WF_PDF_MODE = 'print'`, export before and
   after, and confirm orientation, `natW` and `wrap.style.zoom` are unchanged, no `+` appears in any
   empty note cell, and no toolbar buttons print. Use a calendar with **3 year-blocks** (the case
   that already flipped orientation once). **This has no committed baseline; cut one first.**
5. **Month PDF** — export before and after on a fixture with (a) a note wrapping to 2–3 lines,
   (b) a week at `MV_MAX_LANES`, (c) an expanded row (`mvExtraLanes > 0`), (d) a manual month
   header, and (e) a month dense enough to hit the shrink-to-fit branch. Diff page count, per-week
   `reqH`, `reserve`, which of `reqTotal <= avail` was taken, and the `scaleY` factor. Repeat at
   **two different `#table-wrap` widths** to catch §5.3.
6. **Drag round-trip** — drag one column and one row, then export Excel and both PDFs. This is the
   only thing that exercises `colWidths` / `rowHeights` / `screenPxToChars` end to end (§4.6, §5.7).
7. **Save-format** — open `tests/fixtures/v1.0.0-saved.html`, assert all **48** `fields.byId` keys
   resolve to a live node and land their values (assert on the **count**; silence is the failure
   mode here). Then save a fresh calendar and diff the `fields.byId` **key set** against the
   fixture's: any key added is a leak, any key missing is dropped data.
8. **Undo hygiene** — open and close each of the four tool popovers and assert no undo step was
   pushed.
9. **Box-sizing assertion** — sum of realised column `clientWidth + padding + border` equals the sum
   of declared `<col>` widths. One line; converts an assumption into a check.

### 8.4 Two things to do before Stage 4 starts

- **Cut a new real fixture** from the last pre-Mantine build, alongside the v1.0.0 one.
  `CLAUDE.md` §5g already says cut a fixture whenever a version is cut; the id contract is what that
  fixture exists to prove, and after the migration there will be no way to produce a file in the old
  shape.
- **Fix `HANDOFF` §2h first**, on the current code. `buildSavedHtml()` strips `#table-wrap`,
  `#print-root` and the three popover classes from its clone and does **not** strip
  `#legacy-notice` / `#update-notice`, so a showing notice is baked into a shareable copy
  (`el.hidden = false` removes the attribute, and `outerHTML` serialises attributes). On today's
  code the one-line fix is provably a restoration of v1.0.0's output. Tangled into a persistence
  rewrite it becomes indistinguishable from a regression.

---

## 9. What was overturned

Fifteen "safe to change" calls were reversed by the adversarial pass, plus five factual corrections.
They are recorded so nobody re-derives them.

### 9.1 The general error, stated once

**"Not in `exportExcel` and not in `buildWaterfallPdf`" is not sufficient for SCREEN-ONLY.** There
are four output paths; two of them render live HTML and print CSS, with
`print-color-adjust:exact !important` guaranteeing every inline colour lands on paper. **Any
constant, class name or box metric read by `renderSpreadsheetView` or `renderMonthView` is
export-bearing.** Nine of the fifteen reversals are instances of exactly this mistake. The second
general error: **"zero `document.` references" is a statement about tokens, not about DOM
independence** — `buildWaterfallPdf` reaches five form fields through `computeHeaderDefaults`.

### 9.2 The reversals

| Was called SCREEN-ONLY | Actual verdict | Because |
|---|---|---|
| `SIMPOST_TEXT`, `PHASES[].textColor`, `PHASE_COLOR_OPTIONS[].text` | **FROZEN** | All three ink month-PDF pills via `renderMonthView`'s `const fg = s.textColor \|\| textColorFor(bg)`. Only `MILESTONE_TEXT` (dead) and `PHASE_COLOR_OPTIONS[].name` (swatch tooltip) survived. `HIATUS_TEXT` held frozen pending a decision. |
| `PHASE_COLOR_OPTIONS` as a whole | **FROZEN order & length** | Index-addressed by `phaseColorOverride` and `customPhaseDefs[].colorIndex`, both restored by index. Reordering repaints saved calendars — and `.color` is the Excel fill and the PDF fill. |
| `renderSpreadsheetView`, `notesColspan`, `escHtml`, `.sheet-table td` padding, `.sheet-blockend`, `#table-wrap` | **FROZEN** | `renderSpreadsheetView` is the print fallback's renderer; `notesColspan` has four mirrors, two inside the width model; the resizers write export state; `#table-wrap`'s width sets month-PDF lane spans. |
| `dayNotes`, `dayNoteColors`, `mvExtraLanes`, `mvHeaderMode`, `mvHeaderManual`, `viewMode`, `COL_MIN_CHARS`, `installGridResizers`, `beginSpanDrag`, `applyCellFitLive`, `readCfgForMeta` | **FROZEN** (only `sidebarTab` survived) | The month stores are month-PDF inputs; `viewMode` is the export selector; `COL_MIN_CHARS` bypasses `clampChars` via `pick()`; the drag handlers are already on `CLAUDE.md`'s frozen list; the month-note editor's `kind === 'wf'` branch writes `userNotes` and `noteColors`. |
| `table.sheet-table th { background:#F2F2F2 }` (×3, in three areas) | **Conditional; rest of the rule FROZEN** | The colour is free; `font-size`/`font-weight`/`font-family`/`color` set the print copy's header height → `H` → `scale`. The `.wf-print` override wins by one class with no `!important`. |
| `.note-add-hint` (×2) | **Class name and box FROZEN** | `#print-root .note-add-hint{display:none !important}` is the sole suppression, matched by class, with no JS fallback; and the element's box is measured during the fit pass, where the print rule is inert. |
| `.hdr-tools`, `#hdr-mode-btn`, `#notes-reset-btn` (×2) | **Constrained** | Removed by class in `exportWaterfallPdf`; delegated on `#table-wrap` with `e.target.id === …`, which every Mantine `Button`'s inner span defeats; both buttons write state both writers read. |
| `.mv-arrow`, `.mv-tools`, `.mv-note-add`, `.mv-note-add-full`, `.mv-row-expand`, `.mv-note-click`, `.month-empty` | **Split; identity FROZEN** | Class names are join keys in the print CSS *and* in `exportMonthPdf`'s hide list. `.mv-note-click` is on printed bars, hidden by nothing, and is the click hook into `userNotes`/`noteColors`. `.month-empty` is kept off paper only by an incidental guard. |
| `.month-view` card chrome | **FROZEN** | `background:#fff` is not reset by the print override and is the printed ground for every transparent day cell; `padding:18px` + border set the measurement width that produces `reqH`. |
| `#table-wrap` / `render()` | **Constrained** | §5.3, plus the resizer write path, plus unscoped `document.querySelector('.sheet-grid-wrap')` lookups that bind to the print copy if `#table-wrap` is reparented after `#print-root`. |
| `#export-btn` / `#export-wf-pdf-btn` | **Constrained** | Header geometry feeds `--header-h` feeds the fallback measurement; `#export-btn` dispatches the month PDF; enablement is owned by `render()`; the label is mutable state during an export. |
| `.cal-header-bar` / `.hdr-line` | **Constrained** | `hRect` is a term in the fallback's `W` and `H`; `.mv-header` is measured for the month PDF's `reserve`; `data-hid` keys feed `headerManual` → both writers. |
| Header bar horizontal extent | **Constrained** | Off-screen the pane is shrink-to-fit, so the header can *set* `W` via `Math.max(tRect.width, hRect.width)` and flip orientation. |
| `--grid-line` / `--grid-style` | **Colour free; `--grid-style` and the 1px FROZEN** | `wf-grid-none` overrides only the colour, so `solid` is inherited into the print copy; `--grid-style:none` zeroes the used border width, which is part of `EXCEL_CELL_PAD`. |
| `#sheet-scroll-container` | **FROZEN** | Emitted by `renderSpreadsheetView` inside `#table-wrap` — already out of Mantine's reach — and duplicated into `#print-root` during a fallback export. |
| `title="…"` tooltips | **Values free; markup FROZEN** | A Mantine `Tooltip` must own its target, which is forbidden inside `#table-wrap`, and mounting a portal child in a `<td>` changes `td.textContent` and the print copy. |
| `phiatus-fields-<key>` | **Constrained** | Mount container for two export-bearing, format-contract inputs; `shiftCalendar` shifts `phiatus-start-<key>` regardless of the toggle. |
| `#holiday-vis`, `#holiday-vis-list` | **Export-reaching** | Sole UI writers of `holidayView` / `holidayOff` / `customHolidays` deletion — §5.10. |
| `#wf-page-style` | **FROZEN** | The id is the only handle joining `setWfPageStyle` and `removeWfPageStyle`; a leaked one reorients the month PDF. |
| `exportExcel` (verdict upheld, reason wrong) | **More frozen** | Not "pure function + three DOM touches at the end": `computeHeaderDefaults` and the grid stores are inside its dependency closure. |
| `exportWaterfallPdfDirect` (verdict upheld, reason wrong) | **More frozen** | `#show-title` is not filename-only — it is header line `c1`, printed on the page and part of `hdrLines` → `hS`, and it is read unguarded. |

### 9.3 Factual corrections to the standing docs

- `exportExcel` has **three** real `document.` references; the fourth grep hit is `officedocument.`
  inside the xlsx MIME type.
- `HANDOFF` §2d's "the app is height-bound" is false for the committed fixture, which is
  width-bound by 147.6pt to 2.16pt.
- `CLAUDE.md` says "There is no `version` field in the snapshot yet." The code has
  `const SNAPSHOT_VERSION = 1;` and `captureSnapshot()` emits `version: SNAPSHOT_VERSION`.
- `colWidths`' declaration comment describes a per-block key scheme that `sheetColumnWidths` no
  longer uses.
- `exportMonthPdf`'s comment "(printing-calendar was already set above, before measuring.)" is
  stale and contradicts the code.
- `MANTINE-MIGRATION.md` §2's surface table lists the month view **nowhere** — neither in scope nor
  excluded. Fix that table, or the month PDF gets redesigned by accident.