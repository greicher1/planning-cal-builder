# CLAUDE.md

## ⛔ READ [`HANDOFF.md`](HANDOFF.md) FIRST — before this file, before anything else

`HANDOFF.md` is the live state of the project: what was just built, what the owner has asked for
and not yet received, what was learned the hard way, and the working conventions in force. It is
the only document that reflects *right now*. Read it before you read another line of this file,
and before you touch `index.html`.

**Keeping it current is a first-class part of the job, not bookkeeping.** After any substantial
change — a feature, a fix that taught you something, a decision about how something should work,
anything an owner request touched — update `HANDOFF.md` in the same breath as the code. A stale
handoff is worse than none: the next session will act on it and be confidently wrong. If you find
it out of date, say so and fix it before continuing.

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Full project context lives in [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md)** — the union-holiday
> research and its primary sources, the development/deploy workflow, the headless-Chrome testing
> harness, bug history, and pending work. Read it when picking this project up fresh, or when
> handing it to a session with no history.

**Reading order:** [`HANDOFF.md`](HANDOFF.md) → this file → [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md).

## ⛔ Never commit, push or deploy on your own initiative

`main` **auto-deploys to a live public site that other people are using**. A push is a production
release, not a save.

- Commit locally while you work — that is fine and expected.
- **Never** run `git push` without being asked for that specific push. Approval is per-action and
  per-change: "commit and push" earlier in the session does **not** authorise the next one, and
  "that looks good" is not authorisation at all.
- When work is ready, **ask with an interactive checkbox picker** (`AskUserQuestion`) whether to
  commit, and separately whether to push/deploy. Present it as a choice, not a formality.
- After an approved push, verify the live URL actually serves the change (~40–60 s) before
  reporting it as shipped.

This rule has been broken before. In one session a single "push and commit" was treated as standing
permission and six further pushes went out unasked. Do not repeat that.

## ⛔ Never touch the grid or the exports

**The calendar grid and the Excel/PDF writers are frozen.** They are not to be restyled,
refactored, "modernised", wrapped in components, or migrated to any UI library — including the
Mantine work described in [`MANTINE-MIGRATION.md`](MANTINE-MIGRATION.md). Every number in them is
there for a specific, measured reason, and the reasons are not visible from the code.

**Frozen surface — the seam is exact:**

- **`#table-wrap` and everything inside it.** The waterfall and month-view grids. React/Mantine
  renders this as an *empty container with a ref* and never touches its children.
- **`#print-root` and everything inside it.** Same rule.
- **The width model:** `EXCEL_MDW = 7` (floored, **not** 7.4336), `SHEET_ZOOM = 0.75`,
  `EXCEL_CELL_PAD = 5`, `COL_PAD_CHARS = 1.15`, `ROW_DEFAULT_PX = 20`.
- **Grid rendering + geometry:** `render`, `renderSpreadsheetView`, `renderMonthView`,
  `computeBlockLayout`, `phaseRunBounds`, `computePhaseRowLayout`, `applyCellSpanOverrides`,
  `sheetRowCount`, `sheetGridMetrics`, `sheetPageOrientation`, `sheetColumnWidths`.
- **Text fitting + measurement:** `measureTextPx`, `pxToChars`, `charsToPx`, `charsToScreenPx`,
  `clampChars`, `screenPxToChars`, `wrapLineCount`, `cellTextFit`.
- **Direct manipulation:** `installGridResizers`, `beginSpanDrag`, `spanHandleGeometry`,
  `applyCellFitLive`, `repositionColHandles`, `repositionRowHandles`, `scheduleLiveUpdate`,
  `captureScroll`, `restoreScroll`.
- **Exports:** `exportExcel`, `exportMonthPdf`, `buildWaterfallPdf`, `exportWaterfallPdf`,
  `exportWaterfallPdfDirect`, `pdfSerialize`, `pdfPage`, `pdfEscape`, `pdfRgb`, `pdfDeflate`,
  `ttfRead`, `ttfGlyph`, `ttfAdvance`, `ttfTextWidth`, `setWfPageStyle`, `removeWfPageStyle`,
  `readCfgForMeta`.
