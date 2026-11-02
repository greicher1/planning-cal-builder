# MONTH-NOTE-SIZE-PLAN.md: one note size for the whole month view

**Status: PLANNED, no code. Ten rulings OPEN (R0–R9), each with a recommendation.** The cost was measured on
16 test calendars (§3). It is on the tracker as `month-note-size`.

Owner, 2 Nov 2026:

> *"Since the phase bar size can be increased to large or extra large, can we also have a setting to increase the size
> of notes?"*

Then, after the scoping answer:

> *"Maybe theres a 2 line limit when you increase the size of the notes. Maybe rather than note size setting of
> standard, large, and extra large, what if its just a global notes px size selector. THoughts?"*

And: *"Yes, write the plan"*.

**Scope:** one calendar setting that sets how big the month view's notes are, picked in px. It applies on screen and in
the month PDF. Above today's 10 px, a note shows at most two lines.

**Out of scope:** phase bars and hiatus bands (Phase bar size already does those), day numbers, "Day N", the month
header, the waterfall, Excel and the waterfall PDF. In the waterfall, each note's size can already be set (6–12).

This is the option MONTH-BAR-SIZE-PLAN.md left out as R1(c): "a much larger job" that "would get its own plan". It is
larger because a phase bar is always one line, but a note wraps. Bigger text means more lines per note. That makes
weeks taller, cuts more notes short, and shrinks crowded months in the PDF. The two-line limit is what keeps that cost
small (§3).

---

## 0. How notes work today (read this first; one earlier answer in chat got it wrong)

- A month note is 10 px Inter at weight 500, with a 13 px line. Each line takes one 17 px row (a "lane") of its week, and
  a note takes **at most three lanes**.
- **On screen** a note longer than three lines is clipped by its three-lane box. That box shows three full lines and
  most of a fourth (arithmetic, to confirm in step 1). There is no "…".
- **In the month PDF nothing is cut.** The print path sizes lanes to their content (`#print-root .mv-bars{grid-auto-rows:
  minmax(17px, auto)}`, bars `align-self:start`), and the writer draws every line (`mvlBarHeight` counts all of
  `it.lines`). So a four-line note prints whole, and its lanes grow to hold it. `month-lanecap` and `monthscale` are
  test calendars full of such notes.
- ⚠️ The chat answer of 2 Nov said "a note shows at most three lines (the rest cut with '…')". That is wrong for the PDF,
  and wrong about the "…" on screen. This section is the correct account.
- Content is never hidden by the week's line cap. `MV_MAX_LANES` (6) caps only the row's "+" expansion, so a week with
  more notes simply grows.
- The style bar can already make ONE month note smaller: 6–10 px (MONTH-TEXT-STYLE-PLAN.md R3, "only sizes that fit"),
  stored as `fmt` on the note's entry, or in `mvTextStyle.wfnote` for a waterfall line.

## 1. Rulings (all OPEN; a recommendation for each)

**R0. May the month view's look change for this setting?**
Note text, line height and lane height are set by frozen month-view CSS and by `mvNoteLineCount`. The print-path
rollback prints that CSS. CLAUDE.md requires a specific instruction and an agreed gate before the frozen surface's look
changes.
- **(a) Yes, for this opt-in setting only. RECOMMENDED.** Three frozen edits (E1–E3, §5), each matching nothing at 10 px.
  The gate:
  - gates 10 and 13 byte-identical on every existing calendar;
  - a full gate green;
  - a new gate-13 baseline for one synthetic calendar at a bigger size, cut only after you have seen it.
- (b) No. Then only the PDF could change (the writer is not frozen), and the screen would not show what prints.

**R1. Which sizes?** (your idea: pick a px size, not Standard / Large / Extra large)
- **(a) 10 · 11 · 12 · 13 · 14 px, with 10 being today. RECOMMENDED.** Every step is measured in §3. Each size has a
  whole-pixel line height from a table (§2), never 1.3 × px. Fractional line heights are where Chrome's print and the
  writer drift apart: that is where Phase bar size's one 1.31 px difference came from.
