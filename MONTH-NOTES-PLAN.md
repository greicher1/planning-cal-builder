# MONTH-NOTES-PLAN.md

Bundle A of the owner's 20 Oct 2026 gap list: five month-view note features (items 2, 6, 10, 15, 17). Built in
worktree `month-notes-2951a8`, branch `claude/month-notes-2951a8`, cut from local `main` at `be67ca5`. Siblings:
`prep-switch` (item 1, lands first) and `labels-setup` (items 3–5, 7–9). The gap report that produced the list is
private; nothing about the calendars behind it belongs in this repo.

## 1. The owner's rulings (20 Oct 2026, by picker), verbatim

| Item | Ruling |
|---|---|
| 2 · the note editor | all four: **"Remember last colour"**, **"'No fill' plain text"**, **"Light tints"** (pink, lavender, peach, pale blue), **"Greys"** (light, mid, dark) |
| 6 · edge months | **"One month each side"**; for the month PDFs, **"Only if they hold something"** |
| 10 · hiatus days | **"Every hiatus day"** |
| 15 · many notes at once | **"'Paste notes…' box"** |
| 17 · one-day pills | **"Wrap to two lines"** |

Release rule (owner): merge into local `main` only after a green full gate and the owner's picker; ask by picker before
every push. The frozen edits below are approved in principle; each still needs its A/B (`monthcmp.py ab`) and contact
sheets shown, and any baseline re-cut signed off, before it is committed.

## 2. Item 2 — the month note editor

- **A month-note palette of its own,** `MV_NOTE_PALETTE`, beside `EXCEL_STANDARD_COLORS` (that literal is frozen,
  MANTINE-SEAM §4.8, and is not edited): No fill, the ten standard colours, Pink, Lavender, Peach, Pale blue,
  Light grey, Grey, Dark grey. Each entry has a name, which item 15 reads. Day notes only: a waterfall-owned note
  (`kind 'wf'`) keeps the ten, because its colour is `noteColors[week]`, which the waterfall, Excel and the waterfall
  PDF print.
- **No fill is stored as `#FFFFFF00`** (white at zero alpha). Chosen because every build draws it harmlessly, with no
  format change and no `SNAPSHOT_VERSION` bump:
  - this build and the frozen renderer's `background:${oc}; color:${textColorFor(oc)}`: a transparent fill and black
    ink (`textColorFor` reads the first six digits, white), with no edit to `renderMonthView`;
  - builds v1.3.0–v1.5.0: `sanitizeSnapshot` resets a colour that is not `#RRGGBB` to `null`, so the note draws in the
    default purple;
  - builds before v1.3.0: the same transparent fill and black ink as this one.
  `sanitizeSnapshot` accepts exactly that one eight-digit value for a day note, and nothing else new. Rejected: a new
  `fill` key (needs a frozen edit to draw), and `'none'` (pre-v1.3.0 builds would ink it white on nothing).
- **Both month PDFs:** the print path is the DOM, so it follows the renderer. The writer's `mvlRgb` gains the alpha
  digits, and `mvlPaintBar` draws no fill for a zero-alpha bar. Every new colour is a plain `#RRGGBB`.
- **Remember last colour:** `prefs.mvNoteColor` in `sptcal.prefs` (localStorage), never in `captureSnapshot`. Written
  when a day note is committed with a colour picked in the editor. A new day note (a "+") opens on it and takes it if
  the user picks nothing else. Editing an existing note opens on that note's own colour, as now.

## 3. Item 6 — one month each side

