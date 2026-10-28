# ICS-EXPORT-PLAN.md: export the month view as an .ics file for Google Calendar, Outlook and Apple Calendar

**Status: PLANNED, no code. R1, R2 and R4 RULED (owner, by picker, 27 Oct 2026); R3, R5 and R6 still open.** On the tracker as `month-calendar-export-ics`.

Owner, 26 Oct 2026:

> *"what would it take to be able to export a month view calendar into other calendar formats"*

Then, after the scoping answer: *"Write a plan for the one-off .ics export, with the rulings you need from me listed
up front."*

**Scope:** a one-off `.ics` file, written from the month view, that the user imports into another calendar app.
**Out of scope:** a live subscribed feed, which needs a server (§7). CSV and the waterfall are also out of scope.

---

## 1. Rulings (each has a recommended default; nothing is built until all six are answered)

**R1. What becomes an event? RULED (a)**, owner by picker: *"Every bar as drawn"*.
- **(a) Every bar, as the month view draws it. RECOMMENDED.** One event per bar, with the bar's own label and dates.
  So "Post Week 3" is a Mon–Fri event, a Production bar per episode or block is its own event ("Shoot Ep. 104"), and
  hiatus bands and the Simultaneous Post bar come out too. In Google and Outlook it looks like the month view.
- (b) One event per phase, from its first day to its last, weekends and hiatuses included. Tidier, but it hides the
  hiatuses and the week numbers, and it disagrees with the month view on every weekend.
- (c) (a), plus one event per shoot day ("Day 12 · Shoot Ep. 104"). Most detail, but about 100 extra events per
  season.

**R2. Notes and holidays? RULED (a)**, owner by picker: *"Notes as drawn"*.
- **(a) Every note, as drawn, on its own day. RECOMMENDED.** Holidays appear because the month view shows them as
  notes. A holiday hidden in the month view stays out.
- (b) Bars only. No notes, no holidays.

**R3. One file, or one per phase? OPEN.**
- **(a) One file. RECOMMENDED.** One import gives one calendar, in one colour. Phase colours don't carry over (§5.4).
- (b) One `.ics` per phase, so each one is imported as its own coloured calendar. That means a Save dialog per phase,
  or a zip, which needs a library the single-file build doesn't have.

**R4. Where does the control go? RULED (a)**, owner by picker: *"Beside Export PDF"*.
- **(a) A second button beside Export PDF, shown only in the month view. RECOMMENDED.** This is how *Export PDF* sits
  beside *Export to Excel* in the waterfall: there, the second button shows only in the waterfall. Label:
  *Export to Calendar*, with a calendar icon.
  ⚠️ The header has about 82 px to spare at its tightest width (1121 px), and the header must never wrap (CLAUDE.md,
  `--header-h`). So the button must collapse to its icon (`btn-collapse`) at narrow widths. Measured in step 4.
- (b) A *Export to Calendar…* item in the File menu. Takes no header space, but it is hidden in Safari, where the
  File menu is hidden.

**R5. What happens on re-import? OPEN.**
- **(a) Stable event IDs, and no new saved state. RECOMMENDED.** Each event's ID is made from the show title, the
  scenario name, the phase and the bar's first day. Exporting an unchanged calendar twice gives the same IDs, so an
  app that matches on ID can update events instead of duplicating them. Which apps do that is unmeasured (step 5). Renaming
  the show gives new IDs. A bar that moved is a new event, and its old copy stays behind. The advice to users is:
  import into a calendar of its own, and delete and re-import it when the plan changes. That advice goes in the help
  text (§5.6).
- (b) Mint a calendar ID and save it in the file (a new PERMANENT snapshot key), so IDs survive a renamed show. This
  is more machinery for a small gain, and it does not solve moved bars.

**R6. Which view and which scenario? OPEN.**
- **(a) The month view only, and only the scenario tab on screen, as the month PDF does. RECOMMENDED.** The calendar
  range does not cut it: the month view always shows the whole calendar (`wholeCalendar()`).

## 2. Defaults taken (no ruling needed; tell me to change any)

1. **All-day events only** (`DTSTART;VALUE=DATE`). The app has no times of day, and all-day dates mean time zones
   can never move an event to the wrong day. That matches the app's UTC-midnight rule.
2. **Calendar name** (`X-WR-CALNAME`): the show title, plus the scenario name when there are two or more tabs. If there
   is no title, "SPTCal calendar".
3. **File name:** `<Title> Calendar<scenario suffix>.ics`, built as `monthPdfFileName()` builds the PDF's name.
4. **Event description:** the bar's grey text when it has one (episode or block names), a half-day line ("½ day on
   Thu 3/4") when the bar has a half day, and "From SPTCal".
5. **The months exported are the months the month PDF prints** (`monthPrintRange()`). An empty edge month adds
   nothing anyway.

## 3. Where the data comes from: the month PDF writer's model, not a second reading of the schedule

The month PDF writer already turns each month into plain data. `buildMonthLayout()` renders each month with frozen
`renderMonthView()` and parses the result (`mvlParseMonth()`). The result lists every bar and note in every week, with:
- `kind`: `pill`, `simpost`, `hiatus` or `note`;
- its first and last column, `from` and `to`, counted from that week's Sunday;
- its `text` and grey `tag`;
- its phase (`ph`);
- its colour (`fill`);
- its half days (`halves`);
- for a note, the note's day.

**Export from that model.** Then the `.ics` says what the month view and the month PDF say, by construction:
- the same labels ("Week 3" numbers that skip hiatus weeks);
- Production cut per episode or block;
- weekends blank;
- holidays hidden in the month view stay hidden;
- the phase order and note places.

