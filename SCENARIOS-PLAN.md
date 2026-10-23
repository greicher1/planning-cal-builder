# SCENARIOS-PLAN.md

**Scenarios: several versions of one calendar, side by side, in one file.** Item 8 of the "what Excel-like
functionality are we missing" list (22 Oct 2026). Written 22 Oct 2026. **✅ All six decisions RULED the same day, by
picker, each as recommended (§1).**

**🔨 BUILT 23 Oct 2026** on branch `scenarios` (worktree `.claude/worktrees/scenarios`), commit `4946882`, owner: *"Ok
start building it"*.
- **Built:** steps 1–4, step 5 and most of step 6 (§10).
- **Not built yet:**
  - "Add a calendar file as a scenario…";
  - the overflow ◀ ▶ arrows and ▾ list (tabs scroll with the wheel instead).
- **Tests:** legs `scenarios` (18) and `scenariocompat`, both in `gate.sh`.
- **Not merged, not pushed.**
- **What building it taught:** §13.

§0 answers the owner's four questions in a few lines. §1 holds the decisions and their rulings, §2 the choices this plan
makes unless the owner overrules them, and §3 onwards how it would be built.

**Mockup:** [`mockups/scenarios.html`](mockups/scenarios.html). Three real waterfalls captured from the build (a
synthetic calendar), with working tabs, a tab menu and the Compare window. Every number in it is the app's own.
**Written against:** `4b95581` (main, 22 Oct 2026).
**Read first:** [`CLAUDE.md`](CLAUDE.md) §"Every saved calendar must keep opening, forever", then
[`HANDOFF.md`](HANDOFF.md). This plan changes the save format, so that section of CLAUDE.md is the one that binds.

---

## The request