- **Three ranges, one function.** `monthCoreRange(schedule)` is today's `monthRangeForSchedule` body (phases, plus the
  hiatuses that touch them). `monthRangeForSchedule(schedule)` keeps its name and its callers, and answers by context:
  - on screen, the core range plus one month each side, so `renderMonthView`'s clamp and its ◀ ▶ reach the edges;
  - while a month PDF is being built, the core range plus an edge month only when that month's own days hold a note
    or a drawn holiday. On every calendar with none, that is the core range, so gates 10 and 13 stand still.
  "Building a PDF" is `printingCursor` (set inside both exports' month loops), plus a one-shot flag the two callers of
  frozen `exportMonthPdf` arm, because its first line reads the range before its loop sets the cursor. The writer's
  `buildMonthLayout` (not frozen) asks for the print range directly.
- **The cursor never opens on an empty edge.** The frozen clamp sends a cursor with no month to `range.first`, which on
  screen is now the edge. So `update()` places the cursor first: an absent cursor, or one outside the screen range, goes
  to the nearest CORE month. The L-17 rule for Load / backup / New is unchanged in effect.
- **Notes there:** day notes are keyed by date, so the "+" and the editor work in an edge month with no week row. No
  `addNote` change is needed for them.
- **Holidays there:** see §8 Q1. They cannot go through `addNote` (no week row), so a month-only list,
  `schedule.monthOnlyHolidays`, is appended by `notesForWaterfallDate` on its date. The waterfall, Excel and the
  waterfall PDF never read it. The Settings list tags such a holiday "(month view only)" instead of
  "(outside schedule)", which stays for one beyond the edge months.

## 4. Item 10 — notes on every hiatus day

- **The frozen edit:** `renderMonthView`'s "+" loop loses `if(isHiatusDate(schedule, d)) continue;`, so a hiatus
  week's band weekdays and its weekend take "+" lanes like any day.
- **Expected:** gate 10 moves on every calendar with a hiatus in view, because the hidden "+" lanes are in the print
  document (`#print-root .mv-note-add{display:none}`). Only `.mv-note-add` elements may differ. Gate 13 must not move
  (the writer reads `.mv-bar:not(.mv-note-add)`).
- The day menu's Add note stops being greyed on a hiatus day. MONTH-CONTEXT-MENU-PLAN §3.1 is updated.

## 5. Item 15 — "Paste notes…"

- A **Paste notes…** button in the preview toolbar, shown only in the month view. It opens a box with a textarea (no
  `id`, so `collectFieldValues` cannot sweep it), a live preview, and Add.
- **One note per line:** `date, text, colour`. A tab-separated line (pasted from a spreadsheet) splits on tabs. A comma
  line splits on its first comma, and on its last comma only when what follows is a colour, so text may hold commas.
  The colour is optional.
- **Dates:** `m/d/yy`, `m/d/yyyy`, `yyyy-mm-dd`. A date outside the months the calendar shows is an error.
- **Colours:** a palette name (case and spaces ignored, "gray" read as "grey"; "no fill", "none" and "plain" are No
  fill), or `#RRGGBB`. None given: the remembered colour of item 2, else the default purple.
- **Preview:** each line read back as date · text · swatch, or its error ("Line 3: can't read the date '13/45/26'").
- **Into the store** exactly as the editor writes: text trimmed and `stripXmlIllegal`ed, at most 3 lines (always 1
  here), colour `null` for the default purple, `lane: null` (what the editor stores from a full day's "+"), appended
  after the day's existing notes. A day is never full: the renderer grows a week for its notes, as it does for the
  editor's. The whole paste is **one undo step** (`pushUndoSnapshot` either side, the day menu's pattern).

## 6. Item 17 — one-day custom-phase pills wrap

- **The frozen edits:** in `renderMonthView`'s pill `place()` call, a one-day run of a custom phase whose label does not
  fit one line takes two lanes and a class, `mv-pill-2l`. A new frozen CSS rule lets that class wrap to two lines (and
  cut with "…" on the second). Every other bar, and a one-day custom pill whose label fits, is unchanged.
- How many lines a label needs is measured like `mvNoteLineCount`, at the bar's font (10 px, 600).
- **The writer** (`mvlParseItem`, `mvlMonthLayout`, `mvlBarHeight`, `mvlPaintBar`) wraps such a pill at its own width,
  takes its lanes from its own wrap (at most two), and puts "…" (`bar-ell`) at the end of line two when it is cut.
- Supersedes, for this case only: MONTH-PILL-LABEL Q5 ("A width remedy? None") and HALF-SQUARE-BARS §5 ("Cut it with
  …"). Existing calendars print unchanged unless they hold such a pill; any that move are shown for sign-off.

## 7. Tests

One leg, `monthnotes2` (`t/monthnotes2.js`), on a synthetic fixture minted by its own LIVE run, one case group per item,
with a mutant per behaviour. Then `npm run check`, `python3 tools/check-refs.py`, gate 10's A/B and contact sheets for
items 10 and 17, and the full gate.

## 8. Questions the rulings left open: all ruled 20 Oct 2026, by picker

| # | Question | Ruling | Not chosen |
|---|---|---|---|
| Q1 | Item 6: which holidays draw in the edge months, and outside the phases? | **"Your own only"**: custom holidays draw on any day the month view shows, edge months included. Union holidays keep today's rule, only inside a phase. An edge month prints only for a note or a custom holiday. | union holidays in the edge months on screen only; union holidays drawn and printed (most PDFs gain pages) |
| Q2 | Item 2: what is left of a No fill note's box? | **"No box at all"**: black text alone. One frozen CSS line, inert on every existing calendar. | the faint outline every note has |
| Q3 | Item 17: which one-day pills wrap? | **"Any one-day piece"** of a custom phase, only when its name does not fit one line. | one-day phases only |
| Q4 | Item 15: lines that cannot be read? | **"Fix them first"**: Add stays off until every line reads; the bad ones are marked with their reasons. | add the good lines, leave the bad |

So for Q1, `schedule.monthOnlyHolidays` (§3) is every ENABLED custom holiday that falls outside every phase and inside
the screen range. A custom holiday in a gap between phases, or in the first or last phase month outside its phases,
draws too: "any day the month view shows". On a calendar with no custom holidays the list is empty and nothing moves.
For Q2 the frozen CSS rule clears `.mv-note-block`'s border for a `#FFFFFF00` fill, on screen and in `#print-root`, and
the writer draws neither fill nor ring for it.

## 9. As built (20 Oct 2026)

All five items, as §2–§6 describe, with these settled at the build:

- **Item 2.** The editor's two rows are the standard ten, then No fill, the four tints and the three greys. Tints:
  Pink `#F7C1D9`, Lavender `#D5C8EC`, Peach `#FCCB9E`, Pale blue `#BBDCF7`; greys: Light grey `#D9D9D9`, Grey `#A6A6A6`
  (both black ink), Dark grey `#595959` (white ink). The colour is remembered when a note is committed with a pick; a
  new note with no pick takes the remembered colour. The writer LISTS a No fill bar's fill and ring, marked `clear`, and
  `mvlPageOps` paints neither, so the bar keeps its box for the `monthemit` leg to measure.
- **Item 6.** A click on a month-only holiday in a week with NO waterfall row (an edge month's) adds a day note there,
  as its "+" does; inside a week that has a row, the waterfall-note editor opens with the holiday line in it and leaves
  that line out of what it saves (M-13's rule). A hiatus band alone does not make an edge month print.
- **Item 10.** The day menu's left-click comment and its Add note reason were brought in line; nothing else in the menu
  changed.
- **Item 15.** A line with no comma or tab splits at its first space. The month view pages to the first pasted note's
  month when none of them is on the month in view.
- **Item 17.** The screen measures with `mvPillLineCount` (10 px, 600, line-height 1.5, padding 1 px 8 px), the
  writer wraps at `noteBoxW − 18` with the 600-weight PDF font.

Proof: the README's five entries and HANDOFF's entry of the same date.