- (b) 10 · 12 · 14 only, the same text sizes Phase bar size uses. Fewer layouts to test, but you asked for a px picker.
- (c) Also 8 and 9 px, for crowded calendars. Not recommended: lanes cannot shrink below 17 px (bars share them), so
  smaller text only fits more words per line, and the style bar can already make one note smaller.

**R2. The line limit at a bigger size** (your idea: two lines)
- **(a) Two lines at every size above 10 px; 10 px keeps today's rule exactly. RECOMMENDED.** At 14 px a two-line note
  (42 px) is shorter than today's three-line note (45 px), so the tallest note never gets taller. Measured: no ordinary
  month prints smaller at any size, and the densest test month shrinks only a little more, or even prints bigger (§3).
- (b) Three lines at 11 px, two from 12 px. At 11 px three lines are 48 px, close to today's 45. On the ordinary test
  calendars 11 px cuts nothing either way. The difference only shows on a calendar like `month-dense60`, whose notes
  exactly fill two lines at 10 px (§3, table B).
- (c) No new limit: a note keeps up to three lanes at every size, and the PDF prints it whole. Measured: crowded weeks
  grow by up to 76% and the densest months print smaller (§3, table C).

**R3. What a note cut by the limit looks like**
- **(a) "…" at the end of its second line, on screen and in the PDF. RECOMMENDED.** This is the rule a one-day custom bar
  that wraps already follows (`.mv-pill-2l`, `-webkit-line-clamp:2`). On screen the full text stays in the tooltip and
  in the editor.
- (b) Clipped with no "…", as the screen clips a four-line note today.
- ⚠️ Either way this differs from today's PDF, which prints a long note whole (§0). At a bigger size the PDF cuts a long
  note exactly where the screen does. That is what makes the limit hold on paper.

**R4. Notes resized one at a time with the style bar**
- **(a) The calendar's size is every note's default and its largest. RECOMMENDED.** The style bar offers 6 px up to the
  calendar's size. If the calendar's size is later lowered, a note styled bigger is drawn at the calendar's size, and it
  gets its own size back if the calendar's size goes up again. Nothing stored is lost. This keeps every note inside its
  lane.
- (b) The style bar keeps 6–10 px whatever the calendar's size.

**R5. Which notes?**
- **(a) Every note in the month view. RECOMMENDED.** That is your month notes, the waterfall's notes and automatic notes
  shown there, and holiday names. They are all drawn as one kind (`.mv-note-block`), so a split would add a second
  setting nobody asked for.
- (b) Only notes typed in the month view.

**R6. Saved with the calendar, or kept on each computer?**
- **(a) Saved in the calendar, as Phase bar size is. RECOMMENDED.** Everyone who opens the file sees and prints the same
  notes. A change dirties the file and is one undo step.
- (b) A per-user preference. Two people printing one calendar could then get different month PDFs.

**R7. The control**
- **(a) Settings ▸ Preferences ▸ Month view, directly under Phase bar size. Label: *Note size*. A five-segment
  control: 10 · 11 · 12 · 13 · 14. RECOMMENDED.** It has the same shape as the Phase bar size control above it, and
  every choice is one click and visible.
- (b) A dropdown with "10 px (standard)" … "14 px".

**R8. Phase bar size's labels**
- (a) Leave them as Standard · Large · Extra large.
- **(b) Show their px: 10 px · 12 px · 14 px. RECOMMENDED.** Two neighbouring controls in two different vocabularies
  would be confusing. It changes only the labels: the saved `mvBarSize` values stay `large` and `xl`, so no file changes.
  ⚠️ This reverses the wording of your bar-size ruling R3, not its substance.

