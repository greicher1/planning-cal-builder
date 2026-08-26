# SPT Planning Calendar Builder — Full Project Context

**Purpose of this document:** everything a fresh Claude session needs to work on this project
with no prior context. Pair it with the current `index.html` and you have the whole picture.

**Last updated:** at commit `218558b` (calendar tools: shift / anchor / rebuild, undo-redo, Cmd+S).

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

`index.html` is a **single self-contained HTML file** (~6,100 lines, ~380 KB). One `<style>`
block, static markup, one big `<script>` block.

**Do not split out CSS/JS or add local asset files.** This is load-bearing, not stylistic:

- **Saved calendars *are* copies of `index.html`** with the user's state baked into a
  `<script id="saved-state">` block. A saved calendar is a fully working copy of the app.
- The PWA manifest and all icons are inlined as `data:` URIs so the tool can be **emailed
  around as one file** and run offline from `file://`.

**The only external dependencies:** ExcelJS from a CDN `<script>` tag (line ~1003) and Google
Fonts. Everything else is inline.

**No build system. No package manager. No test framework. No server.**

**Run it:** `open index.html` on macOS, or serve the directory over HTTP. Reload to test.
Chrome/Edge are the target browsers — the File System Access API (`showSaveFilePicker`) and
IndexedDB handle persistence degrade to a plain download elsewhere.

---

## 3. Core data flow

Everything funnels through one cycle, driven by `update()` (line ~4315):

```
DOM inputs → readState() → computeSchedule(state) → render(schedule) → markDirty()
```

- **`readState()`** (~1591) reads every `#start-<key>` / `#weeks-<key>` field, hiatus rows,
  per-phase hiatuses, Show Info, and the region selectors.
  Note: once Show Info is complete (`showInfoStatus()`), **`episodes × days-per-episode`
  overrides** whatever was typed in the Production row, everywhere.

- **`computeSchedule(state)`** (~1650) is the heart of the app. Returns
  `{weeks, maxConcurrent, totalWeeks, segments, hiatuses, gaps, notesByIdx, productionInfo,
  phaseHolidays, error?}`. Each week carries its phase segments, hiatus flags, and auto-notes.

- **`render(schedule)`** (~2359) dispatches to `renderSpreadsheetView()` (waterfall, ~3165) or
  `renderMonthView()` (~2638) per `viewMode` (`'sheet' | 'month'`), plus the summary row and the
  holiday list in Settings.

### Deliberate scheduling behaviours (do not "fix" these)

- **Hiatuses PAUSE a phase, they don't consume its weeks.** `extendEndForHiatus()` (~1677)
  walks week-by-week and only counts non-hiatus weeks, so a phase always delivers its full
  requested span — the hiatus pushes its end date out. Overlapping hiatuses extend by the
  **union**, not per-hiatus.
- **Production alone runs a day-level simulation** (`simulateProductionSchedule()`, ~1701):
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

- **`effectiveRegionKey()`** (~4346) resolves country + sub-region to ONE `HOLIDAYS` key.
  The bare `US`/`CA` values are **never** keys.
- **`reflectRegionUI()`** (~4360) shows whichever sub-region row applies (UK has none).
- **`normalizeRegionSelection()`** (~4334) rewrites the legacy `CAN` value from pre-split saves
  and fills a missing sub-region with that country's default (`CA-BC` / `US-GEN`).
- **`syncRegionTracking()`** (~4538) re-baselines the change-guard after any programmatic
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

A holiday's id is **`slug(name)@year`** (e.g. `good-friday@2026`), produced by `holidaySlug()`
(~1524). It used to be the bare ISO date, which was fragile: switching region kept the date but
changed the holiday, so a per-holiday choice silently transferred to whatever now fell on that
day. With name-based ids a choice **follows the holiday** across region changes, and settings for
a holiday the new region lacks simply lie dormant.

`migrateHolidayViewKeys()` (~1535) rewrites old date-keyed entries on load.

### Enable / disable and custom holidays

- **`holidayOff`** — `hid → true` means the user switched that holiday OFF. Empty map = all on.
- **`customHolidays`** — `[{id, name, date}]`, the user's own single-day holidays. Ids are random
  (`cst-xxxxxxx`) so renaming keeps the settings. **Deliberately NOT region-scoped**, so a
  studio shutdown survives a region change. Always listed even when outside the current phases.
- **`fullHolidayList(regionKey)`** (~1555) merges the region's list with the custom ones and tags
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

`simPostLabel()` (~1025) centralizes the marker text so the waterfall, Excel export, and month
view can't drift apart.

### "Start after previous phase"