- **CSS:** the `/* ---------- Month view ---------- */` block, the
  `/* ---------- Calendar PDF export ---------- */` block, and every `.sheet-*` / `.mv-*` /
  `#print-root` rule. **No third-party CSS baseline may reach them** — Mantine's `global.css` /
  `baseline.css` must be fenced into a `@layer` the grid rules outrank.

**Why, concretely.** These three cost weeks and are each invisible without measurement:

- Calibri/Carlito's `"0"` advances 7.4336 px, but **Excel floors MDW to 7**. Using the true
  advance yields columns ~6% narrower than Excel's autofit, and every downstream width is wrong.
- The width model budgets **3.75 px** of total cell padding at `SHEET_ZOOM`. Any CSS rule that
  spends more silently ellipsis-clips text. This has already landed twice — 64 of 255 filled
  cells once, then 9 of 52 date cells.
- `computePhaseRowLayout()` is the **single** source of which phase occupies which column, shared
  by the screen, the PDF writer, `sheetColumnWidths()` and the Excel export. The previous
  three-way divergence is what made the PDF never match an Excel print.

**Allowed:** calling into this surface, reading from it, and changing what *surrounds* it — the
toolbar above the grid, the popovers anchored to its cells (anchored to, never injected into),
the container's own layout position on the page.

**If a change genuinely requires touching it:** stop and ask, with the measurement you intend to
use as the acceptance gate (clipped-cell count, PDF diff against a pre-change export). Do not
decide this one alone.

## ⏳ Watch the context window — hand off before quality drops

Long sessions degrade: context gets summarised, details are lost, and work starts getting
re-derived or quietly repeated. **Proactively** — without being prompted — tell the owner when the
session is getting long, and recommend migrating:

1. Save all work (commit locally at minimum; ask before pushing).
2. **Update `HANDOFF.md`** with everything learned since it was last written.
3. Start a fresh session, pointing it at `HANDOFF.md` first.

Raise this *before* the session is struggling, not after. Re-read this section periodically during
long sessions — it is easy to forget precisely when it matters most.

## Project

`index.html` — a **single self-contained HTML file** (~10,000 lines / 662 KB) implementing the *SPT Planning Calendar Builder*: a TV production scheduling tool that turns phase start dates + durations into a week-by-week waterfall calendar, a month calendar, an Excel workbook, and a printable PDF.

