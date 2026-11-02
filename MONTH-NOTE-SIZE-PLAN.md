# MONTH-NOTE-SIZE-PLAN.md: note sizes for the month view, and Phase bar size in the same px steps

**Status: PLANNED, no code. ALL TEN RULINGS ANSWERED (owner, by picker, 2 Nov 2026), plus two later instructions:**
- **R4 is the owner's own design:** per-note sizes from the same list, which supersedes the recommended ceiling.
- **R7 and R8 were overtaken the same day** by *"do sizes 10, 11, 12, 13, and 14 for the phase bar sizes"* and *"make
  sizes for both the phase bars and the notes be dropdown menus"*.

The plan therefore now covers TWO settings (§1a). The cost of bigger notes was measured on 16 test calendars (§3). Next
is step 1. On the tracker as `month-note-size` and `bar-size-px-steps`.

Owner, 2 Nov 2026:

> *"Since the phase bar size can be increased to large or extra large, can we also have a setting to increase the size
> of notes?"*

> *"Maybe theres a 2 line limit when you increase the size of the notes. Maybe rather than note size setting of
> standard, large, and extra large, what if its just a global notes px size selector. THoughts?"*

> *"Yes, write the plan"*, then, after the rulings: *"Actually do sizes 10,11, 12, 13, and 14 for the phase bar sizes.
> And make sizes for both the phase bars and the notes be dropdown menus"*

**Scope:**
- **Note size:** a calendar setting for how big the month view's notes are, 10–14 px, on screen and in the month PDF.
  Above 10 px a note shows at most two lines. Any one note can take its own size from the style bar.
- **Phase bar size:** the shipped setting (v1.9.0, MONTH-BAR-SIZE-PLAN.md) goes from Standard · Large · Extra large to
  10 · 11 · 12 · 13 · 14 px.
- **Both** controls become dropdowns in Settings ▸ Preferences ▸ Month view.

