# KEY-FACTS-PLAN.md: each scenario's key facts in a band above the tabs, and a Location box in Show info

**Status: PLANNED, placement RULED (C), no code.** Mockup: [`mockups/scenario-key-facts.html`](mockups/scenario-key-facts.html).
On the tracker as `scenario-key-facts` and `show-location-field`.

Owner, 23 Oct 2026:

> *"i want to consider adding a bar or section somewhere that gives the major key considerations of each scenario in
> one clear easy place. It would include Location, num eps, writers room open, num production weeks, num writers room
> weeks, wrap. Basically as you switch between scenarios you should be able to see at a glance what the key
> differences between each are. But i want to be careful. i dont want to overcomplicate and bloat the app"*

Then *"also add start date of production"*. On the region problem: *"if you selected a province in canada, you might
actually mean winnipeg"*, *"this is also an issue for the comparison screen"*, and the owner's own fix: *"in addition
to selecting a production region, you could also enter a specific location (as text) and that is what is used ...
this would be in the "show menu""*.

---

## 1. What the owner chose

- **Placement C, the tinted band** (*"lets go for C"*). The mockup's other options:
  - **Beside the tabs** was measured and dropped. The line keeps its width, so the tabs are squeezed into what is left:
    1 tab in view at 1440 px.
  - **A, B, D, E** were other ways of setting the row apart from the tabs: a hairline, a white pill, a calendar
    footer, a name tag.
  - **F** put the facts in the text style bar at the top.
- **The facts, in order:** Location · episodes · Writers' Rm open date · its weeks · Production's first shoot day ·
  its span in weeks · Wrap.
