# MONTH-PDF-WRITER-PLAN.md

**Status:** 🔨 **STEPS 1 TO 3 OF 6 BUILT (the fonts, the layout model, and the emitter and serializer,
1 Oct 2026); nothing in the product calls the writer yet.** It writes a valid month PDF from a layout
that carries its row heights, and the step-3 leg holds every box it draws to Chrome's own print layout.
✅ **All four rulings received, 30 Sep 2026** (§6): Inter, the PDF's own cell width, dense months
shrink evenly, and replace the print path while keeping a rollback. Next: step 4, the fit (§8), on
the owner's go-ahead.
**Written:** 30 Sep 2026, against `002e203` (v1.4.2 plus the Reset Notes touch-up).
**Spec input:** [`AUDIT-REPORT.md`](AUDIT-REPORT.md) §9, "What a direct month-PDF writer must
replicate", corrected in §4 below.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md). Related:
[`MANTINE-SEAM.md`](MANTINE-SEAM.md) §5.3 (the note width) and §5.4 (the fit's copied constants).

---

## 1. The request

- **24 Sep 2026.** Reporting missing lines in the month PDF, the owner asked for a *"native device
  PDF saver"* instead of Chrome's print screen. A page cannot make a PDF without the print dialog,
  so that means the app writes the month PDF itself, as `buildWaterfallPdf` already does for the
  waterfall. The lines got a quick fix in the print path, and the writer was ruled a project of its
  own.
- **29 Sep 2026.** *"dont do the writer till we finish everything with the audit fixes starting with
  l3"*. Every audit batch has since shipped, the last with v1.4.1.
- **30 Sep 2026.** *"lets now start on replacing the pdf export of the month view with the direct
  pdf writer … Be very careful not to break anything and run tests."*

What it buys, measured in AUDIT-REPORT §8 and by this plan's research:
- **No print dialog to get wrong.** Scale above 100%, or A4 with a dense month, crops weeks today,
  and only a writer can stop a custom Scale.
- **A real Save dialog** (`showSaveFilePicker`), with a plain download where it is unavailable.
- **The same PDF from any window.** Today a note's height comes from the on-screen day-cell width at
  the moment of export (MANTINE-SEAM §5.3).
- **Real text.** Chrome embeds Inter as 13 Type 3 fonts on every page, and flattens the glyphs of a
  dense month.
- **A byte baseline.** The waterfall writer is deterministic, which is what lets gate 2 byte-compare
  it. The month PDF has never had a pixel- or byte-level gate.

---

## 2. What exists, and why it matters

### 2.1 Today's month PDF is the DOM, printed

`exportMonthPdf` renders every month with `renderMonthView()` (setting `printingCursor`) into
`#print-root`, measures it in screen media at 996 px, fits each month to one Letter-landscape
sheet (fill mode or scale mode), adds `body.printing-calendar` and calls `window.print()`. Gate 10
(`monthprint`, nine calendars) compares the print **document** and Chrome's sheet count. Nothing
compares pixels or PDF bytes.

### 2.2 The waterfall writer, and what of it the month writer can use

| Frozen piece | In the month writer |
|---|---|
| `ttfRead`, `ttfGlyph`, `ttfAdvance`, `ttfTextWidth` | **Called unchanged.** They work on any parsed sfnt. They do not kern. |
| `pdfEscape`, `pdfNum`, `PDF_WINANSI_HI`, `pdfDeflate` | **Called unchanged.** Control characters are cleaned first. |
| `pdfPage` | **Called unchanged**, one per month. Its `ops` array is exposed, so curves, clipping and letter-spacing are appended as raw operators by new code, each wrapped in `q`/`Q` because they are graphics state. |
| `pdfRgb` | **Not used.** Six-digit hex only: `#333` comes out navy and `rgba()` writes `NaN`. A new colour helper pre-blends alpha onto the fill beneath. |
| `pdfSerialize` | **Not used.** It writes exactly one page (`/Count 1`) with fonts-only resources. A new multi-page serializer is modelled on it. |
| `buildWaterfallPdf`, `measureTextPx`, `exportWaterfallPdfDirect` | **Not used.** Hard-wired to Carlito and to the waterfall, and the layout helpers are closures. |
| `exportMonthPdf` | **Not used.** Its fit is DOM measurement with function-local constants. |

So the writer is **new code** beside the frozen surface, and gate 2 staying byte-identical is the
proof that no shared primitive moved.

### 2.3 Where the month view's rules live

- **Callable pure helpers:** `monthRangeForSchedule`, `pillRunsForWeek`, `segPillLabel`,
  `productionPillTag` (reads the Show Info fields and `prefs`), `notesForWaterfallDate` (carries
  M-13, so never re-implement it), `dayNoteList`, `simPostLabel`, `hiatusTextFor`, `textColorFor`,
  `mvHeaderLine`, `resolveHeaderTemplate`, `headerFmt`.
- **Inline inside frozen `renderMonthView`, so not callable:** the week grid, the cell classes, the
  day-override marks, `halfSlices`, all three band builders (all-phase hiatus, per-phase hiatus,
  Simultaneous Post), lane packing (`takeLane`/`place`) and the header assembly.
- **DOM-bound and frozen:** `mvNoteLineCount` (measures a hidden div) and `mvNoteBoxWidth` (the live
  day-cell width).

⭐ **With `printingCursor` set, `renderMonthView` is in effect a pure function of state**, and
`exportMonthPdf` already calls it once per month. Its HTML carries every item in placement order:
classes, `grid-column`/`grid-row` (lane and span), fill and ink, the half-day slices, and the escaped
text. **Proposed: the writer calls it the same way and reads that HTML with `DOMParser`**, which is
inert: no layout, no scripts. Every content rule is then inherited rather than copied, so the writer
cannot drift from the screen. Reading the frozen surface is allowed (CLAUDE.md, "Sanctioned ways").
The coupling to the markup is not new, since `exportMonthPdf` already regex-parses `grid-row`.

The one value that arrives wrong is each note's lane span, baked at the live window width (ruling 2).
⚠️ Read the parsed elements' attributes **as strings**, the way `exportMonthPdf` does. Do not rely on
the parsed document's CSSOM: the app runs under a CSP since v1.4.1.

### 2.4 Inter cannot go into a PDF as embedded

The app's Inter is one **variable WOFF2** (Inter 4.001, `wght` 100–900, Brotli plus transformed
glyph tables). PDF has no variable fonts, browsers expose no font bytes, and `DecompressionStream`
has no Brotli. The month view uses **four weights**:

| Weight | Used for |
|---|---|
| 700 | the title, the date, the month bar, the weekday row |
| 600 | pills, bands, day numbers |
| 500 | notes, the Production tag |
| 400 | the subtitle |

Ruling 1 decides what the PDF uses instead.

⚠️ The Inter 3.019 statics installed in `~/Library/Fonts` are **not** the embedded font: unitsPerEm
is 2816 against 2048, and widths are up to 4% apart. They also share its PostScript names. Never build
from them, and give each embedded weight a distinct, subset-tagged name. Otherwise a viewer that
substitutes the installed copy hides an embedding bug on the very machine used for checking.

---

## 3. Proposed design

New code goes in one new section of `src/legacy/app.js` (it must sit inside the engine's IIFE to read
module state), plus a font tool.

1. **Layout model — `buildMonthLayout(schedule)`, pure data.** Per month, it holds:
   - the header lines with their formats;
   - per week, the day cells: date, spillover, weekend, override mark, ½;
   - per week, the items: kind, first and last column, lane, lanes spanned, fill, ink, text, grey
     tag, half-day slices;
   - the row heights from the fit (ruling 3).

   Content comes from parsing `renderMonthView()` (§2.3), with `printingCursor` set and restored in
   `try/finally`. Each note's lane span is recomputed at the fixed width (ruling 2), and the lanes are
   re-packed with the same first-fit rule.
