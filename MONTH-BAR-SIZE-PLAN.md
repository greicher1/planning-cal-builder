# MONTH-BAR-SIZE-PLAN.md: bigger phase bars in the month view

**Status: PLANNED, no code. Rulings R0–R7 OPEN, each with a recommended default.** On the tracker as `month-bar-size`.

Owner, 27 Oct 2026:

> *"what would it take to allow increasing the size of phase bars in the month view?"*

Then, after the scoping answer: *"Write a plan for bigger month-view phase bars, with the rulings up front and a
recommended default for each."*

**Scope:** a calendar setting that makes the month view's phase bars bigger, on screen and in the month PDF.
**Out of scope:** notes, hiatus bands, the day cells, the waterfall, Excel and the waterfall PDF.

If the goal is only to read the bars more easily on screen, the calendar zoom already does that. This setting makes the
bars bigger *relative to the rest of the month*, and in the PDF.

---

## 1. Rulings (each has a recommended default; nothing is built until all eight are answered)

**R0. May the month view's look change for this setting? OPEN.**
The bars' size is set by frozen month-view CSS (`.mv-bars`, `.mv-bar`, `.mv-pill`). The print-path month PDF prints
that CSS. CLAUDE.md says a change to the frozen surface's look needs a specific instruction and an agreed gate.
- **(a) Yes, for this opt-in setting only. RECOMMENDED.** Three frozen edits (E1–E3, §4). At Standard every one of them
  matches nothing, so the gate is:
  - gates 10 and 13 byte-identical on every existing calendar;
  - a full gate green;
  - new gate-13 baselines for one synthetic Large calendar, cut with your sign-off.
- (b) No. Then only the PDF could change, because the PDF writer is not frozen (R4(b)).

**R1. Which bars grow? OPEN.**
- **(a) Phase bars only. RECOMMENDED.** Every phase bar, Production's episode and block bars, and Simultaneous Post:
  everything drawn as a pill. Hiatus bands, notes and the "+" slots keep today's size.
- (b) Phase bars and hiatus bands, so a phase's run and its pause match.
- (c) Everything inside the weeks, notes included: a "month text size". This changes how notes wrap, the 6-line cap
  per week and the note editor's measure. It is a much larger job and would get its own plan.

**R2. What grows? OPEN.**
- **(a) The text and the bar together. RECOMMENDED.**
- (b) A thicker bar with today's 10 px text. Labels are never cut more often, but the bars look emptier.

**R3. Which sizes? OPEN.**
- **(a) Standard · Large · Extra large. RECOMMENDED.** One control with three choices. Measured costs are in §3. The
  sizes are in §2.
- (b) One switch: Standard or Large. Simplest, but if Large is too timid it means another round.
- (c) Any size (a slider or a number). Not recommended: it is harder to understand (your "keep it simple" rule), and
  every size is a layout the tests have never seen.

**R4. On screen, in the PDF, or both? OPEN.**
- **(a) Both. RECOMMENDED.** The month view is what prints, so they should agree.
- (b) The PDF only. This needs no frozen edit at all, because the writer is not frozen. But the screen would no
  longer show what prints.
- (c) The screen only. The zoom already covers most of this.

**R5. Saved with the calendar, or kept on each computer? OPEN.**
- **(a) Saved in the calendar. RECOMMENDED.** This is how Number Production Days works. Everyone who opens the file
  sees and prints the same bars, and a change dirties the file and is one undo step.
- (b) A per-user preference, as the grey-label switches are. Then two people printing one calendar can get different
  month PDFs.

**R6. Where is the control? OPEN.**
- **(a) Settings ▸ Preferences ▸ Month view, in the card's second block beside Number Production Days. RECOMMENDED.**
  Label: *Phase bar size*.