There is no build system, no package manager, no tests, no server. The whole app is one `<style>` block, static markup, and one `<script>` block. ExcelJS is the only dependency, loaded from a CDN `<script>` tag. The Carlito font is **embedded** in the file (base64 of a zlib'd TrueType subset, ~91 KB) rather than fetched, so text measurement cannot drift; `tools/subset-font.py` regenerates it. Everything else (icons, PWA manifest) is inlined as `data:` URIs.

⚠️ Line numbers quoted anywhere in this file are approximate and go stale fast — the script has roughly doubled since they were written. Search for the symbol, don't jump to the line.

**Run it:** `open index.html` (macOS). Reload the browser to test changes. Chrome/Edge are the target browsers — the File System Access API (`showSaveFilePicker`) and IndexedDB handle persistence degrade to a plain download elsewhere.

**Keep it single-file.** The self-containment is load-bearing: saved calendars *are* copies of `index.html` with state baked in, and the PWA manifest is inlined so the tool can be emailed around as one file. Do not split out CSS/JS or add local asset files.

## Core data flow

Everything funnels through one cycle, driven by `update()`:

```
DOM inputs → readState() → computeSchedule(state) → render(schedule) → markDirty()
```

- **`readState()`** reads every `#start-<key>` / `#weeks-<key>` field, hiatus rows, per-phase hiatuses, and Show Info. Note: once Show Info is complete (`showInfoStatus()`), `episodes × days-per-episode` **overrides** whatever was typed in the Production row, everywhere.
- **`computeSchedule(state)`** is the heart of the app. It returns `{weeks:[], maxConcurrent, totalWeeks, error?}`, where each week carries its phase segments, hiatus flags, and auto-notes. Key behaviors, all deliberate:
  - Hiatuses **pause** a phase rather than consuming its weeks — `extendEndForHiatus()` walks week-by-week and only counts non-hiatus weeks, so a phase always delivers its full requested span. Overlapping hiatuses extend by the union, not per-hiatus.
  - Production alone runs a **day-level** simulation (`simulateProductionSchedule()`): skips weekends, hiatus days, and union holidays for the selected country until the shoot-day count is met.
  - Global hiatuses apply to all phases; `phaseHiatuses[key]` pauses only its own phase.
  - `MAX_WEEKS = 600` guards against typo'd years hanging the page.
- **`render(schedule)`** dispatches to `renderSpreadsheetView()` (waterfall) or `renderMonthView()` per `viewMode` (`'sheet' | 'month'`), plus the summary row and holiday-visibility list.

**After applying a state snapshot, `refreshAfterRestore()` must run** — not a bare `update()`. It is the single list of post-restore UI refreshes (sidebar tab, region tracking, episode rows, sim-post, then `update`). The three restore paths each used to keep their own copy of that list and drifted, which left a stale "Complete Show Info" notice and an empty episode list after opening a saved file.

## Calendar adjustment tools

The toolbar above the preview holds **Shift All** (split control: arrows act, caret opens a form), **Shift From**, **Anchor To** and **Rebuild From**. Only two questions distinguish them, and the popover descriptions exist to answer them: *does everything move or part of it*, and *do the gaps between phases survive or get rebuilt*. Anything true of all four — none of them ever change a phase's duration — must **not** appear in a description; it reads as a distinction while distinguishing nothing.

`shiftCalendar(weeks, fromIso)` also re-keys the week-keyed note stores, because a shift that moved only the dates would leave every note behind on the old calendar date. Holidays never move, locked all-phase hiatuses never move, and notes carrying a date never move; per-phase hiatuses always travel with their phase. Full detail, including the two solvers and why Production is searched rather than inverted, is in **PROJECT-CONTEXT.md §7a**.

`PHASES` (line ~1008) defines the six built-in phases with their Excel fill/text colors and label templates; `production` is the only one with `inputMode:'days'`. Custom phases are appended via `customPhaseDefs` and get keys `custom<n>`; `getAllPhaseDefs()` returns built-ins + custom together and is what the rest of the app iterates.

## State model

State lives in module-scope mutable objects (scattered through the script — `customPhaseDefs`/`episodeDefs` near line ~2150, most note/header maps near lines ~4000–4275), *not* in a single store. The main ones, all keyed by `'YYYY-MM-DD'` week or day:

| Variable | Purpose |
|---|---|
| `userNotes` | note-cell overrides; `text:''` means "auto-note explicitly cleared" |
| `dayNotes` / `dayNoteColors` | month-view per-day notes and legacy colors (folded in by `dayNoteList()`) |
| `noteColors`, `hiatusTexts`, `hiatusColors` | per-cell appearance overrides |
| `holidayView` | which holidays show in which view (`{sheet, month}`) |
| `headerMode`/`headerManual`, `mvHeaderMode`/`mvHeaderManual` | auto vs. hand-edited header lines |
| `mvExtraLanes` | extra note lanes per month-view week |
| `customPhaseDefs`, `episodeDefs` | dynamic rows |

| `locked` on each `.hiatus-entry` | the "Lock in place" pin: a locked all-phase hiatus keeps its dates when the shift tools move the calendar |

Any new persistent state must be added in **both** places or it will silently not survive a save: the `captureSnapshot()` literal and the matching branch in `applyStateSnapshot()` — plus (if it's a DOM field) `collectFieldValues()` / `reflectFieldsToAttributes()`. `captureSnapshot()` is the **single** definition of "what counts as state", consumed by the save file, the crash backup, and the undo stack; it replaced two duplicated snapshot literals.

⚠️ `collectFieldValues()` sweeps every `input[id]`/`select[id]`/`textarea[id]` in the document. Any new id'd control that is *transient UI* rather than calendar data must be excluded, or it gets baked into saved files **and** adds phantom undo steps. The toolbar tool popovers are excluded via `el.closest('.tools-menu')` — matched on the **class**, deliberately not an id, because an id-based test quietly stops matching when markup is reorganised.

## Save / restore

"Save" writes a *new complete HTML document* — `document.documentElement.outerHTML` with the live state serialized into `<script id="saved-state" type="application/json">` (line 750, ships as `null`). `<` is escaped to `<` so user text containing a closing script tag can't truncate the file. On load, `restoreSavedState()` parses that block and replays it: rebuilds custom-phase and hiatus rows first (re-keying generated ids to the saved keys), then applies `fields.byId`.

`reflectFieldsToAttributes()` exists because `outerHTML` serializes *attributes*, not live DOM property values — form fields must have their values written back to attributes before snapshotting.

File handles are kept in IndexedDB (`spt-planning-cal` / `handles`) as a recents list, so a reopened saved file can write back in place after one permission click. `suppressDirty` gates dirty-tracking during load/restore; `markDirty()` schedules a localStorage backup and the 10-minute autosave.

## Exports

- **Excel** (`exportExcel()`, ~line 3582): builds an ExcelJS workbook directly with explicit column widths, merges, and ARGB fills. `computeBlockLayout()` / `computePhaseRowLayout()` compute the column-slot assignment (which phase occupies which column in a given week, honoring `maxConcurrent` and the fixed sim-post slot) — this same layout logic backs the on-screen waterfall table, so changes there affect both.
- **PDF** (`exportMonthPdf()`, ~line 5391): renders every month into `#print-root`, adds `body.printing-calendar` (a print stylesheet at lines ~440–470 hides everything else), and calls `window.print()`. Always clear the class and `#print-root` before starting — a stuck class hides the app and makes the next print silently do nothing.

## Conventions

- All dates are handled as **UTC midnight**; use `parseDateUTC()`, `addDays()`, `mondayOf()`, `isoOf()` rather than raw `Date` math. Weeks are always Monday-snapped.
- Colors are hex strings shared by DOM and Excel; `textColorFor()` picks readable foreground.
- The Production Region selectors **lock** once the user has made note/holiday/hiatus edits (`hasNoteEdits()` → `reflectCountryLock()`), since changing region would regenerate auto-notes and clobber them. Both `#union-country` and `#union-subregion` lock and revert together.
- **Region model:** a country (`#union-country`: `US` / `CA` / `UK`) plus a sub-region for US and Canada — `#union-usregion` (`US-GEN`, `US-NY`) and `#union-subregion` (`CA-BC`, `CA-ON`, `CA-QC`, `CA-AB`, `CA-MB`, `CA-NS`). They are **two separate selects** so both option sets stay static and a restored save can set either value directly. `effectiveRegionKey()` resolves country+sub-region to one `HOLIDAYS` key (the bare `US`/`CA` values are never keys); `reflectRegionUI()` shows whichever row applies; `normalizeRegionSelection()` rewrites the legacy `CAN` value and fills a missing sub-region with that country's default; `syncRegionTracking()` re-baselines the change-guard after any programmatic load/restore. All three selects lock and revert together.
- `HOLIDAYS` (~line 1052) is keyed by **region**, not country, and is **generated from holiday rules** rather than hand-transcribed — regenerate it rather than editing dates by hand. Both US lists are IATSE's 11 recognized holidays: `US-GEN` (West Coast Studio Locals **and** the Area Standards Agreement — verified identical, so LA = Atlanta = Albuquerque) and `US-NY` (Local 52 Majors), which **swaps Good Friday for Veterans Day**. **Columbus Day appears in neither** (it is on no IATSE calendar), and Veterans Day is *only* correct for New York. Canada is per-province because the statutory lists genuinely differ (Boxing Day is ON-only; Remembrance Day BC/AB; Truth & Reconciliation BC/MB; Fête nationale QC-only). Weekend holidays also emit an `(Observed)` weekday entry — US shifts Sat→Fri / Sun→Mon per the IATSE ASA rule, Canada/UK move forward to the next free weekday.
- The code comments explain *why* (bug history, browser constraints) at length — match that style when the reasoning is non-obvious, and keep existing explanatory comments intact when editing nearby.