2. **PDF emitter — `buildMonthPdf(layout)` → bytes.** One page per month: Letter landscape, 792×612
   pt, 8 mm margins, one `pdfPage` each.
   - **New primitives:**
     - rounded rects (radius 9 px);
     - the 135° hatch for off days;
     - strike-through;
     - letter-spacing;
     - an ellipsis fitter;
     - a break-word wrapper;
     - the pre-blending colour helper;
     - the multi-page serializer.
   - **Deterministic:** no `/Info`, no `/ID`, and fixed font programs (never a per-document subset,
     or the date stamp's digits would change the font stream). It is byte-baselined the way gate 2
     is.
3. **Save — `exportMonthPdfDirect()`.**
   - Build first, then open `showSaveFilePicker` within the click's user activation, so a failed
     build never leaves an empty file. Measure that the build fits inside the activation window.
   - Fall back to a download where the picker is unavailable. `AbortError` is a cancel.
   - Errors go through `uiAlert`, awaited.
   - The proposed name is `<title> Month Calendar.pdf`, beside the waterfall's
     `<title> Planning Calendar.pdf`.
4. **The printable-characters check.** A month version of `confirmPdfPrintable`. Anything WinAnsi
   cannot encode prints as "?". The Inter subset also lacks 10 WinAnsi characters: soft hyphen, ƒ,
   †, ‡, ‰, Š, š, Ž, ž, Ÿ. So the check tests the font's own coverage too.
5. **Routing (ruling 4).** The month branch of the `#export-btn` handler, which is not frozen
   (MANTINE-SEAM rates it Constrained). Cmd/Ctrl+P already clicks that button in the month view, so
   it follows.

**Size:** about 600–900 lines of code, or 1,000–1,400 with comments in this codebase's style.
Parsing the renderer saves about 150–200 of them.

---

## 4. What the writer must replicate: AUDIT-REPORT §9, corrected

§9 still holds except where listed below, found against the code on 30 Sep 2026.

**Drift:**
- **Item 1.** Letter is pinned now (L-3), so the MediaBox is 792×612.
- **Item 14.** `onhalf` is new (v1.4.0): the on tint plus the ½.
- **Item 16.** L-16 is fixed. The lane search is unbounded, so nothing lands on lane 0.
- **Item 17.** **`mvExtraLanes` never reaches the PDF.** The "+" slots that make extra lanes are
  hidden in print and in the measurement. `MV_MIN_LANES` acts only through niceH.
- **Item 22.** Episode pills are dead code since BLOCKS-PLAN ruling 8. **The half-day overlay is on
  every phase pill** that covers a half day, not only Production's.
- **Item 23.** N-1 is fixed: an emptied label prints a blank band.
- **Item 26.** M-13 is fixed. The trailing-date regex needs a **two-digit day**, so "Labor Day
  9/7/26" falls back to the pinned date or Monday. Calling `notesForWaterfallDate` inherits all of
  this.

**What §9 leaves out:**
- **Cell backgrounds stack** in this order: override, then weekend `#F4F3F0`, then spillover
  `#FAFAF9`, then white. A spillover weekend therefore prints `#F4F3F0`.
  - Day-number opacity on an off day (.5) beats spillover's (.35).
  - On days ink the number `#7A5B14`.
  - The ½ is 11/700 at .75 opacity and inherits the number's colour.
- **There is no rule** between the weekday row and the first week.
- **Bar columns are inset:** `(W−6)/7` against day columns of `W/7`, with a 1 px margin each side.
- **Print lane geometry:**
  - An occupied lane is 19 px and a note is 13·lines + 6.
  - Every bar is top-aligned, so a note given more lanes than it prints with leaves blank lanes below
    it.
  - Tracks are `minmax(17px,auto)`.
- **The header:**
  - Ink is `#1E1D1B`, except the date (`#000`), and line-height is 1.5.
  - The title bar is aligned on the baseline, and the title wraps.
  - The left slot is at least 84 px and grows with its text.
  - Highlights are fit-content, with 4 px side padding and a 4 px radius.
- **Pills and bands are one line ending in "…"**, and a pill shares that line with its grey tag.
  Hiatus text is centred; pills and Simultaneous Post are left-aligned.
- **Notes are `pre-wrap` and `break-word`**, and Chrome auto-hyphenates them (`hyphens:auto`).
- **Band painting:** the Simultaneous Post band ignores per-phase hiatuses, every band paints on
  spillover days, and every entry in `schedule.hiatuses` paints.
- **Three widths are in play today:** lane spans use the live screen width, row heights are measured
  at 958 px, and the page prints at 991.5 px.
- **Scale mode squashes the vertical axis only.** Text flattens while widths and vertical lines stay
  put.
- **The file name:** Chrome names the file after the document title. There are no page numbers.

The nine gate-10 baselines' JSON already holds every month's fit (row heights, grow, mode, scale).
That makes them a ready oracle for the writer's row heights.

---

## 5. Acceptance gate

Nothing ships on "it looks right". In order of strength:

1. **Nothing old moves.**
   - Gate 2 (the waterfall PDF) stays byte-identical, so no shared primitive changed.
   - Gate 10 stays green on the print path. If ruling 4 replaces that path, its legs force print
     mode.
   - The full `gate.sh` is green before any push.
2. **An A/B leg, `monthwriter`.** One run produces three things that share one build, date, window
   and set of preferences: the writer's PDF, Chrome's print of the print document, and the document
   itself. It is judged on:
   - **Structure, exactly:**
     - one page per month, with the month label on each;
     - per week, the same multiset of items (kind, text, fill, day span, lane order);
     - no text wider than its box, measured with the PDF's own `/Widths`;
     - everything inside the margins, and no `NaN`;
     - `pdfinfo` and `pdftotext` parse it with an empty stderr.
   - **Row heights:** within 1 CSS px of the baselines' fit tables, wherever ruling 3 keeps today's
     fit.
   - **Text:** `pdftotext` token sequences per page, normalising hyphenation and "…".
   - **Pixels, as the owner's review artefact rather than a gate:**
     - `pdftoppm` at 96 dpi, composited on white;
     - a numpy heat map with a 1 px tolerance;
     - print/writer/diff contact sheets.
     - Never compare across renderers: poppler and Quartz differ on 3% of the pixels of the same
       page.
3. **A byte baseline per fixture**, in a new `tests/baselines/<date>-monthwriter/`, compared with
   `pdfcmp.py`'s date-aware stream compare. It is cut only after the owner signs off the contact
   sheets: the rule UI-CONVENTIONS §10 item 10 sets for the print path, where the change goes in
   front of the owner and is never re-cut quietly.
4. **Controls, before trusting any of it:**
   - two fresh runs identical;
   - `TZ=Pacific/Kiritimati`;
   - a date from the 1st to the 9th;
   - **a different window size identical** (the print path fails this today);
   - red on a patched `dist/`: +1 px on a row, a dropped pill, a changed colour, a dropped page.
5. **`cspproof` covers the writer** (`HARNESS_KEEP_CSP=1`).
6. **Built at step 3: the `monthemit` leg**, in `gate.sh` four times (tier 1, and
   `colswap-simpost-refuse`, each also under `TZ=Pacific/Kiritimati`, tier 1 in a 1280 px window too).
   It holds the emitter's display list to Chrome's own print layout of the same document, box by box
   (0.03 px) and baseline by baseline, and to Chrome's computed styles. It holds the bytes to their
   structure, the fixed font programs and the exact `/Widths`, and requires them byte-identical
   across time zones and windows, read clean by poppler. 24 mutants turn it red. Steps 4 and 5 build
   on it; it does not replace the A/B leg above.

**Fixtures:**
- **Tier 1 (must pass):** the nine gate-10 calendars.
- **Tier 2 (the gaps):** `monthscale`, `month-dense60`, `monthnotes`, `shootorder`, `notewrap`,
  `stintswap-reshape`, `carry-rich` and `colswap-simpost-refuse`. They add the things no gated month
  calendar prints today: Simultaneous Post, per-phase hiatus bands, colours, edited notes and the
  shooting order.
- **Tier 3 (robustness: a valid PDF, no throw):** `xss-*`.
- **New fixtures,** minted through the UI and Save, and synthetic per `tests/fixtures/README.md`:
  - month-header size, colour, alignment and highlight;
  - a non-US region;
  - non-WinAnsi note text;
  - labels long enough to ellipsise;
  - preferences off.

---

## 6. ✅ The four rulings (received 30 Sep 2026, picker)

**Ruled: 1(a) Inter, 2(a) the PDF's own day-cell width, 3(b) shrink evenly, 4(a) replace and keep a
rollback.** The owner took the recommended option on all four. The table below is the question as
put.

| # | Question | Options | Recommended |
|---|---|---|---|
| 1 | **Font** | (a) **Inter**, as static 400/500/600/700 instances made from the app's own Inter at build time. It needs a one-time download of two Python tools (`fonttools`, `brotli`), asked separately. It adds about 55–70 KB, and the PDF's text runs about 1% wider than the screen's, because it is not kerned. (b) **Carlito**, the waterfall's font. No new bytes, but about 20% narrower and only regular/bold: a visible change. (c) **Helvetica**, built into every PDF reader. Nothing embedded, and a slightly different look on every reader. | **(a)**: the PDF keeps the month view's look |
| 2 | **The width notes wrap at** | (a) **The PDF's own day-cell width**: the same PDF from any window. (b) **A fixed screen width** (the tests' 1600 px window): closer to a typical PDF today, but it wraps at a width the page does not have. | **(a)** |
| 3 | **Fitting a dense month on one sheet** | (a) **Exactly as today:** dense months squashed vertically, with flattened text. (b) **Shrink evenly:** a dense month keeps the full page width and shrinks its lanes and text together, so letters keep their shape. (c) **Spill over:** a dense month continues on a second sheet. In every option, a month that fits fills the sheet exactly as today. | **(b)** |
| 4 | **The print path** | (a) **Replace:** Export PDF writes the PDF. The print path stays in the file behind a constant (`MV_PDF_MODE`, like `WF_PDF_MODE`) as a one-line rollback, and the seven legs that drive it are retargeted. (b) **Alongside:** the writer is Export PDF, and the old path stays as a visible "Print…" choice. (c) **A trial:** the writer sits behind a Preference, off by default, and is flipped after a release. | **(a)**: "replacing" is the request |

