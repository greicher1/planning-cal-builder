# SPAN-NOTES-PLAN.md

**Notes that span several days**, month view. Item 21 of the owner's 20 Oct 2026 gap report (private: nothing about
the calendars behind it belongs in this repo). Written 21 Oct 2026, after the owner asked whether such notes "would
feel too much like phases and confuse things". **Not ruled yet, and no code written.** §1 holds the four decisions
the owner makes, §2 the choices this plan makes unless the owner overrules them, and §3 onwards how it would be built.

**Why build it at all:** today the only way to mark a multi-day event (a scout week, a table-read week, a location
stretch) is a custom phase. That is the bigger confusion: it adds a sidebar card, can add a waterfall column and an
Excel column, and draws a rounded bar that *is* a phase. A spanning note gives those events a place that is not one.

**Several notes on ONE day already work** (`dayNotes[iso]` is a list since before v1.0.0, each note with its own line
and colour). This plan is only about one note stretched across several days.

## 1. Decisions for the owner

Each has a recommendation, listed first.

### D1 · How it looks

What makes a phase read as a phase in the month view: a **filled, rounded, bold** bar (`.mv-pill`, radius 9 px, weight
600). Day notes today are filled **square** blocks (`.mv-note-block`, weight 500). Fill colour cannot tell them apart:
the default note colour is `MILESTONE_COLOR` (#7030A0, strong purple), the note palette has pastel tints like phases'
and strong colours like phases' five strong ones, so every colour a note can take, a phase can take something close to.
The shape has to do it.

⭐ **Owner direction, 21 Oct 2026 (in chat, after the first mock):** *"come up with better ways we can differentiate
comments from phases that keep the bg color of the note"*. So **the note keeps its fill.** The first mock's
recommendation, an unfilled range line, is withdrawn, and so is an outline box (B). Today's look stays only as the
baseline the options are measured against.

The options, all keeping the fill and the palette (mocked in chat 21 Oct 2026, each with a purple note and a pale blue
note beside a pale blue phase, the hardest case):

1. **Pointed ends (recommended).** Arrow tips at the note's true start and end, flat where it carries on into the next
   week row. Phases are always rounded, so the shape alone tells them apart at any colour, and the tips show where a
   note really starts and ends across rows and month pages.
2. **Folded corner.** A turned-down corner on the last piece, like a sticky note. Clearly a note, but it says nothing
   about where a multi-day note starts.
3. **Dark start edge.** A thick darker stripe on the first day. Weak on a pale colour, where the stripe is the only cue.
4. **Italic text.** The cheapest cue and the weakest on its own; best combined with another.
5. **Tag and line.** The fill holds only the text, and a line in the same colour runs to the end. On a pale colour the
   line is faint.
6. **Pointed ends and italic.** 7. **Folded corner and italic.**

⏳ **Also to rule: every note or only spanning notes.** One rule for every month-view note (recommended: notes look
one way, phases another) changes notes already in saved calendars, on screen and in both month PDFs, so gates 10 and 13
get re-cut with the owner's sign-off. Spanning notes only leaves every existing calendar byte for byte as it is, but
notes then have two looks.

⭐ **Or change the phases instead.** Owner, 21 Oct 2026: *"alternatively come up with ways we could better make the
phases stand out"*. Then notes keep exactly today's look, and a spanning note is simply a wider one. Mocked in chat the
same day, notes unchanged, phases with:

1. **Darker outline:** each phase ringed in its own darker text colour (its `textColor`). The writer already paints a
   ring; only its colour and width change. The phase option this plan would pick.
2. **Dark start cap:** a solid cap in that darker colour where each phase run begins.
3. **Raised edge:** a darker bottom edge, so a phase reads as a bar sitting on the day.
4. **Week chip:** "wk 3" moves into a small dark tag at the bar's end. It changes how a label fits, so more labels
   would be cut with "…". The most work in the writer.
5. **Rule under the phases:** a line across each week under the last phase lane, schedule above and notes below.
   Drawn in the gap between lanes, so no height.

This route changes **every** calendar's month view and both month PDFs (gates 10 and 13 re-cut on sign-off, a frozen
edit to the pill rules), and leaves notes untouched. The waterfall stays as it is either way (the owner's 29 Aug 2026
freeze on its look). The two routes can be combined, but one cue is easier to learn than two.

