# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Full project context lives in [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md)** — the union-holiday
> research and its primary sources, the development/deploy workflow, the headless-Chrome testing
> harness, bug history, and pending work. Read it when picking this project up fresh, or when
> handing it to a session with no history.

## Project

`index.html` — a **single self-contained HTML file** (~6,100 lines) implementing the *SPT Planning Calendar Builder*: a TV production scheduling tool that turns phase start dates + durations into a week-by-week waterfall calendar, a month calendar, an Excel workbook, and a printable PDF.

There is no build system, no package manager, no tests, no server. The whole app is one `<style>` block (lines ~21–746), static markup, and one `<script>` block (lines ~1004–6130). ExcelJS is the only dependency, loaded from a CDN `<script>` tag; Google Fonts are linked. Everything else (icons, PWA manifest) is inlined as `data:` URIs.

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