**R9. Does the print rollback follow?**
- **(a) Yes. RECOMMENDED.** This is E3, two or three CSS rules under `#print-root`, matching nothing at 10 px. It keeps
  the rollback honest, and it lets the `monthemit` leg check the writer's bigger notes against Chrome's own print
  layout, as Phase bar size's R7 did.
- (b) No. The rollback prints 10 px notes, and the writer's bigger notes are checked only by its own legs.

## 2. Defaults taken (no ruling needed; tell me to change any)

1. **The sizes.** A note's box is its lines plus 2 px of padding and 1 px of border, top and bottom (`.mv-note-block`,
   unchanged).

   | Size | Line | One-line note | Two-line note | Most lines |
   |---|---|---|---|---|
   | 10 px (today) | 13 px | 17 px on screen, 19 px in the PDF | 36 px on screen (two lanes), 32 px in the PDF | 3 lanes, PDF prints all |
   | 11 px | 14 px | 20 px | 34 px | 2 |
   | 12 px | 16 px | 22 px | 38 px | 2 |
   | 13 px | 17 px | 23 px | 40 px | 2 |
   | 14 px | 18 px | 24 px | 42 px | 2 |

   At 10 px the screen squeezes a one-line note into a 17 px lane and hides 2 px of its bottom padding (bars do the same).
   At a bigger size the note gets its whole box, so the screen and the PDF agree, as they do at a phase bar size.
2. **Only lanes holding a note grow.** A lane with no note keeps its 17 px (or its phase bar size's height). An empty
   week, with its four empty lanes, is exactly as tall as today.
3. **Bars keep their exact look.** At Phase bar size Standard, a bar that shares a lane with a bigger note keeps its
   17 px at the top of the lane instead of stretching to the note's height. At Large or Extra large it keeps its 22 or
   25 px, as now.
4. **Unchanged:** a note's weight, padding, border, fill, No-fill rule, alignment, and its place (top, under a phase,
   bottom). The "+" slots keep 17 px lanes.
5. **The zoom multiplies on top**, as it does now.
6. **Each scenario tab has its own size**, because the setting lives in the calendar's snapshot.
7. **The note editor is not resized.** It is a panel beside the grid with its own type; only what the note draws in the
   cell changes.
8. **An older build** ignores the key and draws 10 px notes. A note styled above 10 px loses that size in an older build
   (its sanitizer drops note sizes over 10, with a console warning only). Both are safe misreadings, so there is no
   `SNAPSHOT_VERSION` bump (the `'onhalf'` precedent).

## 3. What was measured (2 Nov 2026)

**How.** A throwaway leg, deleted after the run, sliced the month PDF writer out of `src/legacy/app.js` exactly as the
`monthwriter` leg does. It re-evaluated the writer with the note geometry patched to each size (font, line, most lanes)
and, for the two-line limit, with every note's lines cut after the second. Then it ran the real model and the real fit.
`src/legacy/app.js` was not edited. **Control:** the 10 px configuration reproduced the unpatched writer's fit exactly
(JSON-identical) on all 16 calendars.

**Calendars:**
- the 11 print baselines of gate 10;
- 5 fixtures captured fresh: `notewrap`, `monthscale`, `month-dense60`, `monthnotes`, `carry-rich`.

⚠️ Several baselines share one base calendar. `reference`, `blocks`, `blocksoff`, `hiatus-blanklabel` and `halfdays`
hold the same 21 notes, and `dayoverrides`, `dayoverrides-onhalf` and the two `mvheader` calendars hold the same 4. So
there are about eight distinct sets of notes, and only `month-lanecap`, `monthscale` and `month-dense60` are deliberately
crowded.

**"Weeks taller"** is how much more height a month's weeks need at full size, compared with 10 px, as the median and the
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
  lose their endings at 11 px. That is the case R2(b) exists for.

### Table C: what the two-line limit buys (without it, R2(c))

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
Chrome's `-webkit-line-clamp` puts the "…" against where the writer would, and hit-testing.

