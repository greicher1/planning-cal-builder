# MONTH-PDF-WRITER-PLAN.md

**Status:** 🔨 **STEP 1 OF 6 BUILT (the fonts, 1 Oct 2026); the writer itself is not.** ✅ **All four
rulings received, 30 Sep 2026** (§6): Inter, the PDF's own cell width, dense months shrink evenly,
and replace the print path while keeping a rollback. Next: step 2, the layout model (§8), on the
owner's go-ahead.
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
2. **The layout model,** with a leg comparing it to the print document on tier 1. No PDF yet.
3. **The emitter and the serializer,** with the determinism controls.
4. **The fit** (ruling 3), and the A/B leg against the print path. Contact sheets go to the owner.
5. **The save path, the printable-characters check and the routing** (ruling 4), with the seven legs
   retargeted and `cspproof`.
6. **Baselines,** cut after the owner's sign-off. Then the full gate, the README changelog, HANDOFF,
   and a version cut when the owner asks.

⏳ **Build it in a fresh session**, pointed at this file. It is a multi-session project, and steps 1–4
each need a clean context.