---

## 7. Risks and open items

- **Text WinAnsi cannot encode prints as "?".** This is already the waterfall PDF's limit. Today's
  month PDF draws such text from a system font, so for the month PDF it is a regression: emoji,
  non-Latin scripts, and the ė and ū in Lithuanian holiday names. The check in §3.4 warns before
  export. A CID font would lift the limit, at a cost in size; that is a later decision, not this one.
- **Kerning.** Unkerned text runs 0–1% wider than the screen, and up to about 5% on capitals. That is
  enough to move an ellipsis or a line break near a boundary. Kerning (GPOS pairs plus `TJ`) would be
  about 150 more lines, if it is ever wanted.
- **Hyphenation.** The writer breaks at spaces and splits over-long words. It does not reproduce
  Chrome's automatic hyphenation.
- **Preferences.** `prefs.mvBlocks` and `prefs.mvEpisodes` stay per user (BLOCKS-PLAN ruling 10), and
  the writer honours them as the screen does. Byte baselines must seed them.
- **Seven legs stub `window.print` in the month view:** `monthprint`, `blocks`, `hiatuslabel` N1–N4,
  `cmdprint` P3, `exportrefused`, `cspproof` M2 and `printpaper`. Under ruling 4(a) they force print
  mode or are retargeted. `releases/v1.4.2.html` is a reproducible oracle for the print path.
