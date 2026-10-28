# MONTH-BAR-SIZE-PLAN.md: bigger phase bars in the month view

**Status: PLANNED, no code. ALL EIGHT RULINGS ANSWERED (owner, by picker, 27 Oct 2026): every recommendation taken
except R1, where the owner chose (b), phase bars AND hiatus bands.** **Step 1 DONE (27 Oct 2026): the screen mechanism
holds.** **Step 2 DONE (27 Oct 2026) on branch `month-bar-size`:** the setting, the control, E1 and E2, and the
`mvbarsize` leg. E1's `min-height` became a FIXED `height` (§4.2). **Step 3 DONE (27 Oct 2026) on the same branch:**
the month PDF writer draws the picked size and the print rollback follows it (E3). The size reaches the writer as an
ARGUMENT, not a stamp (§4.4). One 1.31 px difference from Chrome's print is recorded (§5, step 3). Next is step 4, the
full gate and the baselines. On the tracker as `month-bar-size`.

Owner, 27 Oct 2026:

> *"what would it take to allow increasing the size of phase bars in the month view?"*

Then, after the scoping answer: *"Write a plan for bigger month-view phase bars, with the rulings up front and a
recommended default for each."*

**Scope:** a calendar setting that makes the month view's phase bars and hiatus bands bigger, on screen and in the
month PDF (R1(b)).
**Out of scope:** notes, the day cells, the waterfall, Excel and the waterfall PDF.

If the goal is only to read the bars more easily on screen, the calendar zoom already does that. This setting makes the
bars bigger *relative to the rest of the month*, and in the PDF.

---

## 1. Rulings (all eight RULED, owner, by picker, 27 Oct 2026)

**R0. May the month view's look change for this setting? RULED (a)**, owner by picker: *"Yes, this setting only"*.
The bars' size is set by frozen month-view CSS (`.mv-bars`, `.mv-bar`, `.mv-pill`). The print-path month PDF prints
that CSS. CLAUDE.md says a change to the frozen surface's look needs a specific instruction and an agreed gate.
- **(a) Yes, for this opt-in setting only. RECOMMENDED.** Three frozen edits (E1–E3, §4). At Standard every one of them
  matches nothing, so the gate is:
  - gates 10 and 13 byte-identical on every existing calendar;
  - a full gate green;
  - new gate-13 baselines for one synthetic Large calendar, cut with your sign-off.
- (b) No. Then only the PDF could change, because the PDF writer is not frozen (R4(b)).

**R1. Which bars grow? RULED (b)**, owner by picker: *"Phase bars and hiatus bands"* (against the recommendation).
- (a) Phase bars only. Was RECOMMENDED. Every phase bar, Production's episode and block bars, and Simultaneous Post:
  everything drawn as a pill. Hiatus bands, notes and the "+" slots keep today's size.
- **(b) Phase bars and hiatus bands, so a phase's run and its pause match. CHOSEN.** Every pill as in (a), plus every
  hiatus band, an all-phase band or one phase's own. Notes and the "+" slots keep today's size. Re-measured with bands
  included: the cost is the same as (a)'s (§3).
- (c) Everything inside the weeks, notes included: a "month text size". This changes how notes wrap, the 6-line cap
  per week and the note editor's measure. It is a much larger job and would get its own plan.

**R2. What grows? RULED (a)**, owner by picker: *"Text and bar together"*.
- **(a) The text and the bar together. RECOMMENDED.**
- (b) A thicker bar with today's 10 px text. Labels are never cut more often, but the bars look emptier.

**R3. Which sizes? RULED (a)**, owner by picker: *"Standard, Large, Extra large"*.
- **(a) Standard · Large · Extra large. RECOMMENDED.** One control with three choices. Measured costs are in §3. The
  sizes are in §2.
- (b) One switch: Standard or Large. Simplest, but if Large is too timid it means another round.
- (c) Any size (a slider or a number). Not recommended: it is harder to understand (your "keep it simple" rule), and
  every size is a layout the tests have never seen.

**R4. On screen, in the PDF, or both? RULED (a)**, owner by picker: *"Screen and PDF"*.
- **(a) Both. RECOMMENDED.** The month view is what prints, so they should agree.
- (b) The PDF only. This needs no frozen edit at all, because the writer is not frozen. But the screen would no
  longer show what prints.
