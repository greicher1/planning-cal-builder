# A limit on how tall a Month view row can get

**Status:** live in v1.19.0 · 18 Nov 2026 · card `month-row-max-height`

Plan, 17 Nov 2026. Tracker card `month-row-max-height`. Branch `claude/dreamy-keller-2ed2c2`, which sits on top of the
unpushed month-shrink build (`claude/month-shrink-build-c94fac`, `MONTH-SHRINK-PLAN.md`). The two are independent in
what they do; this one only shares the branch.

## 1. The owner's words and rulings

- **Owner, 17 Nov 2026**, looking at a month where one week took most of the page: *"there reall should be a max
  limit on how tall a calendar row can be"*. Read as a week row in the Month view.
- **Ruling R0 (picker, 17 Nov 2026): "Stop adding notes".** A full day or week refuses another note and says it is
  full. Nothing is ever hidden, on screen or in the PDF. Turned down: a "+N more" collapse, and no limit.
- **Rulings R1 to R4 (one picker, 17 Nov 2026, each with the measurements of section 2 in its options):**
  - **R1, what the limit counts and its value: "10 lines in a week".** Bars and notes both count, so it caps the row
    itself. Turned down: 8 lines in a week, 6 note lines on a day, 4 notes on a day.
  - **R2, a calendar already over the limit: "No new notes until under".** It opens and shows everything, as it must.
    An over-full day refuses a new note with the same message as any full day, and takes notes again once enough
    are deleted or moved. Nothing is said when the file opens. Turned down: a notice on opening; leaving such days
    unlimited.
  - **R3, lines that arrive on their own: "Never refused".** Automatic notes, holidays, Waterfall notes, notes that
    stay with a phase, phase bars, hiatus bands and anything a moving tool carries always show, and they count. Only
    notes added by hand in the Month view are refused: the "+", paste, Paste notes… and a note dragged to another
    day. Editing or restyling a note already there is never refused, and a note being typed is saved whole, so a row
    can end a line or two over. Turned down: refusing in the Waterfall's note editor too.
  - **R4, the words: "Short message by the day".** The Month view's own short message (the chip it already shows for
    "Holidays and automatic notes stay on their own dates"), by the day, for about 4 seconds:
    *"This day is full (10 lines). Delete or move a note to add another."* In the Paste notes… box a full day is a
    line to fix before Add: *"11/3/26 is full (10 lines)"*. Never a browser alert. Turned down: a dialog with OK.
- Owner rule in force: keep the app as simple as Outlook or Excel. One fixed limit, no setting.

## 2. What exists, measured (17 Nov 2026, synthetic fixtures, this branch's build at 100%)

- `MV_MAX_LANES = 6` caps only the week's "+" strip, inside frozen `renderMonthView` ("Manual expansion is what's
  capped", "content is never hidden"). Notes on a day, automatic notes, holidays and bars have no limit. A week
  grows as tall as its lines need, and the month PDF (and, on this branch, the screen) shrinks the month to one page.
- The weeks share 631.5 px of a Letter landscape page (the default header). A week is about 38 px plus 19 px a line
  (exactly 36 + 19 a line, never under 57; a line holding a one-line note is 2 px taller).

  | Lines | Row | Share of the page |
  |---|---|---|
  | 4 | 112 px | 18% |
  | 6 | 150 px | 24% |
  | 8 | 188 px | 30% |
  | 10 | 226 px | 36% |
  | 12 | 264 px | 42% |
  | 15 | 321 px | 51% |

- A month prints at full size while its weeks total 25 lines (4 weeks), 23 lines (5 weeks) or 21 lines (6 weeks).
  Checked against `textfit-heavy`: its 5-week months of 18 to 21 lines fit, and those of 22 and more shrink (their
  notes take a line more at full size than the shrunk screen shows).
- Lines per week in months that fit: `mvnotes` and `blocks` 0 to 3; `notewrap`, `monthnotes`, `episodeprep` 0 to 4;
  `mvorder-notes` up to 5; `textfit-heavy`, the busiest ordinary calendar, 3 to 5 in most weeks and 7 at most, with
  up to 5 lines of bars and at most 3 notes (5 note lines) on one day.