## 4. How it works

### 4.1 The state: `mvNoteSize`
- A new snapshot key in Phase bar size's shape (`mvBarSize`):
  - values the numbers 11, 12, 13 and 14; **10 px is an ABSENT key**, so every calendar saved before the setting, and
    every 10 px one after it, opens and saves byte for byte as before;
  - `sanitizeSnapshot()` drops any other value;
  - `applyStateSnapshot()` restores it **unconditionally** (absent means 10 px, never "keep what is in memory");
  - New resets it;
  - the setter runs `update()` and `markDirty()`, so a change dirties the file and is one undo step.
- ⛔ The key and its four values are permanent from the first file saved with them.
- A reflect function, called by `update()` BEFORE `render()` (the `reflectMvBarSize` rule), sets `body.mv-note-sized`
  plus one of `body.mv-note-11` … `body.mv-note-14`, and pushes the value to the control through `bridge.js`.

### 4.2 The screen: frozen edit E1 (CSS only)
Every rule needs `body.mv-note-sized` and is scoped to `#table-wrap`, so at 10 px it matches nothing and it can never
reach `#print-root`.
- Each size class defines its numbers once, as custom properties, from the §2 table: `--mvn-size`, `--mvn-line`,
  `--mvn-h1`, `--mvn-h2`. The rules below use only the properties, so the numbers sit in one place in the stylesheet.
- `.mv-bars{ grid-auto-rows:minmax(17px, auto) }`: lanes sized by what is in them, as at a phase bar size.
- `.mv-note-block{ font-size; line-height; height:var(--mvn-h1) }`, plus the two-line clamp (`display:-webkit-box;
  -webkit-box-orient:vertical; -webkit-line-clamp:2`). A note the renderer gave two lanes is matched by its own inline
  style, `.mv-note-block[style*="/ span 2;"]`, and gets `--mvn-h2`. The No-fill rule already matches a note by its style
  attribute, so this is not a new kind of coupling, and it needs no change to `renderMonthView`.
- ⭐ **A FIXED height, as Phase bar size learned the hard way.** A text-sized box comes out wrong at 75% and 150% zoom,
  because Chrome snaps borders to whole device pixels (MONTH-BAR-SIZE-PLAN.md §4.2).
- `.mv-note-add{ contain:size }`, so the "+" slots add no height of their own.
- Pills and bands at Phase bar size Standard get a FIXED 17 px (36 px for a two-lane `.mv-pill-2l`): exactly the height
  their 17 px lanes stretch them to today, so they look the same and do not stretch into a taller note lane. Phase bar
  size's own rules keep 22 and 25 px; step 2 orders the two blocks so those win.

### 4.3 Frozen edit E2: the measure
`mvNoteLineCount()` measures at the calendar's size and line, and caps at two lines when sized. The size is in its cache
key. At 10 px it measures exactly as now. A styled note keeps the line box of the calendar's size: M1's held box,
`MV_TEXT_LINE_PX.note`, becomes a function of the size, as Phase bar size made `mvBarLinePx()`.

### 4.4 The style bar
- `MV_TEXT_SIZES.note` becomes 6 up to the calendar's size (R4(a)).
- The sanitizer accepts 6–14 whatever the size, so a stored size is never dropped.
- `mvTextCss()` draws a note's size as the smaller of its own and the calendar's.

### 4.5 The month PDF writer (not frozen; held by gate 13's bytes)
- The note size reaches the writer as an ARGUMENT beside `barSize`: `buildMonthLayout(…, barSize, noteSize)` →
  `mvlMonthLayout`, which stamps `m.noteSize` only on a sized month, so a 10 px month's model is the JSON it always was.
- `MVL_NOTE_SIZES`, a hand copy of the §2 table, beside `MVL_BAR_SIZES`. `mvlWeekPaint(k, size, noteSize)` gives
  `S.note` the size's type and line. `mvlNoteLines` wraps at the size and, when sized, cuts after two lines with "…".
  `mvlShrinkWeeks` re-wraps at the size × k.