- (c) The screen only. The zoom already covers most of this.

**R5. Saved with the calendar, or kept on each computer? RULED (a)**, owner by picker: *"Saved in the calendar"*.
- **(a) Saved in the calendar. RECOMMENDED.** This is how Number Production Days works. Everyone who opens the file
  sees and prints the same bars, and a change dirties the file and is one undo step.
- (b) A per-user preference, as the grey-label switches are. Then two people printing one calendar can get different
  month PDFs.

**R6. Where is the control? RULED (a)**, owner by picker: *"Settings, Month view card"*.
- **(a) Settings ▸ Preferences ▸ Month view, in the card's second block beside Number Production Days. RECOMMENDED.**
  Label: *Phase bar size*.
- (b) The month view's toolbar. It is always visible, but it takes header room for a set-once choice.
  (The bar's right-click menu is ruled out by your lean-menus rule.)

**R7. Does the print rollback follow? RULED (a)**, owner by picker: *"Yes, it follows"*.
- **(a) Yes. RECOMMENDED.** This needs E3: two CSS rules under `#print-root`, inert at Standard. It keeps the rollback
  honest. It also lets the `monthemit` leg check the writer's Large and Extra large bars against Chrome's own print
  layout, which is the check every writer change has had since step 3 of the writer plan.
- (b) No. The rollback prints Standard, and the writer's bigger bars are checked only by its own legs.

## 2. Defaults taken (no ruling needed; tell me to change any)

1. **The sizes**, for a phase bar and a hiatus band alike (R1(b)). Bar height is the text's line (×1.5) plus 1 px of
   padding and 1 px of border, top and bottom.

   | Size | Label | Grey tag | Bar height on screen | Bar height in the PDF | Corner radius |
   |---|---|---|---|---|---|
   | Standard (today) | 10 px | 9 px | 17 px | 19 px | 9 px |
   | Large | 12 px | 11 px | 22 px | 22 px | 11 px |
   | Extra large | 14 px | 12 px | 25 px | 25 px | 13 px |

   Today the screen bar is 17 px (it stretches to a fixed 17 px lane) and the printed one is 19 px (print sizes lanes
   to their content). At Large and Extra large both are sized by their content, so screen and PDF agree. The radius
   keeps the ends fully round, as 9 px does on today's bars.
2. **Unchanged:** the bars' side padding, weights, outline (the 1.5 px ring in a phase's own ink; a band's 18% rim),
   the half-day shade, the grey tag's gap, a band's centred label, and everything outside the bars. A band whose label
   was emptied still draws full height (the 1 Oct 2026 ruling), now at its size's height.
3. **Only lanes that hold a phase bar or a band grow.** A lane of notes stays 17 px on screen. On screen, a note that
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

**Re-measured after R1(b), with hiatus bands growing too** (the same calendars, which include all-phase and
per-phase hiatuses and an emptied band): the same three months shrink by exactly the same factors, and the cut labels
are the same 2 and 9. Every band in those calendars fits its label at both sizes.

**Labels cut short with "…", across all 173 months:**
- Standard: 2
- Large: 2 (the same one-day custom phase as at Standard)
- Extra large: 9

The extra cuts at Extra large are all in Production's bars on short pieces: the grey tag loses the end of its episode
list ("Ep. 209, …"), or the "Production Week" tag is cut after "We…".

**On screen** (measured in step 1, §5): a month is a median of 4.4% taller at Large and 7.1% at Extra large. Since
26 Oct the month view scrolls in its own box, so that is more scrolling, not a moved toolbar. Hit-testing on bigger
bars is step 2's.

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
- `.mv-bar:not(.mv-pill):not(.mv-hiatus-bar){ contain: size }`: notes and "+" slots add no height of their own. A
  lane without a phase bar or band therefore stays exactly 17 px. Without this, a one-line note's lane would grow to
  its natural 19 px.
- `.mv-pill, .mv-hiatus-bar{ font-size; border-radius; height }` and `.mv-pill-block{ font-size }` at the §2 sizes.
  `height` is the bar height (22 or 25 px), and two lines' worth (40 or 46 px) on a wrapping one-day bar
  (`.mv-pill-2l`).
- ⭐ **The FIXED height came from measurement, in two rounds.**
  - Without any height (step 1, run 1), two things go wrong:
    - At 150% zoom, Chrome rounds the bar's 1 px borders to whole device pixels. A Large lane then comes out 21.33 px
      in the box's own px, not 22.
    - A band whose label was emptied has no line of text, so it adds nothing to its lane's height. It stayed 17 px,
      breaking the 1 Oct 2026 "full height" ruling.
  - Step 1 fixed both with `min-height`. **Step 2's leg then found 75% zoom still wrong:** the rounded borders make the
    text-sized bar TALLER than the minimum, so lanes came out over 22 px. A fixed `height` is exact at every zoom
    (B4: 75%, 150% and 200%).
  - Its content box is exactly the text's line, so nothing is cut at 100%. Under a zoom the rounding can take a
    fraction of a device pixel off the bottom padding.
- A fixed-height bar does not stretch. In a lane made taller by a two-line bar that shares it, a one-line bar keeps
  its own height at the top of the lane. Notes and "+" slots still stretch to fill their lanes.
- ✅ **`contain: size` on a grid item, the one new mechanism here, is PROVEN (step 1, §5).** Every lane with no bar or
  band stayed exactly 17 px, and every note spanning two or three lanes kept exactly the lanes it has today.
- Renderer-free: `renderMonthView` emits the same HTML at every size. The edge grips, the band grips, the reorder
  grip, the drag ghost and the day menu all read bars by their rects, and no month interaction code assumes a 17 px
  lane (checked).

### 4.3 Frozen edit E2: the wrapping one-day pill
`mvPillLineCount()` measures at 10 px with a 15 px line. It takes the bar's size, and its cache key includes the size.
At Standard it measures exactly as now. Without E2, a one-day custom phase whose label fits on one line at 10 px but
not at 12 px would be cut with "…" instead of wrapping.

### 4.4 The month PDF writer (not frozen; held by gate 13's bytes)
- `MVL_PAINT` gains the §2 table. ⚠️ It is a hand copy of E1, the hazard `MVL_PAINT` already lives with. Under R7(a)
  the `monthemit` leg catches a drift.
- `mvlWeekPaint(k)` adds `S.big` and `S.bigTag`: the bar's numbers at the month's size, times the shrink factor `k`.
  `mvlBarHeight`, `mvlPaintBar` and `mvlPillLines` read them for pills, Simultaneous Post and hiatus bands. Notes keep
  reading `S.bar`.
- The writer never reads engine state: it is sliced and run standalone by its legs.
  - ⭐ **As built (step 3), the size is an ARGUMENT, not a stamp.** `buildMonthLayout(schedule, inter500, inter600,
    barSize)` hands it to `mvlMonthLayout(html, widthOf, pillWidthOf, barSize)`, because the model decides whether a
    one-day custom pill wraps while it is being built, at the bars' own size.
  - The 10 px measure it is given is scaled by size ÷ 10. A width is linear in the size (`ttfTextWidth`), so the app
    and every leg get the same answer from the same function.
  - A sized month carries `barSize`, which the fit and the emitter read (`mvlWeekPaint(k, size)`).
  - A Standard month carries no such key, so its model is the JSON it always was, and its file is byte-identical.
- The sizes are `MVL_BAR_SIZES` (frozen objects). They are declared WITH THE MODEL, before `buildMonthLayout`, because
  the `monthlayout` leg slices the model alone; `MVL_PAINT.barSizes` is the same object.
- The `F0` leg's list of the writer's public entry points is unchanged. The `.ics` export plan reads only the model, so
  it is unaffected.

### 4.5 The print rollback: frozen edit E3 (under R7(a))
The same font-size, radius and FIXED height rules (`.mv-pill`, `.mv-hiatus-bar`, `.mv-pill-2l`, `.mv-pill-block`) under the body
class and `#print-root`. The writer's heights are the same numbers by construction: line ×1.5 + 4, or two lines + 4. Print already sizes lanes by content, and
frozen `exportMonthPdf()` measures each week's real height (`scrollHeight`), so no script changes. Its 19 px-per-lane
constant only shares out spare room between weeks.

### 4.6 The control
- A `SegmentedControl` (Standard · Large · Extra large) in `MonthViewCard`, built the way `ProdLabelControl` is built:
  - an explicit `name="mv-bar-size"`, so its radio ids are stable (UI-CONVENTIONS §8.3);
  - inside `.prefs-card`, so `collectFieldValues()` skips it and `fields.byId` does not grow;
  - its value comes in through `bridge.js`, and a pick goes out as the radios' native `click`.
- Label *Phase bar size*, as ruled (R6). Title: *"How big the phase bars and hiatus bands are in the month view, on
  screen and in the month PDF. Saved with the calendar."*

## 5. Build steps

**Step 0: the rulings.** ✅ Done, 27 Oct 2026 (§1).

**Step 1: prove E1's mechanism before building on it. ✅ DONE, 27 Oct 2026.**
- **How:** a throwaway harness leg (deleted after the run; nothing in `src/` changed).
  - It loaded each calendar into the built app (`dist/` of 11:45, whose only uncommitted engine edits were another
    session's, to the waterfall's row handles).
  - It added E1's exact rules at run time, then walked every month at Standard (before and after the rules were
    added), Large and Extra large.
  - It read Chrome's own layout: each week's lane tracks (`grid-template-rows`), and each bar's height, font size and
    overflow.
  - It ran on `mvnotes`, `month-dense60` and `hiatus-blanklabel`: 54 months, 1600 × 1057 window, 160 px days.