- **Inter's licence.** The repo has no `LICENSE-Inter`, although Inter is already embedded in the app
  and would now travel inside every PDF. Add it (SIL OFL) with the font work.
- **The Save dialog is Chromium-only.** Elsewhere the month PDF downloads, as the waterfall's does.
  ⚠️ The waterfall PDF itself still downloads without a dialog. Matching it would be a frozen edit
  (`exportWaterfallPdfDirect`) and is not part of this plan.
- **Size.** About 55–70 KB under ruling 1(a), on a 1.36 MB file.

---

## 8. Suggested order

Every step is one local commit with its proof. Nothing is pushed without asking.

0. ✅ **The four rulings** (§6). ✅ **The download is approved** (owner, 30 Sep 2026): `fonttools` +
   `brotli` from PyPI, into a throwaway virtual environment in the build session's scratchpad. The
   approval was given in the planning session, and approvals are per session, so the build session
   confirms it once before installing.
1. ✅ **Fonts (built 1 Oct 2026; detail and proof in HANDOFF's top block).**
   - A new `tools/subset-inter.py` instances the embedded Inter at the four weights and subsets each
     to WinAnsi with a distinct name. The results are embedded as zlib+base64 beside Carlito, with
     `LICENSE-Inter` added.
   - Proof: every glyph's advance equals the browser's unkerned width; gate 2 is unchanged;
     `npm run check` passes; the size delta is recorded.
   - **As built:**
     - `font-inter-400/500/600/700` in `src/index.html`, made with fontTools 4.60.2.
     - Names `KXTAIS+InterPDF-Regular`, `PJIXRL+InterPDF-Medium`, `MNBNVH+InterPDF-SemiBold` and
       `XYNXFM+InterPDF-Bold`. Frozen `ttfRead()` reads them as `/BaseFont`.
     - 229 glyphs and about 18 KB of TrueType each. +68,801 bytes on the build (+5.1%).
     - The `interfonts` leg and five new `npm run check` checks. Gate 2 is unchanged.
   - ⚠️ **"Equals", made precise.** Chrome's advances at 500/600/700 are fractional (an HVAR delta at
     an F2Dot14 location), and a TrueType advance is a whole number. Every glyph is the whole number
     nearest Chrome's, within 0.4995 units at worst (400 is exact). Summed over a string, that is
     about 0.02 px at 11 px.
   - ⚠️ **Found for step 5 (§3.4).** On screen, Chrome draws Ÿ in Inter by decomposing it to
     Y + U+0308, which the subset lacks. On paper, Ÿ is missing like the other nine.
   - **Measured for §7's kerning risk:** unkerned text is 0.47% wider on average across 64
     month-view strings, and 3.06% wider at most, on a deliberately kern-heavy "AVA … Way".