- (b) The month view's toolbar. It is always visible, but it takes header room for a set-once choice.
  (The bar's right-click menu is ruled out by your lean-menus rule.)

**R7. Does the print rollback follow? OPEN.**
- **(a) Yes. RECOMMENDED.** This needs E3: two CSS rules under `#print-root`, inert at Standard. It keeps the rollback
  honest. It also lets the `monthemit` leg check the writer's Large and Extra large bars against Chrome's own print
  layout, which is the check every writer change has had since step 3 of the writer plan.
- (b) No. The rollback prints Standard, and the writer's bigger bars are checked only by its own legs.

## 2. Defaults taken (no ruling needed; tell me to change any)

1. **The sizes.** Bar height is the text's line (×1.5) plus 1 px of padding and 1 px of border, top and bottom.

   | Size | Label | Grey tag | Bar height on screen | Bar height in the PDF | Corner radius |
   |---|---|---|---|---|---|
   | Standard (today) | 10 px | 9 px | 17 px | 19 px | 9 px |
   | Large | 12 px | 11 px | 22 px | 22 px | 11 px |
   | Extra large | 14 px | 12 px | 25 px | 25 px | 13 px |

   Today the screen bar is 17 px (it stretches to a fixed 17 px lane) and the printed one is 19 px (print sizes lanes
   to their content). At Large and Extra large both are sized by their content, so screen and PDF agree. The radius
   keeps the ends fully round, as 9 px does on today's bars.
2. **Unchanged:** the bars' side padding, weights, outline (the 1.5 px ring in the phase's own ink), the half-day
   shade, the grey tag's gap, and everything outside the bars.
3. **Only lanes that hold a phase bar grow.** A lane of notes or bands stays 17 px on screen. On screen, a note that
   shares a lane with a bigger bar (on another day of that week) stretches to the lane's height. Every bar does that on
   screen today. In the PDF it keeps its own height at the top of the lane, as print does today.
4. **The zoom multiplies on top**, as it does now.
5. **Each scenario tab has its own size**, because the setting lives in the calendar's snapshot like every other
   calendar setting.
6. **A one-day custom phase whose label wraps to two lines** is measured at the bar's own size, so it wraps where it
   would be cut.

## 3. What was measured (27 Oct 2026)

**How:** the `monthwriter` leg on the build of `ae39e3e`, run against throwaway copies of `src/legacy/app.js` with the
writer's phase bars set taller, then also with bigger text (`?src=`, the leg's mutant path). `app.js` itself was not
edited. The calendars were tier 1 (eight calendars, 124 months), `monthscale`, `month-dense60` and `mvnotes`: 173
months in all.

**The fit: bigger bars cost almost nothing in the PDF.** A month that is too full for its page shrinks to fit. Large
shrinks no month that Standard does not, and Extra large shrinks the same three months a little more:

| Calendar | Month | Standard | Large | Extra large |
|---|---|---|---|---|
| month-lanecap | August | 0.469 | 0.469 | 0.453 |
| monthscale | August | 0.609 | 0.609 | 0.594 |
| month-dense60 | August | 0.766 | 0.750 | 0.734 |
| the other 170 months | | fit | fit | fit |

This is because a printed bar is already 19 px. Large adds 3 px per phase lane and Extra large adds 6, and a printed
week has room to spare.

**Labels cut short with "…", across all 173 months:**
- Standard: 2
- Large: 2 (the same one-day custom phase as at Standard)
- Extra large: 9

The extra cuts at Extra large are all in Production's bars on short pieces: the grey tag loses the end of its episode
list ("Ep. 209, …"), or the "Production Week" tag is cut after "We…".

**Not measured yet:** anything on screen (nothing is built), hit-testing on bigger bars, and how much taller the month
view gets. By arithmetic: a week with three phase lanes is 112 px today, 127 px at Large, 136 px at Extra large.
Since 26 Oct the month view scrolls in its own box, so that is more scrolling, not a moved toolbar.

## 4. How it works

### 4.1 The state: `mvBarSize`
- A new snapshot key, built in Number Production Days' shape (`mvNumberShootDays`):
  - values `'large'` or `'xl'`; **Standard is an ABSENT key**, so every calendar saved before the setting opens exactly
    as it did, and a Standard calendar's snapshot is byte-for-byte unchanged;
  - `sanitizeSnapshot()` drops any other value;
  - `applyStateSnapshot()` restores it **unconditionally** (absent means Standard, never "keep what is in memory");
  - New resets it;
  - the setter runs `update()` and `markDirty()`, so a change dirties the file and is one undo step.