- **Run 1, E1 as first written:** 22 of 25 checks passed on `mvnotes` and `month-dense60`. The two problems:
  - 150% zoom failed on all three calendars (lanes 21.33 px);
  - the three emptied bands in `hiatus-blanklabel` stayed 17 px.

  That is why `min-height` was added (§4.2).
- **Run 2, with `min-height`: all 25 checks pass on all three calendars:**
  - **Inert:** with the rules present and no size picked, every lane, row, bar height and font on all 54 months is
    identical to the page without them.
  - **The renderer places every bar in the same lane** at all three sizes. Nothing re-flows.
  - **Lanes with no bar or band: exactly 17 px at every size.** 889 lanes per size. Among them are 84 notes spanning
    two or more lanes, each filling exactly its lanes.
  - **Lanes holding a one-lane bar or band: exactly 17 / 22 / 25 px.** 242 lanes per size. Text is 10 / 12 / 14 px and
    grey tags 9 / 11 / 12 px.
  - **Emptied bands:** 22 px at Large and 25 px at Extra large, as tall as labelled ones.
  - **150% zoom, Large:** every lane and bar the same in the box's own px as at 100%.
  - **No one-line bar or band overflows its box** at Large or Extra large. ⭐ Today, at Standard, 262 of the 268 bars
    and bands overflow by 2 px: the 17 px lane hides their bottom padding. The text itself fits.
  - 0 console errors.