**Out of scope:** day numbers, "Day N", the month header, the waterfall, Excel and the waterfall PDF. (In the waterfall,
each note's size can already be set, 6–12.)

This is the option MONTH-BAR-SIZE-PLAN.md left out as R1(c): "a much larger job" that "would get its own plan". It is
larger because a phase bar is always one line, but a note wraps. Bigger text means more lines per note: taller weeks,
more notes cut short, and crowded months shrunk in the PDF. The two-line limit keeps that cost small (§3).

---

## 0. How notes work today (read this first; one earlier answer in chat got it wrong)

- A month note is 10 px Inter at weight 500, with a 13 px line. Each line takes one 17 px row (a "lane") of its week,
  and a note takes **at most three lanes**.
- **On screen**, a note longer than three lines is clipped by its three-lane box. The box shows three full lines and most
  of a fourth (arithmetic, to confirm in step 1). There is no "…".
- **In the month PDF nothing is cut.** The print path sizes lanes to their content (`#print-root .mv-bars{grid-auto-rows:
  minmax(17px, auto)}`, bars `align-self:start`), and the writer draws every line (`mvlBarHeight` counts all of
  `it.lines`). So a four-line note prints whole, and its lanes grow to hold it. `month-lanecap` and `monthscale` are test
  calendars full of such notes.
- ⚠️ The chat answer of 2 Nov said "a note shows at most three lines (the rest cut with '…')". That is wrong for the PDF
  and wrong about the "…" on screen. This section is the correct account.
- Content is never hidden by the week's line cap: `MV_MAX_LANES` (6) caps only the row's "+" expansion.
- The style bar can already make ONE month note smaller, 6–10 px (MONTH-TEXT-STYLE-PLAN.md R3). The size is stored as
  `fmt` on the note's entry, or in `mvTextStyle.wfnote` for a waterfall line. A styled size keeps the 13 px line box
  (that plan's §3.4).

## 1. Rulings (all RULED, owner, by picker, 2 Nov 2026)

- **R0. May the month view's look change? RULED (a), *"Yes, this setting only"*.**
  - The frozen edits are in §5: none of them has any effect at 10 px.
  - The gate: gates 10 and 13 byte-identical on every existing calendar, a full gate green, and new gate-13 baselines
    cut only after the owner has seen them.
  - The phase-bar change in §1a works under the same terms, as an owner instruction.
- **R1. Which note sizes? RULED (a), *"10, 11, 12, 13, 14 px"*.** 10 is today's size. Each size has a whole-pixel line
  from a table (§2), never 1.3 × px: fractional lines are where Chrome's print and the writer drift apart (Phase bar
  size's one 1.31 px difference).
- **R2. The line limit. RULED (a), *"Two above 10 px"*.** A note whose size is above 10 px shows at most two lines; at
  10 px and below a note keeps today's rule exactly (§0).
- **R3. A cut note. RULED (a), *"'…' at the end"*.** An ellipsis at the end of the second line, on screen and in the PDF.
  On screen the full text stays in the tooltip and the editor. ⚠️ This is a change for the PDF, which prints long notes
  whole today (§0); at a size above 10 px the PDF cuts a note exactly where the screen does.
- **R4. The style bar. RULED, the owner's own answer:** *"It should be the exact same px size offerings as the global
  setting, but allow you to adjust per note"*. A follow-up picker settled the list: **6 to 14 px**, which is the
  setting's sizes plus today's smaller ones. In full:
  - any note can take any size from 6 to 14 px, whatever the calendar's size;
  - a note with no size of its own follows the calendar's size;
  - a note's geometry follows its EFFECTIVE size (its own, or else the calendar's). Above 10 px it gets that size's
    line, height and two-line limit, and its own lanes grow. At 10 px or below it keeps today's rule.
  - ⚠️ This supersedes the recommended R4(a), "the calendar's size is the largest". A 14 px note in a 10 px calendar is
    allowed, and it makes only its own week's lanes taller.
- **R5. Which notes? RULED (a), *"Every month-view note"*.** Month notes, holiday names, and the waterfall's notes and
  automatic notes shown in the month. They are all `.mv-note-block`.
- **R6. Saved? RULED (a), *"Saved in the calendar"*,** as Phase bar size is. A change dirties the file and is one undo
  step.
- **R7. The control. RULED (a), *"Five buttons"*, then OVERTAKEN the same day:** *"make sizes for both the phase bars and
  the notes be dropdown menus"*. See §1a.
- **R8. Phase bar size's labels. RULED (a), *"Keep Standard/Large/XL"*, then OVERTAKEN the same day:** five px sizes
  cannot be named by three words, so both dropdowns read in px. See §1a.
- **R9. The print rollback. RULED (a), *"Yes, it follows"*.** E3 (§5) applies the sizes to `#print-root`, which also
  lets `monthemit` check the writer against Chrome's own print.

## 1a. The owner's later instructions (2 Nov 2026), and what follows from them

**Phase bar size goes to 10 · 11 · 12 · 13 · 14 px.**
- 10 is today's Standard. 12 and 14 are exactly today's Large and Extra large, so every bar drawn today is unchanged.
- 11 and 13 are new.
- **The saved values (a default, not ruled):**
  - 10 stays an ABSENT `mvBarSize` key;
  - 12 and 14 stay `'large'` and `'xl'` (⛔ permanent since v1.9.0), so a v1.9.0 build still opens those calendars
    correctly;
  - 11 and 13 are the new values `'11'` and `'13'`. A v1.9.0 build drops them in its sanitizer and draws 10 px, a safe
    misreading, so there is no `SNAPSHOT_VERSION` bump.
- **The two new sizes, proposed by the existing pattern (bar = line + 4; to confirm in step 1):**

  | Size | Text | Grey tag | Line | Bar | Two-line one-day bar | Corner | Saved as |
  |---|---|---|---|---|---|---|---|
  | 10 px | 10 | 9 | 15 | 17 on screen, 19 in the PDF | 36 (two lanes) | 9 | absent |
  | **11 px (new)** | 11 | 10 | 16 | 20 | 36 | 10 | `'11'` |
  | 12 px | 12 | 11 | 18 | 22 | 40 | 11 | `'large'` |
  | **13 px (new)** | 13 | 12 | 19 | 23 | 42 | 12 | `'13'` |
  | 14 px | 14 | 12 | 21 | 25 | 46 | 13 | `'xl'` |

  The lines are whole px, just under 1.5 × the text, for R1's reason.
- **Cost:** bar sizes were measured at 12 and 14 px for v1.9.0. Even 14 px shrank no extra month and cut only 7 more
  labels (MONTH-BAR-SIZE-PLAN.md §3). 11 and 13 lie between, so their cost should too. Not measured; step 1 and the gate
  measure it.

**Both controls become dropdowns.**
- Two NativeSelects, one above the other in the Month view card, labelled **Phase bar size** and **Note size**. Each
  lists 10 px, 11 px, 12 px, 13 px and 14 px.
- Built as `#wf-paper` is (PAPER-SIZE-PLAN.md), the app's existing pattern for a calendar setting in a dropdown:
  - an explicit id (`pref-mv-barsize`, `pref-mv-notesize`) inside `.prefs-card`, so `collectFieldValues()` skips it and
    it never enters `fields.byId`;
  - UNCONTROLLED: a reflect function writes `.value`, and a delegated `change` listener calls the setter;
  - the option values ARE the save format. For bars: `''`, `'11'`, `'large'`, `'13'`, `'xl'`. For notes: `''`, `'11'`,
    `'12'`, `'13'`, `'14'`.
- ⚠️ This replaces the shipped `BarSizeControl` (a SegmentedControl, radios named `mv-bar-size`, and its document click
  listener and `chrome.mvBarSize` push). The `mvbarsize` and `settingswin` legs drive those radios and move to the select.

## 2. Defaults taken (no ruling needed; tell me to change any)

1. **The note sizes.** A note's box is its lines plus 2 px of padding and 1 px of border, top and bottom
   (`.mv-note-block`, unchanged).

   | Effective size | Line | One-line note | Two-line note | Most lines |
   |---|---|---|---|---|
   | 6–10 px (today) | 13 px | 17 px on screen, 19 px in the PDF | 36 px on screen (two lanes), 32 px in the PDF | 3 lanes, PDF prints all |
   | 11 px | 14 px | 20 px | 34 px | 2 |
   | 12 px | 16 px | 22 px | 38 px | 2 |
   | 13 px | 17 px | 23 px | 40 px | 2 |
   | 14 px | 18 px | 24 px | 42 px | 2 |

   At 10 px the screen squeezes a one-line note into a 17 px lane and hides 2 px of its bottom padding (bars do the
   same). Above 10 px the note gets its whole box, so the screen and the PDF agree, as they do at a phase bar size.
2. **Only lanes holding a sized note grow.** A lane with no such note keeps its 17 px (or its bar size's height). An
   empty week, with its four empty lanes, is exactly as tall as today.
3. **Bars keep their exact look.** At 10 px bars, a bar that shares a lane with a bigger note keeps its 17 px at the top
   of the lane instead of stretching. At a bar size, it keeps that size's height.
4. **Unchanged:** a note's weight, padding, border, fill, No-fill rule, alignment, and place (top, under a phase,
   bottom). The "+" slots keep 17 px lanes.
5. **The zoom multiplies on top.** Each scenario tab has its own sizes (both settings live in the snapshot).
6. **The note editor is not resized.** It is a panel beside the grid with its own type; only what the note draws in the
   cell changes.
7. **The style bar's default for a note is the calendar's size.** Picking it stores nothing, as today, so that note
   keeps following the calendar. Picking any other size stores it on the note (R4).
8. **An older build** ignores `mvNoteSize` and draws 10 px notes. A note styled above 10 px loses that size there (the
   sanitizer drops note sizes over 10, with a console warning only). Both are safe misreadings, so there is no
   `SNAPSHOT_VERSION` bump (the `'onhalf'` precedent).

## 3. What was measured (2 Nov 2026)

**How.** A throwaway leg, deleted after the run, sliced the month PDF writer out of `src/legacy/app.js` exactly as the
`monthwriter` leg does. It re-evaluated the writer with the note geometry patched to each size (font, line, most lanes)
and, for the two-line limit, with every note's lines cut after the second. Then it ran the real model and the real fit.
`src/legacy/app.js` was not edited. **Control:** the 10 px configuration reproduced the unpatched writer's fit exactly
(JSON-identical) on all 16 calendars. Every note was set to the size under test, which is the calendar's size with no
per-note sizes (R4 adds per-note sizes on top; a note sized on its own costs only its own week).

**Calendars:**
- the 11 print baselines of gate 10;
- 5 fixtures captured fresh: `notewrap`, `monthscale`, `month-dense60`, `monthnotes`, `carry-rich`.

⚠️ Several baselines share one base calendar. `reference`, `blocks`, `blocksoff`, `hiatus-blanklabel` and `halfdays`
hold the same 21 notes, and `dayoverrides`, `dayoverrides-onhalf` and the two `mvheader` calendars hold the same 4. So
there are about eight distinct sets of notes. Only `month-lanecap`, `monthscale` and `month-dense60` are deliberately
crowded.

**"Weeks taller"** is how much more height a month's weeks need at full size, compared with 10 px: the median and the
largest across that calendar's months. A month with room to spare still fits its page; only a month already near full
shrinks.

### Table A: ordinary calendars, with the two-line limit

| Calendar (notes) | Notes cut at 11 / 12 / 13 / 14 px | Weeks taller, median | Weeks taller, largest | Months printed smaller |
|---|---|---|---|---|
| reference family (21) | 0 / 1 / 4 / 4 (halfdays 0 / 1 / 5 / 5) | 0.3 / 0.9 / 2.3 / 3.5% | 0.6 / 7.6 / 12.8 / 14.1% | none |
| mvnotes (38) | 0 / 1 / 4 / 4 | 0.3 / 1.1 / 2.3 / 6.3% | 15.3 / 17.7 / 19.3 / 20.9% | none |
| monthnotes (25) | 0 / 1 / 4 / 4 | 0.3 / 1.2 / 2.3 / 3.5% | 0.6 / 7.6 / 12.8 / 14.1% | none |
| carry-rich (21) | 0 / 1 / 3 / 5 | 0.3 / 0.9 / 1.9 / 4.7% | 5.6 / 6.2 / 7.6 / 14.1% | none |
| dayoverrides family (4) | 0 / 0 / 3 / 3 | 0% | 0 / 0.7 / 1.3 / 2.0% | none |
| notewrap (23) | 2 / 3 / 6 / 6 (2 of them are over three lines today, printed whole) | 0.2 / 0.8 / 2.3 / 3.5% | 0.6 / 7.6 / 12.8 / 14.1% | none |

### Table B: the crowded test months (all August 2026), with the two-line limit

Each figure is that month's shrink factor (1 = full size).

| Calendar (notes) | Today | 11 px | 12 px | 13 px | 14 px | Notes cut at 11 / 12 / 13 / 14 px |
|---|---|---|---|---|---|---|
| month-lanecap (46; 25 are over three lines today) | 0.469 | 0.469 | 0.422 | 0.406 | 0.391 | 25 / 26 / 29 / 29 |
| monthscale (63; 42 are four lines today) | 0.609 | **0.766** | **0.734** | **0.719** | **0.688** | 42 / 43 / 46 / 46 |
| month-dense60 (81; none over two lines today) | 0.766 | 0.766 | 0.734 | 0.719 | 0.688 | **60** / 61 / 64 / 64 |

- **`monthscale` prints BIGGER at every size.** The limit cuts its 42 four-line notes to two lines, so the month needs
  less room than today, when the PDF prints them whole.
- **`month-dense60` is the warning.** Its notes exactly fill two lines at 10 px, so one more px pushes 60 of its 81
  notes onto a third line, and the limit cuts them. A real calendar written with notes that just fill two lines would
  lose their endings at 11 px.

### Table C: what the two-line limit buys (against no new limit)

| Calendar | Weeks taller, largest, at 12 / 14 px: two-line limit | No new limit | Crowded month at 12 / 14 px: two-line limit | No new limit |
|---|---|---|---|---|
| month-lanecap | 7.6 / 14.1% | 38.0 / 76.0% | 0.422 / 0.391 | 0.422 / 0.375 |
| monthscale | 7.6 / 14.1% | 28.6 / 63.3% | 0.734 / 0.688 | 0.594 / 0.531 |
| month-dense60 | 7.6 / 14.1% | 28.6 / 36.1% | 0.734 / 0.688 | 0.734 / 0.688 |
| notewrap | 7.6 / 14.1% | 22.2 / 33.1% | fits | fits |
| reference family, median | 0.9 / 3.5% | 1.1 / 7.0% | fits | fits |

**Words before the "…":** at 14 px two lines hold about half the text that three lines hold at 10 px (2 × 10/14 ≈ 1.4
lines of today's text, against 3). By arithmetic, not measured.

**Not measured here; left for step 1:** the screen (lanes, fixed heights, zoom), Chrome's print of a sized note, where
Chrome's `-webkit-line-clamp` puts the "…" against where the writer would, bar sizes 11 and 13, and hit-testing.

## 4. How it works

### 4.1 The state
- **`mvNoteSize`:** a new snapshot key in `mvBarSize`'s shape. The values are the strings `'11'`–`'14'`, and **10 px is
  an ABSENT key**, so every calendar saved before the setting, and every 10 px one after it, opens and saves byte for byte
  as before.
  - `sanitizeSnapshot()` drops any other value, and `applyStateSnapshot()` restores it **unconditionally** (absent means
    10 px, never "keep what is in memory").
  - New resets it, and the setter runs `update()` + `markDirty()`.
  - ⛔ The key and its four values are permanent from the first file saved with them.
- **`mvBarSize` gains `'11'` and `'13'`** (§1a). `MV_BAR_SIZES` gains their rows. `setMvBarSize` and the sanitizer test
  every value by name, as they do now ('toString' would pass a lookup).
- **A note's own size** stays where the style bar keeps it today (`fmt.size` on the entry; `mvTextStyle.wfnote[…].size`).
  The size list for notes becomes 6–14 px (R4), and the sanitizer accepts that range.
- **One reflect function each**, called by `update()` BEFORE `render()` (the `reflectMvBarSize` rule), sets the body
  classes and writes the select's `.value`.

### 4.2 How a note carries its size (R4 makes this per note)
Every note has an EFFECTIVE size: its own if it has one, else the calendar's. A helper outside the frozen code,
`mvNoteGeom(kind, key)`, returns the geometry for that size, and the renderer appends it to the note's inline style.
That is the slot M1's `mvTextCss()` already fills, so `renderMonthView` itself does not change.
- **10 px or less:** exactly what `mvTextCss()` writes today. Nothing for an unstyled note, and today's declarations
  (with the 13 px line box) for a note styled 6–10. So every existing calendar's markup is byte-identical.
- **11–14 px:** `font-size` and the size's `line-height`, plus two custom properties, `--mvn-h1` and `--mvn-h2` (the
  §2 heights). The CSS reads the heights from those (§4.3), so a 14 px note in a 10 px calendar and a note in a 14 px
  calendar are drawn by the same rule.
- `body.mv-note-sized` is set whenever any note's effective size is above 10 px (the calendar's size, or one note's
  own). It turns on content-sized lanes. It is never set on a calendar without a sized note, so E1 matches nothing there.