2. ✅ **The layout model (built 1 Oct 2026; detail and proof in HANDOFF's top block),** with a leg
   comparing it to the print document on tier 1. No PDF yet.
   - **The owner's four rulings for this step (picker, 1 Oct 2026), all as recommended:**
     1. **"Slice it, no hook."** The engine gains no test hook. The `monthlayout` leg slices the
        model's code verbatim out of `src/legacy/app.js` (`interfonts`' technique) and runs it on
        the print documents. `buildMonthLayout`'s own month walk is first exercised at step 5.
     2. **Inter 500 + the frozen `ttfTextWidth`** measure the notes, so the wrapper uses exactly the
        advances the PDF's `/Widths` will carry. `loadInterPdfFont(weight)` decodes a block on
        first use, never at boot.
     3. **128.22 px, the drawn box.** W = 987.528 px (Letter landscape less 8 mm margins, the
        print page's 2 px padding and the frame's 2 px borders). The bar track is (W−6)/7 =
        140.218, the note box 138.218, and the text width 128.218 = 96.164 pt. That is NOT the day
        column frozen `mvNoteBoxWidth()` measures, which would be 0.857 px wider than the box the
        note is drawn in.
     4. **The expected differences "as listed":** only note spans, and the lanes of later
        same-day notes, may differ. Line breaks must equal Chrome's own breaker on the same
        program.
   - **As built:** one new section of `src/legacy/app.js`, before "Month view: note editing":
     `MVL_GEOMETRY`, `loadInterPdfFont`, `mvlTextWidth` (measures what `pdfEscape` will write:
     "?" for anything outside WinAnsi), `mvlCleanText`, `mvlWrapText` / `mvlNoteLines` (pre-wrap
     + break-word, no hyphenation), `mvlParseMonth` (DOMParser, attributes read as strings, every
     day number checked against the grid's own dates), `mvlPackLanes` (a copy of the frozen
     `takeLane`), `mvlMonthLayout`, and `buildMonthLayout(schedule, inter500)`. About 400 lines.
   - ⚠️ **The break-word wrapper moved here from step 3's list**, because ruling 2 needs it to
     count lines. Step 3 draws the model's `lines`; it does not wrap again.
   - ⚠️ **For step 3's `/Widths`:** the model measures each character as the glyph the viewer will
     DRAW. The ten WinAnsi characters the subset lacks measure at `.notdef`'s advance, so the
     emitter's `/Widths` must be `ttfAdvance(ttfGlyph(unicode-of-code))` for every code, `.notdef`
     included, or a line the model fitted can overrun its box.
   - ⚠️ **For step 4's fit:** `mvlNoteLines` takes the font size from `MVL_GEOMETRY`. Under ruling
     3 a shrunk month's text is smaller while its widths are not, so its notes could wrap into
     fewer lines. Step 4 decides whether to re-wrap at the shrunk size (`mvlWrapText` takes any
     width and measure) or keep full-size spans.
   - **Measured on tier 1:** one note in each calendar changes span, "Writer's Room Opens 1/5/26",
     from 1 lane to 2. The frozen screen rule at the PDF's box also says 2, so the width did it,
     not the metrics. No note moves lane, and no other item's lane changes.
   - **Chrome breaks in one place the writer does not** (recorded by the leg, not judged): after
     a hyphen ("second-|unit"). It does NOT break after a slash between letters: both split
     "Cast/Crew/Locations/Vendors" mid-word, identically.