- **What the bigger sizes look like on screen, measured:**
  - A month is a median of **4.4% taller at Large** and **7.1% at Extra large**, at most 6.5% and 10.9%.
  - An ordinary week, 112–113 px today, is at most 123 px at Large and 131 px at Extra large. The densest week in
    `month-dense60` goes 512 → 517 → 520 px.
  - About 5 notes per calendar sit in a lane they share with a bigger bar on another day. They stretch to that lane's
    height (§2 default 3).
- **The two-line custom bar** (`mvnotes`' long one-day phase) takes its two lanes as the grid's spanning rule shares out
  its extra height: 19 + 19 px at Large, 22 + 22 at Extra large, and 26 + 18 in one week where it shares a lane with a
  one-lane bar. That is the rule the writer's `mvlLaneTracks` already models. Step 3's `monthemit` must confirm the
  writer agrees.
- **Not covered here, left for step 2's leg:** Extra large at 150% (only Large was zoomed), other zoom levels,
  hit-testing on the bigger bars, and every gesture.

**Step 2: the setting, the screen and the leg. ✅ DONE, 27 Oct 2026, on branch `month-bar-size`.**
- **Built:**
  - `app.js`: `MV_BAR_SIZES`, `mvBarSize` and `mvBarTextPx()` (declared with the month view's state, before any render);
    `setMvBarSize`, `reflectMvBarSize` (called by `update()` BEFORE `render()`) and the radios' click listener; the
    snapshot key, the sanitizer, the unconditional restore and New's reset; E2 in `mvPillLineCount`.
  - `legacy.css`: E1, after `.mv-pill-block`.
  - `bridge.js`: `chrome.mvBarSize`.
  - `Sidebar.jsx`: `BarSizeControl` (SegmentedControl `name="mv-bar-size"`), after Number Production Days.
  - The leg `t/mvbarsize.js`, in `gate.sh`'s generic list on `mvnotes` and `hiatus-blanklabel`.
- **Results:** 13/13 on `mvnotes` and 12/12 on `hiatus-blanklabel`. All six mutants below turn their own cases red.
- **At Standard:**
  - month PDFs byte-identical to gate 13's baselines on 8 calendars (reference, blocks, mvnotes, hiatus-blanklabel,
    month-dense60, halfdays, notewrap, monthscale);
  - `mvmenu`, `mvnotes` (×2), `labelsetup`, `settingswin`, `calzoom`, `prefs`, `shootdays`, `phasenum`,
    `monthlanes`, `mvhdroff`, `monthdragundo` and `pilllabel` all pass;
  - `npm run check` 40/40.
- **Not run:** a full gate (step 4).
- ⚠️ **Until step 3, a picked size reaches the PDF only half way.** E2 decides a wrapping bar's lanes at the picked
  size, and `buildMonthLayout` reads those lanes from the renderer, but the writer still paints at Standard. The branch
  is not shippable before step 3.

The plan for step 2, as written before the build:
- §4.1, §4.6, E1 and E2.
- A new leg, `mvbarsize`, with every click HIT-TESTED:
  - **B0:** at Standard nothing moved: no class, no key in a Save, and every lane and bar at today's height.
  - **B1:** at Large and Extra large, bar and band heights, lane heights and text sizes as in §2. Lanes without a
    phase bar or band stay 17 px.
  - **B2:** a body drag, an edge grip, a band grip, the reorder grip, the day menu (on a bar and on a band), a "+"
    slot and the day-number band each land on a bigger bar's week.
  - **B3:** one undo step. Save writes the key, and Load brings it back. A file without the key, loaded after one
    with it, opens at Standard (the M-5 trap). New resets it. `fields.byId` is unchanged.
  - **B4:** both sizes at 75%, 150% and 200% zoom, lanes exact in the box's own px (step 1 zoomed Large at 150% only).
  - **B5:** a one-day custom pill wraps at its own size.
  - **B6:** the shareable copy.
- Mutants:
  - no containment, so a note's lane grows (red on B1);
  - no fixed height, so an emptied band and a zoomed lane come out wrong (red on B1, B2, B4);
  - bands left out of the size rules (red on B1);
  - E2 removed, so a cut instead of a wrap (red on B5);
  - a sanitizer that keeps junk;
  - restore left conditional (red on B3).
- The legs that drive the month view by hand (`mvmenu`, `mvnotes`, `labelsetup`, `phasenum`, `calzoom`,
  `monthdragundo`) run unchanged at Standard. B2 covers their gestures at the bigger sizes.

**Step 3: the writer and the print rollback. ✅ DONE, 27 Oct 2026, on branch `month-bar-size`.**
- **Built:**
  - the writer (§4.4): `MVL_BAR_SIZES` and `mvlBarSize()` with the model; the size argument through
    `buildMonthLayout` / `mvlMonthLayout`; `S.big` / `S.bigTag` in `mvlWeekPaint`; `mvlBarHeight` and `mvlPaintBar`
    drawing pills, Simultaneous Post and hiatus bands from them; `exportMonthPdfDirect` passing `mvBarSize`;
  - E3 in `legacy.css`, OUTSIDE `@media print`, because frozen `exportMonthPdf` measures in screen media.
- **The legs:**
  - `t/lib.js` gained `applyBarSizeQuery()` (`?barsize=large|xl`, through the control's own radio) and
    `barSizeShown()`.
  - `monthemit`, `monthwriter` and `monthexport` pass the size on screen to the model.
  - `monthwriter` restyles a shrunk sized month at the sized type and fixed height.
  - `monthlayout` is re-anchored on `buildMonthLayout`'s new last line, and lists the two new model names.
- **Two gaps in `monthwriter`'s oracle, found by the fixture's PDF-tuned label (neither reachable before):**
  - The print path wraps a one-day pill at the SCREEN's day width (about 140 px of text room); the writer wraps it at
    the PDF's (about 120). A label between the two wraps in one and not the other.
  - The leg now counts that as a changed week (`wrap`). It also rebuilds the page with the writer's own wrap
    (`mv-pill-2l`).
- **The fixture** `tests/fixtures/mvbarsize-large.sptcal`, minted from the `mvbarsize` leg's real Save at Large on
  `mvnotes`:
  - two-line custom bars and an all-phase hiatus week;
  - custom3 renamed to the screen-tuned B5 label;
  - custom1 renamed to "Camera Prep Day For T", a label that fits one line of the PDF's box at 10 px and not at 12.

  Emptied bands are covered by `hiatus-blanklabel?barsize=`, and a phase's own hiatus by `offweek?barsize=`, rather
  than by this fixture.
- **Verified:**
  - `gate.sh`'s new block, 82 checks green: `monthemit` on mvbarsize-large, hiatus-blanklabel (xl) and month-dense60
    (xl); `monthwriter` on mvbarsize-large and month-dense60 (xl, a month shrunk to 0.734); `monthexport` on
    mvbarsize-large; the written PDF setting "Camera Prep Day" over "For T";
  - also green at a size: `monthemit` on hiatus-blanklabel (large), offweek (xl), month-lanecap (xl), halfdays (large);
    `monthwriter` on month-lanecap (xl), hiatus-blanklabel (xl), month-dense60 (large); `monthexport` on month-dense60
    and hiatus-blanklabel (xl).
- **Standard is untouched:**
  - written month PDFs byte-identical to gate 13 on 10 calendars;
  - gate 10's print comparison 6/6 on reference, mvnotes, hiatus-blanklabel, halfdays and blocks;
  - `monthemit` (tier 1, mvnotes, colswap-simpost-refuse), `monthwriter` (tier 1, mvnotes, notewrap) and `monthlayout`
    (tier 1, halfdays, halfmarks) all green.
- **Mutants, each red:**

  | Mutant | Caught by |
  |---|---|
  | The writer ignores the size | `monthemit` B0/T0/K0, `monthexport` X2 |
  | E3 removed | `monthemit` B0/T0/K0 |
  | `MVL_BAR_SIZES`' tag 1 px off | `monthemit` K0 |
  | The model wraps at 10 px | `monthemit` X3, `monthexport` X2, the text check |
  | The export passes no size | `monthexport` X2, the text check |
- ⚠️ **RECORDED, NOT MODELLED: one 1.31 px difference from Chrome's print, `mvnotes` at Extra large.** In one week
  (drawn in April and May 2026), a 46 px two-line pill sits alone over lanes 2-3, under a 25 px bar in lane 1, with
  20.09 px to spare.
  - Chrome's lanes (its computed `grid-template-rows`) are 23.69 / 22 / 22, which leaves 3.4 px of the row unused.
  - The spec's "maximize tracks", which the writer follows, gives 25 / 22 / 22. So the writer draws that two-line bar
    1.31 px lower than the print path.
  - In every other measured week Chrome follows the spec, including one with the same pill sharing lane 2 with a
    one-lane bar (25 / 25 / 19).
  - A rule that reproduces both was tried and broke `month-lanecap` at Standard, where four-line notes over three
    lanes are capped at 18 px exactly as the spec says. It was reverted.
  - The written PDF is what users get, and the print path is the rollback, so the writer stays on the spec. `gate.sh`
    leaves mvnotes at Extra large out of the sized block, with a comment saying why.

The plan for step 3, as written before the build:
- §4.4 and E3.
- A synthetic fixture, `mvbarsize-large.sptcal`, minted from the leg's own Save (no real show or schedule), with
  an all-phase hiatus, one phase's own hiatus and an emptied band among its bars.
- At Large and Extra large: `monthemit` (boxes against Chrome's print layout), `monthwriter` (the fit) and
  `monthexport` (the built app's file).

**Step 4: the gate.** ✅ DONE, 27 Oct 2026 (owner: "Do step 4 … here").
- ✅ **The new gate-13 baseline is CUT, on the owner's sign-off.**
  - The owner saw `monthbase.py sheets` contact sheets of all 16 months: the same calendar at Standard | Large |
    difference, so only what the size changes shows red. The answer was **"Yes, cut it"** (picker).
  - `tests/baselines/2026-10-05-monthwriter/mvbarsize-large.pdf`: 16 pages, 84,839 bytes, sha256
    `2208e3ae4806e9d0…`. It was byte-identical across two runs. Its README records the cut.
  - Added to gate 13's two lists as `bl`.
- ✅ **The full gate ran on `76315d2`** (15:41–16:32, `HARNESS_PORT=8463`, after two other sessions' gates): **3,178
  PASS, 3 FAIL.** None of the three is in a month-view or bar-size leg:
  - `notewrap` produced no result;
  - `hdrcut` EX: timed out waiting for ExcelJS (the CDN script);
  - `offweek (offweek)` R14: the Pause prep switch was covered by an open file-menu item after a Load. That is the
    leg's Load-timing wait, the same shape as the `offweek` R8 flake on record.
  - ✅ Each passed alone on the same build, once, while another session's gate ran: `notewrap` 16/16, `hdrcut` 7/7,
    `offweek (offweek)` 42/42 with R14 green. `offweek` R14 has failed the same way in ten other sessions' gates.
- ✅ **Gate 10 (the print path) is byte-identical** on every existing calendar: every `monthprint` document matched,
  one sheet per month.
- ✅ **Gate 13 is byte-identical** on all 20 existing writer baselines, and the new `bl` case
  (`mvbarsize-large (Large phase bars)`) matched its baseline, 84,839 bytes, `2208e3ae4806e9d0…`.
- ✅ The sized block passed: `monthemit` (`mvbarsize-large`; `hiatus-blanklabel` and `month-dense60` at `barsize=xl`),
  `monthwriter` (`mvbarsize-large`; `month-dense60` at XL), `monthexport` (`mvbarsize-large`) and the text check.
  `mvbarsize` passed on `mvnotes` (13/13) and `hiatus-blanklabel` (12/12).
- ✅ `npm run check` 40/40.
- ✅ The changelog and HANDOFF. ⚠️ **The version cut moves to step 5.** A version is cut on `main` at ship time
  (`APP_VERSION` + `version.json`, the tag, `releases/`), never on a branch that other sessions' commits will be merged
  around.

**Step 5: ship**, on your picker, commit and push asked separately. (In progress, 27 Oct 2026; owner: *"Do step 5 … here:
merge into main and cut the version. Ask before pushing."*)
- ✅ **Merged** local `main` (`9cdd5cb`: the phase start/end automatic notes, the view-switch speedup, plans) into the
  branch as `46509c3`. Only README's changelog top conflicted; both entries kept.
- ✅ **On the merged build** (`a21455d6…`): `npm run check` 40/40; `mvbarsize` 13/13 and 12/12; `autonotephases` 17/17;
  `autonotekinds` 16/16; `settingswin` 21/21; `customunits` and `builtindates`, live and restore, all green; `mvnotes`
  14/14; `monthlayout` 14/14; `monthexport` 9/9 on four calendars, each written PDF byte-identical to its gate-13
  baseline (reference, `mvbarsize-large`, `mvnotes`, `hiatus-blanklabel`).
- ✅ **v1.9.0 cut** on the branch: `APP_VERSION`, `version.json` and `package.json`; README `## v1.9.0` over the 37
  entries since v1.8.0; `releases/v1.9.0.html` byte-identical to the cut build `d9d9297c…`, which differs from the
  merged build only in the version literal and the CSP hash; `tests/fixtures/v1.9.0-saved.sptcal` (real Save, 43 keys,
  77 ids); tag `v1.9.0`.
- 🔁 **Then the owner widened it** (*"lets merge all the features were working on into main then run one single gate"*;
  picker: month text styling, the phase map rail + Soft Lines, two or more seasons; NOT the month menu trim; stop the
  three per-feature gates). The Seasons session's uncommitted work was committed on `main` as `15ac6ce`, and the
  integration happened on this branch: `main` → `4dc1aa1`, `land-month-text-style` → `9d67f4c`, `claude/month-rail` →
  `1bc01d5`.
  - ⭐ **Where bar size meets month text styling** (both edit `mvPillLineCount` and the writer's layout signature): a
    styled size on a bar or band is written in the bar size's own line box, `mvBarLinePx()` (15 px at Standard, as
    M1 always had; 18 / 21 px at a size), because that is the box the writer draws (`S.big`). A bar styled in weight
    alone measures at the bars' size (`mvlStyledWidthOf(…, barPx)`), and the style bar reads a bar's unstyled size as
    the size's. `mvlMonthLayout(html, widthOf, pillWidthOf, fonts, barSize)`; the month legs pass `fonts` as null.
  - On the merged builds: `monthemit` on the styled fixture `mvtextstyle` at Standard, Large and Extra large, 16/16
    each; `mvtextstyle` 23/23 and 6/6; `monthmap` 15/15 twice; `softlines` 6/6; `mvbarsize` 13/13 and 12/12;
    `seasons` 15/15; `settingswin` 21/21; `monthlayout` 14/14; month PDFs byte-identical to gate 13 (reference,
    `mvbarsize-large`, `mvnotes`); `npm run check` 40/40.
  - **v1.9.0 re-cut** over all four: `releases/v1.9.0.html` = the build `c352d88b…`; the fixture re-minted unchanged.
  - ✅ **The single full gate** on `c352d88b…`: **3,338 PASS, 0 FAIL** (17:50–18:20, no other gate running); every baseline byte-identical, gate 13's 23 written month PDFs (the new Large one included) and gate 10's 68 print checks.

**Size:** M–L. Probably steps 1–2 in one session and steps 3–4 in another. It is the first month-view change that
alters row heights on purpose. That is why step 1 exists.

## 6. What it does not change
- the waterfall, Excel, the waterfall PDF, the Compare PDF;
- notes, the day cells, shoot-day numbers, the month header;
- the `.ics` export's events;
- any calendar that never picks a size: every saved file opens, draws and prints byte-for-byte as before.

## 7. Risks and interactions
- **`contain: size`** is proven (step 1), with `min-height` added.
- **Extra large cuts more Production tags** on short pieces (§3). Large measured no extra cuts.
- **The month view gets taller on screen**, measured at a median of 4.4% (Large) and 7.1% (Extra large): more
  scrolling at 100%.
- ⚠️ **Running harness legs beside another session's full gate.** `run.sh` frees its port before it starts
  (`pkill -f "srv.js $PORT "`). On the default 8231, that kills a running gate's test server. Step 1's first run did
  exactly this, for about a minute, to another session's gate. Pass `HARNESS_PORT=<another>` whenever a gate may be
  running.
- **The month-view redesign** (`month-view-modern-look`, five options, open) also adds `#table-wrap`-scoped month
  CSS. Its options 1–4 only change colours and lines, so the two are independent. Option 5 narrows each day by about
  6 px, which would cut more labels at Extra large. Whichever lands second re-runs step 1's measurements.
- **The `MVL_PAINT` hand copy** grows by one table. R7(a) is what keeps it honest.
- **Month text styling** (`month-text-style`, scoped and ruled 27 Oct 2026 in another session, no plan file yet) lets
  the text style bar style bar and note text in the month view. Its size ruling, *"Only sizes that fit"*, keeps bar
  text to what fits today's bars (about 12 px with a capped line height, by arithmetic) and leaves bigger bars to this
  plan. The two touch the same places: `mvlPaintBar`, `mvPillLineCount` / `mvlPillLines`, and the pill's and band's
  font size. The rule that keeps them apart is that **this setting sets a bar's or band's height and default text
  size; a text style sets one bar's own text inside that height.** So at Large and Extra large the style bar's size
  list for bars and bands would offer up to that size's text. That needs no ruling now. Whichever plan builds second adopts it and re-runs the other's
  legs.