A second reading of `currentSchedule` would need its own copy of each of those rules, and this file has paid for
second copies before.

- **It edits no frozen code.** `buildMonthLayout()` is the writer's code (not frozen), and it only *calls* frozen
  `renderMonthView()`. Nothing on screen, in Excel, or in either PDF changes.
- **It needs the Inter fonts loaded**: `buildMonthLayout()` measures note text, and the `.ics` ignores those widths.
  Load them as `exportMonthPdfDirect()` does (`loadInterPdfFont`). A font-free path is possible later, but not
  worth a change to the writer now.
- **No save-format change** under R5(a). **No CSP change:** nothing is fetched, and the file is written locally.
  **No library:** the file is plain text.

## 4. Build steps

**Step 1: the writer, `buildMonthIcs(model, meta)`** — new code in `src/legacy/app.js`, next to the month PDF writer.
It is a pure function, from JSON in to text out, so a harness leg can slice it out and test it alone, as
`monthlayout` does.
- **Model → events.** A bar's dates are `weekSunday + from` to `weekSunday + to + 1`. The end date is exclusive, as
  `.ics` wants it.
- ⚠️ **Month seams.** A week that crosses a month boundary is drawn in both months, so its bars appear twice in the
  model. Drop the exact repeats by (kind, phase, text, first day, last day). The step's leg must prove that no bar is
  lost or doubled at a seam. That includes a bar that runs through a seam, which the two renders may cut differently.
  Measure that before choosing the rule.
- **The `.ics` text rules** (RFC 5545):
  - `CRLF` line endings;
  - lines folded at 75 octets, counting UTF-8 bytes and never splitting a character;
  - `\`, `;`, `,` and newlines escaped;
  - `VERSION:2.0`, a `PRODID`, and one `DTSTAMP` per export;
  - a `UID` per event, by R5.
- **Colour:** each event's `COLOR` (RFC 7986), taken from the bar's fill. Most apps ignore it, and it does no harm.

**Step 2: the export, `exportMonthIcs()`.** It is shaped like `exportMonthPdfDirect()`:
- refuse an empty calendar with the existing message;
- set the button's busy state;
- load the fonts, build the model, write the text;
- then a Save dialog with an `.ics` type, from a sibling of `saveMonthPdf()`;
- where the File System Access API is missing, fall back to `downloadTextFile(text, 'text/calendar', name)`.

**Step 3: the control**, by R4. Its id must stay out of `collectFieldValues()`: it is a button, not an input, so
nothing extra is needed. Its click listener is bound by id at evaluation time, so the button is always rendered and
hidden with `display` (the `#export-wf-pdf-btn` rule, Header.jsx).

**Step 4: tests.** A new leg, `icsexport`, in `gate.sh`, run on real fixtures: the default calendar,
`halfmarks.sptcal`, `blocks.sptcal`, `episodeprep.sptcal`, a two-scenario file, and the `xss-*` fixtures' text, which
must come out escaped and inert.
- **Every bar and note in the model has exactly one event** with the same dates and text. That includes a bar that
  crosses a month seam.
- **The file follows the format:** `CRLF`, every line ≤ 75 octets, escapes round-trip, and every UID unique.
- **The same calendar gives the same file twice**, apart from `DTSTAMP`.
- **Chrome:** the header does not wrap at 1121 px, and the button shows only in the month view.
- **A full gate, because the exporter drives the month renderer:** every frozen output byte-identical to its
  baseline.

**Step 5: a hand import (the owner, or me in the browser pane).** Import a real export into Google Calendar, Outlook
and Apple Calendar. Check that the bars land on the right days, and see what each app does on a re-import. That last
result rewrites the help text in §5.6. No harness can import into these apps.

**Step 6: docs.**
- README changelog;
- HANDOFF;
- CLAUDE.md's Exports section: a fifth output, and what it reads;
- the tracker card.

**Size:** steps 1–4 are a day or two of session work. Step 1's seam rule is the only part with real unknowns.

## 5. Things to know before building

1. **The `.ics` is a snapshot.** The plan changes; the imported calendar doesn't (R5).
2. **Weekends are blank in the month view and stay blank here** under R1(a): a phase is a run of Mon–Fri events.
   That is right for a production calendar, but it is many events. A 40-week phase is 40 events.
3. **Half days** are in the event description only. An all-day event cannot be half a day.
4. **Colour:** Google and Outlook colour a whole calendar, not single events, and support for `COLOR` elsewhere is
   patchy (step 5 checks). R3(b) is the only sure way to keep colours.
5. **Confidentiality:** the file holds whatever the calendar holds. It is written only where the user saves it, the
   same as the PDF.
6. **Help text** (the button's tooltip, and one line in the Save dialog's flow): *"Import into a calendar of its
   own. When the plan changes, delete that calendar and import the new file."* Wording is settled after step 5.

## 6. What this does NOT touch

- Frozen code: `#table-wrap`, `#print-root`, the width model, `renderMonthView` (called, never edited), and every
  writer.
- The save format: no new key under R5(a).
- The month PDF: byte-identical (gate 13).

## 7. Later, if wanted (each its own decision)

- **A live, subscribable feed.** Every app re-reads the calendar on its own, and moved bars move. It needs the
  calendar hosted somewhere at a URL. SPTCal has no server, and hosting someone's plan has confidentiality cost.
- **CSV** for Google's and Outlook's own import formats.
- **The waterfall** as an `.ics`: week-long events, one per phase per week.