Each built-in phase except Writers Room has a small text button that fills its start date with
the week right after the nearest **earlier scheduled** phase ends, following `PHASE_CHAIN`
(~4427). Handles hiatuses two ways: the previous phase's end already accounts for hiatuses
*inside* it, and then `autostartPhase()` (~4439) steps past any hiatus at the boundary so the new
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

### Sidebar tabs

Three tabs: **Show**, **Phases**, **Settings** (`setSidebarTab()`, ~3944). Sections are
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
| `customPhaseDefs`, `episodeDefs` | dynamic rows |
| `phaseColorOverride` | per-phase colour overrides |
| `viewMode`, `sidebarTab` | UI position |

Added since: `locked` on each all-phase hiatus row (the "Lock in place" pin — see §7a), and the
undo/redo stacks, which are **not** persisted (history is per-session and reset on New/Open).

> ### ⚠️ Any new persistent state must be added in BOTH places or it silently won't survive a save:
> 1. the `captureSnapshot()` literal (~5176)
> 2. the matching branch in `applyStateSnapshot()` (~6942)
> 3. if it's a DOM field, `collectFieldValues()` (~4974) / `reflectFieldsToAttributes()`
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

- **Shift All / Shift From** — `shiftCalendar(weeks, fromIso)` (~5369). `fromIso` limits the
  move to weeks on or after a cutoff; that is Shift From. Earlier/Later is the direction of
  **travel**, not which side moves — both directions move the same set.
- **Anchor To** — measures the gap between a landmark and a target date, then calls
  `shiftCalendar` with that delta. It moves **dates, not phases**: a phase with a week count but
  no date is invisible to it. It never reads week counts to position anything.
- **Rebuild From** — `workBackwardsFrom` (~5584) / `workForwardsFrom` (~5632). Pins one date and
  recomputes one side to run consecutively, **writing** start dates including into empty fields.
- **Close all gaps** — `closeAllGaps()` (~5682), folded into the Rebuild From popover. It is
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

- `startForWeeksEndingAt()` (~5570) is the **exact inverse of `extendEndForHiatus()`**: it walks
  back from an exclusive end counting only non-paused weeks, so a phase straddling a hiatus starts
  earlier rather than losing weeks.
- Production has **no week count** — its span is a day-level walk over weekends, hiatus days and
  enabled union holidays, so the same shoot occupies a different number of weeks depending on where
  it lands. `productionStartEndingBy()` (~5525) therefore **asks the real scheduler** rather than
  inverting it: `productionEndFor()` (~5504) sets the field, calls `computeSchedule(readState())`
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

`phaseSequence()` (~5475): built-ins keep their canonical `PHASE_CHAIN` order — it is the app's
own model of the sequence and works with **no dates entered at all**. A custom phase has no place
in that chain, so it is slotted by the date it currently sits on; an undated custom phase goes last.

---

## 8. Save / restore

**Save writes a new complete HTML document**: `document.documentElement.outerHTML` with live
state serialized into `<script id="saved-state" type="application/json">` (line 750, ships as
`null`). `<` is escaped to `<` so user text containing a closing script tag can't truncate
the file.

On load, `restoreSavedState()` (~5905) parses that block and replays it: rebuilds custom-phase
and hiatus rows **first** (re-keying generated ids to the saved keys), then applies
`fields.byId`, then the in-memory maps.

**`reflectFieldsToAttributes()` exists because `outerHTML` serializes *attributes*, not live DOM
property values** — form fields must have their values written back to attributes before
snapshotting.

File handles are kept in **IndexedDB** (`spt-planning-cal` / `handles`) as a recents list, so a
reopened saved file can write back in place after one permission click. `suppressDirty` gates
dirty-tracking during load/restore; `markDirty()` schedules a localStorage backup and the
10-minute autosave.

**Consequence to remember:** a saved calendar carries the app code from whenever it was saved.
Fixing a bug in `index.html` does **not** fix already-saved calendars. To repair one, patch the
code inside that saved file (this has been done before — see §11).

### Restoring: one path, three callers

`applyStateSnapshot(snap)` (~6942) applies a snapshot to the live document;
`restoreSavedState()` (~6911) is a thin wrapper that parses the embedded block and calls it.
Afterwards, **`refreshAfterRestore()` (~6929) must run** — it re-reads the calendar into the UI
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

- Pushes are **debounced** (~500 ms) off `markDirty()`, because `update()` runs on every
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

### Excel (`exportExcel()`, ~3582)

Builds an ExcelJS workbook directly with explicit column widths, merges, and ARGB fills.
`computeBlockLayout()` (~4048) / `computePhaseRowLayout()` (~4155) compute the column-slot
assignment — **the same layout logic backs the on-screen waterfall**, so changes there affect
both.