- ⛔ The key and both values are permanent from the first file saved with them.
- **No `SNAPSHOT_VERSION` bump.** An older build ignores the key and draws Standard, which is a safe misreading
  (the `'onhalf'` precedent).
- A reflect function sets `body.mv-bar-large` or `body.mv-bar-xl` on every path that can change the value: a pick, a
  Load, undo and redo, backup recovery and New.

### 4.2 The screen: frozen edit E1 (CSS only)
Every rule is under the body class and scoped to `#table-wrap`, so at Standard it matches nothing. It can never match
inside `#print-root`, which is not inside `#table-wrap`.
- `.mv-bars{ grid-auto-rows: minmax(17px, auto) }`: lanes are sized by what is in them, as print already sizes them.
- `.mv-bar:not(.mv-pill){ contain: size }`: notes, bands and "+" slots add no height of their own. A lane without a
  phase bar therefore stays exactly 17 px. Without this, a one-line note's lane would grow to its natural 19 px.
- `.mv-pill{ font-size; border-radius }` and `.mv-pill-block{ font-size }` at the §2 sizes.
- ⚠️ **`contain: size` on a grid item is the one new mechanism here**, and step 1 measures it before anything else is
  built. A note spanning two or three lanes must keep exactly the lanes it has today.
- Renderer-free: `renderMonthView` emits the same HTML at every size. The edge grips, the reorder grip, the drag
  ghost and the day menu all read bars by their rects, and no month interaction code assumes a 17 px lane (checked).

### 4.3 Frozen edit E2: the wrapping one-day pill
`mvPillLineCount()` measures at 10 px with a 15 px line. It takes the bar's size, and its cache key includes the size.
At Standard it measures exactly as now. Without E2, a one-day custom phase whose label fits on one line at 10 px but
not at 12 px would be cut with "…" instead of wrapping.

### 4.4 The month PDF writer (not frozen; held by gate 13's bytes)
- `MVL_PAINT` gains the §2 table. ⚠️ It is a hand copy of E1, the hazard `MVL_PAINT` already lives with. Under R7(a)
  the `monthemit` leg catches a drift.
- `mvlWeekPaint(k)` adds `S.pill` and `S.pillTag`: the bar's numbers at the month's size, times the shrink factor `k`.
  `mvlBarHeight`, `mvlPaintBar` and `mvlPillLines` read them for pills and Simultaneous Post. Notes and bands keep
  reading `S.bar`.
- The writer never reads engine state: it is sliced and run standalone by its legs. So `exportMonthPdfDirect()`
  stamps `barSize` on each month, exactly as it stamps `headerOff` for the month header's Off. A month with no stamp
  draws every number from today's `MVL_PAINT`, so a Standard calendar's file is byte-identical.
- The `F0` leg's list of the writer's public entry points is unchanged. The `.ics` export plan reads only the model, so
  it is unaffected.

### 4.5 The print rollback: frozen edit E3 (under R7(a))
The same font-size and radius rules under the body class and `#print-root`. Print already sizes lanes by content, and
frozen `exportMonthPdf()` measures each week's real height (`scrollHeight`), so no script changes. Its 19 px-per-lane
constant only shares out spare room between weeks.

### 4.6 The control
- A `SegmentedControl` (Standard · Large · Extra large) in `MonthViewCard`, built the way `ProdLabelControl` is built:
  - an explicit `name="mv-bar-size"`, so its radio ids are stable (UI-CONVENTIONS §8.3);
  - inside `.prefs-card`, so `collectFieldValues()` skips it and `fields.byId` does not grow;
  - its value comes in through `bridge.js`, and a pick goes out as the radios' native `click`.
- Title: *"How big the phase bars are in the month view, on screen and in the month PDF. Saved with the calendar."*

## 5. Build steps

**Step 0: the rulings.**

**Step 1: prove E1's mechanism before building on it.**
- In a throwaway build: on `mvnotes` and `month-dense60`, measure that lanes without a phase bar are 17 px, lanes with
  one are 22 or 25 px, and multi-lane notes keep their lanes. Measure again at 150% zoom.