Cost in the month PDF writer (not frozen): pointed ends and the folded corner need a polygon fill, a new op in the
writer's display list (a few lines of PDF path). The dark edge and tag-and-line are rectangles it already paints.
Italic is the text op's existing `skew`. On screen every option is CSS on the existing box (`clip-path` for the points),
so none adds height.

### D2 · How you make one

- **A "Through" date in the note editor (recommended).** The month note editor (`openMvNoteEditor`) gains one control
  under the text: *Through* [ Wed 3/4 ▾ ], listing the note's own day and the days after it. Its own day (the default)
  is a one-day note, exactly as now. Picking a later day stretches it; picking its own day again shrinks it back. One
  place to learn, and nothing on the grid changes until you choose.
- **Drag the note's end.** A grip on the note's right end, like a phase's month-view edge grip. Direct, but it is the
  phase gesture, which works against keeping the two apart, and it is more code on the frozen surface.
- **Both.**

### D3 · When the schedule moves

- **Stays on its dates (recommended).** As every month-view day note does today (`shiftCalendar` leaves `dayNotes`
  alone), as holidays and dated notes do. It also marks the difference: phases move, notes don't.
- **Moves with Production.** A note sitting over shoot days travels with the shoot. Needs `dayNotes` re-keyed on every
  mover (the same shape as `asShootDayMove()`), and a rule for a note that is half inside the shoot.

### D4 · A note that runs into the next week

It splits into one piece per week row (each row is its own grid), as phases do.

- **The text on every piece (recommended).** A month page that starts part-way through the note still says what it is.
- **The text on the first piece only.** Later pieces are the line alone. Cleaner on screen, but a printed month whose
  first rows hold only the line of a note that began on the previous page cannot be read.

## 2. Decided in this plan unless the owner says otherwise

- **Month view only**, like every day note: not in the waterfall, Excel or the waterfall PDF. Both month PDFs, yes.
- **Weekends are drawn when the dates include them.** A note says what is true of its dates. It is one more difference
  from a phase: `segCoversDate` never draws a non-Production phase on a Saturday or Sunday, and a hiatus band stops at
  Friday.
- **Up to six weeks.** The *Through* list stops 41 days after the note's day. A stretch longer than that is a phase.
- **Colour:** the same swatches as a day note, as the fill, with the ink `textColorFor` picks today. (No fill has no
  fill to shape; with pointed ends it would be plain text, as a No fill day note is.)
- **Up to three lines**, as a day note, wrapped at the piece's own width, so a wide note rarely wraps.
- **It sits under the phase bars**, as notes already do (`renderMonthView` places notes after phases).
- **Clicking any piece opens the one note.** The editor shows its first day ("Wed 3/4 – Tue 3/10").
- **Paste notes… reads a range** in the date column: `3/4/27-3/10/27, Location: Studio B`. Today a range there is an
  error ("can't read the date"), so no paste that works now changes meaning.
- **No new setting, no new button.** (Owner rule, 20 Oct 2026: simplify rather than add options.)

## 3. The save format

- A spanning note is a day note with one more key, on the entry in its **first** day's list:
  `dayNotes['2027-03-04'] = [ {text, lane, color, days: 7} ]`. `days` counts calendar days including the first.
  **Absent means one day**, and it is never written as 1, so every calendar that has no spanning note saves byte for
  byte as before.
