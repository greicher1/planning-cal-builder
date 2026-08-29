# SPT Planning Calendar Builder — Full Project Context

**Purpose of this document:** everything a fresh Claude session needs to work on this project
with no prior context. Pair it with the current `index.html` and you have the whole picture.

**Last updated:** at commit `b603fd7` (28 Aug 2026) — the `.sptcal` save format, the frozen
grid/exports rule, and the Mantine redesign decision. Previous refresh was `218558b`, 27 commits
earlier; everything between is summarised in §§2, 8, 9, 9a and 12.

> ⚠️ **Three documents, three jobs.** [`HANDOFF.md`](HANDOFF.md) is *where things stand right now*
> and is read **first**. [`CLAUDE.md`](CLAUDE.md) is the rules. This file is the *system* —
> how it works and why. When they disagree, `HANDOFF.md` is newer.

---

## 1. What this app is

A **TV production scheduling tool** used to build season planning calendars. You give it phase
start dates and durations; it produces a week-by-week **waterfall calendar**, a **month
calendar**, an **Excel workbook**, and **printable PDFs**.

Above the preview sits a row of **adjustment tools** that move or rebuild a whole plan at once —
see §7a, which is the densest part of the app added since the original version of this document.

It is used by production/scheduling staff at a TV studio ("SPT" = Sony Pictures Television).
The output is the sort of one-page planning calendar that gets circulated to a production team.

**Live URL:** https://greicher1.github.io/planning-cal-builder/
**Repo:** https://github.com/greicher1/planning-cal-builder (public)
**Owner:** Graham Reicher (grahamreicher@gmail.com)

### The six built-in phases (in order)

`writersRoom` → `prePrep` → `prodPrep` → `production` → `post` → `localization`

Every phase takes a **start date + a number of weeks**, except **Production**, which is measured
in **shoot days** and simulated day-by-day. Users can also add **custom phases** (keys
`custom<n>`).

---

## 2. Hard architectural constraint: ONE FILE

`index.html` is a **single self-contained HTML file** — **10,210 lines, 660 KB** as of `b603fd7`.
One `<style>` block, static markup, one big `<script>` block wrapped in an IIFE (so nothing inside
is a global — see §11).

**Do not split out CSS/JS or add local asset files.** This is load-bearing, not stylistic:

- The PWA manifest and all icons are inlined as `data:` URIs so the tool can be **emailed around
  as one file** and run offline from `file://`.