- If `contain: size` does not hold, the fallback is for `renderMonthView` to write each week's lane sizes itself. That
  is a bigger frozen edit, and it comes back to you before it is built.

**Step 2: the setting, the screen and the leg.**
- §4.1, §4.6, E1 and E2.
- A new leg, `mvbarsize`, with every click HIT-TESTED:
  - **B0:** at Standard nothing moved: no class, no key in a Save, and every lane and bar at today's height.
  - **B1:** at Large and Extra large, bar heights, lane heights and text sizes as in §2. Lanes without a phase bar
    stay 17 px.
  - **B2:** a body drag, an edge grip, the reorder grip, the day menu, a "+" slot and the day-number band each land
    on a bigger bar's week.
  - **B3:** one undo step. Save writes the key, and Load brings it back. A file without the key, loaded after one
    with it, opens at Standard (the M-5 trap). New resets it. `fields.byId` is unchanged.
  - **B4:** at 150% zoom.
  - **B5:** a one-day custom pill wraps at its own size.
  - **B6:** the shareable copy.
- Mutants:
  - no containment, so a note's lane grows (red on B1);
  - E2 removed, so a cut instead of a wrap (red on B5);
  - a sanitizer that keeps junk;
  - restore left conditional (red on B3).
- The legs that drive the month view by hand (`mvmenu`, `mvnotes`, `labelsetup`, `phasenum`, `calzoom`,
  `monthdragundo`) run unchanged at Standard. B2 covers their gestures at the bigger sizes.

**Step 3: the writer and the print rollback.**
- §4.4 and E3.
- A synthetic fixture, `mvbarsize-large.sptcal`, minted from the leg's own Save (no real show or schedule).
- At Large and Extra large: `monthemit` (boxes against Chrome's print layout), `monthwriter` (the fit) and
  `monthexport` (the built app's file).

**Step 4: the gate.**
- The full gate.
- Gates 10 and 13 byte-identical on every existing calendar.
- New gate-13 baselines for the new fixture, cut only with your sign-off.
- `npm run check`.
- The changelog, HANDOFF and a version cut.

**Step 5: ship**, on your picker, commit and push asked separately.

**Size:** M–L. Probably steps 1–2 in one session and steps 3–4 in another. It is the first month-view change that
alters row heights on purpose. That is why step 1 exists.

## 6. What it does not change
- the waterfall, Excel, the waterfall PDF, the Compare PDF;
- notes, hiatus bands, the day cells, shoot-day numbers, the month header;
- the `.ics` export's events;
- any calendar that never picks a size: every saved file opens, draws and prints byte-for-byte as before.

## 7. Risks and interactions
- **`contain: size`** is unproven here (step 1).
- **Extra large cuts more Production tags** on short pieces (§3). Large measured no extra cuts.
- **The month view gets taller on screen** (§3's arithmetic): more scrolling at 100%.
- **The month-view redesign** (`month-view-modern-look`, five options, open) also adds `#table-wrap`-scoped month
  CSS. Its options 1–4 only change colours and lines, so the two are independent. Option 5 narrows each day by about
  6 px, which would cut more labels at Extra large. Whichever lands second re-runs step 1's measurements.
- **The `MVL_PAINT` hand copy** grows by one table. R7(a) is what keeps it honest.
- **Month text styling** (`month-text-style`, scoped and ruled 27 Oct 2026 in another session, no plan file yet) lets
  the text style bar style bar and note text in the month view. Its size ruling, *"Only sizes that fit"*, keeps bar
  text to what fits today's bars (about 12 px with a capped line height, by arithmetic) and leaves bigger bars to this
  plan. The two touch the same places: `mvlPaintBar`, `mvPillLineCount` / `mvlPillLines`, and the pill's font size.
  The rule that keeps them apart is that **this setting sets a bar's height and default text size; a text style sets
  one bar's own text inside that height.** So at Large and Extra large the style bar's size list for bars would offer
  up to that size's text. That needs no ruling now. Whichever plan builds second adopts it and re-runs the other's
  legs.