- `sanitizeSnapshot`: `days` must be an integer from 2 to 42, or it is removed and counted in `bad.n` (it reaches a
  `grid-column` through the renderer's arithmetic, so it is checked like `lane`).
- `captureSnapshot` / `applyStateSnapshot` need no change: they hand over and restore `dayNotes` whole, and undo, the
  crash backup and Save all read `captureSnapshot`.
- **Older builds:** the sanitizer copies a day-note entry with `Object.assign` in this build and in
  `releases/v1.3.0.html` and `releases/v1.6.0.html` (checked 21 Oct 2026), and builds before v1.3.0 have no
  sanitizer, so the key survives everywhere. Their renderers read only a note's text and colour, so an older build
  should draw the note on its first day only, and editing it there drops the span. To be confirmed at build time by
  opening the fixture in `releases/v1.6.0.html` (new file into an old app is unsupported, CLAUDE.md, but it should
  degrade, not break). No `SNAPSHOT_VERSION` bump, for the reason the `'onhalf'` day word took none: older builds
  safely ignore it.
- `hasNoteEdits()` already counts every day note with text, so the Region prompt covers spanning notes unchanged.
  "Reset month notes" (`resetMonthNotes`) clears them with the rest.

## 4. Frozen edits (each needs the owner's sign-off, like bundle A's)

- **F1, `renderMonthView`'s notes loop.** Today each day's own notes are placed one day wide (`place(i, i, …)`). A
  note with `days` is placed once per week row it touches, from its first day in that row to its last, by a new
  helper outside the frozen list (`mvSpanPiecesForWeek(weekStart)`, which also finds notes that began in an earlier
  row). Each piece carries the start day and index (`data-note-day`, `data-note-index`), so the existing click
  handler and `relocateNoteAnchor` open the one note. A piece that continues gets `mv-span-open-l` / `-r`. Its line
  count comes from `mvNoteLineCount` at the piece's width. **A note without `days` takes exactly today's path**, so
  every existing calendar renders the same bytes.
- **F2, the Month view CSS block.** The look D1 picks, on the existing `.mv-note-block` box (with pointed ends: a
  `clip-path` whose tips the open classes flatten). Fill and ink stay the renderer's inline `background` / `color`.
  Nothing may add height: a spanning note takes the lanes a day note with the same text and width would. The same
  rules apply under `#print-root`. If D1 applies to every note, this rule reaches every existing note too (§1).

The print path (`exportMonthPdf`) is the DOM, so F1 and F2 reach it with no further edit.

## 5. Not frozen

- **The editor** (`openMvNoteEditor`, `writeActiveMvNote`): the *Through* control; `days` written only above 1.
- **The month PDF writer** (not frozen; gate 13 holds it byte for byte): `mvlParseItem` reads the `mv-note-span` and
  open classes; the note's lines are wrapped at the piece's width (today `noteBoxW` is one day's); `mvlPaintBar` paints
  D1's shape (for pointed ends, a polygon fill and ring, a new display-list op). If D1 applies to spanning notes only,
  a calendar without one takes none of these branches.
- **Paste notes** (`parsePastedNotes`, `addPastedNotes`): the range form, with its own errors (end before start,
  longer than six weeks, outside the months the calendar shows).
- **Shift tools:** nothing (D3 A). With D3 B, every mover re-keys `dayNotes`.

## 6. Proof

- **New leg `spannotes`**, LIVE and RESTORE, on a synthetic fixture `tests/fixtures/spannotes.sptcal` minted by the
  LIVE run's own Save (as `mvnotes` was). Cases: make one with *Through*; it crosses a weekend; it crosses a week row
  (two pieces, text on both with D4 A, ticks only at the true ends); it crosses a month (both months show it, on
  screen and in both PDFs); a click on either piece opens the same note; *Through* back to its own day leaves no
  `days` key; the shape D1 picks, with the tips only at true ends; no "+" under it; a busy week (`MV_MAX_LANES`); one undo step
  and redo; Save and Load; the shift tools leave it on its dates; Reset month notes clears it; the Region prompt
  counts it; a pasted range; bad `days` values (0, 1, 43, "7", 2.5) are dropped and counted; a shareable copy.
- **A/B, gates 10 and 13:** every existing fixture's month documents and written PDFs unchanged (`monthcmp.py ab`),
  because only a note with `days` takes a new path. The `spannotes` fixture adds its own documents to gate 10 and its
  PDF to gate 13 (`pdftotext` finds the text on each piece).
- **Mutants**, each expected red: a continued piece drawn without its text; the writer ignoring `days`; `days`
  written as 1; the sanitizer letting 0 or 43 through; a shift moving the note; a continued piece drawn with a tip on
  its open side; the writer painting a square note where the screen draws the shape; and, if D1 is spanning notes
  only, the old one-day path changed (gate 13 must catch it).
- **The full gate**, then the owner's picker to merge, and a separate picker to push.

## 7. Steps

1. The owner's rulings (§1), recorded here verbatim.
2. Store, sanitizer and editor (`days` saved, restored and cleaned; nothing drawn yet).
3. F1 and F2, with the A/B and contact sheets shown to the owner.
4. The writer.
5. Paste ranges.
6. The leg, the mutants, the full gate.

Size: L, about two sessions. It joins the "look and feel" group (items 19–22) on the tracker; item 22's tentative look
should be designed knowing D1's answer.
