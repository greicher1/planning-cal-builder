# MONTH-RAIL-PLAN.md: the phase map rail and the Soft Lines month view (option 3d+)

*Planned 27 Oct 2026. No code yet. Mockup: [`mockups/month-view-redesign.html#o3d2`](mockups/month-view-redesign.html), tab 3d+.
Tracker cards: `month-nav-in-toolbar`, `month-view-modern-look`.*

## 0. What was asked

The owner, 27 Oct 2026, in order:

1. *"Offer me 5 options for redesigns of the look of the month view calendar page. I want it to look a little more modern.
   I also dont want the buttons to change the months to be on the page itself, they should be fixed buttons above"*
2. Option 1 (Soft Lines), then *"a few variations of the month rail"*, then *"plan 3d"* (the Phase map rail).
3. *"maybe the position of the phase map rail should be swapped with the position of the styling bar"* (tab 3d+).
4. *"Plan 3d+ (phase map under the toolbar, style bar above the calendar) with the guardrails: slimmer phase rows, at
   most 3 named rows, measured on real calendars first. Screen only for now."*

So three things get built, all on screen only:

- **A. The phase map:** a fixed row under the preview toolbar, in the month view only. Every month of the calendar, with
  the phases drawn over them as named bars. Click a month to go there, click a phase to go to the month it starts in,
  or step with ‹ ›.
- **B. The month arrows leave the page.** `#mv-prev` / `#mv-next` are hidden on screen, never deleted.
- **C. The Soft Lines look:** the month grid's black lines become light warm grey, the month band softens and rounds,
  and the day names lose their grey fill. Paint only.

Both month PDFs stay exactly as they are (owner: *"Screen only for now"*).

## 1. Rulings

**Already ruled (above):** the look is Option 1 Soft Lines, the buttons are the 3d+ phase map, the map sits under the
toolbar with the text style bar under it, screen only, slimmer rows, at most 3 named rows, and real calendars are
measured before any UI is built.

**Open, each with the default the build takes unless the owner says otherwise:**