### 4.3 The screen: frozen edit E1 (CSS only)
Every rule is scoped to `#table-wrap`, so none can reach `#print-root`.
- Under `body.mv-note-sized`:
  - `.mv-bars{ grid-auto-rows:minmax(17px, auto) }`: lanes sized by what is in them, as at a phase bar size.
  - `.mv-note-block:not([style*="--mvn-h1"])` and `.mv-note-add` get `contain:size`. A 10 px note, or a "+" slot, then
    adds no height of its own and keeps its 17 px lane, exactly as Phase bar size's E1 does.
  - Pills and bands at 10 px bars get a FIXED 17 px (36 px for a two-lane `.mv-pill-2l`). That is exactly the height
    their 17 px lanes stretch them to today, so they look the same and do not stretch into a taller note lane. A bar
    size's own rules keep its height; step 2 orders the blocks so those win.
- On any note carrying `--mvn-h1` (no body class needed):
  - `height:var(--mvn-h1)`, or `var(--mvn-h2)` for a note the renderer gave two lanes. That note is matched by its own
    inline style, `[style*="/ span 2;"]`; the No-fill rule already matches a note by its style attribute, so this is
    not a new kind of coupling.
  - The two-line clamp: `display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2`.
- ⭐ **FIXED heights, as Phase bar size learned the hard way.** A text-sized box comes out wrong at 75% and 150% zoom,
  because Chrome snaps borders to whole device pixels (MONTH-BAR-SIZE-PLAN.md §4.2).