- The **Carlito font is embedded** (base64 of a zlib'd TrueType subset, ~94 KB, 14% of the file)
  rather than fetched, so text measurement cannot drift. `tools/subset-font.py` regenerates it.
  This replaced a Google Fonts dependency — see §9a for why that mattered enough to inline 94 KB.

> ⚠️ **"Saved calendars are copies of `index.html`" is no longer true, and that change is recent.**
> As of v1.1.0 **Save writes `.sptcal`** — the state as JSON, ~4.5 KB. The old full-copy format
> survives as File ▸ *Export shareable copy…*. Both still open, forever. See §8, which was
> rewritten for this.

**The only external dependency:** ExcelJS from a CDN `<script>` tag (line 2240). Everything else
is inline. The app is otherwise fully offline-capable and makes no network requests.

**No build system. No package manager. No test framework. No server.** There are now **test
fixtures** (`tests/fixtures/`) but no runner — see §11.

> ⚠️ **This constraint is under active reconsideration.** The owner has chosen to redesign the
> surrounding UI on Mantine, which requires React and a build step. The grid and the exports are
> **permanently frozen** and excluded (§2a). See [`MANTINE-MIGRATION.md`](MANTINE-MIGRATION.md)
> and `HANDOFF.md` §8 for the staged plan and the decisions it is gated on.

**Run it:** `open index.html` on macOS, or serve the directory over HTTP. Reload to test.
Chrome/Edge are the target browsers — the File System Access API (`showSaveFilePicker`) and
IndexedDB handle persistence degrade to a plain download elsewhere.

---

## 2a. The frozen surface — the grid and the exports

**Never touched.** Not restyled, refactored, wrapped in components, or migrated to a UI library.
The full rule, listed function by function, is the *"⛔ Never touch the grid or the exports"*
section of [`CLAUDE.md`](CLAUDE.md); the seam is `#table-wrap` and `#print-root` and everything
inside them, the width model, the layout and text-fitting functions, and the Excel/PDF writers.

Three measured facts are why, and none is visible from reading the code:

1. Carlito/Calibri's `"0"` advances **7.4336 px**, but **Excel floors MDW to 7**. Using the true
   advance makes every column ~6% narrower than Excel's autofit.
2. The model budgets **3.75 px** of total cell padding at `SHEET_ZOOM`. Anything more silently
   ellipsis-clips text — it has landed twice, at 64/255 filled cells and then 9/52 date cells.
3. `computePhaseRowLayout()` is the single source of which phase occupies which column, shared by
   four consumers. Its previous three-way divergence is why the PDF never matched an Excel print.

Changing what *surrounds* the grid is fine and expected: the toolbar, the popovers anchored to its
cells, the container's position on the page.

---

## 3. Core data flow

Everything funnels through one cycle, driven by `update()`:

```
DOM inputs → readState() → computeSchedule(state) → render(schedule) → markDirty()
```

- **`readState()`** reads every `#start-<key>` / `#weeks-<key>` field, hiatus rows,
  per-phase hiatuses, Show Info, and the region selectors.
  Note: once Show Info is complete (`showInfoStatus()`), **`episodes × days-per-episode`
  overrides** whatever was typed in the Production row, everywhere.

- **`computeSchedule(state)`** is the heart of the app. Returns
  `{weeks, maxConcurrent, totalWeeks, segments, hiatuses, gaps, notesByIdx, productionInfo,
  phaseHolidays, error?}`. Each week carries its phase segments, hiatus flags, and auto-notes.

- **`render(schedule)`** dispatches to `renderSpreadsheetView()` (waterfall) or
  `renderMonthView()` per `viewMode` (`'sheet' | 'month'`), plus the summary row and the
  holiday list in Settings.

### Deliberate scheduling behaviours (do not "fix" these)

- **Hiatuses PAUSE a phase, they don't consume its weeks.** `extendEndForHiatus()`
  walks week-by-week and only counts non-hiatus weeks, so a phase always delivers its full
  requested span — the hiatus pushes its end date out. Overlapping hiatuses extend by the
  **union**, not per-hiatus.
- **Production alone runs a day-level simulation** (`simulateProductionSchedule()`:
  skips weekends, hiatus days, and **enabled** union holidays for the selected region until the
  shoot-day count is met.
- **Global hiatuses** apply to all phases; **`phaseHiatuses[key]`** pauses only its own phase.
- `MAX_WEEKS = 600` guards against typo'd years hanging the page.
- All weeks are **Monday-snapped**.

---

## 4. Dates convention (important)

All dates are handled as **UTC midnight**. Always use the helpers, never raw `Date` math:

| Helper | Line | Purpose |
|---|---|---|
| `parseDateUTC()` | 1474 | parse `'YYYY-MM-DD'` to a UTC-midnight Date |
| `addDays(d, n)` | 1480 | day arithmetic |
| `mondayOf(d)` | 1481 | snap to the week's Monday |
| `isoOf(d)` | 2498 | back to `'YYYY-MM-DD'` |
| `fmtShort(d)` | 1486 | display format |

Using local-time `Date` math here causes off-by-one-day bugs that are painful to track down.

---

## 5. The holiday / region system (the most researched part)

This was rebuilt from primary union-contract sources. **The data is generated from rules, not
hand-transcribed — regenerate it rather than editing dates by hand.**

### Region model

The region is a **country + a sub-region**, held in **three separate `<select>` elements** so
every option set stays static and a restored save can set any value directly:

| Element | Values |
|---|---|
| `#union-country` | `US`, `CA`, `UK` (+ hidden legacy `CAN`) |
| `#union-usregion` | `US-GEN`, `US-NY` |
| `#union-subregion` | `CA-BC`, `CA-ON`, `CA-QC`, `CA-AB`, `CA-MB`, `CA-NS` |

Supporting functions:

- **`effectiveRegionKey()`** resolves country + sub-region to ONE `HOLIDAYS` key.
  The bare `US`/`CA` values are **never** keys.
- **`reflectRegionUI()`** shows whichever sub-region row applies (UK has none).
- **`normalizeRegionSelection()`** rewrites the legacy `CAN` value from pre-split saves
  and fills a missing sub-region with that country's default (`CA-BC` / `US-GEN`).
- **`syncRegionTracking()`** re-baselines the change-guard after any programmatic
  load/restore, so the next user change isn't compared against a stale value.

### THE RESEARCH FINDINGS (verified against primary sources — do not silently change these)

**United States — IATSE's 11 recognized holidays.**

`US-GEN` (West Coast Studio Local Agreements **and** the Area Standards Agreement — verified
word-for-word identical, so **LA = Atlanta = Albuquerque**):

> New Year's Day · Martin Luther King Jr. Day · Presidents' Day · **Good Friday** · Memorial Day ·
> Juneteenth · Independence Day · Labor Day · Thanksgiving · Day After Thanksgiving · Christmas

`US-NY` (IATSE Local 52 Majors Agreement) — **swaps Good Friday for Veterans Day.** Same count
(11), different days.

**Critical corrections that were made** (the app previously had these wrong):

- **Columbus Day is on NO IATSE calendar.** It appears in neither US list. It was wrongly
  costing shoot days.
- **Veterans Day is AICP *commercial*-contract only** — so it is correct for **New York only**,
  never for General.
- **Good Friday IS a US union holiday** (not Canada/UK-only).
- **Day After Thanksgiving** is recognized (Basic + Low Budget, not AICP).
- **Juneteenth** was added effective **1 Jan 2025** (2024 MOA), so it applies for 2026–2029.
  The same MOA raised the unworked-holiday percentage 4% → 4.583%.
- **MLK Day** was added to Local 52 effective **1 Jan 2023** (raising its percentage
  3.719% → 4%).
- **Christmas Eve and New Year's Eve are NOT holidays** (in BC they carry premium pay but are
  working days). Do not mark them as no-shoot.

**Canada — per province, because the statutory lists genuinely diverge:**

| Holiday | BC | ON | QC | AB | MB | NS |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| New Year's, Good Friday, Canada Day, Labour Day, Christmas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Family Day / Louis Riel / Heritage Day (3rd Mon Feb) | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Victoria Day (Patriotes in QC) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Thanksgiving | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Boxing Day** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Remembrance Day** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Truth & Reconciliation** | ✅ | ❌* | ❌ | ❌ | ✅ | ❌ |
| **Aug civic holiday** | ✅ BC Day | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Fête nationale (24 Jun)** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

Totals: **BC 11 · ON 9 · QC 8 · AB 9 · MB 9 · NS 6**

\* Ontario's IATSE Local 873 treats 30 Sept as a *"Proclaimed Holiday"*, not statutory, with an
auto-upgrade clause if Ontario legislates it.

Other notes: **Quebec requires Good Friday *or* Easter Monday (employer's choice)** — the app
lists Good Friday; switch manually if a production observes Easter Monday. **Nova Scotia is the
outlier** with only 6 (no Victoria Day, Thanksgiving, or Boxing Day) — a Halifax production's
IATSE 849 agreement may add some back, but there was no primary source for it so nothing was
invented.

**Weekend observance rule** (verified verbatim from the ASA):

> *"If any of the above-named holidays falls on a Sunday, the following Monday shall be
> considered the holiday and if any... falls on a Saturday, the preceding Friday shall be
> considered the holiday, except that during six (6) day workweeks, Saturday holidays will be
> recognized on Saturday."*

So: **US shifts Sat→Fri / Sun→Mon.** **Canada and UK move forward to the next free weekday**,
which is why a Saturday Christmas + Sunday Boxing Day correctly become Monday + Tuesday rather
than colliding.

A weekend holiday also emits an **`(Observed)` weekday entry**. Only that observed entry can
actually cost a shoot day (weekends are already skipped), so the UI greys out the Enable box on
the weekend entry itself.

### Primary sources (re-verify here if the data is ever questioned)

- IATSE Local 695 holiday calendar — https://www.local695.com/iatse-holiday-calendar/
- IATSE Basic Agreement 2021–2027 — https://www.editorsguild.com/Portals/0/FullContract/COMBINED%20IATSE%20BASIC%20AGREEMENT%20-%202021-2027.pdf
- 2024 IATSE Area Standards Agreement MOA — https://iatse.net/wp-content/uploads/2024/07/2024-IATSE-Area-Standards-Agreement-MOA-FINAL.pdf
- IATSE Local 52 Majors Agreement — https://amptp.org/wp-content/themes/amptp/assets/pdf/IATSE/New%20York%20Agreements/Local%2052/
- BC statutory holidays — https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards/statutory-holidays
- Ontario ESA public holidays — https://www.ontario.ca/document/your-guide-employment-standards-act-0/public-holidays
- Alberta general holidays — https://www.alberta.ca/general-holidays-pay
- Manitoba general holidays — https://www.gov.mb.ca/labour/standards/
- Nova Scotia paid holidays — https://novascotia.ca/lae/employmentrights/holidaychart.asp

**Not verified:** DGA and Teamsters holiday lists (those claims failed verification). IATSE is
the safe anchor because crew holidays are what actually stop a shoot day. Also unverified:
whether Juneteenth reached Local 52 (industry-wide pattern says yes; the current Local 52 MOA
would not open).

### Holiday identity — stable IDs

A holiday's id is **`slug(name)@year`** (e.g. `good-friday@2026`), produced by `holidaySlug()`. It used to be the bare ISO date, which was fragile: switching region kept the date but
changed the holiday, so a per-holiday choice silently transferred to whatever now fell on that
day. With name-based ids a choice **follows the holiday** across region changes, and settings for
a holiday the new region lacks simply lie dormant.

`migrateHolidayViewKeys()` rewrites old date-keyed entries on load.

### Enable / disable and custom holidays

- **`holidayOff`** — `hid → true` means the user switched that holiday OFF. Empty map = all on.
- **`customHolidays`** — `[{id, name, date}]`, the user's own single-day holidays. Ids are random
  (`cst-xxxxxxx`) so renaming keeps the settings. **Deliberately NOT region-scoped**, so a
  studio shutdown survives a region change. Always listed even when outside the current phases.
- **`fullHolidayList(regionKey)`** merges the region's list with the custom ones and tags
  each with `enabled`.
- Disabling a holiday **changes Production's dates**, so it warns once (only when note edits
  exist) rather than hard-blocking.
- Custom holidays fill a real gap: hiatus rows are **whole Monday-snapped weeks**, so there was
  previously no way to block a **single day**.

---

## 6. Other subsystems

### Simultaneous Post

Marks weeks where post runs concurrently with the shoot. Lives inside the Production row (its
offset counts weeks from Production's start). A **numbering toggle** (`#simpost-count`, default
ON) chooses between:

- **On:** weeks read "Simultaneous Post wk 1, 2…" and the regular Post phase **continues** from
  there (Post wk 3, 4…). One unbroken post-week sequence.
- **Off:** every flagged week reads just "Simultaneous Post" and Post starts again at wk 1.

`simPostLabel()` centralizes the marker text so the waterfall, Excel export, and month
view can't drift apart.

### "Start after previous phase"

Each built-in phase except Writers Room has a small text button that fills its start date with
the week right after the nearest **earlier scheduled** phase ends, following `PHASE_CHAIN`. Handles hiatuses two ways: the previous phase's end already accounts for hiatuses
*inside* it, and then `autostartPhase()` steps past any hiatus at the boundary so the new
phase lands on a working week. One-time fill; the date stays editable. Custom phases excluded.

### Notes

The Notes column auto-fills milestones ("Start Principal Photography", "Principal Photography
Wraps", holidays, sim-post flags). Users can edit, recolor, or clear any note.

**The two views own their notes separately:**
- **Waterfall notes** are the master set — they appear in the Waterfall, the Excel export, AND
  the Month view.
- **Month view notes** (added via the `+` on a day) belong to the Month view and its PDF only,
  and deliberately do NOT appear in the Waterfall or Excel.

`userNotes[key].text === ''` means "auto-note explicitly cleared" and stays gone.

### Editing is a popover, never markup injected into the grid

`openNoteEditor()` — and the month-view note editor and the phase colour picker — open a
panel **appended to `body` and anchored to the cell**, not an editor rendered *inside* it. The
grid must keep exactly the shape it had: injecting a form into a cell changes that row's height
and column's width, so opening an editor moved the very thing being edited out from under the
pointer. That is what commit `cf51a29` fixed, and it is now a standing convention.

Three obligations come with it, each of which was a bug first:

- **A popover that outlives its anchor must be torn down.** `render()` rebuilds the grid on every
  edit, so a body-level popover survives its cell and is left hanging over the calendar pointing
  at nothing.
- **Anchored inside a scrolling container ⇒ reposition on `scroll` (capture phase) and `resize`**,
  and clamp into the window.
- **Its controls must not carry `id`s.** `collectFieldValues()` sweeps every id'd
  `input`/`select`/`textarea` into saved files *and* the undo stack, so the editor's day and size
  selects use **classes** (§7). The toolbar popovers are excluded by `el.closest('.tools-menu')`
  — matched on the class, deliberately not an id.

**Direct manipulation is preferred over dialogs** generally: resizing, filling a cell and changing
a row height are all drag-or-double-click on the thing itself, and double-click means "back to
automatic" (§9a).

### Sidebar tabs

Three tabs: **Show**, **Phases**, **Settings** (`setSidebarTab()`. Sections are
`<section class="card" data-tab="...">`. The Settings tab holds **Production Region** and
**Holidays** together — they were previously split across two tabs, which made the region
undiscoverable.

---

## 7. State model & the snapshot rule

State lives in **module-scope mutable variables**, not a single store. The persisted ones:

| Variable | Purpose |
|---|---|
| `userNotes` | note-cell overrides (`text:''` = auto-note cleared) |
| `dayNotes` / `dayNoteColors` | month-view per-day notes and legacy colours |
| `noteColors`, `hiatusTexts`, `hiatusColors` | per-cell appearance overrides |
| `holidayView` | which holidays show in which view (`{sheet, month}`) |
| `holidayOff` | holidays switched off (affects the schedule) |
| `customHolidays` | user-added single-day holidays |
| `headerMode`/`headerManual`, `mvHeaderMode`/`mvHeaderManual` | auto vs hand-edited header lines |
| `mvExtraLanes` | extra note lanes per month-view week |
| `customPhaseDefs`, `episodeDefs` | dynamic rows (with their `customPhaseCounter` / `episodeCounter`) |
| `phaseColorOverride` | per-phase colour overrides |
| `noteFontSize`, `hiatusFontSize` | per-cell font size, set by the note editor or a row drag |
| `colWidths`, `rowHeights` | manual grid sizing from `installGridResizers`; absent = automatic |
| `cellSpans` | a cell dragged across the empty columns beside it |
| `viewMode`, `sidebarTab` | UI position |

Two more things ride in the snapshot that are not maps: **`version`** (`SNAPSHOT_VERSION`, see §8)
and **`fields`** — `collectFieldValues()`'s sweep of every id'd form control, which is what makes
those DOM ids part of the file format (§2a, §8).

Added since: `locked` on each all-phase hiatus row (the "Lock in place" pin — see §7a), and the
undo/redo stacks, which are **not** persisted (history is per-session and reset on New/Open).

**Deliberately NOT state:** `autosaveNeedsFile`, `autosaveFailed`, `isDirty`, `suppressDirty` and
the legacy-notice visibility are session UI. Per-user *preferences* (`SHEET_GRIDLINES`,
`WF_PDF_MODE`, `GRID_TEXT_COLOR`, once the Settings menu owns them) belong in `localStorage`,
**never** in `captureSnapshot()` — they are not calendar data and must not travel inside someone
else's file.

> ### ⚠️ Any new persistent state must be added in BOTH places or it silently won't survive a save:
> 1. the `captureSnapshot()` literal
> 2. the matching branch in `applyStateSnapshot()`
> 3. if it's a DOM field, `collectFieldValues()` / `reflectFieldsToAttributes()`
>
> **This used to be three places, with two duplicated snapshot literals** (one in
> `buildSavedHtml()`, one in the IndexedDB backup). They are now a single `captureSnapshot()`
> consumed by all **three** callers — the save file, the crash backup, and the undo stack — so
> there is one definition of "what counts as state".
>
> ⚠️ `collectFieldValues()` sweeps **every** `input[id]`/`select[id]`/`textarea[id]` in the
> document, so any new id'd control that is *transient UI* rather than calendar data must be
> excluded or it gets baked into saved files **and** adds phantom undo steps. The toolbar tools are
> excluded by `el.closest('.tools-menu')` — matched on the **class**, deliberately not an id,
> because an id-based test quietly stops matching when markup is reorganised (this happened).

---

## 7a. The calendar adjustment tools (toolbar above the preview)

```
[Waterfall | Month]  [← 1 wk  Shift All  1 wk → ▾] [Shift From ▾] [Anchor To ▾] [Rebuild From ▾]  [↶ ↷]
```

One button per tool, each opening its own small popover. There is deliberately **no container
menu** — an earlier "Adjustment Tools" menu hid all four behind one unlabelled click and grew to
562 px tall. Shift All is a **split control**: the arrows act on one click, the caret opens the
multi-week form.

Only **two questions** distinguish these tools, and the popover descriptions are written to answer
them. Anything true of all four (durations are never changed by any of them) must **not** appear in
a description — it reads as a distinction while distinguishing nothing.

| | Everything moves | Part moves |
|---|---|---|
| **Gaps preserved** | Shift All (by amount) · Anchor To (by date) | Shift From |
| **Gaps rebuilt** | — | Rebuild From |

- **Shift All / Shift From** — `shiftCalendar(weeks, fromIso)`. `fromIso` limits the
  move to weeks on or after a cutoff; that is Shift From. Earlier/Later is the direction of
  **travel**, not which side moves — both directions move the same set.
- **Anchor To** — measures the gap between a landmark and a target date, then calls
  `shiftCalendar` with that delta. It moves **dates, not phases**: a phase with a week count but
  no date is invisible to it. It never reads week counts to position anything.
- **Rebuild From** — `workBackwardsFrom` / `workForwardsFrom`. Pins one date and
  recomputes one side to run consecutively, **writing** start dates including into empty fields.
- **Close all gaps** — `closeAllGaps()`, folded into the Rebuild From popover. It is
  Rebuild-forwards from the *first* phase at its current date, so it **moves the shoot**; Rebuild
  From backwards **holds the shoot** and moves the front end. Same goal, opposite anchor.

### What a shift moves — and what deliberately doesn't

A shift that moved only the dates would leave every note behind on the old calendar date, silently
detached from the phase it was written for. `shiftCalendar` therefore also re-keys the week-keyed
stores (`userNotes`, `noteColors`, `hiatusTexts`, `hiatusColors`) and nudges `monthCursor`.

| Stays put | Why |
|---|---|
| Union holidays | Real calendar dates. Because Production is a day-level sim, shifting by exactly 7 days can move its **wrap** by more or less than 7 — the tools report the resulting wrap for this reason. |
| All-phase hiatuses with **Lock in place** checked (the default) | A winter break belongs to Christmas, not to the schedule around it. The four built-in defaults are all winter breaks. Uncheck to let one travel. |
| Notes carrying a **date** | A dated note is *about* that day. Month-view day notes and `mvExtraLanes` stay for the same reason. |
| Per-phase hiatuses | These **do** travel — they belong to their phase's work, and move with it as a unit. |

> ⚠️ Two notes can land on one week (an undated note shifted onto a dated one's week).
> `shiftKeyedMap` lets **stayers claim their keys first** and arrivals **merge**; whichever wrote
> second used to silently delete the other. A shift must never lose text.
>
> ⚠️ `noteColors` keys off the same week as its note and must make the same stay-or-go decision,
> so the pinned-week set is computed **once, before anything moves**.

### The two solvers

- `startForWeeksEndingAt()` is the **exact inverse of `extendEndForHiatus()`**: it walks
  back from an exclusive end counting only non-paused weeks, so a phase straddling a hiatus starts
  earlier rather than losing weeks.
- Production has **no week count** — its span is a day-level walk over weekends, hiatus days and
  enabled union holidays, so the same shoot occupies a different number of weeks depending on where
  it lands. `productionStartEndingBy()` therefore **asks the real scheduler** rather than
  inverting it: `productionEndFor()` sets the field, calls `computeSchedule(readState())`
  directly (no render), reads the segment end, and restores the field.
  > ⚠️ It searches from the latest candidate **backward**, deliberately not forward until it stops
  > fitting. A later start is not always a later finish: a shoot beginning just before a long hiatus
  > is pushed out by it, while one a week later starts *after* it and can finish sooner — so a
  > forward scan can settle on a local fit and miss the answer.
- `workForwardsFrom` uses **neither** solver: it writes a start, recomputes, and reads the real
  segment end before placing the next phase, so Production's sim is honoured for free.
  > ⚠️ It must chain off the last phase actually **placed**, not the previous entry in the
  > sequence. Those differ whenever a phase is skipped for having no week count, and chaining off
  > the sequence position meant one unused phase in the middle broke every phase after it.

### Phase order for a rebuild

`phaseSequence()`: built-ins keep their canonical `PHASE_CHAIN` order — it is the app's
own model of the sequence and works with **no dates entered at all**. A custom phase has no place
in that chain, so it is slotted by the date it currently sits on; an undated custom phase goes last.

---

## 8. Save / restore

> **Rewritten at v1.1.0 (`eae849e`).** Everything before that commit described a single format
> where Save wrote a complete copy of the app. That is now one of two formats and no longer the
> default.

### Two formats, two jobs

| | **`.sptcal`** — the calendar | **`.html`** — a shareable copy |
|---|---|---|
| Contents | `captureSnapshot()` as pretty JSON | the whole app, with the state in it |
| Size | **~4.5 KB** | KB |
| Written by | Save, Save As, autosave (`buildSavedData`, 7300) | File ▸ *Export shareable copy…* (`buildSavedHtml`, 7311) |
| For | working — opening, editing, saving | emailing a double-clickable app to someone |

**Why the split.** Save and Open were never symmetric: Save wrote a runnable copy of the app, but
Open never read it — it lifts the JSON out and replays it into the **running** app, so the old
file's HTML, CSS and JS is never parsed and never executed. Measured on a 10-episode calendar:
**729,172 bytes of which 3,238 (0.44%) was the data**, and 44.5 KB of the rest was the rendered
grid, serialized out of the live DOM and then regenerated from state on load and thrown away.
A save is now **155–168× smaller**.

### One reader, forever

`parseCalendarText(text)` (7352) is the **only** thing that reads a calendar file. It returns
`{format:'data'|'html', snapshot}` or `null`:

- text starting with `{` → the file **is** the snapshot;
- anything else → the original `<script id="saved-state">` regex.

Both converge on `applyStateSnapshot()` → `refreshAfterRestore()`, so there is no migration that
can be got wrong. The `format` is part of the return because the caller acts on it: opening a
legacy `.html` raises a dismissible strip recommending *Save as .sptcal* (`showLegacyNotice`,
8226). **Recommend, never convert** — plain Save writes back in whatever format the file already
is (`handleIsLegacyHtml`), so nothing changes format without being asked.

**This is a permanent contract.** Every calendar saved before v1.1.0 is an `.html` sitting on
someone's machine, and a file that stops opening is a production plan destroyed. See the
*"⛔ Every saved calendar must keep opening, forever"* rule in `CLAUDE.md`, and §11 for the
fixture that proves it.

### The share format's details

`buildSavedHtml()` serializes a **clone** of the document, so the live page is never mutated. The
clone drops `#table-wrap`, `#print-root` and any body-level popover before serializing — all
regenerated on load, and a stray popover would otherwise export as a panel hanging over the
calendar pointing at nothing. `<` is escaped to `\u003c` in the state block so user text
containing a closing script tag can't truncate the file.

**`reflectFieldsToAttributes()` exists because `outerHTML` serializes *attributes*, not live DOM
property values** — form fields must have their values written back to attributes first. It is
now only needed by this path.

### Snapshot versioning

`captureSnapshot()` stamps `version: SNAPSHOT_VERSION` (currently 1). Nothing branches on
it yet; it exists so a future migration can ask which app wrote a file instead of sniffing for
individual keys, which is what `migrateHolidayViewKeys()` and `normalizeRegionSelection()` have
both had to do. **Snapshots with no `version` key must keep opening** — that is every file written
before v1.1.0.

### Files, autosave and the picker

File handles are kept in **IndexedDB** (`spt-planning-cal` / `handles`) as a recents list, so a
reopened calendar can write back in place after one permission click. `suppressDirty` gates
dirty-tracking during load/restore; `markDirty()` schedules an IndexedDB backup and the 10-minute
autosave.

> ⚠️ **The first save always opens the save picker, and autosave can never reach that path.**
> `showSaveFilePicker()` requires a user gesture — calling it from a timer throws — and writing a
> calendar to a location the user never chose is exactly what the picker exists to prevent. When
> autosave finds unsaved work with no linked file it sets `autosaveNeedsFile` and the status line
> says *"Autosave needs a file — click Save"*. Work is not at risk meanwhile: `writeBackup()` has
> been keeping a rolling IndexedDB copy since three seconds after the first edit. **Do not "fix"
> this by having autosave pick a location.**

`markClean()` runs as soon as the bytes are on disk, **before** the `recordRecent()` IndexedDB
round-trip. Doing it after left the status line saying "unsaved" for as long as IDB took —
measured at 1.2 s, long enough for an autosave tick to fire a second redundant write.

**Consequence that still holds for the `.html` format:** a shareable copy carries the app code
from whenever it was exported, so it keeps the bugs it was exported with. When someone reports
something already fixed, ask which file they are in. `.sptcal` does not have this problem — it is
always opened by current code, which is most of the point.

### Restoring: one path, three callers

`applyStateSnapshot(snap)` applies a snapshot to the live document;
`restoreSavedState()` is a thin wrapper that parses the embedded block and calls it.
Afterwards, **`refreshAfterRestore()` must run** — it re-reads the calendar into the UI
(`setSidebarTab`, `syncRegionTracking`, `refreshEpisodesUI`, `refreshSimPostUI`, `update`).

> ⚠️ The three restore paths — initial page load, opening a file, recovering a backup — each used
> to keep their **own hand-maintained copy** of that refresh list, and they drifted. Opening a file
> never called `refreshEpisodesUI()`, the only thing that hides the "Complete Show Info" notice
> and renders the episode rows, so opening a complete calendar restored every field correctly and
> left the *previous* calendar's stale warning on screen with an empty episode list. Keep
> `refreshAfterRestore()` as the single list.

Restore is **replace, not merge**: `dayNotes`/`userNotes` are cleared before repopulating.
Merging left behind entries the incoming snapshot didn't have — stale after an undo step, or leaked
in from a previously open file.

### Undo / redo and Cmd+S

Undo/redo are whole-state snapshots of `captureSnapshot()`, held as **JSON strings** so a later
in-place mutation of e.g. `userNotes` can't retroactively corrupt an already-pushed step.

- Pushes are **debounced** ( ms) off `markDirty()`, because `update()` runs on every
  keystroke — otherwise a typed date would be a dozen undo steps.
- **Discrete actions bypass the debounce**: every toolbar tool wraps itself in
  `pushUndoSnapshot()` either side of the change, so one click is always exactly one undo step.
- `resetUndoHistory()` runs whenever a different document replaces what's on screen.
- Applying a step calls `refreshAfterRestore()`, not a bare `update()` — an undo that changed
  the episode count otherwise put the field back and left the old episode rows on screen.
- **Cmd+S** calls the Save button's own click handler (not `saveToFile()` directly) so it keeps
  the in-flight guard, the flash, and the error handling. `saveToFile()` already means "picker if
  no handle, write in place otherwise".
- Cmd+Z / Cmd+Shift+Z are skipped while focus is in an `input`/`textarea`/contenteditable, so
  the browser's own in-field undo still works there.

---

## 9. Exports

### Excel (`exportExcel()`

Builds an ExcelJS workbook directly with explicit column widths, merges, and ARGB fills.
`computeBlockLayout()` / `computePhaseRowLayout()` compute the column-slot
assignment — **the same layout logic backs the on-screen waterfall**, so changes there affect
both.

> ### ⚠️ Excel caps a header/footer string at 255 characters IN TOTAL (not per `&L`/`&C`/`&R` section).
> One character over and the file still writes and still parses as valid XML, but Excel refuses
> it on open with *"We found a problem with some content… Do you want us to try to recover as
> much as we can?"* — which looks like corruption, not a too-long header.
>
> A real calendar hit this at exactly **256** characters. The export now enforces the limit
> (`HF_MAX` by dropping trailing detail lines (right-hand stats before centre subtitles,
> never a block's first line), with a backstop that shaves the longest remaining line inside its
> own text so it can't cut through an `&` control code.
>
> Note the three `&B&12&"Calibri,Bold"` prefixes cost **60 of the 255** on their own, leaving
> only for actual text.

### PDF

- **Month PDF** (`exportMonthPdf()` — still goes through the browser: renders every month
  into `#print-root`, adds `body.printing-calendar` (a print stylesheet hides everything else),
  calls `window.print()`.
- **Waterfall PDF** (`buildWaterfallPdf()` → `exportWaterfallPdfDirect()` — **writes
  the PDF bytes directly. No print dialog.** lines: TrueType subsetting from the embedded
  Carlito (`ttfRead` 9140, `ttfGlyph`, `ttfAdvance`, `ttfTextWidth`), `/FontFile2` embedding,
  WinAnsi encoding, xref table, Flate compression via `CompressionStream` (`pdfDeflate`), assembled
  by `pdfSerialize` (9285). `WF_PDF_MODE = 'direct' | 'print'` selects it; the old print path is
  kept as the fallback.

  Orientation comes from `sheetPageOrientation()` — **the same rule the Excel export
  uses**, so the workbook and the PDF turn the page the same way. That divergence was a real bug.

> ### ⚠️ Always clear `body.printing-*` and `#print-root` before starting a print.
> A stuck class hides the entire app and makes the next print silently do nothing. Cleanup is
> bound to `afterprint` with a 60 s safety net — a stubbed `window.print()` in a test must
> `dispatchEvent(new Event('afterprint'))` or it looks stuck forever.

---

## 9a. The shared column model (the through-line of the 2026 work)

The app once had **three independent column-width systems** — screen, Excel, PDF — that could
never agree, and that, not the rendering, is why the PDF never looked like an Excel print.
They are now one:

```
sheetColumnWidths()  → Excel char units, measured with a real canvas
        ├─ screen    → <colgroup> + table-layout:fixed
        ├─ Excel     → column widths directly
        └─ PDF       → the same numbers read as points
```

**The constants, all frozen (§2a), at line 2309:**

| | | |
|---|---|---|
| `EXCEL_MDW = 7` | **not 7.4336** | Excel floors max-digit-width. The true Carlito advance yields columns ~6% narrower than Excel's autofit. |
| `SHEET_ZOOM = 0.75` | | The screen renders 11 px type where Excel uses 11 pt, so screen px and Excel points are numerically the same. `charsToScreenPx()` serves both the screen and the PDF. |
| `EXCEL_CELL_PAD = 5` | | Total cell padding budget. **3.75 px at `SHEET_ZOOM`.** Any CSS rule spending more silently ellipsis-clips. |
| `COL_PAD_CHARS = 1.15` | | Breathing room. Belongs *here*, where both outputs get it equally. |
| `ROW_DEFAULT_PX = 20` | | Every row starts here. Text is fitted to the row, never the row grown to the text. |

Every width goes through `px = trunc(chars × 7) + 5`.

**Carlito is metric-compatible with Calibri** — verified, not assumed: both give `"0"` an advance
of 1038/2048 em, and a 155 px string measures identically. That is what lets an embedded
open-licence font stand in for Calibri without the model drifting, and why the font is inlined
(§2) rather than fetched.

**`computePhaseRowLayout()`** is the matching single source for *which phase occupies which
column in a given week*. Four consumers call it — screen, PDF writer, `sheetColumnWidths()`, Excel
export — so a layout change lands everywhere at once. Keep it that way.

### Direct manipulation on the grid

- **Drag columns and rows to resize** (`installGridResizers`. Row drags **snap** to the
  default and to any height already set on another row (4 px); the handle turns green while it
  holds. Double-click means "back to automatic".
- **Cell spans** (`beginSpanDrag`; `applyCellSpanOverrides` — drag a cell's edge
  across the empty columns beside it; double-click to fill or un-fill.
- **Text fitting** (`cellTextFit` — **row height decides how many lines a note gets**, plus
  a per-note font size. Shrink-to-fit for notes, phase labels and hiatus bands.
- **Phases running at the same time divide the width evenly** — two take half each, three a third.
  All phase columns within a year block share one width; columns differing by 15% make an even
  split read as a mistake.
- **The preview never jumps**, and it takes **two** mechanisms, not one:
  1. `captureScroll()` / `restoreScroll()` wrap every render. Inner scroll
     containers are remembered by element id; the **window** is anchored to *where the grid sits
     on screen* — `getBoundingClientRect().top` of `#sheet-scroll-container`, falling back to
     `#table-wrap` (the month view has no sheet scroller) — and put back as a **delta**, not an
     absolute `scrollY`. Restoring the old `scrollY` faithfully is the jump, not
     the cure: sidebar rows appear and disappear above the grid (a new hiatus row, the province
     selector when the region becomes Canada), so the same scroll number puts the grid somewhere
     else on screen. A delta also agrees with Chrome's own scroll anchoring instead of fighting it
     — where anchoring already held the view still, `dy` is 0 and nothing happens.
  2. A separate **capture-phase** `pointerdown`/`change`/`input` listener scoped to
     **`.form-panel`**. Sidebar handlers rebuild their rows *first* and call `update()` afterwards,
     by which point the grid has already moved and the snapshot inside `update()` reads the moved
     position as correct. Taking the anchor on the event itself, before any handler runs, is the
     only way to catch those. ⚠️ It is scoped to the sidebar **deliberately** — events in the grid
     must not be second-guessed, because scrolling a clicked cell into view is exactly what should
     happen there.

> ⚠️ `table-layout: fixed` **scales declared widths to the table's width**. Widening one column
> without also updating the table's explicit width just steals room from every other column, and
> the dragged one never reaches the size asked for. That was the entirety of "the dragging feels
> weird."

---

## 10. Development process (how this project is actually worked on)

### Workflow

1. **Make the change** in `index.html`.
2. **Verify it in a real browser** — never claim it works from code reading alone. The owner
   expects evidence.
3. **Report what was verified**, with concrete before/after values.
4. **Wait for an explicit "commit and push."** The owner gates every deploy. Committing locally
   while waiting is fine and expected; pushing without being asked is not — `main` auto-deploys
   to a public site.
5. **Push → GitHub Pages redeploys** (~40 s). Verify the live URL actually serves the change.

### Owner's preferences (learned over the project)

- Wants to **test locally before deploying**; will often say "I want to test it before I push."
- Says **"commit and push"** (or "push and ship") explicitly when ready. Honour that gate.
- Wants **honest reporting** — if something wasn't verified, say so. Corrections are welcomed
  (e.g. the "US is uniform nationally" claim was wrong and needed retracting).
- Prefers **discussing design before building** for anything substantial ("explain to me exactly
  how X will work before you build it"). Mockups help.
- Pushes back usefully — if the owner questions a finding, re-examine it rather than defending.

### Commit style

Long, explanatory commit messages: **what changed, why, what was verified**, and the bug history
where relevant. Look at `git log` for the established tone. Every commit ends with:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

(Match whatever model is actually doing the work.)

### Code comment style

The codebase comments explain **why** — bug history, browser constraints, the failure that
motivated the code — often at length. **Match that style** when the reasoning is non-obvious,
and **keep existing explanatory comments intact** when editing nearby. These comments are the
project's real documentation.

---

## 11. Testing methodology (no test framework — use headless Chrome)

There is no test runner. The reliable pattern is a **throwaway static server that injects a test
script**, driven by headless Chrome with `--dump-dom`, writing results into a `<pre>` that gets
parsed back out.

```js
// /tmp/testsrv.js — serve index.html with a test script injected
const http=require('http'), fs=require('fs'), path=require('path');
const ROOT='/Users/apple/Downloads/Calendar Builder';
const INJECT=`
<pre id="R">pending</pre>
<script>
window.addEventListener('load',function(){setTimeout(function(){
  var out={};
  function set(id,v){var e=document.getElementById(id);if(!e)return;e.value=v;
    ['input','change'].forEach(function(t){e.dispatchEvent(new Event(t,{bubbles:true}));});}
  try{
    set('show-title','T'); set('shoot-days-per-ep','10'); set('num-episodes','10');
    set('start-production','2026-01-05');
    set('union-country','US'); set('union-usregion','US-GEN');
    out.wrap = (Array.from(document.querySelectorAll('table.sheet-table td'))
      .find(function(x){return /Principal Photography Wraps/.test(x.textContent||'');})||{}).textContent;
  }catch(e){ out.EX=e.message; }
  document.getElementById('R').textContent=JSON.stringify(out,null,1);
},1000);});
</script>`;
http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html';
  fs.readFile(path.join(ROOT,p),(e,d)=>{
    if(e){r.writeHead(404);r.end('nf');return;}
    let o=String(d); if(q.url.includes('test')) o=o.replace('</body>',INJECT+'</body>');
    r.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});r.end(Buffer.from(o));
  });
}).listen(8190,()=>console.log('8190'));
```

Then:

```bash
node /tmp/testsrv.js & sleep 2
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-sandbox --user-data-dir=/tmp/tc --virtual-time-budget=8000 \
  --dump-dom "http://localhost:8190/index.html?test" > /tmp/out.html
# then grep the <pre id="R"> block out of /tmp/out.html
```

### Practical gotchas with this harness

- **`grep` on `index.html` often fails** (very long lines). Use `node -e` with `readFileSync`
  and split on `\n` instead.
- **Use a fresh port each run** — `EADDRINUSE` silently yields a bogus page that looks like a
  test failure. Always `pkill -f` old servers first and check the server actually started.
- **Kill stale Chrome:** `pkill -9 -f "Google Chrome.*headless"`, and use a unique
  `--user-data-dir` per run.
- **`timeout` doesn't exist on macOS** by default.
- **Closure scope:** app functions live inside one big script and are NOT globals. To trigger an
  export from a test, **click the button** (`document.getElementById('export-btn').click()`),
  don't call `exportExcel()`.
- **To capture an exported file**, monkey-patch `URL.createObjectURL` to grab the Blob, then
  base64 it into the DOM and decode locally. Also stub `HTMLAnchorElement.prototype.click` so the
  download doesn't fire. You can skip the round trip to disk entirely: `DecompressionStream
  ('deflate-raw')` will inflate the .xlsx entries in the browser, and `DOMParser` will tell you
  whether each part is well-formed.

### Saved fixtures (`tests/fixtures/`)

There is still no runner, but there are now **real files to test the restore path against**, which
matters because synthesised ones only reproduce your own assumptions.

- **`tests/fixtures/v1.0.0-saved.html`** — a genuine pre-`.sptcal` calendar, produced by serving
  the **v1.0.0 build itself**, typing a calendar into it, and clicking Save. 760,003 bytes, 27
  snapshot keys, **no `version` field**, grid baked in. Opened in current code it restores every
  field and a 154-cell grid identical to the one it was saved from.
- **Cut a new fixture every time a version is cut**, alongside the tag and the `releases/` copy.
  Fixtures are only worth having if they keep pace with the formats in the wild.

> ⚠️ **A round-trip test that reads its own output proves almost nothing.** The first `.html`
> compatibility test used an `.html` generated by *current* code — which already had the `version`
> field, was already built from a clone, and already had no baked grid. It showed the new code
> could read itself, not that it could read what is out in the world.

Edge cases worth keeping in any restore test: `releases/v1.0.0.html` itself (the app, whose state
block is the literal `null`) must be **rejected**, not opened as an empty calendar; and garbage,
empty text, malformed JSON and HTML with no state block must all be rejected without throwing.

### ⚠️ Every test must build its own fixture

The single most expensive mistake made in this project's testing. Reusing state between cases
means **an action that happens to be a no-op creates no undo step** — so the next `undo` in the
test pops the *test's own setup* instead, and every later assertion cascades into a false failure.
One session lost eight assertions to this and briefly "found" a non-existent undo bug. Reset the
fixture at the top of each case, and wait ~1.5 s after building it so the debounced undo pushes
settle before you start measuring.

### False failures: things that look like bugs and are not

Each of these produced a wrong "FAIL" during a full-systems sweep. Check them before believing a
result.

| Symptom | Actual cause |
|---|---|
| Waterfall rows look out of chronological order | The waterfall renders as **two side-by-side blocks**; a row carries two date cells. Attribute each label to the nearest preceding date cell *in the same row*, then sort by date. |
| `Post wk 1` found where it shouldn't be | It matches **inside** `Simultaneous Post wk 1`. Strip `/Simultaneous Post wk \d+/` first, or anchor on `^`. |
| Month-view note editor "missing" | It is a popover with id `mv-note-pop` appended to **`body`**, not a child of the day cell. |
| Excel header measures 320 > 255 | That is the **XML-escaped** length; `&amp;` is 5 characters for 1. Unescape before measuring — the real string was 237. |
| PDF leaves `body.printing-*` stuck | Cleanup is bound to **`afterprint`** (with a 60 s safety net). A stubbed `window.print()` must `dispatchEvent(new Event('afterprint'))` or it looks stuck forever. |
| Re-enabling holidays doesn't restore the schedule | The holiday list **re-renders on every change**, so a captured checkbox array is detached. Re-query `#holiday-vis-list input.hv-en` on each iteration. |
| A holiday doesn't appear in the waterfall | Holidays default to **month-view only**. Each row has three boxes: `hv-en` (counts against the schedule, on by default) plus two `hv-cb` for per-view display — sheet **off**, month **on**. |
| Region change silently ignored | Once any note/holiday/hiatus edit exists the region **reverts** rather than being `disabled`. Test on a fresh fixture with no edits. |

### Validating an exported .xlsx

```bash
mkdir x && cd x && unzip -q out.xlsx
for f in $(find . -name "*.xml"); do xmllint --noout "$f" || echo "FAIL $f"; done
```
Then check, in order of likelihood: **header/footer length ≤ 255**, overlapping merged ranges,
column widths ≤ 255, style indices < `cellXfs count`, control characters in `sharedStrings.xml`.

### Verifying a deploy

```bash
node -e "const https=require('https');
https.get('https://greicher1.github.io/planning-cal-builder/?t='+Date.now(),r=>{
  let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d.includes('SOME_MARKER')));});"
```
GitHub's CDN can serve a stale copy for a minute — cache-bust with a query string, and tell the
user to hard-refresh (Cmd+Shift+R) or use Incognito.

---

## 12. Bug history & traps (things already learned the hard way)

- **Excel "corrupt file" alert** = the 255-char header limit, not real corruption. See §9.
- **Waterfall PDF printed 2 pages**: `width:fit-content` let columns reflow narrower, wrapping
  text and making the real height exceed the measured height. Fixed by pinning the wrapper to the
  measured width plus a height safety factor.
- **Phase columns spanning wrongly**: occupancy tracked *weeks* rather than *phase identity*.
  Fixed with per-occupant-key tracking.
- **Victoria Day is the Monday STRICTLY before 25 May.** When 25 May is itself a Monday (2026),
  Victoria Day is 18 May, not 25 May. Easy off-by-one.
- **A "download gateway"** (forcing users to download rather than run the hosted app) was built
  and then **reverted** — it broke for anyone who had installed the PWA, because an installed app
  loads the hosted URL and got gated. It lives in history at `ffadc6d` if ever revisited; the
  installed-PWA fix was started but never finished.
- **Button height inconsistency**: `button.primary` (specificity 0,1,1) overrode `.tb-btn`
  (0,1,0). Fixed with `:not(.tb-btn)`.
- **The app's `holidayView` checklist used to be display-only.** It now has an Enable column that
  genuinely changes the schedule — don't confuse the two.
- **Repairing an already-saved calendar** requires patching the code inside that `.html` file,
  because saved calendars embed the app. This was done for a user's file by string-replacing the
  affected function and writing a `(Excel fix)` copy — the original was left untouched.

### Traps from the column-model and save-format work (2026)

- ### ⚠️ THE WIDTH-UNIT TRAP — `EXCEL_MDW` IS 7, NOT 7.4336
  Carlito/Calibri's `"0"` genuinely advances **7.4336 px** at 11 pt, and Excel **floors** max
  digit width to **7**. Dividing measured text by the *true* advance gives columns ~6% narrower
  than Excel's autofit, and because every width in the app flows through
  `px = trunc(chars × 7) + 5`, that 6% lands in the screen grid, the workbook **and** the PDF at
  once. The measured-looking number is the wrong one. See §9a.
- **A 53-Monday year leaves a trailing blank strip.** A table row is one row of *every* year block
  at once, so the grid is as tall as the longest block — and years differ: 2029 has 53 Mondays
  (both 1 Jan and 31 Dec fall on one) where 2026–2028 have 52. The 53rd row is blank in every
  other block, and if nothing is scheduled that week it is blank everywhere. `sheetRowCount()` drops trailing rows that are content-free in **every** block. ⚠️ It deliberately does
  **not** touch full-year padding: a year whose work ends in September still shows its remaining
  weeks, because those rows carry content in some *other* block. Only a row empty everywhere goes.
- **64 of 255 filled cells were silently ellipsis-clipped**, then later 9 of 52 date cells — both
  times because a CSS rule spent more padding than the width model budgets (§9a). Invisible
  without counting. **Any change near cell CSS needs a clipped-cell count as its gate.**
- **ExcelJS omits `<col>` when `width === 9`**, so the Date column's width never took effect.
- **The workbook and the PDF disagreed about page orientation** on a 3-block calendar, until both
  were made to call `sheetPageOrientation()`.
- **Excel dropped hard line breaks in notes** — `wrapText` was only set at the shrink floor.
- **Excel writes alignment into `styles.xml`, not `sheet1.xml`.** Reading `wrapText` from the
  wrong part produced a confidently wrong test result.
- **`sips` renders a PDF's CropBox; the Read tool renders its MediaBox.** Comparing an app PDF to
  a reference with a CropBox needs a **byte-length-preserving** rewrite, or every xref offset
  breaks.
- **Compositing a transparent PDF page onto black** instead of white produced an "all black page"
  that was the measurement, not the PDF.
- **`requestAnimationFrame` does not fire while the browser pane is hidden.** Front the pane before
  measuring anything that depends on it, or the whole run is meaningless.
- **Three "scroll jump" failures were Chrome's scroll anchoring working correctly** — `scrollY`
  changed while the view held still. Comparing scroll numbers lied; comparing where a given week's
  row sat on screen told the truth. Measure what the user perceives.
- **The save status lagged the save** by the duration of an unrelated IndexedDB round-trip,
  because `markClean()` ran after `recordRecent()`. Long enough for autosave to fire a second
  redundant write. See §8.
- **A round-trip test that only reads its own output proves nothing about old files.** The first
  `.html` compatibility test used an `.html` generated by *current* code — already versioned,
  already clone-built, already grid-free. The real fixture had to be generated by running the
  **v1.0.0 build itself**. See §11.

### Traps added while building the adjustment tools

- ### ⚠️ `SIM_KEY` IS DELIBERATELY NUL-PREFIXED — never run a blanket control-character sweep
  over `index.html`.
  `const SIM_KEY = '\u0000simpost'` uses a NUL prefix so the simultaneous-post pseudo-key can
  never collide with a real phase key. A sweep that stripped "stray" control characters silently
  changed it to `'simpost'`; it was caught by diffing against `HEAD` and restored byte-for-byte.
  Verify with code points, not a string literal — a NUL cannot be reliably authored in a script.
- **Restore paths drift.** See the `refreshAfterRestore()` warning in §8. Symptom was a stale
  "Complete Show Info" notice and an empty episode list after opening a saved file.
- **`collectFieldValues()` excludes transient UI by CLASS, not id.** It was `#tools-menu`; the
  restructure to one popover per tool killed that id and the tool fields silently started being
  saved again *and* adding phantom undo steps (undo needed two presses).
- **A shift could silently delete a note.** Collisions merge now — see §7a.
- **"Ends by" must floor, not round.** Aligning to the nearest week landed a 10/05 deadline on
  10/11, six days *late*. A deadline is one-sided.
- **`markDirty()` was missing** from `commitActiveNoteEditor()` and the waterfall header
  `focusout` — waterfall note and header edits were invisible to the dirty indicator *and* to
  undo. Anything that mutates state must call it.
- **CSS specificity:** `input[type=date]{width:100%}` (0,1,1) out-specifies a bare class (0,1,0).
  A `.tools-date-fixed` class lost, the date input took the whole row, and the phase dropdown
  beside it collapsed to 18 px. Use `.tools-menu input[type="date"].tools-date-fixed`.
- **Regression tests must build their own fixture per case.** Reusing state meant a solve that
  happened to be a no-op created no undo step, so the next `undo` popped the *test's own setup*
  and eight later assertions cascaded into false failures. See §11.
- ### ⚠️ Month grid rows run SUNDAY–Saturday; schedule weeks are MONDAY-based.
  `gridStart` backs up to the Sunday on/before the 1st, so `mondayOf(weekStart)` on a row's own
  Sunday returns the Monday of the *previous* week — the week that ended the day the row starts.
  This drew every Simultaneous Post band a week late, and the first sim-post week never appeared in
  the month containing it. A row's working days are Mon–Fri, so look up from `addDays(weekStart, 1)`.
  The same skew still exists (deliberately) in the `mvExtraLanes` key: it is only ever compared
  against itself and is persisted, so re-deriving it would orphan saved lanes.

---

## 13. Pending / discussed but not built

**New Calendar intake screen** — agreed in design, not implemented:

- **One screen** (not stepped), shown as a **modal over the app**.
- Collects: show title + season, episodes × days-per-episode, and **Production Region** (the
  whole point — Region is the most consequential field and is otherwise undiscoverable now that
  it lives in Settings).
- **No anchor date**, no phase dates (those need the live waterfall), no holiday customization.
- Must be **skippable** and never blocking; add a quiet empty-state hint for anyone who skips.
- ⚠️ **Must never appear when opening a saved calendar** — trigger off "no saved state AND no
  fields filled", not merely "page loaded". A *shareable copy* is a copy of the app, so getting
  this wrong greets every one of them with a setup form.
- Also triggered by the existing **New** button.

**Explicitly deferred:** an imported "holiday pack" format and a server-side/admin authoring UI.
Judged unnecessary while the tool is still pre-release with no external users. If revisited: a
static `admin.html` that authors holiday rules and exports a pack is the recommended approach —
**not** a live API, which would break offline use and risk silently shifting dates under already-
saved calendars. Holiday data must never auto-update into an existing calendar.

**Not yet done:** non-holiday settings (export options, defaults) in the Settings tab — the owner
asked to hold off on those.

> **This section is no longer the live list.** [`HANDOFF.md`](HANDOFF.md) §2 is what has been asked
> for and not yet delivered, and **§8 is the sequenced build order** across all of it — the docs
> refresh, PWA update delivery, `.sptcal` encryption, the Settings menu, the Mantine stages, the
> notes columns and the PDF calibration, with the owner decisions each is gated on. Read that
> before planning work; this section is kept for the design detail it records.

### Decisions taken and deliberately not revisited

- **New Calendar intake screen: declined for now.** Asked again after the toolbar work; the owner's
  answer was to keep the app as is. The design above stands if it is ever picked up.
- **The toolbar wraps to two lines below 1280 px window width.** Measured, accepted. It never
  overflows or clips (tested to 900 px) — it just goes to 75 px tall. Shortening the labels or
  collapsing them to icons was considered and rejected as worse.
- **`Close all gaps` is redundant** — it is Rebuild-forwards from the first phase at its current
  date. Kept anyway as the zero-input, one-click case, the same justification as the toolbar arrows
  next to Shift All.
- **Result-message verbosity is intentionally uneven.** The toolbar arrows show a terse chip
  (`1 wk later · wrap 05/01/26`); the popovers give the full sentence including the locked-hiatus
  count. The arrows are a quick nudge and that count is almost always "all of them".
- **`bc2fc2d` has a wrong `Co-Authored-By` trailer** (says Sonnet 5; the work was Opus 5). Left
  alone — it is pushed, and fixing it means rewriting public history.

---

## 14. The line-number map — the ONE place numbers live

Everywhere else in these docs names the **symbol only**, deliberately. These numbers were once
scattered through the prose in ~107 places, and twice in a single day one commit to `index.html`
invalidated nearly all of them (the second time, 104 of 107) — any insertion shifts everything
below it. **A wrong line number is worse than none:** it reads as precision and sends you to the
wrong function. So prose names symbols, which `grep -n` always finds, and the numbers live here.

⚠️ **These go stale on any edit to `index.html`.** Verify or regenerate with:

```bash
python3 tools/check-refs.py
```

| Symbol | Line |
|---|---|
| `<style>` block | 21 |
| The saved-state block (ships empty) | 993 |
| Embedded Carlito (2 weights, base64) | 1483 |
| ExcelJS CDN tag | 2262 |
| Main script (one IIFE) | 2264 |
| `APP_VERSION` | 2275 |
| `EXCEL_MDW` | 2341 |
| `cellTextFit` | 2439 |
| `installGridResizers` | 2483 |
| `beginSpanDrag` | 2699 |
| `measureTextPx` | 2894 |
| `charsToScreenPx` | 2909 |
| `PHASES` | 2921 |
| `SHEET_GRIDLINES` | 2937 |
| `WF_PDF_MODE` | 2941 |
| `GRID_TEXT_COLOR` | 2954 |
| `HOLIDAYS` | 2985 |
| `autoNotesText` | 3435 |
| `effectiveNoteText` | 3443 |
| `holidaySlug` | 3465 |
| `migrateHolidayViewKeys` | 3476 |
| `fullHolidayList` | 3496 |
| `readState` | 3532 |
| `computeSchedule` | 3591 |
| `extendEndForHiatus` | 3618 |
| `simulateProductionSchedule` | 3642 |
| `addNote` | 3890 |
| `captureScroll` | 4316 |
| `restoreScroll` | 4332 |
| `render` | 4383 |
| `renderMonthView` | 4683 |
| `renderSpreadsheetView` | 5220 |
| `notesColspan` | 5229 |
| `openNoteEditor` | 5545 |
| `exportExcel` | 5830 |
| `setSidebarTab` | 6208 |
| `computeBlockLayout` | 6321 |
| `computePhaseRowLayout` | 6428 |
| `applyCellSpanOverrides` | 6534 |
| `sheetRowCount` | 6613 |
| `sheetPageOrientation` | 6656 |
| `sheetColumnWidths` | 6669 |
| `update` | 6831 |
| `normalizeRegionSelection` | 6855 |
| `effectiveRegionKey` | 6867 |
| `reflectRegionUI` | 6881 |
| `autostartPhase` | 6960 |
| `syncRegionTracking` | 7059 |
| `reflectFieldsToAttributes` | 7272 |
| `collectFieldValues` | 7299 |
| `buildSavedData` | 7332 |
| `buildSavedHtml` | 7343 |
| `parseCalendarText` | 7384 |
| `SAVE_EXT` | 7421 |
| `SNAPSHOT_VERSION` | 7426 |
| `handleIsLegacyHtml` | 7438 |
| `captureSnapshot` | 7594 |
| `shiftCalendar` | 7808 |
| `phaseSequence` | 7943 |
| `productionEndFor` | 7972 |
| `productionStartEndingBy` | 7993 |
| `startForWeeksEndingAt` | 8038 |
| `workBackwardsFrom` | 8052 |
| `workForwardsFrom` | 8100 |
| `closeAllGaps` | 8150 |
| `showLegacyNotice` | 8258 |
| `openRecentFile` | 8318 |
| `openFileViaPicker` | 8365 |
| `exportMonthPdf` | 8944 |
| `buildWaterfallPdf` | 9378 |
| `exportWaterfallPdfDirect` | 9644 |
| `restoreSavedState` | 9968 |
| `refreshAfterRestore` | 9986 |
| `applyStateSnapshot` | 9999 |

## 15. Starting a fresh session — suggested first message

> This is the SPT Planning Calendar Builder, a single-file HTML TV production scheduling tool.
> Read `HANDOFF.md` first, then `CLAUDE.md`, then `PROJECT-CONTEXT.md` — in that order. The short
> version: the grid and the exports are permanently frozen and must not be touched; every calendar
> ever saved must keep opening; changelog substantial changes in `README.md`; verify in a real
> browser before telling me anything works; and never push to `main` without being asked for that
> specific push — it auto-deploys to a live public site.

In Claude Code all three files load automatically via `CLAUDE.md`, which points at the other two
in reading order. Keep them current — `HANDOFF.md` especially, in the same breath as the code.