| # | Question | Default |
|---|---|---|
| R1 | A calendar that needs more than 3 rows of phases: what happens to the rest? | Up to 2 more rows as thin 4 px lines with no name (the name on hover). Anything past that shares the last thin line. Revisit after step 1's measurement. |
| R2 | What the map draws | Every phase the month view draws, custom ones and ones hidden in the waterfall included, plus Simultaneous Post and Episode prep. Production is ONE bar (not one per episode or block). All-phase hiatuses are a red mark on the month row and take no row. Not drawn: per-phase hiatuses, off weeks, holidays, notes. |
| R3 | The empty month before and after the calendar (the arrows already reach them) | Shown, dimmed. |
| R4 | A long show (2+ years) | Each month gets at least **36 px** (was 44; changed after step 1's measurement, §12). Past that the map scrolls sideways and keeps the month on screen in view. |
| R5 | Help copy: Export says the month PDF prints "exactly as it looks on screen (minus the paging arrows)" | Becomes: "…in full colour with the header, month and date. On screen the grid lines are drawn lighter; the PDF keeps its black lines." |
| R6 | Today's month | A small navy dot, as mocked. |
| R7 | The row order of the bars | The month view's own phase order (`mvLaneOrder`), packed first-fit, so a month view the owner has reordered gives a matching map. |

## 2. Layout

`.view-toggle-row`'s children become, top to bottom:

1. the view toggle and the tools (unchanged),
2. **the phase map** (new, a full-width line, month view only),
3. the text style bar's host `.style-bar-host` (unchanged, still last).

⛔ The map goes INSIDE `.view-toggle-row`, before `.style-bar-host`. A new sibling between `.view-toggle-row` and
`#table-wrap` would break the sibling contract that `index.html` and `PreviewToolbar.jsx` both document.

- **In the waterfall** the map renders nothing, so the style bar stays exactly where it is today.
- **In the month view** the style bar moves down by the map's height. The owner accepted that with 3d+.
- `#table-wrap` is the month view's `flex:1` scroll box (since `71a6c87`), so it gives up the map's height by itself.
  "THE APP SHELL'S GRID FIT" is not read in the month view, and the toolbar is already observed. Verify; change nothing.
- **Zoom** scales `#table-wrap` only. The map is outside it, so it stays fixed, which is the point of the request.
- ⚠️ **No broad `:has()`.** The 26 Oct lag (`ae39e3e`) came from `body:has(#view-month-btn.active) .preview-panel > *`.
  The map shows or hides from bridged view state in React, not from a `:has()` rule.

## 3. The model: `monthMapModel(schedule)` (new, in `app.js`, not frozen)

Plain data in, plain data out. The model owns every decision about what the map shows, so the harness can test it
without the UI.

- **Months:** `monthRangeForSchedule(currentSchedule)`, the same core ±1 range the arrow handler pages through. Each
  month gets `{y, m, label, edge, today}`. The label is `Oct`, plus `’26` on the first month and on each January.
  `edge` marks the dimmed months either side (R3).
- **The month on screen:** `monthCursor`. The engine already clamps it in `update()` before `render()`.
- **Phases:** `schedule.segments` in `mvLaneOrder()` order. Episode prep (`PREP_KEY`) is pushed into the same list.
  - Each band is `{key, name, fill, ink, from, to, startMonth, row, thin}`.
  - `fill` and `ink` are the segment's `color` and `textColor || textColorFor(color)`, exactly what the month view's
    bars use, so colour overrides come for free.
  - `name` is `phaseDisplayName(key)`, or the segment's own `label` for keys it does not know (Episode prep).
  - `from` and `to` are positions in month units: the month's index plus the fraction of the month elapsed. That is
    the mockup's `pos()`. A segment's `end` is exclusive (`date < s.end`).
- **Simultaneous Post:** from `schedule.weeks[].simPost`, as one band per unbroken run, with `SIMPOST_COLOR` and
  `SIMPOST_TEXT`.
- **All-phase hiatuses:** from the schedule's own hiatus ranges (the ones `isHiatusDate` reads), as `{from, to, name}`
  on the month row, never as a row (R2).
- **Rows:** first-fit packing in the order above, as the mockup does. The first 3 rows are named. Rows 4 and 5 are
  `thin`. The rest share row 5 (R1).
- **The schedule it reads:** in the month view `currentSchedule` is already the whole calendar (`update()` lays
  `fullRange` back over it), so a calendar range never cuts the map. Use `wholeCalendar()` anyway, so the model is
  right in whichever view asks.

## 4. The engine side: push, and go to a month

- **Push.** A new bridge key, `chrome.monthMap(model | null)`, is pushed from `pushViewControls()`, which the existing
  childList observer on `#table-wrap` already runs after every render. That covers paging, edits, Load, undo, New,
  scenario switches and view switches with no new call site (sanctioned pattern 3). It pushes `null` in the waterfall
  or when there is no month range.
- **Go to a month.** A new `goToMonth(first)` sets `monthCursor` to that first-of-month (UTC) when it is inside
  `monthRangeForSchedule(currentSchedule)`, then runs `render(currentSchedule)`. That is the frozen arrow handler's
  exact rule. The handler itself stays as it is.
- **Input.** Delegated on `document`, the `hiddenNotes` pattern: a button with `data-mvgo="2026-10"` goes to that
  month, and `data-mvstep="-1|1"` steps.
- **Not state.** Paging is session UI. Nothing goes into `captureSnapshot()`, nothing marks the file dirty, and nothing
  is an undo step, exactly as the arrows today.

## 5. The React side: `MonthMap.jsx`

- **Where:** rendered by `PreviewToolbar.jsx`, just before `.style-bar-host`. It installs `monthMap` through
  `installChrome`, as `headerModeBtn` does.
- **Draws:** ‹ and › at the ends, the named bands, the thin lines, the hiatus marks, and the month row. The month on
  screen is filled navy, and a light tint runs up through the bands above it.
- **Sizes, the slimmer rows:**
  - a named row is 13 px, with a 2 px gap; a thin row is 4 px;
  - the month row is 20 px.
  - Targets: about 50 px for 1 row, 65 px for 2, 80 px for 3. The mockup's 19 px rows gave about 100.
  - The band label is 9.5–10 px, 600 weight. A band too short for its name shows none, and its name moves to its
    tooltip.
- **Tooltips:** a band reads, for example, "Production, 10/5/26 to 2/26/27. Click to go to October 2026". A month
  reads its full name.
- **Accessibility:** every target is a `<button>` with an `aria-label`, and the month on screen carries
  `aria-current="date"`. Tab moves through them.
- ⛔ **No `id`** on anything in it (`collectFieldValues()`), and no Mantine control that generates ids.
- **Long shows (R4):** each month column is at least 36 px (§12), and a bar at least 8 px. When they do not fit, the band area and the month row
  scroll together, sideways, inside the map, and the month on screen is scrolled into view after each push.
- **Below 960 px** (the stacked layout) the same rule holds. The map is one full-width line of a wrapping row.

## 6. The Soft Lines CSS (C)

A new block in `legacy.css`, OUTSIDE the frozen "Month view" and "Calendar PDF export" blocks. **Every selector starts
`#table-wrap .month-view`**, so it can never match inside `#print-root` (a different subtree of `<body>`, measured
18 Sep 2026). The values are the mockup's `[data-theme="o1"]` block.

- **Paint only:** border and background colours, text colour, and `border-radius` on the outer boxes. No width,
  padding, margin, font-size, line-height or border width changes, so no cell, lane or note moves.
- ⛔ **Trap 1, specificity.** `#table-wrap .mv-weekend` outranks `.mv-day-on`, `.mv-day-off` and every other rule that
  paints a day cell's background. Written naively, it would wipe the tint of a worked weekend (a frozen, owner-approved
  mark). So the background rules exclude every marked cell: `:not(.mv-day-on):not(.mv-day-off)` and any other mark
  step 4 finds.
  - Step 4 starts by listing every rule that paints `.mv-daycell` / `.mv-out` / `.mv-weekend` backgrounds or borders:
    day marks, shoot-day numbers, selection, drag targets, hover.
  - Its leg proves each still paints exactly as before.