- The three shrink fixtures, August 2026: `monthscale` two weeks of 18 lines (6 notes on a day), `month-dense60` one
  week of 25 (12 notes), `month-lanecap` one week of 51 (25 notes).
- At 10 lines: one full week among ordinary ones (3 lines each) still prints full size in a 5-week month. Every week
  full is the worst case: about 0.56 of full size in a 5-week month, 0.47 in a 6-week month.

## 3. The rule

**A day in the Month view holds 10 lines. A day that already reaches its 10th line takes no new note added by hand.**

- **A day's lines** are the lines its column reaches in its week row: the lowest line any bar, band or note covering
  that day ends on. A bar that crosses the day counts on that day. Blank lines (the four every week is given, and
  the ones the week's "+" strip adds) do not count.
- **Counted at full size**, as the frozen renderer packs the week for the export: never the shrunk screen's count,
  where a note can take fewer lines (frozen edit SK1 of the shrink build). So a day is full or not whichever month
  page it is seen on, and whatever the month's shrink factor.
- **The check is at the door** (R3): it asks whether the day is full BEFORE the note is added. A note that is let in
  is saved whole. One note is at most 3 lines (4 for a dated Waterfall line at note sizes 11 to 14), so a row can end
  up to 2 lines over, never more by this route.
- **The row is capped because every day in it is.** A week's height is its tallest day. A day with room in a week
  whose tallest day is full still takes notes: they do not make the row taller.
- **Refused (hand adds in the Month view):**
  1. a "+" on a full day: the editor does not open;
  2. ⌘V onto a full day; with several notes on the clipboard they land one by one until the day is full, and the
     message then reads *"This day is full (10 lines). 6 of 8 notes were pasted."* (the builder's wording for the
     partial case, in the ruled message's form; the owner sees it in the build to try);
  3. Paste notes…: a line for a day that is full (counting the lines above it in the same box) is an error line, and
     Add stays off until it is fixed, as for every other error there;
  4. a note dragged onto a full day: it does not land, and goes back where it was.
- **Never refused (R3):** editing a note that is already there, however it wraps; its colour, style and "Stays with";
  "Show in waterfall"; a drag within its own day; a holiday or automatic note renamed; automatic notes and holidays
  switched on; everything typed, pasted or dragged in the Waterfall (a Waterfall note, a note that stays with a
  phase, a month note's line re-dated or dragged there); phase bars, Simultaneous Post, Prep bars and hiatus bands;
  every moving tool; Note size and Phase bar size; Load, recovery, a scenario tab, undo and redo.
- **Already over (R2):** nothing special. An over-full day reaches its 10th line, so it is full by the same test,
  shows everything, and takes notes again once it is back under.
- **The week's "+" strip is unchanged**: blank lines, up to 6 in all, as today. Six is under ten, so the strip can
  never take a week past the limit.

## 4. Where it lives: outside the frozen renderer, no frozen edit

- **The count is ASKED of the frozen renderer, never copied** (CLAUDE.md, sanctioned pattern 2). `mvMonthLines(month)`
  renders that month as the export does (`printingCursor` set, frozen `renderMonthView(currentSchedule)` called, both
  put back in `finally`, synchronous: `buildMonthLayout`'s and `mvWriterFit()`'s own pattern), and reads from the html
  each bar's `grid-column` and `grid-row`, which the renderer writes inline. The result is a map from each day of the
  month's grid to the lines it reaches. There is no second copy of the packing rule to drift. Cost: one month
  render, 6 to 7 ms, per check.
- `mvDayLines(iso)` and `mvDayIsFull(iso)` read that map. `MV_DAY_MAX_LINES = 10` is the one number.
- **The four doors**, none of them a frozen symbol:
  1. `openMvNoteEditor`: a click on a "+" (`.mv-note-add`, the full-day overlay too) of a full day says so and
     returns before the editor is built. Opening a note that exists is untouched.
  2. `mvNotesPaste`: each note is added only while the day is not full; with none added there is no undo step.
  3. `openPasteNotes`' `refresh`: after `parsePastedNotes`, a pass marks the rows of full days, counting the rows
     above them (the day's notes are extended and put back, synchronously, around each count).
  4. The note drag's `begin()` reads the month's lines once at the press; `apply()` returns false for another day that
     was full then, which the drag already treats as "cannot go there".
- **The message** is the Month view's chip (`flashMvSel`'s), given a day to sit by. It is body-level chrome
  (`.month-sel-chip`, already stripped from a shareable copy).
- **Nothing is saved.** No snapshot key, no setting, no id. A calendar saved by any version opens exactly as before,
  and one already over the limit shows everything it holds.
- **No output moves.** The limit only refuses new notes, so the written month PDF, the print rollback's document, the
  workbook and the waterfall PDF are byte for byte what they were for every calendar.
- **What WOULD need a frozen edit, and is not proposed:** hiding the "+" on a full day, or changing the week strip's
  cap or its tooltip ("This week is at its 6-line maximum"). Both are drawn inside frozen `renderMonthView`. As built,
  a full day's "+" still appears on hover and says the day is full when clicked.

## 5. Every way a line reaches a week, and what the limit does there

| # | Path (symbol in `src/legacy/app.js`) | Limit |
|---|---|---|
| 1 | A "+" on a free line or the full-day "+" (`openMvNoteEditor` → `writeActiveMvNote`) | Refused when the day is full |
| 2 | ⌘V on a day, and ⌘X then ⌘V (`mvNotesPaste`) | Refused, note by note |
| 3 | Paste notes… (`parsePastedNotes`, `addPastedNotes`) | A full day is an error line |
| 4 | A note dragged to another day (the note drag's `apply`) | Refused, snaps back |
| 5 | A note edited so it wraps to more lines; a Waterfall line edited into several | Never |
| 6 | "Stays with" or "Show in waterfall" changed in the month editor (same day) | Never |
| 7 | A holiday or automatic note renamed longer | Never |
| 8 | Bold or a size on a picked note, Note size, Phase bar size | Never |
| 9 | A note dragged up or down its own day (above the bars a crossing bar drops a line) | Never |
| 10 | The week's "+" strip (`mvExtraLanes`) | Its own cap of 6, unchanged |
| 11 | A Waterfall Notes cell typed, pasted or dragged; "Show in month view" | Never |
| 12 | A note that stays with a phase (`phaseNotes`), wherever its phase takes it | Never |
| 13 | Automatic notes and holidays ticked for the month; a Region change | Never |
| 14 | Phase bars, Simultaneous Post, Prep bars, hiatus bands; the day menu's Add phase | Never |
| 15 | Shift, Build Around, the cards' arrows, the hiatus ripple, a phase dragged in the month | Never |
| 16 | Load, crash recovery, a scenario tab, a shareable copy, undo and redo | Never |

The day menu has no Add note item (trimmed on 23 Oct 2026).

## 6. Known edges, by design

- **A shrunk month can show fewer lines than are counted.** The count is at full size; a shrunk month re-wraps its
  notes smaller, so a day can read "full (10 lines)" while showing 8 or 9. Rare once the limit exists, since a
  calendar built under it shrinks far less.
- **A row can end up to 2 lines over** (R3: a note is saved whole).
- **A full day with a free line higher up** (under a bar that starts later in the week) is still full: the test is
  the lowest line the day reaches, so an over-full day never grows.
- **The "+" still shows on a full day** (section 4).
- **A full day that is out of view** (a paste onto the day last clicked, after scrolling): the message cannot sit by
  the day, so it shows at the top of the calendar and names the date. Found after the gate; a refusal with no
  message was the one way the first build broke the ruling "refuses and says so" (case L2d).
- Arrivals can take any day past the limit (R3). Nothing is ever hidden.

## 7. Build steps

**Stage 1, for the owner to try (no tests or docs yet): BUILT 17 Nov 2026, local WIP commit; `HANDOFF.md` has what
was measured.**
1. `MV_DAY_MAX_LINES`, `mvMonthLines`, `mvDayLines`, `mvDayIsFull`, and the message by a day.
2. The four doors of section 4.
3. Scratch probes, not committed: each door refuses on a full day and lets in on a day with room; the never-refused
   paths still work on a full day; an over-limit calendar opens and shows everything; the written month PDF, the
   print rollback's document, the workbook and the waterfall PDF are byte-identical to the commit this started from
   on `mvnotes`, `notewrap`, `monthscale` and `month-dense60`.
4. Hand over on localhost; `HANDOFF.md`; tracker to `building`; local WIP commit.

**Stage 2 (the owner said "Finish it", 17 Nov 2026):**
5. The leg `tests/harness/t/monthrowlimit.js`, wired into `gate.sh` as three runs. As built (the plan's L5 "a phase
   moved onto a full week" became "the full day's holiday is still drawn": the same claim, with no mover to drive):
   - `g=doors`, the standard calendar loaded as a file with July 2026's notes (a day over the limit, a day at 9
     lines): C0 the premise; L1 the "+" (L1b controls); L2 a paste onto the full day, L2b onto the day at 9 lines
     ("1 of 3 notes were pasted", one Undo), L2c onto an empty day; L3 Paste notes… (the full day's row), L3b a day
     that fills as the rows above land, L3c the calendar untouched while it previews, L3d the rest are added; L4 the
     drag onto the full day, L4b across it onto a day with room; L5 an edit that grows a note, L5b a Waterfall note
     typed with the full day's date, L5c the holiday on a day holding ten notes.
   - `g=over` on `month-lanecap`: L6 all 25 notes drawn, L6b that day takes no note and the day beside it does.
   - `g=shrunk`: L7 a day showing 5 lines in a month shrunk to 26/64, 13 at full size, is full; L7b the premise.
   Red on the build before the limit at L1 L2 L2b L3 L3b L4, L6b and L7. Nine mutants, each red where it should be
   and nowhere else: the limit at 99; the check removed from the "+", the paste, Paste notes… and the drag in turn;
   the count taken as the screen draws it (L7); an edit refused (L5); Waterfall lines dropped from a full day
   (L5b, L5c); notes past the 10th dropped on load (L6). Added after the gate: L2d in `g=doors` (a paste onto a
   full day scrolled out of view at 200% zoom still says so, by date), red on a tenth mutant.
6. The full gate. Gates 2, 3, 10 and 13 byte-identical is the proof that no output moved. **RUN 17 Nov 2026:
   5,530 pass, 81 fail; gates 1-3, 10 and 13 all green.** 80 of the failures are the month-shrink build's and fail
   identically on the build before the limit (`monthemit` / `monthwriter` / `monthlayout` F0, `monthexport` X1,
   `monthlanes` L16b, `mvnotesize` on `month-dense60`, `monthpage` T and B on `monthscale`); one was a `phasefill`
   run that stopped early (green alone); one was this change's: `textfit`'s lines run added a note to a day the
   limit calls full, and now uses a day with room. `HANDOFF.md` has the detail.
   **RUN AGAIN 17–18 Nov 2026**, after the month-shrink build's stage 2 was finished on this branch and `origin/main`
   v1.17.0 merged in: **5,731 pass, 14 fail; gates 1-3, 10 (11 of 11) and 13 (24 of 24) byte-identical**, the 4 gate
   13 files whose runs timed out written alone. `monthrowlimit` 23/23. All 14 failures were timeouts under a machine
   load of up to 60, each green alone.
7. README changelog, `CLAUDE.md` (the state table's `mvExtraLanes` row), `UI-CONVENTIONS.md` (§7 and §10),
   `HANDOFF.md`, the tracker.
8. Pickers: commit, and separately push. ⚠️ This branch carries the unpushed month-shrink build: a push publishes
   that too, so the owner must have approved finishing the shrink build first.

## 8. Frozen edits

None. If one turns out to be needed, the work stops and the owner is asked for it by picker, with its gate.