- ⚠️ **The "…" must land where Chrome's line clamp puts it**, character for character, or `monthemit` fails. Step 3
  reads Chrome's rule off the print rollback (E3) before writing the writer's.

### 4.6 Frozen edit E3: the print rollback
- `body.mv-note-sized #print-root .mv-note-block{ font-size; line-height; the two-line clamp }`, outside `@media print`
  for E3-of-bar-size's reason: frozen `exportMonthPdf` measures `#print-root` in screen media.
- Print already sizes lanes by content, so no fixed heights are needed there.

### 4.7 The control
- `NoteSizeControl` in `Sidebar.jsx`, under `BarSizeControl` in the Month view card, built exactly like it:
  - a SegmentedControl named `mv-note-size`;
  - the value pushed in through `chrome.mvNoteSize`;
  - a pick caught as a native click on document.
- No id anywhere, and `.prefs-card` keeps it out of `fields.byId`.

## 5. The frozen edits, in one place

| Edit | Where | What it changes | At 10 px |
|---|---|---|---|
| E1 | `legacy.css`, after the Phase bar size block | note type, line, fixed height, two-line clamp; lanes sized by content; bars fixed at their own height | matches nothing |
| E2 | `mvNoteLineCount` (and M1's held line box) | measures at the size, two lines at most | the same numbers, the same cache key |
| E3 | `legacy.css`, beside bar size's E3 | the print rollback's notes at the size | matches nothing |

The writer, the state, the control and the style bar's list are not frozen code.

## 6. Steps

1. **Probe the screen mechanism** with a throwaway leg, as Phase bar size's step 1 did. It adds E1 at run time and walks
   every month of `mvnotes`, `month-dense60` and `notewrap` at 11–14 px, alone and with each phase bar size. It must
   find:
   - inert with no size picked;
   - every note lane exactly its one-line or two-line height;
   - every lane with no note exactly as today;
   - every bar exactly 17, 22 or 25 px;
   - the clamp's line count equal to the measure's, with a "…" exactly where a note is cut;
   - all of the above at 75%, 150% and 200% zoom.
2. **The setting** (state, save, load, undo, New), the control, R8's labels, E1, E2, the style bar's list, and a leg
   `mvnotesize` in `gate.sh`, red on a mutant of each.
3. **The writer and E3.** The harness gets `HARNESS_QUERY=notesize=<px>`. The month legs become size-aware. `monthemit`
   holds the writer to Chrome's print at 12 and 14 px, alone and with Extra large bars. A synthetic fixture,
   `mvnotesize-14.sptcal`, is minted.
4. **The full gate.** Gates 10 and 13 byte-identical on every existing calendar. The new gate-13 baseline for the sized
   fixture is cut only on your sign-off, after contact sheets of every month (10 px | 14 px | difference).
5. **Merge, version, push**: each on your picker, the push asked separately.

**Rough size:** L, two to three sessions. Phase bar size took one long day for its five steps; notes add the clamp, the
"…" placement and the style bar.

## 7. Risks

- **Chrome's line-clamp "…" against the writer's.** If they cannot agree to the character, the fallback is R3(b)
  (clip, no "…"), which needs no ellipsis placement at all.
- **A two-lane note sharing a lane with a bigger bar.** The grid shares a spanning item's height across its lanes, and
  the writer models that in `mvlLaneTracks`. Phase bar size's one recorded 1.31 px difference came from exactly this.
- **Both settings on together.** Every combination of 5 note sizes × 3 bar sizes is a layout. Step 1 probes all 15 on
  screen; the gate holds 10 px × Standard byte for byte and a chosen few others.
- **Notes that exactly fill two lines at 10 px** lose their endings at 11 px (`month-dense60`, §3 table B). The
  tooltip and the editor keep the text; the PDF does not.