- ⛔ **Trap 2, no `overflow:hidden`** on `.mv-body` or `.month-view` to round the corners. It would clip the row-expand
  edge, drag handles and anything hanging past the grid. The corner cells take the radius instead.
- **The month band keeps the month name**, which prints. Only the arrows inside it go (B).
- **Untouched:** pills (the 21 Oct darker outline stays), notes, hiatus bands, the header lines, the "+" affordances.

## 7. Hiding the frozen arrows (B)

`#table-wrap .mv-arrow{ display:none }`, in the same new block, after `#mv-hdr-mode-btn`'s precedent (30 Sep 2026: hidden,
never deleted, a chrome twin does the job).

- The print path already hides them (`#print-root .mv-arrow`). The direct writer never drew them.
- About 100 harness files click `#mv-prev` / `#mv-next` by script. `element.click()` works on a hidden button, so they
  keep working.
- Any leg that clicks them by coordinates, or checks they are visible, needs a fix. Step 3 greps for both.

## 8. What must not change

- **Both month PDFs, byte for byte:** gate 13 (the written PDF) and gate 10 (the print-path documents, the rollback).
- **Everything else:** the waterfall, Excel, the waterfall PDF, the save format (no new key: `captureSnapshot()` is
  untouched), the undo stack, the CSP (nothing new is loaded), and the shareable copy. `buildSavedHtml()` already
  empties `.view-toggle-row` in its clone, so the map cannot travel in a copy.