3. ✅ **The emitter and the serializer,** with the determinism controls (built 1 Oct 2026; detail and
   proof in HANDOFF's top block).
   - **The owner's four rulings for this step (picker, 1 Oct 2026, before any code), all as
     recommended:**
     1. **Row heights: "Chrome's, measured."** The emitter never computes a week's height. Each
        month must carry `fit.rows`, its weeks' border-box heights in CSS px, and the emitter
        stacks them under its own header. Step 3's leg hands it the heights Chrome's print layout
        gives the same document. Step 4's fit produces them instead, and its even shrink scales
        `MVL_PAINT`'s vertical sizes and font sizes, which is why every one is read from there.
     2. **"Slice it, no hook" extends to the emitter.** The `monthemit` leg slices the model and the
        emitter verbatim, with the frozen primitives they call. ⛔ **Step 5 owes a check that the
        BUILT app writes the same bytes as the slice for the same calendar**, because the minifier
        drops the whole writer until step 5 routes to it.
     3. **`/Widths` exact, to 3 decimals.** Every code's width is the advance of the glyph a viewer
        draws, unrounded. That is .notdef's for the ten WinAnsi characters the subset lacks, for
        DEL and for the five codes WinAnsi leaves undefined (no text can reach those six; controls
        are dropped first). The frozen waterfall serializer rounds to whole units, which Inter's
        2048 units/em would put up to half a unit off per glyph.
     4. **The today stamp is pinned, not masked.** The month's stamp is right-aligned and the title
        is centred in what it leaves, and Inter's digits are proportional, so real stamps run from
        64.8 px ("1.11.26") to 83.2 px ("10.01.26") and move the title by up to 9 px. `pdfcmp.py`'s
        literal swap cannot follow that. So step 3's leg writes one fixed, real-looking date
        ("9.22.26") into every document before anything reads it; gate 10's `DATESTAMP` is 127.8
        px, wider than any real date. ⛔ **From step 5** there is no document in between, and the
        leg must pin the page's clock instead: local noon on a fixed date, a stub like the print
        stub. `pdfcmp.py` stays the waterfall's tool.
   - **As built:** one section of `src/legacy/app.js`, after `buildMonthLayout`, about 650 lines.
     - `MVL_PAINT`: every number the print stylesheet paints the month with, each a hand copy of a
       frozen rule, held by the leg to Chrome's layout and computed styles.
     - `mvlRgb` / `mvlMix`: `#rgb` and `#rrggbb`, and opacity PRE-MIXED over what lies beneath. The
       PDF has no transparency at all. Text over the off-day hatch is mixed with the hatch's mean,
       which is 2 levels from either stripe.
     - `mvlFlat`, `mvlMeasure`, `mvlLineMetrics`, `mvlWrapWords`, `mvlFitLine` / `mvlLongestStart`:
       white-space collapsing, widths as `pdfEscape` writes them (plus letter-spacing), Chrome's
       baseline rule, the header's word wrap, and the ellipsis.
     - `mvlHeader`: the baseline-aligned title bar and the subtitle, with formats and highlights.
     - `mvlBarHeight` / `mvlLaneTracks`: CSS Grid track sizing for the bar layer, including
       "maximize tracks" against the row's definite height.
     - `mvlPaintBar` / `mvlPaintMonth`: the DISPLAY LIST, in CSS px, in print's paint order, each
       entry tagged with what it is. `mvlPageOps` turns it into one frozen `pdfPage`'s operators.
     - `mvlSerialize`: the multi-page file, modelled on the frozen `pdfSerialize`. Catalog, pages,
       one shared resources dictionary, three objects per used weight, a page and its contents
       per month, xref, and a trailer of `/Size` and `/Root` only.
     - `buildMonthPdf(layout)`: decodes the four programs on first use and embeds only the weights
       some page sets text in.
     - The model gains one field: a header line's `editable` (a Manual header is contenteditable in
       print too, and Chrome gives an EMPTY editable line a line box).
   - ⚠️ **Found by holding the emitter to Chrome's layout, each now matched** (record for step 4):
     - **A day number sits on the cell's 14 px strut**, since `.mv-daycell` sets no font size and
       inherits body's 14px. Its baseline is the cell top + 19, not + 15.
     - **A hiatus band whose label was emptied (audit N-1) prints 4 px tall**, its padding and
       border alone, at the top of its 17 px lane: print's bars are `align-self:start`, and an
       empty one has no line box. The writer reproduces it. 🟡 **Raised with the owner** as a
       print-path quirk to keep or change deliberately.
     - **An empty line in a Manual header is a full line tall** (contenteditable), not 14 px.
     - **Print squeezes lanes when a row is shorter than they want.** The print path's fit measures
       a week at a wider box than it prints, so a note that gains a line on paper overruns its row,
       and CSS shares out only the room left ("maximize tracks"): lanes of 17 to 18.3 px instead of
       19, measured on four tier-2 calendars. Step 4's rows always hold their lanes, so there every
       lane reaches its limit.
   - ⚠️ **For step 4: Chrome's REAL print is not exactly the geometry the model rules.** It lays the
     month out in a 996 × 756 px content box at 30 px margins, not 995.528 × 755.528 at 8 mm, and it
     snaps every border to a whole CSS pixel. The writer draws exact positions on the 8 mm geometry
     (step 2's ruling 3), so its lines sit up to 0.75 px from today's print, the most at the page
     foot. Measured on the reference calendar, from both PDFs' own vector coordinates. The pixel A/B
     should expect it, and "row heights within 1 CSS px" holds it.
   - ⚠️ **For step 4: the window-size control waits for the fit.** Step 3's rows come from the print
     document, whose note spans still depend on the window. On tier 1 (fixed documents) the files
     are byte-identical in a 1280 px window.
   - **Kerning, measured:** Chrome kerns and the PDF does not, so Chrome's text runs up to 1.8 px
     narrower on a date stamp, 1.4 px on a highlighted subtitle and 0.7 px on a bar label. The leg
     corrects each anchor by the difference Chrome reports rather than tolerating it.
4. **The fit** (ruling 3), and the A/B leg against the print path. Contact sheets go to the owner.
5. **The save path, the printable-characters check and the routing** (ruling 4), with the seven legs
   retargeted and `cspproof`.
6. **Baselines,** cut after the owner's sign-off. Then the full gate, the README changelog, HANDOFF,
   and a version cut when the owner asks.

⏳ **Build it in a fresh session**, pointed at this file. It is a multi-session project, and steps 1–4
each need a clean context.
