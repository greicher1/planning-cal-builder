# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`index.html` — a **single self-contained HTML file** (~5000 lines) implementing the *SPT Planning Calendar Builder*: a TV production scheduling tool that turns phase start dates + durations into a week-by-week waterfall calendar, a month calendar, an Excel workbook, and a printable PDF.

There is no build system, no package manager, no tests, no server. The whole app is one `<style>` block (lines ~21–648), static markup, and one IIFE-free `<script>` block (lines ~871–5133). ExcelJS is the only dependency, loaded from a CDN `<script>` tag; Google Fonts are linked. Everything else (icons, PWA manifest) is inlined as `data:` URIs.

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

`PHASES` (line ~875) defines the six built-in phases with their Excel fill/text colors and label templates; `production` is the only one with `inputMode:'days'`. Custom phases are appended via `customPhaseDefs` and get keys `custom<n>`; `getAllPhaseDefs()` returns built-ins + custom together and is what the rest of the app iterates.

## State model

State lives in module-scope mutable objects (scattered through the script — `customPhaseDefs`/`episodeDefs` near line ~1655, most note/header maps near lines ~3350–3600), *not* in a single store. The main ones, all keyed by `'YYYY-MM-DD'` week or day:

| Variable | Purpose |
|---|---|
| `userNotes` | note-cell overrides; `text:''` means "auto-note explicitly cleared" |
| `dayNotes` / `dayNoteColors` | month-view per-day notes and legacy colors (folded in by `dayNoteList()`) |
| `noteColors`, `hiatusTexts`, `hiatusColors` | per-cell appearance overrides |
| `holidayView` | which holidays show in which view (`{sheet, month}`) |
| `headerMode`/`headerManual`, `mvHeaderMode`/`mvHeaderManual` | auto vs. hand-edited header lines |
| `mvExtraLanes` | extra note lanes per month-view week |
| `customPhaseDefs`, `episodeDefs` | dynamic rows |

Any new persistent state must be added in **three** places or it will silently not survive a save: the `stateSnapshot` literal in `buildSavedHtml()`, the matching branch in `restoreSavedState()`, and (if it's a DOM field) `collectFieldValues()` / `reflectFieldsToAttributes()`.

## Save / restore

"Save" writes a *new complete HTML document* — `document.documentElement.outerHTML` with the live state serialized into `<script id="saved-state" type="application/json">` (line 652, ships as `null`). `<` is escaped to `<` so user text containing a closing script tag can't truncate the file. On load, `restoreSavedState()` parses that block and replays it: rebuilds custom-phase and hiatus rows first (re-keying generated ids to the saved keys), then applies `fields.byId`.

`reflectFieldsToAttributes()` exists because `outerHTML` serializes *attributes*, not live DOM property values — form fields must have their values written back to attributes before snapshotting.

File handles are kept in IndexedDB (`spt-planning-cal` / `handles`) as a recents list, so a reopened saved file can write back in place after one permission click. `suppressDirty` gates dirty-tracking during load/restore; `markDirty()` schedules a localStorage backup and the 10-minute autosave.

## Exports

- **Excel** (`exportExcel()`, ~line 3030): builds an ExcelJS workbook directly with explicit column widths, merges, and ARGB fills. `computeBlockLayout()` / `computePhaseRowLayout()` compute the column-slot assignment (which phase occupies which column in a given week, honoring `maxConcurrent` and the fixed sim-post slot) — this same layout logic backs the on-screen waterfall table, so changes there affect both.
- **PDF** (`exportMonthPdf()`, ~line 4519): renders every month into `#print-root`, adds `body.printing-calendar` (a print stylesheet at lines ~379–402 hides everything else), and calls `window.print()`. Always clear the class and `#print-root` before starting — a stuck class hides the app and makes the next print silently do nothing.

## Conventions

- All dates are handled as **UTC midnight**; use `parseDateUTC()`, `addDays()`, `mondayOf()`, `isoOf()` rather than raw `Date` math. Weeks are always Monday-snapped.
- Colors are hex strings shared by DOM and Excel; `textColorFor()` picks readable foreground.
- The union-country selector **locks** once the user has made note/holiday/hiatus edits (`hasNoteEdits()` → `reflectCountryLock()`), since changing country would regenerate auto-notes and clobber them.
- `HOLIDAYS` (~line 898) is hand-transcribed data for 2026–2029 per country, with "ALL" entries pre-merged into each country's list. Extending it means adding years to each array.
- The code comments explain *why* (bug history, browser constraints) at length — match that style when the reasoning is non-obvious, and keep existing explanatory comments intact when editing nearby.