- **The two new bar sizes** are two more rows in Phase bar size's E1 block (font, corner, fixed height, grey tag),
  under new body classes `mv-bar-11` / `mv-bar-13`. The Large and Extra large rules do not change.

### 4.4 Frozen edit E2: the measure
- `mvNoteLineCount()` measures in the note's effective size and line, and caps at two lines above 10 px.
- The effective size is in its cache key. At 10 px and below it measures exactly as now.
- `mvPillLineCount()` (bar size's E2) already measures at `mvBarTextPx()`, so 11 and 13 need only their table rows.

### 4.5 The month PDF writer (not frozen; held by gate 13's bytes)
- **Notes:** the writer reads each note's size from its inline style, as it reads a month text style today
  (`mvlTextFmt`; W1). So it needs no note-size argument, and per-note sizes come for free.
  - `mvlTextFmt` reads only the declarations it knows and passes over the rest, so the `--mvn-*` properties reach it
    harmlessly. The writer takes a note's heights from its own table by the size, never from those properties.
  - `MVL_NOTE_SIZES` is a hand copy of the §2 table. A note above 10 px is wrapped at its size and line, at most two
    lines, the second ending in "…", and its box is the size's height. `mvlShrinkWeeks` re-wraps at size × k.
  - ⚠️ **The "…" must land where Chrome's line clamp puts it**, character for character, or `monthemit` fails. Step 3
    reads Chrome's rule off the print rollback (E3) before writing the writer's.
- **Bars:** `MVL_BAR_SIZES` gains the 11 and 13 rows; `mvlBarSize()` learns their names.

### 4.6 Frozen edit E3: the print rollback
- On `#print-root .mv-note-block[style*="--mvn-h1"]`: the two-line clamp. The size and line already arrive in the inline
  style. Outside `@media print`, for bar size's E3 reason: frozen `exportMonthPdf` measures `#print-root` in screen
  media.
- Print already sizes lanes by content, so no fixed note heights are needed there.
- Bar sizes 11 and 13: two more rows in bar size's E3.

### 4.7 The controls (§1a)
- Two NativeSelects in the Month view card (`Sidebar.jsx`), Phase bar size then Note size, built as `#wf-paper`.
- `BarSizeControl`'s SegmentedControl, its radio click listener and its `chrome.mvBarSize` push are removed. Its
  `.pref-mv-barsize` wrapper class stays if a leg or a rule reads it (step 2 checks).

### 4.8 The style bar (R4)
- `MV_TEXT_SIZES.note` becomes 6–14 px.
- A note's default size, which the bar compares a pick against (`mvTextDefault`), becomes the calendar's size.
- A note sized above 10 px keeps its own line box (the §2 table's), not M1's held 13 px, because its lanes are its own.

## 5. The frozen edits, in one place

| Edit | Where | What it changes | At 10 px with no sized note |
|---|---|---|---|
| E1 | `legacy.css`, after the Phase bar size block, plus two rows in that block | content-sized lanes while any note is sized; a sized note's fixed height and two-line clamp; bars held at their height; bar sizes 11 and 13 | matches nothing |
| E2 | `mvNoteLineCount` | measures in the note's effective size; two lines at most above 10 px | the same numbers, the same cache key |
| E3 | `legacy.css`, beside bar size's E3 | the print rollback's sized notes; bar sizes 11 and 13 | matches nothing |

The state, the dropdowns, `mvNoteGeom`, the style bar's list and the writer are not frozen code.

## 6. Steps

1. **Probe the screen mechanism** with a throwaway leg, as Phase bar size's step 1 did. It adds E1 at run time and walks
   every month of `mvnotes`, `month-dense60` and `notewrap`, testing:
   - every calendar note size, 11–14 px;
   - each note size with each bar size, 10–14 px;
   - one note sized alone in a 10 px calendar.

   It must find:
   - inert with nothing sized;
   - every sized note exactly its one-line or two-line height;
   - every lane without a sized note exactly as today;
   - every bar exactly its size's height (11 and 13 included);
   - the clamp's line count equal to the measure's, with a "…" exactly where a note is cut;
   - all of the above at 75%, 150% and 200% zoom.
2. **The settings:**
   - `mvNoteSize` and the two new `mvBarSize` values: state, save, load, undo and New;
   - both dropdowns, replacing the SegmentedControl;
   - E1, E2, `mvNoteGeom` and the style bar's 6–14 list;
   - a leg `mvnotesize` in `gate.sh`, red on a mutant of each; `mvbarsize` and `settingswin` moved to the select.
3. **The writer and E3.**
   - The harness gets `HARNESS_QUERY=notesize=<px>` and bar sizes 11 and 13.
   - The month legs become size-aware.
   - `monthemit` holds the writer to Chrome's print at 12 and 14 px notes, at 11 and 13 px bars, and with a per-note
     size.
   - A synthetic fixture, `mvnotesize-14.sptcal`, is minted.
4. **The full gate.** Gates 10 and 13 byte-identical on every existing calendar, the v1.9.0 Large baseline included. New
   gate-13 baselines (14 px notes; 11 or 13 px bars) are cut only on your sign-off, after contact sheets of every month.
5. **Merge, version, push**: each on your picker, the push asked separately.

**Rough size:** L, two to three sessions. Phase bar size took one long day for its five steps; this adds the clamp, the
"…" placement, per-note sizes, two bar sizes and the dropdowns.

## 7. Risks

- **Chrome's line-clamp "…" against the writer's.** If they cannot agree to the character, the fallback is to clip with
  no "…" (R3(b)), which needs no ellipsis placement. That would need your say.
- **A two-lane note sharing a lane with a bigger bar.** The grid shares a spanning item's height across its lanes, and
  the writer models that in `mvlLaneTracks`. Phase bar size's one recorded 1.31 px difference came from exactly this.
- **Combinations.** 5 bar sizes × 5 note sizes, plus per-note sizes, is a lot of layouts. Step 1 probes them all on
  screen; the gate holds 10 × 10 byte for byte and a chosen few others.
- **Notes that exactly fill two lines at 10 px** lose their endings at 11 px (`month-dense60`, §3 table B). The tooltip
  and the editor keep the text; the PDF does not.
- **Bars at 11 and 13 px are not measured yet** (§1a). They are expected to cost between today's Standard and Extra
  large.