- **No frozen function is edited, and no frozen CSS rule is edited.** C changes how the month view LOOKS on screen,
  which the freeze otherwise forbids. The owner's instruction of 27 Oct 2026 is what authorises it, and gates 10 and
  13 are the proof that it stays on screen.

## 9. Steps

Each step ends green before the next starts. Nothing is pushed without the owner's picker.

1. **Model and measurement, no UI** (the owner's guardrail).
   - Write `monthMapModel()`, plus a leg, `monthmapmeasure`, that loads every `.sptcal` in `tests/fixtures/` through
     `?state=`. There are 95, all synthetic.
   - It reports, per fixture: months, phases, rows needed before the cap, and the widest month count.
   - **The table goes to the owner before step 3.** If real calendars routinely need more than 3 rows, R1 is re-asked
     with the numbers.
2. **Engine wiring:** `goToMonth()`, the delegated listener, and the bridge push. Leg `monthmap` part A:
   - the model's months are exactly the months the frozen arrows walk;
   - `goToMonth` clamps like the arrow handler;
   - the pushed selection follows the frozen arrows too;
   - a Load, an undo and a scenario switch each re-push.
3. **`MonthMap.jsx` and its CSS.** Leg `monthmap` part B:
   - the row order is toolbar, map, style bar in the month view, and the map is absent in the waterfall;
   - the map's height stays within the targets above;
   - clicks on a month, a phase and each arrow land on the right month;
   - a long fixture scrolls the shown month into view;
   - the today dot is on the right month.

   Then grep the legs that use the arrows (§7) and fix what needs it.
4. **Hide the arrows, add the Soft Lines CSS.** Leg `softlines`, on the fixtures with day marks, half days, shoot-day
   numbers, off weeks, notes and month order (`dayoverrides`, `halfmarks`, `shootdays`, `offweek`, `mvnotes`,
   `mvorder-notes`):
   - every `.mv-*` element's bounding box is identical to the build before C, so nothing moves;
   - every marked cell's computed background, border and colour is identical;
   - plain cells take the new paint.
5. **Docs:**
   - Help copy (R5);
   - UI-CONVENTIONS §7 (the toolbar row's lines) and §10 (the new legs);
   - MANTINE-SEAM (the hidden arrows, the new `#table-wrap`-scoped month block);
   - README changelog and HANDOFF.
6. **Full gate** (`tests/harness/gate.sh`, run alone):
   - gates 10 and 13 byte-identical;
   - the month-view legs that measure geometry re-run: `calzoom` (M2b measures the toolbar row), `mvmenu`,
     `labelsetup`, `phasenum`, `monthnotes`, `pilldrag`, `scenarios`;
   - any leg that assumed `#table-wrap` starts at the same height in both views is updated, with the reason.

   Then the owner sees it in the pane, and commit and push are asked separately on the picker.

## 10. Risks and unknowns

- **Rows on real calendars.** The mockup's made-up show needs 3. Step 1 measures it.
- **Very long shows.** A 30-month show scrolls the map, which weakens "the whole show at a glance". R4 is the
  fallback, not a fix.
- **Screen vs PDF.** Soft grey on screen, black lines in the PDF. This is deliberate for now ("Screen only"). Making
  the PDF follow later means `MVL_PAINT`'s colours, the print path's frozen print rules, and a re-cut of gate 13's
  baselines with the owner's sign-off.
- **Switch lag.** The map is a React re-render on each push. Time the month ↔ waterfall switch in a VISIBLE pane, with
  the click timed synchronously (HANDOFF, 26 Oct), against `ae39e3e`'s ~110 ms.

## 11. Size

Medium. The CSS is small. Most of the work is the model, the React component, and the legs that prove nothing in either
PDF moved.

## 12. Step 1 results (27 Oct 2026)

**Built** (branch `claude/month-rail`, worktree `.claude/worktrees/month-rail`):
- `monthMapModel()` in `app.js`, after `pushViewControls()`: the pure model of §3, nothing from the engine.
- `tests/harness/t/monthmapmeasure.js` and `tests/harness/monthmapmeasure.sh`, which runs the leg once per fixture and
  writes `monthmapmeasure-table.txt` (gitignored).

**How it measures:** "slice it, no hook". The leg pages through every month with the frozen arrows and reads each page
with the month-PDF writer's own parser, `mvlParseMonth`, sliced as `monthlayout` slices it. A phase's span is its
first to last drawn day. It then runs the sliced `monthMapModel` on those spans, in date order, which is R7's order
on a calendar nobody has reordered. Its control (C0) counts the most phases running on any one day by a sweep, and
the model's packing matched it on every calendar.

**On all 94 committed fixtures** (all synthetic test calendars, none a real show):

| Rows needed | Calendars | Which |
|---|---|---|
| 1 | 6 | builtindates, offweek, shootdays, blocks-noeps-v1.5.0, loadfail-colour, loadfail-null-field |
| 2 | 71 | the rest, including every saved-version fixture (v1.3.0 to v1.8.0) |
| 3 | 11 | colreuse, mvdrag, mvorder, mvorder-hostile, mvorder-notes, mvorder-set, carry-rich, custom-nondense, stintswap-chained, colswap-simpost-refuse, customunits |
| 4 | 1 | phasenumbering: a one-day custom "Table Read" on a day three other phases run. R1 draws it as a thin line. |

- **Not measured (5):** loadfail-future (refused by design: saved by a newer version) and parse-bom, parse-empty,
  parse-trunc, parse-utf16 (broken files by design). None draws a calendar.
- **Every leg case passed on the 89 that draw.** The 13 hostile fixtures (xss-*, loadfail-null-*, mvorder-hostile)
  log the load-time sanitizer's own warning, which E0 now records and sets aside.
- **Longest calendar:** colreuse, 29 months. At a 1,440 px window with the sidebar open, the map has about 1,100 px, so
  about 38 px a month: under R4's 44 px minimum, so it would scroll a little.
- **Short phases:** 3 calendars have a phase of 5 days or less (one-day table reads and fittings). At 60 px a month a
  one-day bar is about 2 px wide.

**Changes this makes to the plan (adopted by the owner, 27 Oct 2026, by picker: "Yes, both, start step 2"):**
- R4's minimum drops from 44 px to **36 px a month**, so a 29-month show fits whole at that window size. The year tag
  moves above the month label ("’27" over "Jan"), so a narrow month still reads.
- A bar is never narrower than **8 px**, so a one-day phase can be seen and clicked. Its name goes to the tooltip.
- R1's cap holds with room to spare: 88 of 89 calendars need 3 rows or fewer, and the one that needs 4 does so for a
  single day.

## 13. Step 2 results (27 Oct 2026)

**Built** (uncommitted on `claude/month-rail` at the time of writing):
- `monthMapInput(schedule)` feeds the model from `wholeCalendar(schedule)`:
  - the screen range from `monthCoreRange()` ±1. ⛔ Never `monthRangeForSchedule()`, which consumes the print path's
    one-shot `mvPrintRangeOnce`.
  - the phases in `mvLaneOrder()` order with the bars' own colours. Episode prep uses `firstDay..lastDay`, as
    `monthCoreRange` reads it.
  - Sim Post from `weeks[].simPost` runs, Monday to Friday, placed after the phases.
  - the all-phase hiatuses from `schedule.hiatuses`, named with `HIATUS_DEFAULT_LABEL`.
- `pushMonthMap()` sends `chrome.monthMap(model | null)` from its own childList observer on `#table-wrap`. It is
  registered in the map's section, not inside `pushViewControls()`, which runs at evaluation time before the
  section's `const`s exist. It pushes null in the waterfall, during the print walk, and with no phases.
- `goToMonth('YYYY-MM')`: the frozen arrow handler's range rule at the screen's range. Paging is still session UI.
- A delegated `document` click listener: `data-mvgo="YYYY-MM"` / `data-mvstep="-1|1"`.
- `bridge.js`: the `monthMap` key, a no-op until step 3's `MonthMap.jsx` installs it.

**Leg `monthmap`, part A** (7 cases), all green on 9 fixtures: mvnotes, episodeprep, colreuse (29 months), hidewf,
scenarios-3, blocks, customunits, phasenumbering, offweek. It makes its own buttons carrying the two attributes:
- a month by `data-mvgo`, and every month the frozen arrows page through, the dimmed ends included;
- the months past both ends refused; stepping stops where the frozen arrows are disabled;
- garbage refused; undo and the save status unchanged;
- nothing at all in the waterfall;
- no console errors over every render, in both views.

⚠️ It caught a real bug first: `data-mvgo="2026-13"` landed on January 2027, because `Date.UTC` rolls month 12 over.
`goToMonth` now checks the month is 01–12.

**Not yet proved, by design:** what `monthMapInput` pushes. Nothing consumes the push until step 3. Part B will hold
the pushed model to the month view itself (the bars that the step 1 leg reads off every page).

**Unchanged and re-run green:** mvmenu 89/89, monthnotes 7/7, hdrcontrols 12/12, monthlanes 6/6, halfmarks 5/5,
calzoom 26/26, monthmapmeasure 6/6, `npm run check` 40/40. No frozen function or rule was touched.

## 14. Step 3 results (27 Oct 2026)

**Built** (uncommitted at the time of writing):
- **`src/chrome/MonthMap.jsx`**, rendered by `PreviewToolbar.jsx` just before `.style-bar-host`. It draws `chrome.monthMap`:
  - ‹ and ›, named bars (13 px) and thin ones (4 px), month dividers (darker at each January), the red hiatus marks on
    the month row, and the month buttons with the year above the first month and each January;
  - the month on screen is navy with a tint up through the bars, edge months are faint, and this month has a dot.
  - Bars have an 8 px minimum. A bar under 30 px keeps its name in the tooltip only.
  - Months are at least 36 px; past that the map scrolls sideways and keeps the month on screen in view.
  - Plain buttons carrying `data-mvgo` / `data-mvstep`. No ids, no form fields.
- **CSS** in `legacy.css`, "The phase map above the month view", just before the text style bar's block. No `.mv-*`
  rule, nothing under `#table-wrap`.
- **Engine:** Production's span is now its first to last SHOOT day (`shootDays`). Its segment's `end` is week-based,
  so the bar ran on past a Tuesday wrap to the Sunday. Leg B2 caught it.

**Measured** in the pane, 1440 × 900:
- **Heights:** 54 px for one row, 69 for two, 84 for three, 90 for three plus a thin row.
- **Stacked layout (900 px):** the map is the row's full width, with no sideways page scroll.
- **Switch timing:** month → waterfall 97–122 ms over 5 clicks, timed synchronously in a visible pane, the same as
  `ae39e3e`'s ~110 ms. Waterfall → month is ~20 ms; the map draws in React's next task.

**Leg `monthmap`, now 15 cases (parts A and B):** all green on 15 fixtures: offweek, mvnotes, episodeprep, colreuse,
hidewf, scenarios-3, blocks, customunits, phasenumbering, carry-rich, halfdays, shootorder, dayoverrides, hiatusdrag,
sideboxes. Part B checks:
- the map's place in the toolbar row;
- its months and highlight against the frozen arrows on every page;
- every phase the month view draws has a bar over its drawn days, and past them only over weekends and the
  hiatus or off-week days drawn in its place;
- real `.click()`s on a month, a bar, ‹ and ›, and both arrows disabled at the ends;
- the 36 px minimum and the month in view;
- the height cap, this month's dot, no ids, and the map gone in the waterfall.

⚠️ **Leg trap:** `requestAnimationFrame` may never fire under `--virtual-time-budget`. The leg then waits out the
budget and reports STILL PENDING. It waits on a 30 ms timer instead.

**Existing legs re-run green on this build:** mvmenu 89/89, calzoom 26/26, monthnotes 7/7, hdrcontrols 12/12,
labelsetup 41/41, mvhdroff 9/9, hidewf 19/19, sideboxes 78/78, textstyle 51/51, scenarios 22/22, scenariofacts 12/12,
calrange 18/18, phasecolors 10/10, regionlock 14/14, settingswin 21/21, loadcarry 6/6, holidays2031 6/6,
zoomresize 40/40, phasenum 31/31 and 24/24. `npm run check` 40/40.

**Not done in step 3, by plan:** hiding the frozen arrows and the Soft Lines look (step 4); docs (step 5); the full
gate (step 6).

## 15. Step 4 results (27 Oct 2026)

**Built** (uncommitted at the time of writing): `legacy.css`, "Soft Lines: the month view's ON-SCREEN look", an
`@media screen{...}` block just before the text style bar's. Every selector starts `#table-wrap .month-view`. No frozen
rule was edited.

Two values changed from the mockup, so nothing moves:
- The arrows go by `visibility:hidden` + `pointer-events:none`, not `display:none`. Their boxes still size the month
  band, so the grid does not rise 1.5 px.
- No font-size, padding or weight change on a box that sizes itself. The mockup's 16 px month name, 10.5 px day names
  and 20 px padding are dropped.

The tints exclude `.mv-day-on`, `.mv-day-off`, `.mv-day-half` and `:hover`. The two bottom corner cells take the
radius, with no `overflow:hidden`.

**Leg `softlines`** (6 cases). In ONE run it measures every month page with the block, deletes the block from the
page's own stylesheet, measures again, and puts it back. No baseline file, no hook. Green on 10 fixtures:
dayoverrides, dayoverrides-onhalf, halfmarks, shootdays, offweek, mvnotes, mvorder-notes, carry-rich, halfdays, blocks
(148 pages, ~19,000 bar and note elements).
- **L1:** every element's box identical to 0.01 px.
- **L2:** marked days, bars, notes, hiatus bands and header lines paint identically.
- **L3:** the soft tints and lines are right.
- **L4:** the frozen arrows are hidden and take no pointer clicks, yet a scripted click still pages the month.

⚠️ **Leg trap:** read a computed style BEFORE a click that re-renders. A detached element's computed style is empty.

**Gates:**
- **Gate 10** (the printed month documents, 11 calendars) and **gate 13** (21 written month PDFs, byte for byte):
  293 PASS, 0 FAIL. Both month PDFs are unchanged, as the owner's "Screen only" requires.
- **Gate 7** (`fence.js`, by hand, the step-3 build vs this one): 511 entries, 0 differ.

**Re-run on this build:**
- monthmap 15/15 ×3 (mvnotes, colreuse, dayoverrides) and softlines 6/6 ×2;
- mvmenu 89/89, calzoom 26/26, monthnotes 7/7, hdrcontrols 12/12, monthlanes 6/6, halfmarks 5/5;
- labelsetup 41/41, mvhdroff 9/9, hidewf 19/19, sideboxes 78/78, scenarios 22/22, scenariofacts 12/12;
- calrange 18/18, phasecolors 10/10, regionlock 14/14, settingswin 21/21, loadcarry 6/6, holidays2031 6/6;
- zoomresize 40/40, phasenum 31/31 and 24/24, offweek 42/42.
- In that 29-leg batch, **textstyle** (timed out waiting for a Load after 33/33) and **shootdays** (A9a, a Load right
  after a Load) failed once each. Alone they passed: textstyle 51/51, shootdays 14/14 twice. Recorded as Load-timing
  flakes under the long batch, the kind HANDOFF already records for offweek R13.

**Next:** step 5 (Help copy R5, UI-CONVENTIONS §7/§10, MANTINE-SEAM, README changelog) and step 6 (the full gate,
alone).