Owner, 22 Oct 2026, picking item 8 ("Scenarios: '8 episodes vs 10', or two start dates, in one file with a quick
compare") from the list of Excel gaps:

> *"comparing multiple scenarios is HUGE. the question is how it should work. should they live in the same sptcal
> file? how do you compare or switch them? are they each a different version number? how do we make sure it doesnt
> get too complicated."*

**What people do today.** In Excel they duplicate the sheet tab and change the copy. In SPTCal the nearest thing is
Save As, which `saveAsFile()` describes as forking the calendar "to try a variation". That leaves two files with
nothing linking them. To compare them you open one, then the other, and remember the dates.

## 0. The short answers

- **Same file?** Yes. One `.sptcal` holds every scenario, the way one workbook holds its sheets. A calendar with one
  scenario saves exactly as it does today, byte for byte. Two buttons cover the times you do want separate files:
  "Save this scenario as its own file…" and "Add a calendar file as a scenario…".
- **Switch?** Tabs along the bottom-left of the calendar, like Excel's sheet tabs. The zoom is already bottom-right,
  which is Excel's own layout. Click a tab to flip to it. You stay in the same view (waterfall or month) at the same
  scroll position, so flipping back and forth shows what moved. "+" duplicates the tab you're on.
- **Compare?** Two ways. Flip between tabs to see the shape change. Open **Compare** for a table: one column per
  scenario and one row per key date. A value that differs from the scenario on screen is bold, with how much it
  differs ("Pushed 2 wks" for a date, "+2" for a count). A row that is the same everywhere is grey.
- **Version numbers?** No, and keeping the two apart is the main thing that stops this getting complicated.
  - A **scenario** is an *alternative*: A and B exist at the same time, and one of them will win.
  - A **version** is the *same plan over time*: the v3 you sent last week, and the v4 you'll send next week.
  - So scenarios get letters, not numbers ("Scenario A", "Scenario B"). B is not newer than A.
  - The Show Info **Version** field stays what it is: the revision number printed in the header. Each scenario has
    its own, because each scenario is a whole calendar.
  - When one scenario wins, you keep it ("Keep only this scenario…") and carry on revising it, v4, v5.
- **Not too complicated?**
  - A scenario is a whole calendar. Nothing is shared or linked between scenarios, so there is never a question of
    which field affects which tab.
  - Nothing new appears until you make a second scenario.
  - There can be up to 50, and Compare shows up to twelve side by side.
  - Everything you already know, from exports to undo, works on the tab you're on.

---

## 1. Decisions for the owner

Each decision has a recommendation, listed first.

✅ **RULED, 22 Oct 2026, by picker. Every decision went as recommended:**
- **D1:** one file.
- **D2:** tabs bottom-left.
- **D3:** flip plus the Compare table. The dashed outlines and side-by-side calendars are not built.
- **D4:** letters, with the version kept apart.
- **D5:** nothing shared.
- **D6:** exports are of the tab on screen and named after it. This includes the one-line frozen edit to the Excel
  and waterfall-PDF download names (name only), approved in principle. §7's byte-identical measurement is its gate.
  The shareable copy carries this tab only.
- **The cap** (asked after the six rulings): up to 50 scenarios (the plan had said six in all).
  - Compare showed six at a time until the owner raised it on 23 Oct 2026: *"you should be able to compare up to 12
    scenarios at once, scrolling left to right to see them all ... Make sure you can export the table to excel or pdf"*
    (§2).

### D1 · Where scenarios live

1. **One file holds them all (recommended).**
   - The file *is* the set of options, so it can't be separated from its siblings, and Compare always has every
     scenario to hand.
   - Two menu items bridge to separate files:
     - **Save this scenario as its own file…** writes one tab as an ordinary one-calendar `.sptcal`, for sending one
       option to someone.
     - **Add a calendar file as a scenario…** brings a separate `.sptcal` (or a legacy `.html`) in as a new tab. This is
       how today's Save-As forks get joined up.
2. **Separate files, with Compare opening other files.**
   - No format change.
   - But Compare has to ask for the files every time, the recents list fills with near-identical names, and "which file
     is the real one" stays a question.

### D2 · How you switch

1. **Tabs at the bottom-left of the calendar, like Excel's sheet tabs (recommended).**
   - They sit in the strip under the calendar, left of the zoom and the ? button, in both views.
   - With one scenario, the strip shows only a small **+ Scenario** button.
   - Click a tab to switch. Double-click a tab's name to rename it. Right-click a tab, or click the ▾ on the tab you're
     on, for its menu.
2. **A "Scenario ▾" menu beside the file name in the header.** Tidy, but each switch takes two clicks, and you can't
   see at a glance how many scenarios there are.
3. **A list in the sidebar's Show tab.** Out of sight whenever another sidebar tab is open, which is most of the time.

### D3 · How you compare

1. **Flip between tabs, plus a Compare table (recommended).**
   - **Flip:** a switch keeps the view, the zoom and the scroll position, so the grid changes in place and your eye
     catches what moved. Ctrl+Page Down and Ctrl+Page Up flip without the mouse, as in Excel.
   - **Compare table:** a window with one column per scenario and one row per key date. A value that differs from the
     tab you're on is bold, with the difference under it ("Pushed 2 wks", "Pulled 1 day", "−2"). A row that is the same everywhere
     is grey. It exports to Excel or PDF, or copies as a table, ready to paste into an email or a sheet. §2
     has the details.
2. **Also draw another scenario's phases as dashed outlines on the calendar.** A later step if flipping isn't enough.
   It needs no frozen edit (an overlay outside the grid, as the text-style highlight is), but it is the most work on
   this list.
3. **Two calendars side by side.** Not recommended.
   - The frozen `render` draws into one `#table-wrap`, so a second live grid would need a frozen edit.
   - At a readable size, two waterfalls don't fit on one screen.

### D4 · Names and version numbers

1. **Scenarios are named by letter, and the version stays a per-scenario revision number (recommended).**
   - New tabs are "Scenario A", "Scenario B", and so on, and you'd usually rename them ("10 eps", "8 eps", "Toronto").
   - The Show Info Version field is untouched: it is the revision you're on, and it prints in the header as it does
     today.
2. **Numbered scenarios ("Scenario 1", "Scenario 2").** These read like versions, which is the confusion this decision
   exists to avoid.
3. **Scenarios as versions:** each new tab bumps the version. Not recommended. It mixes "options we are weighing"
   with "the plan as of a date", and the header's v-number would stop meaning "the revision you sent".

### D5 · What scenarios share

1. **Nothing: each scenario is a whole calendar (recommended).**
   - The simplest rule there is, and the one a duplicated Excel tab follows.
   - **The cost:** fix a typo in the title in A and B keeps the typo. A typo is cheap to fix in the tabs you keep,
     and "Keep only this scenario…" ends the exercise. A hidden link is expensive to discover.
2. **Show Info and the header shared, dates separate.**
   - Tidier for the title, but every shared field becomes something to explain: "why did changing this in B change A?"
   - Episodes and shoot days are in Show Info too, and they are exactly what an "8 vs 10 episodes" scenario changes,
     so the line would have to be drawn field by field.
3. **One base calendar plus each scenario's differences.** Not recommended. It is the most complicated model to use
   and to save, and the hardest to keep opening forever.

### D6 · Exports and sharing

1. **Everything exports the tab you're on (recommended).**
   - With two or more scenarios, an export's file name ends with the scenario's name ("<title> Planning Calendar –
     8 eps.xlsx"), so a sent export says which option it is.
     - ⚠️ **For Excel and the waterfall PDF this is a small frozen edit**, and it needs your sign-off. Those two names
       are built inside `exportExcel` and `exportWaterfallPdfDirect`, both frozen.
     - The edit changes the download's name only. The gate would prove every byte of both files is unchanged.
     - Without it, those two keep today's names. The month PDF, Save and the shareable copy name their files outside
       the frozen code, so they need no sign-off.
   - A `{scenario}` header token exists for anyone who wants the name printed on the page. It is off unless a
     Template line uses it, so no existing header changes.
   - **Export shareable copy** carries the tab you're on only, so emailing one option never sends the others.
2. **The scenario's name always prints in the header** when there are two or more. Safer against sending the wrong
   option, but it changes the page of every calendar that has scenarios, and the header is crowded already.
3. **The shareable copy carries every scenario.** Only if you want to send someone the whole set as one
   double-clickable file. Sending the `.sptcal` already does that.

---

## 2. Decided in this plan unless the owner says otherwise

- ✅ **Up to 50 scenarios** (owner, 22 Oct 2026, by picker; this plan had said six).
  - 50 is a guard against damaged files, not a working limit. "+" greys out at 50, with the reason.
  - Tabs that don't fit scroll sideways, with ◀ ▶ at the strip's ends and a ▾ that lists every scenario, as Excel's
    sheet tabs do.
  - Default names run Scenario A to Z, then AA, AB and so on, as Excel's columns do.
- **Compare shows up to twelve columns at once** (owner, 23 Oct 2026): the tab on screen plus eleven others.
  - **With three or more scenarios, a row of Mantine `Chip`s above the table picks which to compare** (owner: *"i do
    want to add the chip selector"*).
    - Every other scenario is ticked to start, up to eleven: the next ones in tab order.
    - Untick one to drop its column. Once eleven are ticked, the rest grey out.
    - The choice lasts while the same scenario is on screen. With another on screen it starts afresh, so the old
      reference can't silently drop out of the table.
  - **The window grows with the table, up to the browser window.** Past that, the table scrolls left to right inside
    it, and the row labels stay pinned on the left.
- **"+" duplicates the tab you're on.** There is no blank scenario: a blank calendar is File ▸ New. The copy opens at
  once, named with the next free letter, its name ready to type over.
- **The tab menu** (right-click, or the ▾ on the tab you're on): Rename… · Duplicate · Compare scenarios… · Save this
  scenario as its own file… · Keep only this scenario… · Delete scenario… (red, last).
  - Delete and Keep only ask first, with the names of what will go. Neither can be undone, and the question says so.
  - The last scenario cannot be deleted; that item greys out with its reason.
- **Drag a tab to reorder.** The order is saved. Compare's columns follow it.
- **A switch keeps everything that is about you, not the calendar:** the view (waterfall or month), the zoom, the
  sidebar tab, the scroll position, folded phase cards and preferences. `captureSnapshot()` holds `viewMode` and
  `sidebarTab`, so a switch must put back the current ones after applying the target, rather than adopting what was
  saved with that tab.
- **Switching is not an edit.** It marks nothing unsaved and adds no undo step, as switching Waterfall/Month doesn't
  today (`setViewMode` calls no `markDirty`). The file remembers the tab you were on when it was last saved, and opens
  there.
- **Each tab keeps its own undo history** while the file is open. ⌘Z never reaches into another tab. Duplicating
  starts the copy with an empty history. Creating, renaming, reordering and deleting tabs are not undo steps (Delete
  and Keep only ask first instead).
- **The Compare window** (owner, 22 Oct 2026). First: *"super super easy to understand and styled with mantine,
  reduce complexity"*. Then: *"it should have the styling of this new version but the content of the old version. Also
  remove all the random explainations at the bottom and top. remember clean and simple"*.
  - **Built as a real Mantine component,** `mockups/scenarios-compare/CompareDialog.jsx`, meant to move into
    `src/chrome/` as it stands.
  - **It holds a table and its buttons, and nothing else.** No explanation lines above or below it. Its one toggle,
    Only differences, came later (below).
  - **One column per scenario.** The tab on screen comes first, marked with an "On screen" `Badge`.
  - **Every row shows every value.** The rows, in order:
    - Episodes (or Blocks), Shoot days, Location;
    - each phase's dates in phase order, custom phases included;
    - First shoot day and Wrap after Prod Prep;
    - Production span, weeks from first phase to last, Version.
  - **A value that differs from the tab on screen is bold.** The difference sits under it in a small light `Badge` in
    the `warn` colour. A date says "Pushed 2 wks" or "Pulled 1 day", or "Start pushed 2 wks, end same" for a range
    that moved at one end. A count keeps its sign: "+2" episodes, "+9" shoot days, "+2 wks" of production span.
  - **A row that is the same everywhere is grey.**
  - **The owner's notes after it went live** (23 Oct 2026, the same evening):
    - *"It should hide phases that aren't used/empty"*: a phase none of the columns shown has gets no row. A phase only
      some of them have keeps its row, with a dash in the others, because that is a difference.
    - *"There should be a button to hide comparisons that are the same"*: an **Only differences** switch, top right,
      beside the chips. It hides every row that is the same in every column shown. It is remembered while the app is
      open, as the chips are.
    - *"lets use pushed and pulled instead of + and -"* for dates, then *"days and eps can stay + and - as they are
      counts and not dates"*.
    - The holidays behind a moved shoot date. The owner first asked for their names next to the "± days". Then:
      *"lets not name the specific holidays, lets just say + or - a number of holidays with the same yellow chip"*.
      So First shoot day and Wrap carry a second chip beside their Pushed/Pulled, "+1 holiday". It is how many more
      days that scenario's shoot lost to a holiday than the one on screen's, each from its own production walk
      (`holidaysHit`). First shoot day counts only the holidays before it. Equal counts make no chip.
    - The exports and Copy table follow the table as shown, so all four reach them.
  - **Dates read as the waterfall writes them:** 6/29/26, and ranges as 5/18/26 – 6/26/26.
  - **Footer:** Export to Excel, Export PDF and Copy table on the left, Done on the right. Escape and the × close it
    too.
  - **Three or more scenarios:** a row of `Chip`s above the table picks the columns (see above).
  - **Export to Excel and Export PDF write the table exactly as shown:** the same columns, rows and marks. The window
    only builds the table's model; the engine writes the file.
    - **Excel:** ExcelJS, which the app already loads (no new resource for the CSP). One sheet, "Compare", with:
      - the title and the file's name;
      - the label column and the header row frozen;
      - each difference bold, with its "Pushed 2 wks" (and any "+1 holiday") on a second line on the `warn` tint;
      - same rows grey;
      - landscape, one page wide.
    - **PDF:** written directly, as the month PDF is, from that writer's machinery (the embedded Inter, the shared
      serializer). Landscape Letter, one page wide, with smaller type past seven columns. The mockup prints the table
      through the browser's Save as PDF instead.
    - **File names:** "<title> Scenario Comparison.xlsx" / ".pdf".
    - **Both are new code, not frozen writers.** No frozen edit.
  - **Mantine parts only:**
    - `Modal` (centered, `radius="lg"`, `shadow="xl"`, overlay 0.35, as the Export PDF dialog);
    - `Table` in a `Table.ScrollContainer`, so a narrow window scrolls the table sideways rather than outgrowing the
      dialog;
    - `Badge`, `Chip.Group`, `Button`, `Text`, `Group`, `Stack`;
    - the app's own theme. `Chip` and `Table` are the two style sheets `main.jsx` doesn't import yet.
- **The values are the header's own:** the tokens `buildHeaderCtx()` already computes. So Compare cannot disagree with
    what each scenario's header prints.
- **A flip highlights nothing.** ✅ Owner, 22 Oct 2026: *"im not sure if showing what changed flash makes sense...
  feely a little silly"*.
  - The mockup had outlined the changed weeks for two seconds after each switch. That is withdrawn.
  - Flipping in place already shows what moved, because anything that shifted jumps as you go back and forth.
  - A change too small to see that way, such as a wrap moving one day, is what the Compare table is for.
- **The month view** has the same tabs, flip and Compare:
  - **The tabs** sit in the same strip under the calendar, in both views.
  - **A flip keeps the month on screen.** `monthCursor` is session UI, not saved, so a switch leaves it alone. If
    the other scenario has nothing in that month, the cursor moves to the nearest month that scenario covers. That
    is the rule `update()` already applies on every render. A switch never arms `monthCursorRecheck`: that is for
    Load and New, which replace the calendar.
  - **Everything the month view stores belongs to one scenario**, because each tab is a whole calendar: day notes,
    Off and half days, the bar order, extra lanes, the month header. Marking a day Off in "8 eps" changes nothing
    in "10 eps".
  - **Compare** is the same window in both views.
  - **Export PDF** in the month view writes the tab on screen. Its file name comes from `monthPdfFileName()`, which
    is not frozen, so it carries the scenario's name with no sign-off.
- **A scenario can differ in anything, Location included**, so its union holidays differ too. The mockup's third tab
  is the same calendar shot in Toronto: it wraps a day later.
- **Scenario names** are plain text: at most 40 characters, line breaks and XML-illegal characters removed
  (`stripXmlIllegal`, as the header's text is), and always drawn with `textContent`. A name reaches file names and,
  through the token, the Excel header.
- **No new setting.** (Owner rule, 20 Oct 2026: simplify rather than add options.)
- **New (⌘N) starts a calendar with one scenario.** Load replaces every tab with the file's.

## 3. The save format

⛔ **The binding rules** (CLAUDE.md): every saved calendar keeps opening forever; never rename, remove or repurpose a
key; restore unconditionally; migrations are forward-only; a version bump is for a change an older build must refuse
rather than misread.

### 3.1 One scenario: nothing changes

A calendar with one scenario writes exactly today's `captureSnapshot()` JSON, `version: 1`, with no new key. Every file
saved today, and every one-scenario file saved after this ships, stays byte-identical. Gate 5's restore baseline
proves it.

### 3.2 Two or more: the file is the tab you're on, plus the others

```jsonc
{
  "version": 2,                       // ← the file's version, not the snapshot's (see 3.3)
  // ... every key of the CURRENT tab's captureSnapshot(), exactly as a one-scenario file has them ...
  "fields": { "byId": { ... } },
  "scenarios": {
    "current": "s2",
    "tabs": [
      { "id": "s1", "name": "10 eps",  "snapshot": { "version": 1, ... } },
      { "id": "s2", "name": "8 eps" },                 // the current tab: its snapshot IS the top level
      { "id": "s3", "name": "Toronto", "snapshot": { "version": 1, ... } }
    ]
  }
}
```

- **Every snapshot is a normal one.** Each tab's state is exactly what `captureSnapshot()` writes, `version: 1`, and it
  is read through the same `sanitizeSnapshot()` → `migrateRegionSnapshot()` → `applyStateSnapshot()` path. Every
  migration ever written applies to every tab, and every one written later will.
- **Why the current tab sits at the top level, rather than every tab in a tidy list.** Measured against
  `releases/`:
  - **v1.3.0 to v1.8.0** run `snapshotVersionOk()` before applying anything, so `version: 2` makes them refuse the
    file whole, with "That calendar was saved by a newer version of SPTCal…". That is the outcome we want.
  - **v1.1.x and v1.2.0 have no version check, and their `parseCalendarText()` accepts any JSON object as a
    calendar.** The root `index.html` (the legacy rollback) is v1.2.0, and so is any shareable copy exported in that
    era.
    - With the current tab at the top level, such a build opens that tab correctly and ignores the rest. A Save there
      would drop the other tabs, but never the one on screen.
    - With a tidy list and a stub at the top, it would open a **blank** calendar, and a Save would overwrite the whole
      file with nothing.

  New files in old apps are unsupported (CLAUDE.md), but this choice turns the worst case from "everything lost" into
  "the other options lost", at no cost to the new reader.
- **`version: 2` on the file is the version bump, and it is the right kind.** Without it, v1.3.0–v1.8.0 would open
  the top-level tab and silently drop the others on their next Save. That is a misread, which is what a bump exists to
  prevent. Only files with two or more scenarios carry it.
- **`scenarios.tabs[]` order is the tab order.** Ids are `s1`, `s2`, … from a counter, never reused within a file, and
  never shown.

### 3.3 Reading it (`parseCalendarText()`, still the one reader)

- A top-level `scenarios` object → **a container**. Check, all before touching the open calendar (as audit M-1
  requires):
  - top-level `version` is 2;
  - `tabs` is an array of 2 to 50;
  - each id is unique and matches `/^s\d{1,3}$/`;
  - `current` names one tab, and exactly that tab has no `snapshot`;
  - every other tab's `snapshot` passes `looksLikeCalendar()` and `snapshotVersionOk()`;
  - names are cleaned as in §2.

  **Any failure refuses the whole file**, as a newer-version file is refused today. A crafted file can't half-load,
  and can't load 10,000 tabs (audit M-15's runaway-count rule).
- The current tab's snapshot is the top level with `scenarios` removed and `version` set back to 1.
- `SNAPSHOT_VERSION` stays 1. A new `FILE_VERSION_SCENARIOS = 2` is the most the reader accepts. A file with
  `version > 2` is refused, as today.
- **`parseCalendarText()` returns `{format, snapshot, scenarios}`.** Older callers that read only `snapshot` keep
  working. The scenarios-aware Load path and `restoreSavedState()` use the third field.
- `restoreSavedState()` reads containers too, for one reason: crash recovery writes the backup into `#saved-state`
  and calls it (`offerBackupRecovery`), and the backup must hold every tab (§6).

### 3.4 What must be updated when this is built

- CLAUDE.md §"Every saved calendar…": "`SNAPSHOT_VERSION` (currently 1)…" gains a line saying a multi-scenario
  *file* is version 2 and its snapshots stay version 1.
- CLAUDE.md's state-model table gains one row, `scenarios`.
- A new fixture, `tests/fixtures/scenarios-3.sptcal` (synthetic, built in the real app), and the version cut's
  fixture as usual.

## 4. Switching (the engine)

A small module in `src/legacy/app.js`, outside every frozen function:

- **The store:** `scenarioTabs = [{id, name, snapshot|null, undo:{stack, redo, base}}]`, `currentScenarioId`,
  `scenarioCounter`.
  - With one tab, `scenarioTabs` has one entry and nothing else in the app changes.
  - The current tab's `snapshot` is `null`: its state is the live app, as now.
- **`switchScenario(id)`.** Synchronous from start to finish, so nothing paints a half-switched app.
  1. Commit an open note editor, as `buildSavedData()` does.
  2. Store `captureSnapshot()` and the undo stacks on the current tab.
  3. Remember the view, sidebar tab, zoom and scroll.
  4. `applyStateSnapshotAtomically(target)` (with `suppressDirty`), then `refreshAfterRestore()`.
  5. Put back what step 3 remembered: `setViewMode`, `setSidebarTab`, and `captureScroll` / `restoreScroll` (frozen,
     and *called*, which is allowed).
  6. Restore the target's undo stacks.

  It uses the same apply path as Load, so everything Load must refresh is refreshed. The three restore paths were
  merged into `refreshAfterRestore()` for exactly this reason (CLAUDE.md).
- **`duplicateScenario()`** = capture → new tab with that snapshot → switch to it.
- **`deleteScenario(id)`** asks first. Deleting the current tab switches to its left neighbour first.
- **The tab strip** is a React component beside `ZoomControl` in the strip under the calendar, fed through the bridge
  as the zoom is. ⛔ **No `id` on anything in it.** `collectFieldValues()` sweeps every `input[id]` into the saved
  file and the undo stack, and the rename box is an input. `ZoomControl` follows the same rule.
- ⚠️ **The app shell measures the strip.** Above 960 px, "THE APP SHELL'S GRID FIT" solves `--header-h` on
  `.preview-panel` from what surrounds the grid. The tabs must not change the strip's height (one row, no wrap; extra
  tabs scroll sideways). If that ever changes, the strip must be among the things the fit observes.

## 5. Compare (the probe)

⚠️ **The central technical risk.** `readState()` reads the DOM, so the app can only compute the schedule of the
calendar that is in the DOM. An inactive tab has a snapshot, not a schedule.

- **`scenarioKeyDates(snapshot)`** applies the snapshot, reads, computes, and puts the current calendar back, all in
  one synchronous call. It is never held across an `await`, the same rule `paperProbe` lives by.
  - **Applies:** `applyStateSnapshot(snapshot)` with `suppressDirty` and `applyingUndoRedo` set, so nothing is
    dirtied, backed up or banked.
  - **Reads:** `readState()`, then `computeSchedule()`, then `buildHeaderCtx(wholeCalendar(schedule))`, which yields
    the header's tokens for that scenario.
  - **Puts back:** the current calendar's own snapshot, re-applied in a `finally`.
  - **Never runs:** `refreshAfterRestore()` and `render`. The grid is never redrawn, and the browser never paints in
    between.
- **What it touches that is not in a snapshot** has to be saved and put back around it: `collapsedPhaseKeys`, the
  month cursor (`monthCursorRecheck`), `episodeNamesLegacy` (derived; re-derived on the way back), an open editor
  (closed first). Step 4 lists every module-scope variable `applyStateSnapshot()` writes. The leg in §11 proves the
  current calendar is byte-identical (`captureSnapshot()` and the rendered grid) before and after a probe.
- **Cost:** one apply and one compute per column Compare shows (eleven at most), and none while you work. So the cost
  does not grow with the number of tabs. If it measures slow, each tab's key dates are cached as it is switched away
  from (it can't change while inactive), and only tabs never visited since Load are probed.
- **The current tab** needs no probe: its tokens come from the live schedule.
- **"Copy table"** writes `text/plain` (tab-separated) and `text/html` (a plain table), so it pastes into an email,
  Excel or Sheets as a table. It is chrome, not one of the frozen writers.

## 6. Undo, autosave, the crash backup, recents, file conflicts

- **Save, Save As and autosave** all write `buildSavedData()`, which becomes "one tab → `captureSnapshot()`, two or
  more → the container". One function, so nothing can write a partial file.
- **The crash backup** (`writeBackup()`) stores the same container, or a crash loses every tab but one. Recovery reads
  it through `restoreSavedState()` (§3.3).
- **Undo:** one history per tab (§2). The 100-step limit is per tab.
  - The worst case is 50 tabs × 100 steps × ~5 KB, about 25 MB, and only if every tab was edited 100 times in one
    sitting.
  - If that measures badly, a tab's history is trimmed to its last 20 steps when you switch away from it.
- **Recents, file stamps and the "changed on disk" question** are about the file, and the file is still one file.
  Nothing changes.
- **Load** applies the file's current tab and keeps the rest as snapshots. **New** clears them.
- **Dirty:** an edit on any tab makes the file unsaved, as now. So do creating, renaming, reordering and deleting a
  tab. Switching does not (§2).

## 7. Exports

- **Excel, both PDFs and the shareable copy export the calendar on screen**, which is the tab you're on. No writer
  changes.
- **File names:** with two or more tabs, " – <scenario name>" is appended. With one tab, every name is exactly as today.
  The names are built in four places:
  - `buildSavedFileName()` (Save, Save As, the shareable copy) and `monthPdfFileName()` (the month PDF) are not frozen.
  - ⛔ **The workbook's name is built inside `exportExcel`, and the waterfall PDF's inside
    `exportWaterfallPdfDirect`.** Both are frozen. Appending the scenario there is a frozen edit (D6). It touches the
    download name only. The measurement for sign-off: both files byte-identical to a pre-change export, for a
    one-scenario calendar and for each tab of a three-scenario one.
- **`{scenario}` header token** (D6): added to `buildHeaderCtx()` and the token menu. It is empty with one tab, so a
  Template line using it prints nothing on a one-scenario calendar.
- **The shareable copy** (D6): `buildSavedHtml()` already embeds `captureSnapshot()`, which is the current tab only.
  So option 1 is the code as it stands, and option 3 would be the change.

## 8. The frozen surface: no frozen edit, except one optional file-name edit

Checked against CLAUDE.md's symbol list. The only frozen edit anywhere in this plan is D6's optional export file
name (§7): the download's name only, never a byte of the file. Everything else:

- **The tabs and the Compare window are chrome**, outside `#table-wrap` and `#print-root`.
- **Switching calls frozen code without editing it:** `render` through `refreshAfterRestore()`, and `captureScroll` /
  `restoreScroll`.
- **The probe reads; it doesn't draw.** It runs `readState`, `computeSchedule` and `buildHeaderCtx`, none of which
  is frozen, and never calls `render` or a writer.
- **No writer's output changes.** The token flows through the header text the writers already read, and it is empty
  until a Template line uses it.
- **One thing to watch:** the strip's height and the shell's grid fit (§4).

## 9. Risks, and what keeps each small

| Risk | What keeps it small |
|---|---|
| Sending the wrong option | File names carry the scenario's name with 2+ tabs (Excel and the waterfall PDF only after the frozen-edit sign-off). The optional `{scenario}` token. The tab you're on is always in view at the bottom of the calendar. |
| Editing the wrong tab | The current tab is filled and the others are not. Each tab has its own undo, so a mistake is undone where it was made. |
| A fix made in one tab only | D5's honest cost. "Keep only this scenario…" ends the exercise. |
| "Is B newer than A?" | Letters, not numbers (D4). Version stays the revision. |
| The probe leaving state behind | Synchronous, with a `finally` restore. The §11 leg compares `captureSnapshot()` and the grid before and after. |
| Old builds | v1.3.0+ refuse a multi-scenario file whole. v1.1–v1.2 open the current tab (§3.2). One-scenario files are unchanged everywhere. |
| A crafted file | The container is validated whole before anything is applied, capped at 50 tabs, and names are plain text (§3.3). |
| 50 tabs × 100 undo steps | ~25 MB worst case. An inactive tab's history is trimmed if that measures badly (§6). |
| Too many tabs to see | Tabs scroll, with ◀ ▶ and a ▾ list of every scenario. Compare shows up to twelve, scrolled sideways, and chips pick which (§2). |

## 10. Steps

Each step lands on its own branch with its own gate run, in this order. Each one is usable alone.

1. **The format, with no UI.**
   - The reader, the writer, the backup, the fixture.
   - Legs: a round trip; one-scenario byte-identical; old builds refuse (§11).
   - A one-scenario user sees nothing.
2. **The engine:** `switchScenario`, duplicate, rename, delete, and per-tab undo, driven from a test hook only.
3. **The tab strip:** + Scenario, tabs, rename, the tab menu, drag to reorder, Ctrl+Page Up/Down.
4. **Compare:** the probe, the window (move `mockups/scenarios-compare/CompareDialog.jsx` into `src/chrome/` and feed
   it through the bridge), Copy table, and the Excel and PDF exports of the table.
5. **Exports:** file names and the `{scenario}` token, and the shareable-copy rule if D6 changes it. The Excel and
   waterfall-PDF names only after the frozen-edit sign-off (§7).
6. **The bridges:** Save this scenario as its own file…, Add a calendar file as a scenario…, Keep only this
   scenario….
7. **Release:** docs (CLAUDE.md §3.4), README changelog, version cut **v1.9.0** (a new file format), the version's
   fixture.

## 11. The gate

- **`scenarios`** (new leg):
  - build three tabs in the real app;
  - save, load, and compare each tab's `captureSnapshot()` with what was saved;
  - switch while on the month view and check you stay on the month view, on the same month;
  - check undo stays in its tab;
  - delete, then keep only one, then check the file is a plain v1 snapshot again.
- **`scenariocompat`** (new leg):
  - a one-scenario save is byte-identical to today's;
  - `releases/v1.8.0.html` refuses `scenarios-3.sptcal` with the newer-version message and leaves its open calendar
    untouched;
  - `releases/v1.2.0.html` opens its current tab;
  - crafted containers (51 tabs, a duplicate id, a missing current, a bad snapshot, a `version: 3`) are each
    refused whole.
- **`scenariocompare`** (new leg):
  - with three tabs the chips show and unticking one drops its column;
  - twelve columns scroll with the labels pinned;
  - the Excel export's cells, bold, tint and frozen panes match the window;
  - the PDF is written and opens.
- **`scenarioprobe`** (new leg):
  - Compare's values for each tab equal that tab's own header tokens when it is current;
  - the current calendar's `captureSnapshot()` and its rendered `#table-wrap` are identical before and after opening
    Compare.
- **The full gate**, with every byte baseline unchanged. Nothing about a one-scenario calendar or a writer changes.

## 12. The mockup

- **What it is:** three calendars rendered by the real build (`dist/`, 22 Oct 2026) and captured verbatim:
  - the whole waterfall of each, with the resize handles stripped;
  - each one's month view for July, August and September 2026, the months the shoot runs in. The Month button at the
    top switches views, and the month's own ◀ ▶ move between those three.

  The three calendars:
  - **10 eps:** `tests/fixtures/halfdays.sptcal` with Version 3.
  - **8 eps:** two fewer episodes, Prod Prep and Production two weeks later.
  - **Toronto:** "10 eps", shot in Toronto.

  The tab strip, the tab menu, the Compare window and the view switch are new. A flip highlights nothing (§2).
- **The Compare window is the real thing**, not a drawing of it:
  - React 19, Mantine 9.5.2 and the app's own `src/theme.js`, with `main.jsx`'s CSS imports in `main.jsx`'s order;
  - built from `mockups/scenarios-compare/` (its `vite.config.mjs` says how) and pasted into the page as one script
    and one stylesheet.

  That is most of the page's ~890 KB, beside the twelve captured calendars.
- **What its numbers are:** each scenario's own header line and grid, as the app drew them.
  - "8 eps" wraps the same day as "10 eps", because it starts two weeks later with two fewer episodes.
  - "Toronto" wraps a day later on Ontario's holidays.
- **What it fakes:** nothing is saved or exported. "+" adds a tab that is a copy of the "10 eps" picture.
- **Where it is served:** nowhere. The deploy publishes `dist/` only. Open it from the file, or through the harness
  server at `/mockups/scenarios.html`. It loads Inter from Google Fonts, as the month menu's mockup does.

## 13. What building it taught (23 Oct 2026)

- **The undo baseline must be `undoStateJSON()`, not `JSON.stringify(captureSnapshot())`.**
  - The undo-keys work (⌘Z after every edit) made the history leave `viewMode` out.
  - A baseline that kept it made the first push after every switch or copy a phantom step: ⌘Z then "undid" nothing.
  - Found because the `scenarios` leg's per-tab undo case failed. Every baseline in the scenarios code uses
    `undoStateJSON()` now.
- **`buildHeaderCtx()` returns `{tokens}`.** Compare reads `.tokens`. A date token is a `hdrDate()` box, so the exact
  Date is read from `__hdrDate` rather than re-parsed.
- **`buildSavedFileName('')` is not a bare name:** an empty extension falls back to `.sptcal`. `savedFileBase()` cuts
  the base off a name built with `.html`.
- **Save to a legacy `.html` writes a whole copy of the app**, with the state embedded. If it carried only the tab on
  screen, it would silently drop the others. So `buildSavedHtml({allScenarios: true})` is used for every Save path, and
  only Export shareable copy writes the one tab (D6).
- **The scenario variables are `var`.** `buildHeaderCtx()` reads them for `{scenario}`, and a render during the IIFE's
  evaluation, before their line runs, would otherwise hit the temporal dead zone and take the rest of the engine with it.
- **v1.2.0 measured, not assumed** (`scenariocompat`): it opens the current tab (Half Days Test, 8 episodes) from
  `tests/fixtures/scenarios-3.sptcal`. v1.8.0 refuses it with the newer-version message and keeps its calendar.