> ### ⚠️ Excel caps a header/footer string at 255 characters IN TOTAL (not per `&L`/`&C`/`&R` section).
> One character over and the file still writes and still parses as valid XML, but Excel refuses
> it on open with *"We found a problem with some content… Do you want us to try to recover as
> much as we can?"* — which looks like corruption, not a too-long header.
>
> A real calendar hit this at exactly **256** characters. The export now enforces the limit
> (`HF_MAX`, ~3708) by dropping trailing detail lines (right-hand stats before centre subtitles,
> never a block's first line), with a backstop that shaves the longest remaining line inside its
> own text so it can't cut through an `&` control code.
>
> Note the three `&B&12&"Calibri,Bold"` prefixes cost **60 of the 255** on their own, leaving
> only ~195 for actual text.

### PDF

- **Month PDF** (`exportMonthPdf()`, ~5391) — renders every month into `#print-root`, adds
  `body.printing-calendar`, calls `window.print()`.
- **Waterfall PDF** (`exportWaterfallPdf()`, ~5603) — fits the ENTIRE grid onto ONE page and
  picks the orientation that prints largest, mirroring Excel's "fit sheet on one page".
  Orientation follows the grid's **width**; `MARGIN_MM = 5` (Excel's "Narrow"); the grid is
  pinned to its measured width so the print can't reflow and spill a row; height gets a 4%
  cushion for per-row sub-pixel rounding. Gridlines are fine **dotted** light grey (dashed
  rendered as chunky marks once the fit-to-page zoom magnified them).

> ### ⚠️ Always clear `body.printing-*` and `#print-root` before starting a print.
> A stuck class hides the entire app and makes the next print silently do nothing.

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
  fields filled", not merely "page loaded". Saved calendars are copies of the app, so getting
  this wrong greets every saved calendar with a setup form.
- Also triggered by the existing **New** button.

**Explicitly deferred:** an imported "holiday pack" format and a server-side/admin authoring UI.
Judged unnecessary while the tool is still pre-release with no external users. If revisited: a
static `admin.html` that authors holiday rules and exports a pack is the recommended approach —
**not** a live API, which would break offline use and risk silently shifting dates under already-
saved calendars. Holiday data must never auto-update into an existing calendar.

**Not yet done:** non-holiday settings (export options, defaults) in the Settings tab — the owner
asked to hold off on those.

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

## 14. Quick line-number map (as of `218558b`)

Approximate; the file shifts as it's edited. Regenerate with:
`grep -n "^\s*\(async \)\?function [a-zA-Z]" index.html`

| Area | Line |
|---|---|
| `<style>` block | 21–841 |
| `<script id="saved-state">` | 845 |
| Main `<script>` | 1197–7170 |
| `PHASES` | 1201 |
| `HOLIDAYS` | 1245 |
| `readState` | 1784 |
| `computeSchedule` | 1843 |
| `extendEndForHiatus` | 1870 |
| `simulateProductionSchedule` | 1894 |
| `buildPhaseRows` | 2191 |
| `addHiatusRow` (incl. the Lock-in-place pin) | 2432 |
| `render` | 2558 |
| `renderMonthView` | 2837 |
| `renderSpreadsheetView` | 3364 |
| `exportExcel` | 3783 |
| `setSidebarTab` | 4145 |
| `update` | 4516 |
| `autostartPhase` | 4640 |
| `collectFieldValues` | 4974 |
| `buildSavedHtml` | 5006 |
| `saveToFile` | 5122 |
| **`captureSnapshot`** (the one state definition) | 5176 |
| `pushUndoSnapshot` / undo-redo block | 5243 |
| **`shiftCalendar`** | 5369 |
| `phaseSequence` | 5475 |
| `productionEndFor` / `productionStartEndingBy` | 5504 / 5525 |
| `startForWeeksEndingAt` | 5570 |
| `workBackwardsFrom` / `workForwardsFrom` | 5584 / 5632 |
| `closeAllGaps` | 5682 |
| `exportMonthPdf` | 6397 |
| `exportWaterfallPdf` | 6609 |
| `restoreSavedState` | 6911 |
| **`refreshAfterRestore`** | 6929 |
| **`applyStateSnapshot`** | 6942 |

---

## 15. Starting a fresh session — suggested first message

> This is the SPT Planning Calendar Builder, a single-file HTML TV production scheduling tool.
> I'm attaching `PROJECT-CONTEXT.md` (full context) and `index.html` (the app). Please read the
> context doc first. Key things: it must stay a single self-contained file, saved calendars are
> copies of the app itself, verify changes in a real browser before telling me they work, and
> don't push to `main` until I say "commit and push" — it auto-deploys to a public site.

Also worth re-creating a `CLAUDE.md` in the repo (one already exists and should be kept current)
so the guidance loads automatically in Claude Code.