- **Grey for same** (Compare's rule): a value that is the same in every scenario is grey, so what is left dark is what
  differs. The first draft tinted differences yellow instead. Realistic scenarios differ in most facts, so everything
  went yellow.
- **A Location box** in Show info, under Production Region. Typed text wins in the band and in Compare; blank shows the
  region, shortened.

## 2. Defaults taken (each reversible in one place; tell me to change any)

1. **The band appears only with 2 or more scenarios**, in both views, and only while a calendar is shown. With one
   scenario the app is exactly as it is today.
2. **No label on the band.** It begins with the Location, as in the mockup.
3. **Narrow windows: the band wraps onto a second line** rather than dropping facts or cutting text off (owner:
   *"so we dont have elipses/things cut off"*). The calendar gives up the extra line. On one line it needs a window
   about 1,040 px wide; the app shell starts at 961 px.
4. **A fact with nothing behind it drops out:**
   - no writers' room → no Writers' Rm;
   - Production not scheduled → no Production and no Wrap;
   - no episode count → no episodes;
   - Region None and no Location → no Location.

   If nothing is left, the band hides.
5. **Blocks mode** reads "5 blocks". Singular is "1 ep" / "1 block" / "1 wk".
6. **Dates** read as the waterfall and Compare write them: 6/1/26.
7. **The grey rule compares every scenario in the file**, not just Compare's ticked columns. A fact that some
   scenarios have and others don't counts as different.
8. **The Location box:**
   - label "Location", placeholder "e.g. Winnipeg";
   - helper line: *"Optional. Shown instead of the region when you compare scenarios."*;
   - at most 40 characters, line breaks and XML-illegal characters removed, as scenario names are.
9. **Location is NOT a header token** (`{location}`) in this plan. It is easy to add later if wanted.

## 3. What it does

### 3.1 The band

- **Where:** a fixed strip like `.sc-strip`, directly above it.
  - Left edge where the tabs start: the preview panel's left plus its 28 px padding, measured the way
    `ScenarioTabs` already measures it.
  - Right edge 28 px in from the panel's right, so it is as wide as the calendar.
  - 30 px tall, 8 px above the tabs.
  - Background a soft grey (`#efeee8` in the mockup), radius 8, 12 px side padding.
- **Rendered by the chrome** (`src/chrome/ScenarioTabs.jsx`, or a sibling `ScenarioFacts.jsx` in `#react-root`).
  - It is never inside `#table-wrap` or `#print-root`.
  - Both print paths hide `#react-root`, and `buildSavedHtml()` empties it, so a shareable copy never carries a band.
- **Making room:** `.preview-panel`'s bottom margin (44 px above 960, "The app shell" in `legacy.css`) grows by the
  band's measured height.
  - The band's `ResizeObserver` writes the height as one custom property, so a wrapped band makes room for itself.
  - The grid fit ("THE APP SHELL'S GRID FIT") already observes the panel's border box, so the waterfall ends above the
    band with no change to it.
  - The month view scrolls inside the panel, so the margin ends its scroller above the band too.
  - Below 960 px (stacked) the same height is added to the panel's bottom padding.
- **No id on anything in it** (the `collectFieldValues()` rule; `ScenarioTabs.jsx`'s lead comment).
- **No setting.** The band itself is never saved, printed or exported.

### 3.2 The Location box

- `<TextInput id="show-location">` in `ShowInfoCard` (`src/chrome/Sidebar.jsx`), directly under the Production Region
  mirror. It is calendar data, so it has an id and is swept into `fields.byId` (§5).
- It never changes a date. Only `#union-place` decides holidays.
- Typing marks the file unsaved and refreshes the band. It changes nothing in the calendar, so there is no render
  beyond what `markDirty()` already does.

### 3.3 Compare

- Its **Location** row keeps its label and reads the same value as the band: typed Location, else the short region.
  The Excel and PDF exports follow, since they write the table as shown.
- **The short region**, one function, `placeShortLabel(value)`:
  - drop a `" — …"` tail and a `", XX"` state or province code from `PLACES[value].label`;
  - an explicit `short` on any `PLACES` entry the rule gets wrong (`us-general` → "U.S. (Area Standards)");
  - None → no value (Compare shows its dash).

## 4. Where the values come from

- **`scenarioFacts()`**, which Compare already uses. So the band, Compare and the header can't disagree. It gains:
  - `wrOpen`, from the `writersRoom.open` token;
  - `wrWeeks`, from `writersRoom.weeks`;
  - `loc`, now typed Location or `placeShortLabel()`.

  Production start, span and Wrap are already there (`first`, `span`, `wrap`).
- **The tab on screen:** recomputed after each `update()`.
  - `scenarioFacts()` calls `computeSchedule(readState())` again today.
  - It gains an optional schedule argument, so the band can reuse the one `update()` just computed
    (`wholeCalendar(currentSchedule)`).
- **Parked tabs:** `parkCurrentScenario()` already stores `t.facts`. A parked tab can't be edited, so its facts
  can't go stale.
- **Tabs not visited since Load** have no facts yet.
  - They are probed once after Load, one tab per idle moment, with the same synchronous probe Compare uses.
  - That probe is factored out of `compareScenarioValues()` without its undo push: there is no pending edit at Load.
  - Until a tab is probed, no value is greyed. With a handful of tabs this is instant.
- **Pushed to the chrome** with the tabs (`pushScenarioChrome`) as `facts: {current, same: {key: true}}`. The chrome
  only draws.

## 5. Save format

- ⛔ **`show-location` is a NEW PERMANENT id in `fields.byId`** from the first file saved with it (CLAUDE.md, "Every
  saved calendar must keep opening"). Per scenario, like every Show info field.
- **Absent means blank.** Added to the restore's absent-field defaults list beside `show-mode`, `prep-name` and the
  others (`hasField`), so a calendar saved before it, loaded after one with a Location, shows its own region, not the
  previous file's town. New (`resetAll`) clears it too.
- **`SNAPSHOT_VERSION` is not bumped.** An older build ignores an id it has no element for, as it does for every
  field added since v1.0.0.
- ⚠️ **Gate 5 moves** (the `fields.byId` key set): one id gained. Its baseline is re-cut on sign-off, as for every
  id added before.
- `.compare-dlg` and the band carry no ids, so nothing else enters a file.

## 6. The frozen surface

**No frozen edit.**

- The band is chrome outside `#table-wrap`.
- The room it takes is the panel's margin, which the grid fit already measures.
- Nothing reaches the writers or the print paths.
- `scenarioFacts()` and Compare are new code (SCENARIOS-PLAN.md).

## 7. Tests and the gate

- **A new leg, `scenariofacts`,** in `gate.sh` beside `scenarios`. It must be red on the pre-change build.
  - **F1** One scenario: no band; the panel margin is 44 px.
  - **F2** Duplicate:
    - the band shows;
    - the grid's box ends above the band's top;
    - the tabs strip is unchanged.
  - **F3** The current tab's band text matches Compare's column for it: Location, episodes, Writers' Rm, Production,
    Wrap.
  - **F4** Grey rule: a fact equal in every tab is grey. Change episodes in one tab, and that fact turns dark in both.
  - **F5** Flip: the band shows the other tab's facts with no edit and no undo step.
  - **F6** Location:
    - typed → the band and Compare show it;
    - blank → the short region ("Manitoba", not "Manitoba — province-wide");
    - ⌘Z undoes the typing.
  - **F7** Save and Load:
    - each scenario keeps its own Location;
    - a file without `show-location`, loaded after one with it, shows a blank box;
    - New clears it.
  - **F8** None of it is in `#table-wrap`, `#print-root`, a shareable copy or `fields.byId`, except
    `show-location`.
  - **F9** A 1,000 px window: the band wraps, nothing is clipped (`scrollWidth <= clientWidth`), and the grid still
    clears it.
  - **F10** Month view: the band shows, and the month scroller ends above it.
- **Also:** `scenarios`, `scenariocompat`, `npm run check`.
- **Then the full gate.** Every frozen output must stay byte-identical (gates 1–3, 10, 13); only gate 5 moves, by the
  one id.

## 8. Things that could go wrong, and the answer

- **The probe after Load is slow with many tabs.** It runs one tab per idle moment and never blocks a click. The band
  only waits to grey values.
- **The band and the tabs drift apart on resize.** Both take their left edge from the same measurement of
  `.preview-panel`.
- **A stale Location from the previous file.** The absent-field default (§5), held by F7.
- **The grid hides behind the band.** The margin is measured, never declared, and F2, F9 and F10 hold it.

## 9. Build order (a worktree branch from local `main`)

1. **Engine:**
   - `placeShortLabel`;
   - `scenarioFacts(sch?)` with `wrOpen`, `wrWeeks` and `loc`;
   - the live tab's facts after `update()`;
   - the post-Load probe;
   - `pushScenarioChrome` carries the facts.
2. **Show info:**
   - `#show-location`;
   - its absent default and `resetAll`;
   - sanitizing on read.
3. **Chrome:** the band, its CSS, and the measured panel margin.
4. **Compare:** the Location row reads `loc`.
5. **Tests:** the `scenariofacts` leg, red on the old build, then the targeted legs, gate 5's re-cut on sign-off, and
   the full gate.
6. **Docs:**
   - README changelog;
   - HANDOFF;
   - CLAUDE.md's state notes (`show-location` is a permanent id).

   Ask before any commit to `main` or push.
