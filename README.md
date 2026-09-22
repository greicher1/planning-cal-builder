# SPT Planning Calendar Builder

A TV production scheduling tool. Phase start dates + durations in, and out comes a week-by-week
waterfall calendar, a month calendar, an Excel workbook and a printable PDF.

**Live:** <https://greicher1.github.io/planning-cal-builder/>
**v1.0.0 (frozen):** `releases/v1.0.0.html` — also reachable at
<https://greicher1.github.io/planning-cal-builder/releases/v1.0.0.html> **once this commit and the
`v1.0.0` tag are pushed.** Until then the copy is local only; `git push && git push --tags`.

One self-contained `index.html`. No build system, no package manager, no server. Open the file and
it runs.

**Browser:** use **Chrome or Edge.** A calendar will *open* in any modern browser, but saving in
place — writing back to the same file, the recent-files list, autosave — needs the File System
Access API, which only Chromium browsers have. In Safari or Firefox, Save falls back to downloading
a new copy each time, and printing has not been tested.

**For contributors and agents, the reading order is:** [`HANDOFF.md`](HANDOFF.md) →
[`CLAUDE.md`](CLAUDE.md) → [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md).

---

## Changelog

This project versions the **built app**, not the repo. A version is cut when the app changes in a
way a user would notice or a future session would need to return to. See
[`CLAUDE.md`](CLAUDE.md) → "⛔ Changelog every substantial change" for when and how.

<!-- Newest first. Add new entries directly under this line. -->

### Unreleased — the Blocks panel uses the same ⋮⋮ rows as the episode list

Owner, 22 Sep 2026: *"the block shooting UI window in the production phase editor should be the same
UI look as the episodic one, meaning drag and drop with the three lines thing."* In Blocks mode the
Production row now lists each block's header (name and day count) with its episodes as the same grip
rows Episodes mode uses, replacing the chips. Drop an episode on another row to move it into that
row's block at that point in the shooting order; drop it on a block's header or empty space to send
it to the end of that block. Moving never changes a date, and each move is one undo step. Sidebar
chrome only, with no frozen code.

**Verified:** real mouse drags in the browser for a row drop (204 before 201 → Block 1: 204, 201,
202) and a header drop (206 → the end of Block 5, leaving Block 3's "drop one here" placeholder),
with the wrap unmoved and each undo reverting exactly one move. The `blocks` gate leg now drives the
grips and covers both drop kinds. Full gate: **376 pass, 0 fail**; every month-PDF case is
identical.

### Unreleased — the month view names blocks and episodes inside Production's pill; shooting order; two preferences

Block shooting step 4, plus four owner rulings made the same day on seeing the PDFs (BLOCKS-PLAN.md
§7 rows 7–10, §10). ⛔ **This deliberately changes the month PDF of every existing episodic
calendar.** The owner saw and approved before/after PDFs first.

- **"Production Week N" is always the pill during production** (ruling 8). Episode pills are
  retired in both modes. The episodes being shot are smaller grey text inside the pill:
  *Production Week 2 · Ep. 205, 202*. In Blocks mode it's *Block 1 · Ep. 201, 202*, and a week
  split between blocks names each: *Block 1 · Ep. 201, 202 / Block 2 · Ep. 203–205*. Runs of three
  or more consecutive episodes fold into a range. A one-day pill piece gets no grey text (ruling 7),
  because it cannot fit.
- **Shooting order** (ruling 9): in Episodes mode, drag an episode's ⋮⋮ grip to reorder the shoot.
  Numbers never change (201 stays 201), and neither does Production's length or wrap; only which
  days each episode occupies moves. Blocks' automatic split follows the same order. Each move is
  one undo step.
- **Preferences ▸ Show Blocks / Show Episodes in Month View** (ruling 10). These are per-user and on
  by default; they apply on screen and in the month PDF, and never go into a saved calendar.
  **Single Column Mode now shows only in Waterfall view, and these two only in Month view** (owner
  instruction; this reverses a 10 Sep decision).

**Verified.** The tag inside the pill adds **no row height** (the Blocks-mode A/B fit tables are
identical) and nothing is clipped on screen or in print; the forced three-block week still fits
with room to spare. Ruling 8 moved exactly **one** row in the baselines, and it closes a gap: on a
half-day calendar the wrap day used to have **no pill at all**, because episode pills count
entries, and Production's pill now covers it. The month baselines were re-cut and recorded. The
new `shootorder` gate leg drives the drag (both drop sides), checks that the wrap and the whole
grid are unchanged, confirms one-step undo, confirms a preference pushes no undo step and stays out
of `fields.byId`, and checks the view-scoped rows. Real mouse drags, switch clicks and view clicks
were driven in the browser. Full gate: **375 pass, 0 fail**. Save format: one new snapshot key,
`episodeShootOrder` (`[]` = natural order).

### Unreleased — block shooting, steps 1–3: schedule by Blocks, and drag episodes between them

The owner's request of 16 Sep 2026, built from [`BLOCKS-PLAN.md`](BLOCKS-PLAN.md) against its six
rulings. No frozen code changed; step 4 (the month-view block tag) is next.

**Show ▸ Schedule by: Episodes / Blocks.** In Blocks mode you enter a **number of blocks** and
**shooting days per block**, and Production's length becomes the sum of the blocks, not of the
episodes. Days per Episode is hidden but kept, so switching back restores the previous dates
exactly. The Production row lists the blocks. Each one has its own day count, which can be
overridden, and episode chips that **drag between blocks**. Episodes start evenly split with the
remainder at the front (10 over 3 blocks is 4, 3, 3). ⭐ **Moving an episode changes labels, never
dates**, and each move is one undo step.

Also in Blocks mode: the month view draws Production's own pills and no episode pills (ruling 5),
and the waterfall header reads *"18-Week Production Span / 5 Shooting Blocks"* instead of the
hidden per-episode figure (ruling 6). **Episodes mode is byte-identical to before.**

**Save format.** There are three new `fields.byId` ids (`show-mode`, `num-blocks`, `days-per-block`)
and three new snapshot keys (`blockDefs`, `blockCounter`, `blockAssignEdited`), written in both
modes. ⛔ **An absent `show-mode` means Episodes**, and `applyStateSnapshot()` enforces it. That
was proven necessary by removing it: a pre-Blocks calendar loaded after a Blocks one was then
scheduled *from the previous file's blocks*, at 90 days wrapping 11/10/26 instead of 80 days and
10/27/26.

**Verified.** The new `blocks` gate leg runs on a minted fixture (`tests/fixtures/blocks.sptcal`)
and checks four things: labels-not-dates (the whole grid signature is unchanged by a move), the
mode round trip, the restore default through the real picker path, and ruling 5 in the month view.
In the dev build, a real mouse drag moved an episode, `cmd+z` reverted exactly that move, and
`cmd+shift+z` redid it. Full gate: **351 pass, 0 fail**. Gate 5 was deliberately re-cut from 59 to
62 ids (`v1.0.0-saved.html` restores as `show-mode: "episodes"`), and every other gate is
identical, including all four month-PDF cases.

### Unreleased — the month PDF gets a gate, and the gate stops killing its own legs

Harness only. No app code changed; the deployed file is untouched.

**The month PDF is gated.** It was the only one of the four outputs with no gate coverage, while six
frozen edits that move or could move it had shipped on hand-taken A/Bs. `gate.sh` now runs the
`monthprint` leg on four calendars (the reference fixture, `dayoverrides`, `mvheader`,
`mvheaderlegacy`; the last three were loaded by no leg until now) and `monthcmp.py` checks two
things against `tests/baselines/2026-09-22-monthprint/`, cut from the build that was live
(`ff1ecbe`):

- **the document**: `#print-root` at the moment `exportMonthPdf` calls `window.print()`, byte for
  byte, with the page's own today stamp normalised (both `M.DD.YY` and `M.D.YY`, from the clock the
  app read, so it never false-fails on the day after the cut);
- **the sheets**: Chrome *prints* that document through its real print pipeline
  (`run.sh HARNESS_PRINT_PDF=1`), and every month must come out as exactly one sheet.

The second half is needed, and that was shown by forcing a failure, not argued. A CSS-only edit
(`.print-page` at `130vh`) left the document **byte-identical** and doubled the printout from 16
sheets to 32. The other controls: a +4 px change to every row, which failed and was reported as
"structure identical, only inline styles differ" with the per-month fit table; tomorrow's date via
`TZ`, which passed; and the 1st-to-9th stamp case in Node, which passed. `BLOCKS-PLAN.md` §5's
*"the month PDF still paginates the same"* now has an automated check.

**`run.sh` polls for the dump instead of running a wall-clock timer.** The old loop killed Chrome
after `[seconds]` *real* seconds, but that argument is a *virtual* time budget, and on a loaded
machine it runs out later than that. So slow legs were killed before writing a byte and reported
*"produced no result"*: three different legs did this in one session, and each passed when run on
its own. `run.sh` now waits for the dump to end in `</html>` with its size held across two polls
(the pattern from `tools/make-icon.py`), with a 3× + 30 s cap for a genuine hang. Because Chrome
never exits after `--dump-dom`, the old loop also made every leg wait out its full budget.

**Verified:** a full `gate.sh` passes with **339 assertions, 0 failures, in 3 min 19 s**. The last
full run took ~51 min and lost `stintreshape` to the timer. All five numbered gates are green:
0 clipped cells, waterfall PDF identical to baseline, Excel parts identical, v1.0.0 restore
identical, `fields.byId` 59 ids identical. The `base` leg went from 49 s to 6 s. The count
accounts exactly: 305 + the 10 `stintreshape` assertions + 24 new month-PDF checks.

### Unreleased — three month-editor bugs, found by driving production

Shipped in `9bdf80c` and found minutes later by using the month header editor on the live site.
**All three are one mistake** — a hardcoded `false` where the view flag belongs:

- `repaintHeaderEditorStage` wrote the **Excel budget** unconditionally, so the month editor opened
  with it correctly blank and then announced *"about 215 of 255 characters"* on the first keystroke.
  That limit is a workbook page-header limit; the month view's only export is a PDF and has none.
- the same function read the **waterfall's** format store. It is the fast repaint that runs on every
  keystroke, so a month line's size, colour or italic disappeared from the live preview the moment
  you typed and returned only on a full repaint.
- the editor's **Bold / Italic** toggles read the waterfall's format to decide which way to flip, so
  in the month editor they toggled against the wrong state.

⭐ **The first pass audited the wrong half.** `paintHeaderEditor` — the slow, full repaint — had been
threaded correctly and read clean, which is why an audit of it found nothing. Every one of these
lives in the **fast repaint or an event handler**, code that only runs when someone types or clicks.
A retarget is finished when every handler that *reads state back* is threaded, not when the render
function is. `grep -n "headerFmt(.*, false)"` is the whole check; the hits that remain are
legitimately waterfall-only.

**Verified** on `mvheader.sptcal`: the budget stays blank through typing, the month's italic survives
a keystroke, and one Italic click turns an already-italic month title **off** — which it can only do
by reading the month's own store. `hdrtemplate`, `hdrpreset` and `hdrfile` pass. No full gate: these
touch only the template editor, which is not frozen, not a writer and not the save format.

### Unreleased — the month header becomes a template system

Owner ruling, 21 Sep 2026, on [`MONTH-HEADER-PLAN.md`](MONTH-HEADER-PLAN.md) §6: **one preset file
with two sections**, **both** new slots, **the same editor** retargeted by view, and **`.spthdr`
keeps its extension** with the reader validating `version` up front. Built against that plan.

**What the month header is now.** Three modes — Auto / Template / Manual — over **four** slots
instead of two, sharing the waterfall's resolver, its token catalogue and its template editor.
Separate stores, one grammar: two resolvers would eventually disagree about what `{episodes}` means
inside one document, which is the divergence `computePhaseRowLayout()` exists to prevent, applied
to text.

| | |
|---|---|
| slots | `tleft` · `title` · `subtitle` · `today` |
| mode | `mvHeaderMode` + the new `mvHeaderTemplates` flag |
| default | `DEFAULT_MV_TEMPLATE` — `[{titleSeason} ]Full Prelim Production Calendar` / `{today:dotpad}` |
| editor | the existing one, switched by view |
| preset file | `.spthdr` **v2**: `{sheet:{…}, month:{…}}`, either section optional |

⭐ **THE LEFT SLOT IS FREE, AND THAT IS A MEASUREMENT RATHER THAN A CLAIM.** The month header was
already carrying an **84 px blank box** — `.mv-titlebar::before`, `content:''`, whose only job was
to balance the date on the right so the title read centred. (`--mv-today-w` was never assigned
anywhere in the codebase, so its fallback was its only value.) `.mv-tleft` takes over that exact
box, so an empty left slot occupies what the spacer did and a filled one costs **no height at all**.
It is `min-width` rather than `width` so longer text grows and pushes the title instead of being
clipped — losing someone's words in a PDF is worse than an off-centre title — and `white-space:
nowrap`, because a wrap here would add a line box and forfeit the entire reason it was free.

⭐ **THE SUBTITLE COSTS 26 px, AND ONLY WHEN IT IS USED.** It carries `.hdr-slot`, so the existing
`.hdr-line.hdr-slot.hdr-empty` rule removes it entirely when empty — the same guarantee `l2`/`l3`/
`c4` give the waterfall. Every calendar ever saved prints exactly as it did. ⚠️ And the cost is not
what "adds height to every month PDF" suggests: `exportMonthPdf` fits **each month to one sheet**,
so a filled subtitle does not lengthen the document or spill a page — it takes 26 px from the week
rows on that page.

⛔ **A REGRESSION THIS NEARLY SHIPPED, found by measuring rather than by reading the cascade.** In
**Manual** mode every header line carries `.hdr-editable`, so
`.hdr-slot.hdr-empty:not(.hdr-editable)` stops matching and the empty subtitle came back as a real
24 px line — which would have landed in the PDF of every month calendar ever saved in Manual mode,
breaking exactly the guarantee the slot was designed around. Fixed with two `#print-root` rules that
hide an empty added slot and the dashed "there is a slot here" outline. ⚠️ **They sit OUTSIDE
`@media print`**, for the reason the `.wf-print` block already records: the month export **measures
`#print-root` off-screen** and divides the page between the week rows by what it measured, so a rule
that applied only while printing would reserve 26 px the printed page never uses — a worse bug than
the one it fixed.

⛔ **`{today}` IS NOT THE MONTH'S DATE FORMAT, AND ASSUMING IT WAS WOULD HAVE CORRUPTED A THIRD OF
THE YEAR.** The waterfall's `{today}` renders `M.D.YY`; the month header has always rendered
`M.DD.YY`. Enumerating 400 consecutive days: they agree on **279** and differ on **121** — every
1st to 9th of every month. Today, 21 Sep, is one of the days they agree on, so a same-day browser
check would have "verified" it. `{today:dotpad}` was added for this and `DEFAULT_MV_TEMPLATE` uses
it, so Template mode resolves **byte-identically** to Auto.

**A latent duplication is deleted rather than added to.** The month's two auto strings were built
inside frozen `renderMonthView` **and** rebuilt verbatim in the `#mv-hdr-mode-btn` handler so that
switching to Manual could snapshot them — two copies of one rule, one of them frozen and therefore
unfixable if they drifted. Both call `computeMvHeaderDefaults()` now.

⛔ **A RESTORE BUG FIXED IN PASSING, and it is the failure CLAUDE.md's "restore unconditionally"
rule exists for.** `applyStateSnapshot()` had **no else branch** for the month header, so opening a
calendar whose month header was Auto, after one whose month header was Manual, left the previous
file's title and date rendering — one show's name on another show's calendar, silently. The
waterfall's twin has had its else branch all along. `mvHeaderFormat`/`headerFormat` were reset only
when the incoming file had a manual month header, and are now hoisted out of the branch too.

**Save format.** `mvHeaderTemplates` joins `captureSnapshot()`, restores with `=== true` outside the
branches, and resets on New. Absent means `false`, which is Manual — so a legacy month header
containing `{today}` still prints the literal `{today}`. Verified against a fixture written in the
pre-feature shape.

**Preset files.** `.spthdr` v2 carries `sheet` and `month` sections, either optional; an absent
section is **omitted**, not written as `null`, because "has no month header" and "has an empty month
header" are different claims. A v1 file's flat `lines` **are** the waterfall, so they fold into
`sheet` and the month is left alone — migrated on read, so a preset never opened is never touched.
A file from a newer format version is refused **entirely, before any content is read**: a
half-imported preset is one the user believes in and cannot see the holes in. Applying a preset
touches every section it has as **one** undo step, and a view asking for a section the preset lacks
is refused **by name**.

⛔ **THE GATE CAUGHT A REAL REGRESSION IN THIS WORK, WHICH IS WHY IT EXISTS.** The first cut of
`headerPresetCapture()` offered Save-as whenever **any** section was capturable — so a user with a
**Manual** waterfall and an untouched month could save a preset that silently omitted the header
they were looking at and carried only the month's built-in defaults. `hdrpreset`'s H8 assertion
(*"Save-as is refused in Manual, and says why"*) went red and named it. Decision H8 is now
**generalised rather than relaxed**: at least one section must be in Template, an Auto section may
ride along with a Template one but never be the only thing in the file, and the hint says which
Manual section is being left out.

⚠️ **Four other gate failures were the tests asserting the v1 file shape**, which changed
deliberately under ruling 1. They were **updated, not relaxed** — each site carries a comment saying
so — and both files now assert the v2 shape **plus two new guarantees**: the month section travels
as templates, and a v1 file migrates into `sheet` with `month` absent.

**Verified.** Print-container A/B against the pre-change build on `dayoverrides.sptcal`: page height,
header, titlebar, title, date, month bar, day-name row, body, all five week rows, 4 pills and 35 day
cells **all identical** — the DOM gains exactly 2 elements (`.mv-tleft`, and `.mv-subtitle` which is
`display:none`). Template mode resolves byte-identically to Auto, with and without a show title.
Two new fixtures (`mvheader.sptcal`, `mvheaderlegacy.sptcal`) restore correctly, the second proving
braces stay literal. New Node prover `tests/harness/prove-header-preset.mjs` — **40 assertions** over
the v1 migration, the v2 round trip, absent sections, the version refusal and per-section id
filtering. `prove-header-template.mjs` still 73/73. **Full `gate.sh`: 305 pass, all five numbered gates green**
— clipped cells 0, waterfall PDF and Excel parts identical to baseline, v1.0.0 restore identical,
`fields.byId` 59 ids identical. ⚠️ One leg (`stintreshape`) reported *"produced no result"* with a
0-byte dump and **passes standalone** with the gate's own invocation; three different legs hit that
in one session, which is `run.sh`'s fixed wall-clock kill timer, not a product fault.

### Unreleased — the header styling toolbar says why it is inert

Owner report, 21 Sep 2026: *"the styling menu does not seem to work"* (month view). Local, not
committed at time of writing.

⛔ **IT WORKS. IT REFUSES SILENTLY, WHICH IS WORSE.** Reproduced and measured: with no header line
selected, every control in the bar is `opacity:.45` **and `pointer-events:none`** — so a click on
Bold is not merely ignored, it never reaches a handler and the button is absent from the hit stack
entirely. Nothing anywhere said why. Click a line first and all of it works: Bold took the month
title from `font-weight:700` → `400`, Size wrote `font-size:30px`, the colour pickers wrote
`color:#cc0000` and `background-color:#ffff00`, Italic wrote `font-style:italic`. **No control was
broken.**

**The fix is one CSS rule**: while nothing is selected the toolbar reads *"Click a header line to
format it"*, and it vanishes the instant a line is clicked. That is this project's standing rule
applied to a control instead of a dialog — **a refusal must name its reason**, the same rule that
gives a hiatus day's greyed-out "Work this day" its explanation.

⚠️ **THIS IS NOT A REVERT OF THE 31 AUG 2026 REMOVAL, and the difference is why it is safe.** The
CSS there records that a text readout was removed *at the owner's request*, on the reasoning that
*"the dimming is what actually communicates 'pick a line first'"*. What was removed was a **readout
naming the selected line** — shown AFTER you had clicked, where the focus ring already said the same
thing. This is the opposite message at the opposite moment: an **empty state**, shown only while
nothing is selected. Once you are working there is still nothing extra, so the original objection
stands. Today's report is the evidence that the dimming alone did not carry the meaning.

Implemented as `::after` so there is **no markup change at all** — `headerFmtToolbarHtml()` feeds
both `renderSpreadsheetView()` and `renderMonthView()`, and adding no node makes it impossible for
this to reach either print path. (`.mv-tools` is stripped from the month print host anyway.)

⚠️ **A TESTING TRAP WORTH THE SAME WEIGHT AS `elementsFromPoint`: `element.focus()` DOES NOT
DISPATCH FOCUS EVENTS in the browser pane.** The first diagnosis looked like a real month-view bug —
`document.activeElement` became the header line, yet the toolbar never armed and **no `focusin`
fired anywhere, not even on `document` in capture phase**. ⭐ **The control experiment is what saved
it:** the WATERFALL header failed identically, and its `hdreditor` gate leg passes 20+ assertions,
so the fault had to be the harness. A real click armed both instantly. **Synthetic focus is not
focus, exactly as a dispatched event is not a click** — when a focus-driven feature looks broken,
run the same probe against a surface known to work before believing it.

### Unreleased — half days show in the BAR, the day target is obvious, and "Off" is just "Off"

Three owner requests, 21 Sep 2026, after using the day-override menu for the first time. Local, not
committed or pushed at time of writing.

**1. A half day now shows in the pill.** Until now it showed only as a ½ beside the DATE — and the
date is not what you read when you scan a month for the shape of a shoot. The bar is. So a half day
looked exactly like a full one in the only place people actually look. The bottom half of that day's
slice of the pill is now darkened, so a half day reads as **a bar that is half filled**.

⛔ **FROZEN EDIT, and it deliberately changes the month PDF** — the second one that does, after the
hiatus change. ⭐ **The code comment next to it said this could not be done, and its PREMISE was
wrong rather than its logic.** It read: *"a pill spans a RUN of days, so it could not mark a single
'half' inside it without splitting runs, which WOULD change the rendered structure."* True **if**
marking means splitting. A background LAYER on the pill that already exists marks one day's slice
while the element, its `grid-column` span, its lane and its text all stay exactly as they were.

**Measured A/B against `62cc0dc`, same fixture, via the real `exportMonthPdf` path:**

| | HEAD | with the change |
|---|---|---|
| total elements in `#print-root` | 3511 | **3511** |
| pills · day cells · note bars · hiatus bars · pages | 76 · 539 · 4 · 4 · 15 | **identical** |
| structure hash (every element's tag, class, `data-ph`, text) | `-380796107` | **`-380796107`** |
| pills carrying a `background-image` | 0 | **1** |

**The structure hash is identical**, so the only difference in the entire printed document is one
`style` attribute gaining a `background-image`. That is §6.5 condition 1 met by measurement rather
than by argument, and condition 2 (row heights) cannot move because nothing was added to the flow.

⚠️ **Both pill paths had to be wired, and missing one would have been invisible in testing.**
Episode pills REPLACE Production's own whenever episodes exist — which is most real calendars — so
the overlay is emitted at both sites. Exactly the trap `data-ph` hit.

⚠️ **The background-position maths is the part that could silently lie.** With
`background-size:W% 100%`, a percentage `background-position` is not a straight offset: the browser
maps `P%` onto the FREE space, so a slice starting at `O%` needs `P = O / (100 - W) × 100`, and a
single-day pill (`W = 100`) divides by zero. Getting it wrong marks **the wrong day**, which is a
silent corruption of someone's schedule rather than a visual glitch. Verified by measuring rendered
pixels, not by reading: on a four-day pill (`grid-column:3 / 7`) the slice lands on the **second**
day of the run, matching the cell's own ½ mark.

**2. The click target is obvious now.** `cursor:pointer` alone only spoke once the pointer was
already in the right place — the thing people were going to miss. Hovering a day now puts its date
number in an accent chip and tints the strip.

⭐ **The affordance cannot lie about its own hit area**, and that is why this shape was chosen.
`.mv-daycell:hover` fires **only** where the cell is genuinely the hit target: the bar layer is a
sibling subtree, so hovering a `+` or a pill puts those in the hover chain instead. The highlight
therefore appears at exactly the pixels where a click opens the menu, and stays dark everywhere a
click would do something else.

⭐ **Height-neutral by construction, and this is a stronger argument than the `mv-day-*` marks had.**
`.mv-daygrid` is `position:absolute; inset:0` — **out of flow**. The week row's height comes from
`.mv-bars`, its in-flow sibling. So nothing inside the day grid can move a row height, padding and
all — which is what lets this add a real box rather than only paint.

⭐ **And it cannot print, twice over:** `#table-wrap` scoping keeps it out of `#print-root`, and
`:hover` has no meaning in a print rendering. Confirmed on the real print path — `cursor` computes
to `auto` on `#print-root`'s day cells, and 0 popovers reach it.

**3. "Off — not shot" is now just "Off".** The em-dash half was a tautology; Off already means not
shot. ⚠️ The other two keep theirs deliberately — *"Weekend — not shot"* and *"Holiday — not shot"*
state the day's CURRENT state and the reason for it, which is information rather than repetition.

### Unreleased — new app icon, and the icon is reproducible for the first time

Owner supplied new artwork, 18 Sep 2026: the same calendar-as-film-slate mark — a fixed clapstick
across the top with the hinged one pivoting open from the left — but the body now carries the full
spectrum (yellow → red → purple → blue) instead of flat red. Local, not pushed at time of writing.

⭐ **The bigger change is that it can now be regenerated.** `src/chrome/appIcon.js` said its bytes
were *"rasterised at 192px from the source SVG"* — and **that SVG was never in the repo.** The icon
could not be reproduced, re-cut at another size, or diffed against its own source; the blob was the
only copy. The artwork now lives at `art/app-icon.svg` and `tools/make-icon.py` derives every PNG in
the app from it:

```
python3 tools/make-icon.py --theme-color '#E8383F'
```

**All four surfaces are now literally the same bytes**, not merely the same artwork. Verified in the
built app: favicon, apple-touch-icon, header brand mark and the manifest's 192px entry all hash to
SHA-256 `84f0fd8877f6…`. The round-5 owner ruling (*the favicon and the header mark must be
instances of ONE upload, never two independent copies*) now holds across the manifest too, which it
did not before — the manifest was a separate encoding of the same picture.

**`theme_color` is `#E8383F`** (owner's call), replacing `#E74C3C`. That closes a standing open item:
the old value was never the artwork's red. It is a flag on the script, never a silent write — a
spectrum has no derivable "the" colour, so the tool refuses to guess.

⚠️ **Two corrections the work surfaced.** `appIcon.js` claimed the manifest carried *"three icons
(192/512/512-maskable)"*. It carries **two**, and neither declares a `purpose`, so there is no
maskable icon and never was. A maskable one is not a re-encode — it needs its own artwork with the
mark shrunk into the safe zone, because Android crops to a circle. That is a design task, not a
build flag.

⛔ **The script had to work around Chrome not exiting, and the fix is worth reading.** `--screenshot`
writes the PNG and then **the process stays alive** — the same behaviour `PROJECT-CONTEXT.md` §11
records for `--dump-dom`. A plain `subprocess.run(timeout=120)` therefore waited out its whole
timeout and reported failure *after the render had already succeeded*. Polling for the file to
appear and stop growing, then killing Chrome, takes the render from **a 120 s timeout to 2.1 s**.
⭐ **That is open item 3's hypothesis confirmed on real code:** `run.sh` waits for Chrome to exit
the same way, and the same change would cut most of the 28 gate legs to a fraction of their
`--virtual-time-budget`.

⚠️ **Size, stated plainly: the bundle grew 1,180 KB → 1,254 KB (+74 KB, +6%).** A smooth gradient is
the worst case for PNG, so the 192px icon is 16,979 bytes against roughly 5.5 KB before. Palette
quantisation was measured rather than assumed — **76% smaller, but max channel delta 39 and ~8% of
pixels off by more than 8**, i.e. visible banding across the body. Rejected: this is the brand mark.

**Legibility measured, not assumed** — rendered from the shipped bytes at 16/20/24/32/48/64/128/192
on white and on dark. Down to ~24px the silhouette holds (a rounded block with a dark diagonal band
across the top). Below that the clapper stripes merge into a dark bar and the grid squares into
texture; what still identifies it is the **colour**. Do not add finer detail.

⚠️ **Not re-gated, and it did not need to be** (owner's call): the icon is a `data:` URI swap that
touches no frozen symbol, no width-model constant, neither export writer and no save-format key.
`npm run build` + `npm run check` 12/12.

### Unreleased — day overrides get a UI: half days, days off, and worked weekends/holidays

The feature the owner originally asked for (*"adjust the start and end of each week at a week by
week level"*), and the one that turns on everything shipped 16–17 Sep. Local, not pushed at time of
writing.

**Click a day in the month view** and a small popover offers what that day can actually be. Choosing
writes `dayOverrides[iso]` and the schedule recomputes immediately. **Double-click a marked day
clears it** — the "back to automatic" idiom `cellSpans`, column widths and row heights already use.

| the day is | the popover offers |
|---|---|
| a normal shoot day | **Full day** (default) · **Half day** · **Off — not shot** |
| a weekend inside the shoot | **Weekend — not shot** (default) · **Work this day** |
| a union holiday inside the shoot | **Holiday — not shot** (default) · **Work this day**, captioned *Overrides &lt;holiday name&gt;* |
| inside a hiatus | **Work this day**, greyed out, captioned *Inside &lt;hiatus name&gt; — shorten the hiatus to work these days* |
| outside the shoot span | nothing — an override there is inert by design |

⭐ **IT NEEDED NO FROZEN EDIT, and that is not luck.** `.mv-bars` is `pointer-events:none` so the bar
layer does not swallow clicks meant for the day cells, and `.mv-daycell` is `auto` — so a delegated
click on `#table-wrap` matching `.mv-daycell` already reaches the day. The three frozen edits this
feature depends on (`data-ph`, the `mv-day-*` marks, the pill's `pointer-events`) all shipped
earlier; **they had been live in production rendering nothing, because there was no way to set an
override.** The display half was dormant for two days.

✅ **OWNER RULING (18 Sep 2026): a hiatus day shows "Work this day" GREYED OUT with its reason**,
rather than hiding it. Behaviour is unchanged — `'on'` still does not punch through a hiatus — but
the gap stops being silent, which is the project's standing rule that a refusal must name itself.

⛔ **`episodeSpans()` still counts ENTRIES, not work** — an 8-day episode takes 8 calendar entries out
of `shootDays`, which is only 7 days of work once two are halves, so episode boundaries drift against
half days. **The owner chose this deliberately**, against the recommendation: an episode occupies 8
shooting days on the calendar regardless of how full each one is. Do not "fix" it.

**Verified in a real browser** (1024×768, built bundle, 10 × 8 = 80 shoot days from 6/29/26,
`us-general`):

| check | result |
|---|---|
| reachability — `elementsFromPoint` over the day-number band | `.mv-daycell` on top, **35/35 cells** |
| reachability — cell **centre** | **0/35** — a `.mv-note-add` or a pill is always on top (see below) |
| Half day on Mon 6 Jul | wrap **10/20/26 → 10/21/26**; sidebar reads *1 half — 81 days on the floor for 80.5 of 80* |
| Work Sat 11 Jul | wrap pulls in a day → 10/27/26 |
| Tue 7 Jul off | wrap pushes out a day → 10/28/26 |
| double-click clears | mark gone, popover closed, *80 days for 80 of 80* |
| undo / redo | exactly **one** step each way |
| hiatus day | one disabled option, captioned *Inside Summer Break — shorten the hiatus to work these days* |
| a day before the shoot starts | no popover |
| grid rebuilt underneath it | popover **survives** and stays on the same day; applying then marks the right one |
| month nav · view switch · outside click · Esc · same-day click | all close it |

⚠️ **The click target is the day-number band, not the whole cell, and this is worth knowing.**
HANDOFF's one-line claim that a cell click "already reaches the day" is true only there: at the cell
centre the `+` note affordances (which fill every free lane) or a phase pill are on top in **every**
cell. The reachable strip is the ~22 px of `.mv-bars` top padding where the date sits — measured, 16
of 56 probes down a 112 px cell are the cell itself.

✅ **So it shipped with a hover cue, owner-approved the same day:** a scoped
`#table-wrap .mv-daycell{cursor:pointer}`. That is a **frozen CSS edit** — `.mv-daycell` is a `.mv-*`
rule — of the same category and shape as the `#table-wrap .mv-pill{pointer-events:auto;cursor:grab}`
line body-drag needed. Doubly inert in print: the scoping cannot reach `#print-root`, and `cursor`
has no printed representation at all. ⚠️ **It is a weak cue on purpose** — it says "clickable" and
no more, because `.mv-note-click` already sets `pointer` in the lanes below and `.mv-pill` sets
`grab`. Saying more would mean painting the cell, which is a real appearance change to the grid.

⚠️ **And the scoping argument these rules rest on was stated wrongly everywhere — now corrected.**
The docs said *"`#print-root` is a SIBLING of `#table-wrap`"*. It is not: `#print-root` is a direct
child of `<body>`, `#table-wrap` is `body > .layout > main.preview-panel > #table-wrap`. ⭐ The
conclusion is unaffected and is **stronger** than the reason given — all the scoping needs is that
`#print-root` is not a *descendant* of `#table-wrap`. Verified directly: `#print-root .mv-pill` and
`#print-root .mv-daycell` match **0** elements, `#table-wrap .mv-daycell` matches all **35**. The
shorthand stopped being true when the Mantine layout wrapped the preview panel and nobody
re-checked it.

**Save-format hygiene, each item a rule this project has already been bitten by:** `.day-ov-pop` is
in `OVER_PANEL` **and** in `buildSavedHtml()`'s clone strip (proved by planting a marked ghost panel
and reading the exported copy back: absent, while its CSS is still present); **no control inside it
carries an `id`**, so `collectFieldValues()` cannot bake it into saved files or add phantom undo
steps; a `MutationObserver` on `#table-wrap` tears it down from outside frozen `render()`. No
save-format work was needed — `dayOverrides` has been in `captureSnapshot()` since 17 Sep.

⭐ **And the fixture gap is closed.** `tests/fixtures/dayoverrides.sptcal` is the first saved calendar
carrying real `dayOverrides` **and** a `snap-<key>` set to false — all four override kinds (`half`,
`off`, `on` over a weekend, `on` over a union holiday), a non-Monday phase start (Pre Prep, Wed
4/8/26), and a named hiatus. `MONTH-VIEW-PLAN.md` §8 asked for this at steps 1, 2 and 6 and it was
never done, which left **all four month-view frozen edits proven inert when unused and unproven when
used.** Restored through the inline `?state=` path it reproduces the saved calendar exactly: wrap
10/27/26, *1 half · 1 off · 2 added*, snap off with the Wednesday start, and all four marks
rendering.

### Unreleased — month-view hiatus bands stop at Friday

Owner instruction, 18 Sep 2026: *"hiatuses in the month view should not show up on Saturday and
Sundays"*. Nothing is shot at a weekend regardless, so a band painted across Sat and Sun said
nothing and competed with the weekend tint for the same cells. The phase pills already behaved this
way — the hiatus band was the odd one out. Local, not pushed at time of writing.

⛔ **FROZEN EDIT, AND UNLIKE THE OTHER THREE IN THIS VIEW IT DELIBERATELY CHANGES THE MONTH PDF.**
`data-ph` and the `mv-day-*` classes were provably **inert** — the printed DOM came back
byte-identical, which is what let them pass §6.5 condition 1 unchanged. This one does not and is not
meant to. The intended difference, and the only one: weekend columns lose their hiatus band.

⭐ **It also removes a stray band nobody had named.** A hiatus is Monday-snapped and whole weeks long
(`mondayOf(h.start)`, `h.weeks * 7`), so it runs **Mon → Sun**. A month row runs **Sun → Sat**. So a
one-week hiatus painted Mon–Sat on one row *and a single orphan Sunday cell on the next* — a one-day
band belonging to a hiatus that had visually ended the week before. Skipping weekends removes it by
construction.

**Measured with the `monthprint` leg against the reference fixture** (whose range covers the
2026-12-21 default hiatus), `HEAD` vs this change:

| | before | after |
|---|---|---|
| hiatus bands | **4** — `Mon-Sat`, `Sun-Sat`, `Sun-Sat`, **`Sun-Sun`** | **3** — all `Mon-Fri` |
| total elements in `#print-root` | 3751 | **3750** (exactly the one removed band) |
| pages | 16 | 16 |
| `mv-pill` · `data-ph` · note bars · day cells | 86 · 86 · 21 · 574 | **identical** |

The `Sun-Sun` band in the before column is the orphan described above. The month PDF changes in
exactly one way and nothing else moves.

⚠️ **`tests/harness/prepost.py` needs a fix before its next use.** It strips `data-ph` from the POST
capture before comparing, which was right when `HEAD` predated that attribute and is wrong now that
`HEAD` carries it — it reports a false divergence on the first pill. Compare the two captures
directly and normalise only the today-stamp.

⚠️ **A weekend-only hiatus cannot exist**, because hiatuses are whole Monday-snapped weeks — so no
hiatus can lose its band entirely. If hiatuses ever become day-granular, re-check that.

⚠️ Scope: this is the month view's **rendering** of the band only. `isHiatusDate()` is untouched, so
the schedule, the simulation and the waterfall are unaffected — a hiatus still pauses a phase across
the full seven days.

### Unreleased — the month-view drag moves day by day, and "Snap to Mon" is left-aligned

Two owner requests, 18 Sep 2026. Local, not pushed at time of writing.

**The drag is day-granular now, always.** It used to move a snapped phase in whole WEEKS, because
`computeSchedule` does `mondayOf()` on a phase's start and a one-day drag was therefore undone the
instant it landed — the bar sat still through six days of pointer travel and then jumped.

⛔ **The fix is not to quantise the gesture but to let it say what it means.** A snapped phase is
Monday-only, so dragging one onto a Tuesday *is* the instruction "this phase starts on a Tuesday" —
and the drag now turns that phase's snap toggle off rather than refusing to move. The toggle flips
in the sidebar, so the state change is visible rather than silent (owner ruling: *drag turns snap
off*).

⭐ **ONE undo still restores BOTH the date and the toggle, with no extra bookkeeping.**
`start-<key>` and `snap-<key>` are both id'd inputs, so `collectFieldValues()` sweeps them into the
same `fields.byId` snapshot and the gesture banks exactly one of those. Measured: drag
`2026-01-05 → 01-06 → 01-07 → 01-08` flips snap off on the first step; one undo returns the date to
`01-05` **and** the toggle to on.

⚠️ The checkbox is set with `.checked = false` and **no dispatched `change`** — its only listener is
`update()`, which the next line calls anyway, so dispatching would run the whole schedule and render
twice per drag. If a second listener is ever bound to it, dispatch there instead.

**"Snap to Mon" was centred; it is left-aligned now.** ⛔ **A CSS SPECIFICITY COLLISION, and the
bare class lost.** `.phase-fields label` is **(0,1,1)** — one class plus a type — against
`.phase-snap`'s **(0,1,0)**, so it won and forced `flex-direction:column; flex:1 1 116px` onto the
label. Correct for "Start date" stacked over its input; wrong here, where the checkbox belongs
beside its caption. The visible result was the two children stacked *and* centred, because
`.phase-snap`'s own `align-items:center` centres them horizontally once the direction is column — a
checkbox floating above centred text, in a card where every other label is left-aligned.

Fixed with `.phase-fields label.phase-snap` (0,2,1). ⚠️ **`flex-direction:row` is set EXPLICITLY**:
the competing rule sets column, so relying on the row default silently loses the same way. Both the
built-in and the custom-phase builders nest this label inside `.phase-fields`, so one selector covers
both. Measured after: the checkbox's left edge is 33px, identical to the "Start date" and "Weeks"
labels above it.

⏭ **A third report is unresolved and NOT fixed here:** *"Hiatus is missing from the writer's room
hiatus checkbox"*. Not reproducible — the caption reads "Writer's Rm Hiatus" in full when unticked,
ticked, expanded, at 900px and at full width, and it needs 98px against 179 available. ⚠️ **The
likely explanation is that the caption is a `placeholder`, not static text**: `phiatus-name-<key>` is
in `fields.byId`, so a calendar carrying a *value* in that field shows the value and hides the
placeholder entirely. Awaiting the owner on whether it is a fresh calendar or one opened from a file.

### Unreleased — new app icon: a calendar whose top band is a film slate

Owner-supplied artwork, 18 Sep 2026 — a calendar with a clapperboard top, the hinged clapstick
pivoting open from the left. Replaces the flat red-header calendar tile the app had used since the
beginning. Local, not pushed at time of writing.

⛔ **There are TWO independent copies of the app icon and both had to change.** `HANDOFF.md` row 32
flagged this and it is still the trap:

| | feeds | what changed |
|---|---|---|
| `APP_ICON` in `src/chrome/appIcon.js` | the tab favicon, the `apple-touch-icon`, and the header brand mark | one 192px PNG, 3,750 → 6,502 B |
| the manifest's `icons[]` | the **installed-PWA** identity | three PNGs: 192 `any`, 512 `any`, 512 `maskable` |

Changing only the first leaves an installed app wearing the old icon forever, with nothing on screen
to say so.

**How the PNGs were made.** The source is an SVG; all four rasters come from it via headless Chrome
at exact pixel sizes. ⚠️ Chrome's `--screenshot` **writes the file and then does not exit**, exactly
as `run.sh` documents for `--dump-dom` — background it, poll for the file, kill it. A foreground
chain hangs.

⛔ **THE MASKABLE ICON WAS DROPPED, because it is what put a white box behind the app in the macOS
Dock** (owner report). A `maskable` icon is *required* to be opaque — the platform crops it to a
circle or squircle and transparency would show as holes — so it shipped as RGB with no alpha channel
at all. That is correct on Android. **macOS does not crop app icons**, so when Chrome picked the
maskable for the installed app you got the white square. The manifest now carries only the two
transparent `any` icons.
⚠️ **Cost:** an Android install no longer gets a purpose-built masked icon and the launcher will crop
the `any` one itself, which can clip the corners. Acceptable here — the documented targets are
Chrome/Edge on desktop — but restore the maskable if Android ever matters.
⛔ **AN INSTALLED PWA CACHES ITS ICON AT INSTALL TIME.** Changing the manifest does **not** update an
existing install's Dock icon; it has to be uninstalled and reinstalled. Expect no visible change
otherwise, and do not read that as the fix having failed.

⛔ **A REAL BUG THIS FOUND, worth more than the icon itself: `--window-size` BELOW ~400px IS CLAMPED
BY macOS CHROME, and the screenshot is then a CROP of a larger render.** The first 192px icon was
rendered directly at `--window-size=192,192` and came out as the top-left corner of a much bigger
drawing — a fragment of the clapper arm and nothing else. It shipped into `APP_ICON` *and* the
manifest, and it looked plausible in a file listing because it is a valid 192×192 PNG of the right
size. ⭐ **Render large and downscale; never trust a small window.** The 192 is now a 4:1 box
downscale of a 768px render, averaged in **premultiplied** alpha — averaging straight RGBA bleeds the
colour of fully-transparent pixels into the edges and leaves a dark halo. ⚠️ **Check the centre pixel's
alpha after any icon render**: opaque centre + transparent corners is the two-number test that would
have caught this immediately.

⚠️ **The manifest is a fully percent-encoded `data:` URI** (`+` → `%2B`, `/` → `%2F`, `=` → `%3D`),
so splicing new base64 into it risks silently rewriting the whole thing. Guarded by proving the
round-trip first: `quote(unquote(payload), safe='') == payload` is byte-identical, and only then were
the three `src` values replaced. Re-verified after writing that `name`, `short_name`, `theme_color`
and `start_url` are untouched.

⭐ **Trimmed after a first look (owner: "too tall").** The gap below the last row of day cells was
**110 units** against **62** between the red band and the first row — measurably bottom-heavy. The
calendar body's bottom edge moved 716 → 668 and its corner arc 646 → 598, the darker slab moved up the
same 48 keeping its 34-unit reveal, and the outer transform was re-centred `translate(40,58)
scale(0.90)` → `translate(28,72) scale(0.95)` so the shorter artwork still fills the 800 square. Both
gaps are now 62. ⚠️ The corner arc now starts *above* the last cell row — checked, not assumed: at
y=606 the body edge sits at x=100.2 and the nearest cell starts at x=166, so nothing clips.

⚠️ **At 16–32px the diagonal clapper stripes blur into a pink band.** The silhouette still reads as a
red-topped calendar — the same shape the old favicon had — so it is legible, but the detail is at its
floor. Do not add finer detail to this artwork expecting it to survive a favicon.

⏭ **`theme_color` is still `#E74C3C` and was deliberately left alone.** The new artwork's clapper red
is `#EF493C` — close but not the same. `theme_color` tints the browser chrome and the installed app's
title bar, and `HANDOFF.md` already records it as deliberately not single-sourced from the icon. Say
the word if it should follow the artwork.

⚠️ Build cost: about 15 KB on `dist/index.html`, which is ~1.17 MB.

### Unreleased — the app is **SPTCal**

Owner rename, 18 Sep 2026, replacing *SPT Calendar Builder* (itself a rename from *SPT Planning
Calendar Builder* on 3 Sep). Local, not pushed at time of writing.

⭐ **The name was already half-shipped, which is most of the argument for it.** The save format is
**`.sptcal`**, the preference store is `sptcal.prefs`, the IndexedDB is `spt-planning-cal`. People
are already emailing each other "sptcal files" — the app now matches the file, and the extension
stops looking arbitrary. It also never truncates under a home-screen icon, which *SPT Calendar* was
borderline on.

**Changed — the six surfaces that name the APP:** the PWA manifest `name` **and** `short_name` (both
now `SPTCal`, where they previously differed), the tab `<title>`, `apple-mobile-web-app-title`, the
header brand, and the help panel's heading and its `?` button tooltip.

⛔ **Deliberately NOT changed — these name the DOCUMENT, not the app**, which is the same line the
3 Sep rename drew and it still holds:

| Left alone | Why |
|---|---|
| `<Show> Planning Calendar.xlsx` / `.pdf` | the file a user hands to a producer |
| the Excel worksheet tab, `Planning Cal` | ditto, and it is inside every workbook ever exported |
| the save/open picker type labels | describes the file being chosen |
| the calendar's own `c2` header line, `Planning Calendar` | ⛔ **baked into every saved `.sptcal`** — changing it would rewrite what existing calendars print |

⛔ **The root `index.html` was NOT renamed.** It is byte-identical to `releases/v1.2.0.html` and is
the one-click rollback; only the build changed. Verified with `cmp` after the edit.

⚠️ **A changed manifest `name` changes the INSTALLED identity.** An existing PWA install may appear
as a *new* install rather than a rename — the same caveat logged for the 3 Sep rename, and it has
never been observed in the wild either time, so treat it as a known unknown rather than a prediction.

⚠️ **The manifest is a percent-encoded `data:` URI**, so the edit ran against `%22name%22%3A%22…%22`
rather than readable JSON, and every token was count-verified before anything was written — a
partial rename would leave the app calling itself two different things. Confirmed afterwards by
fetching the manifest in the running app and parsing it: `name` and `short_name` both `SPTCal`, JSON
still valid.

### Unreleased — dragging a phase in the month view: it could not be clicked, and it was two undo steps

`MONTH-VIEW-PLAN.md` step 5 (body-drag), shipped in the same working tree that added it. Two
defects, one of which made the feature non-functional. Local, not pushed at time of writing.

**The gesture could not receive a mouse press at all.** `.mv-bars` sets `pointer-events:none` so the
bar layer does not swallow clicks meant for the day cells, and `.mv-pill` inherits it — so a real
press on a pill landed on the `.mv-daycell` underneath and the handler never saw it. Measured:
`elementFromPoint()` at a pill's exact centre returned `mv-daycell`, and the pill was absent from
`elementsFromPoint()` entirely.

It had looked verified because it was driven by dispatching events **straight at the pill node**,
which skips hit-testing — exactly the trap `HANDOFF.md` already records (*"synthetic PointerEvents
are not proof a gesture works for a real user"*). This is the second time that trap has been paid
for; the first cost a shipped regression in the preview toolbar.

⛔ **Fixed with a FROZEN CSS EDIT, owner-approved 18 Sep 2026:**
`#table-wrap .mv-pill{ pointer-events:auto; cursor:grab }`. It is the same opt-in `.mv-note-click`
already uses one screen down, not a new mechanism. ⭐ **Scoped to `#table-wrap` on purpose**: the
unscoped form would also match inside `#print-root`, and although neither property can render,
scoping makes *"the print path is untouched"* true by **construction** rather than by argument —
`#print-root` is a sibling of `#table-wrap`, so nothing inside it can match. That is the claim a
frozen edit should be able to make.

⚠️ What it costs: a pill now takes clicks in its own ~17px lane, where they previously passed
through. Measured on the reference fixture — **0 overlaps between the 4 pills and all 118
`.mv-note-click` elements**, and nothing listens on `.mv-daycell` (the month view's click handlers
are `.mv-note-click` and `.mv-row-expand`, both in their own lanes). So it is free today. Anything
added to a day cell later must expect pills to be in front.

**One drag was two undo steps.** Every increment calls `update()` → `markDirty()` →
`scheduleUndoPush()`, which **clears and re-arms** a 500 ms timer (`UNDO_DEBOUNCE_MS`). Hold still
longer than that — which is what aiming looks like — and it fires **mid-gesture**, banking an
intermediate date the user never chose. Measured A/B on the same drag, `2026-01-05 → 01-12 → 01-19`
with a 1.5 s pause: before, one undo landed on **`2026-01-12`** and a second was needed for
`01-05`; after, one undo returns to `01-05`.

⭐ **Why no other drag in the app needs this, which is the part worth keeping.**
`installGridResizers` and `beginSpanDrag` mutate only **presentation** while dragging
(`col.style.width`, `tr.style.height`) and write their store once, in `onUp` — so `markDirty()`
runs exactly once and the single step falls out for free. This gesture cannot: a phase's start date
**is** the state, and moving it is the whole preview. So it brackets itself with explicit pushes
and cancels the pending one on each step, via a new `cancelPendingUndoPush()` helper declared
beside `scheduleUndoPush()`. No frozen code involved.

Also fixed while there: a `mouseup` released outside the window never arrived, so the pill kept
following the pointer with the button up — and, once the debounce is cancelled, its undo step would
never have been banked at all. A move with the primary button released now ends the drag. And the
drag wore `body.grid-selecting` (`cursor:cell`, the **marquee** cursor) where `body.grid-swapping`
(`cursor:grabbing`) already existed and is what a move means.

New harness leg `tests/harness/t/monthdragundo.js` asserts the undo contract. ⚠️ Its header states
plainly that it does **not** prove reachability — synthetic events exercise the handlers, not
hit-testing, which is the whole reason the first defect survived.

### Unreleased — `dayOverrides`: per-day control of the shoot (store, simulation, and the waterfall's explanation)

`MONTH-VIEW-PLAN.md` steps 2 and 3. Owner asked to *"move weeks, and adjust the start and end of
each week at a week by week level"*. This is the mechanism. **No UI yet**, so it is inert for users
until something can set it. Local, not pushed at time of writing.

```js
dayOverrides = { 'YYYY-MM-DD': 'half' | 'off' | 'on' }
```

⭐ **One map, not a restructure.** The literal reading — give every week its own start date — would
have turned Production from `{start, days}` into a list of independently-dated blocks. Instead:
*"week starts Tuesday"* is `Mon:'off'`, *"runs into Saturday"* is `Sat:'on'`. Production stays
derivable from `start + count + holidays + hiatuses + this map`, which is the property that makes
the waterfall and the month view incapable of disagreeing.

**Measured against hand-traced predictions** — 10 shoot days from Mon 6 Jul 2026, region None:

| Overrides | Wrap |
|---|---|
| none | Fri 17 Jul |
| Wed + Thu `half` | **Mon 20 Jul** — two halves are a day short, so +1 |
| Wed `off` | **Mon 20 Jul** |
| Sat `on` | **Thu 16 Jul** — Saturday worked, finishes a day EARLY |
| one `half` (odd) | **Mon 20 Jul** — count reaches 10.5, over-delivers |

And the month view draws the forced Saturday as a real shoot day (`mv-pill` at `grid-column: 7 / 8`)
— no change to `renderMonthView`, the same as the snap toggle.

⭐ **The over-deliver ruling needed no new code.** The loop was already
`while(count < shootDaysRequested)`, so making `count` fractional implements it exactly: 9.5 of 10
takes one more full day and delivers 10.5. **The shoot can never come up short.**

⛔ **`dayOverrides` SHIFTS — the first day-addressed store that does.** `shiftCalendar` carries a
standing warning *not* to add a `shiftKeyedMap` call there, because `dayNotes` / `dayNoteColors` /
`mvExtraLanes` belong to a **date** — "wrap party booked" must stay put. An override belongs to a
**shoot day**. The warning has been extended rather than left for someone to "correct" back.

⚠️ **A bug introduced earlier in this same work, found and fixed.** The shift first used
`hiatusKeyStays` as its predicate — which keeps a bare-ISO key when that ISO is in
`stayingHiatusWeeks`, the week Mondays of **locked** hiatuses. Override keys are DAY ISOs, so one
landing on such a Monday would have **stayed behind while every other override moved**, silently
changing which day is half. The test that "passed" did so only because none of its four dates
collided. It now shifts with **no predicate**: every override moves, always.

⚠️ **Restore copies values VERBATIM and filters nothing** — proven with a deliberately unknown value
(`'futuristic'`) surviving a full round trip, read back out of the crash backup. A round trip must
never lose data; ignoring unrecognised values is the simulation's job. Otherwise opening and
re-saving someone's file would silently strip whatever this build did not understand.

⚠️ **Reset All clears the map; "Reset Notes & Hiatus" deliberately does NOT** — an override moves
the wrap date, so wiping it from a *notes* reset would silently reschedule the shoot. **Verified by
code inspection, not execution**: the Reset Notes button was not reachable in the view under test
and the attempted probe returned `buttonFound: false`, so it proves nothing.

**Two judgment calls, not owner rulings — both flagged for confirmation:**

1. **`on` does not override a hiatus.** It forces past weekends and union holidays, which are
   calendar facts; a hiatus is a stop-work period deliberately scheduled, and a per-day flag
   punching through it would make the hiatus band meaningless. To work during a hiatus, shorten it.
2. **A half day still goes into `shootDays`**, because the month view draws from that array and the
   day *is* worked. ⛔ **Known consequence:** `episodeSpans()` slices it by **count**, so an 8-day
   episode gets 8 *entries* — fewer than 8 days of work once any are half. Episode boundaries drift
   against half days. Commented at the push site rather than papered over.

#### Step 4 — the waterfall says why the wrap moved

A sibling line under the Production row, shown **only** when an override is in range:

```
2 half · 1 off · 1 added — 11 days on the floor for 10 of 10
```

Two numbers, which is the whole of the owner's §4.5 ruling: **11 days on the floor** (every override
day counted as a full day — the waterfall's view) delivering **10 days of work** (halves at 0.5 — the
month view's). One wrap date, two displayed counts. Verified by hand: overrides Wed ½, Thu ½, Fri off,
Sat on gives Mon 6, Tue 7, Wed½, Thu½, Sat, Mon 13–Fri 17, Mon 20 = 11 days delivering
`1+1+.5+.5+1+1+1+1+1+1+1 = 10`, wrapping 7/20/26 — exactly what the line reports.

⚠️ **This corrected an error in `MONTH-VIEW-PLAN.md` §4.5**, which called the `meta-<key>` hint
"chrome, not frozen". That conflated the **element** (a sidebar div) with the **code that writes
it**: `metaEl.textContent` is written inside `render()`, which **is** frozen. So this is a *sibling*
element filled from `update()` after `render()` returns — `CLAUDE.md`'s sanctioned *"drive the effect
from outside"* pattern, the same one `reflectStartDateValidity()` uses. **No frozen edit.**

⭐ **Silent on every calendar that has none** — empty text plus a `:empty{display:none}` rule, verified
against a fixture with no overrides. Since there is still no UI to set them, this ships invisible.

⚠️ `'off'` days are absent from `shootDays` by definition, so they cannot be counted the way `half`
and `on` are — they are counted across the span between the first and last shoot day instead.

### Unreleased — phases can start on any day: a per-phase Monday-snap toggle

`MONTH-VIEW-PLAN.md` step 1. Owner: *"right now start dates of phases snap to the closest monday.
thats fine as the default, but i want you to have the option to change that start date to a
different day for each phase."* Local, not pushed at time of writing.

Every phase row — the six built-ins and every custom phase — gets a **Snap to Mon** checkbox,
**default on**. Off, the date you typed is the date used.

⭐ **The month view went day-accurate for free, and that was the point of doing this first.** It was
already a day-level renderer and nobody had noticed: `segCoversDate()` is
`date >= s.start && date < s.end`, Production carries an exact `shootDays` ISO array, and
`pillRunsForWeek()` walks `i = 0..6` asking per day. Neither is on the frozen list. The view only
*looked* Monday-aligned because `computeSchedule` snapped starts before the renderer saw them.
**Measured, not assumed** — with `prePrep` starting Wed 8 Jul 2026 and snap off, the pill renders at
`grid-column: 4 / 7` against day headers `Sun Mon Tue Wed Thu Fri Sat`. Column 4 is Wednesday.
**Zero changes to `renderMonthView`.**

So the whole change is one conditional plus a checkbox:

```js
const start = (cfg.snap === false) ? parsed : mondayOf(parsed);
```

⚠️ **Only the PHASE start is conditional.** The other 34 `mondayOf()` call sites key weeks for notes,
spans and row heights, and stay Monday-based — a grid cell **is** a week, and the save format
depends on it.

**The waterfall is unchanged by design.** It renders whole week rows, so a Wednesday-start phase
occupies that week. That is a resolution difference, not a disagreement: one schedule, two views
(`MONTH-VIEW-PLAN.md` §1).

⭐ **The frozen hint corrected itself, which was a genuine surprise.** `render()` is frozen and writes
`meta-<key>`, including `note += '\nSnapped to Mon X'`. Its guard turns out to be
`if(cfg.start !== start.toISOString().slice(0,10))` — comparing **what you typed against what was
resolved**, not "is this a Monday". So with snap off they are equal and the frozen code drops its own
hint, correctly, with no edit. **A second hint was written and then deleted**; a comment now records
why none is needed.

⚠️ **Built-in phase rows bind inputs BY ID**, while only the custom-phase builder does a blanket
`row.querySelectorAll('input')`. The checkbox worked on custom phases and was **inert on all six
built-ins** until bound explicitly in `PHASES.forEach`. That reads as a per-phase bug; the binding
site now carries a warning.

**Save format.** `snap-<key>` per phase, swept into `fields.byId` like any `input[id]` — correct,
because it changes dates. ⛔ **`checked` lives in the MARKUP, which is the entire back-compat
mechanism**: an older calendar has no `snap-*` key, `applyStateSnapshot()` never touches the box, it
stays checked. Absent means snapped.

**Verified.** Gate: **294 assertions, one real failure — gate 5, by design** (`lost: []`,
`gained:` the six ids, `changed: []`, 53 → 59), re-cut after checking the rest. `v1.0.0-saved.html`
restores with an **identical grid signature** and all six toggles reading `"1"`. Waterfall PDF
byte-identical, Excel parts identical, 0 clipped cells, `npm run check` 12/12.

⚠️ **A second gate failure was investigated and dismissed, with evidence.** `onecol` timed out after
20 s waiting for its `.xlsx` blob. Not a regression: it passed in both prior gate runs, it passes
**standalone now with this change** (`PASS: true`, every assertion including `xlsxHeaderIdentical`),
the failure was a timeout rather than a mismatch, and gates 1–4 in the same run reported Excel parts
identical. Contention during a ~25-minute run. **Recorded rather than silently re-run.**

### Unreleased — Northern Ireland, Wales, and Germany as Berlin + Brandenburg

Owner: *"add northern ireland, wales, and germany as berlin + brandenburg"*. Local, not pushed at
time of writing. **31 places, 15 lists** (was 27 / 12).

⛔ **Northern Ireland was the same bug we had just fixed for Scotland.** The UK was split into two
nations — but `gov.uk/bank-holidays.json`, the feed `tools/gen_holidays.py` already reads, publishes
**three**. NI keeps every England & Wales bank holiday and adds two: **St Patrick's Day** (17 Mar)
and the **Battle of the Boyne** (12 Jul). Ten days, the longest list of the four nations. Until now
a Belfast shoot — Titanic Studios is a real production centre — had to pick *London* and silently
lost both. The data was sitting in a source already being consumed.

**Wales cost one line.** It shares England's bank holidays exactly, so it is a label pointing at the
existing `UK-EW`. Cardiff is a genuine hub and there was no way to say so.

⚠️ **Germany is NOT one entry, and the reason is a trap worth knowing: Studio Babelsberg is in
Potsdam, which is BRANDENBURG, not Berlin.** Germany is federal — nine holidays nationwide and
thirteen more that vary by *Land*. Berlin and Brandenburg differ **in both directions**:

| | Berlin (`DE-BE`) | Brandenburg (`DE-BB`) |
|---|---|---|
| International Women's Day, 8 Mar | ✅ | — |
| Reformation Day, 31 Oct | — | ✅ |
| Easter Sunday / Whit Sunday | — | ✅ statutory |
| **Days/year** | **10** | **12** |

So a production calling itself a Berlin shoot but staging at Babelsberg is on the *other* list.
Picking Berlin for it loses Reformation Day and invents Women's Day. Berlin's entry carries a
caveat saying exactly this, and Brandenburg is labelled *"incl. Studio Babelsberg"*.

⭐ Brandenburg is one of the few Länder making **Easter Sunday and Whit Sunday** statutory. Both
always fall on a Sunday, so they can never move a shoot date — but they are in the law, so they are
in the list. ⚠️ **Germany has no substitute-day rule at all**: a holiday landing on a weekend is
simply lost, which is why both German regions use `observance="none"` and emit no `(Observed)` rows.
Verified in the output — the German lists contain none.

**What was verified.** The regression that matters: after adding three regions, **all 12
pre-existing lists still reproduce BYTE-IDENTICALLY** from the generator — checked by extracting
`HOLIDAYS` from both `app.js` and the regenerated `holidays.data.js` and comparing each region's
JSON. That is what makes the new data trustworthy: it comes from the same machinery that provably
reproduces the old. Date spot-checks against Easter 2026 (5 Apr): Good Friday 3 Apr, Ascension +39 =
14 May, Whit Sunday +49 = 24 May, Whit Monday 25 May — all correct. The Boyne falls on a Sunday in
2026 and correctly rolls to Monday 13 July. `npm run check` 12/12, `verify_migration.mjs` reports
all 31 places resolve and all 15 lists reachable, and the four new options were driven in a browser.

⚠️ **PROVENANCE IS WEAKER FOR GERMANY AND THE CODE SAYS SO.** Every other region cites a union
agreement that was read. The German entries cite each Land's **holiday statute**, which was read —
Berlin's Sonn- und Feiertagsrecht and the Brandenburg Feiertagsgesetz (FTG) 2003. The relevant crew
agreement, the **TV FFS** (ver.di / Produzentenallianz), had its holiday clause **NOT** verified.
Brandenburg's caveat says so to the user. This matches how `LT` was already handled — statute-based,
and labelled as such — but it is a lower standard than the IATSE and Pact/Bectu entries and should
be closed by someone with access to the TV FFS.

⛔ **`union-place` values are part of the save format now** — they live in `fields.byId`. Adding
places is safe (append-only, same rule as `PHASE_COLOR_OPTIONS`). **Renaming or removing one breaks
every calendar saved with it.** Splitting Germany later would have needed a migration, which is
exactly why it went in as two entries rather than one.

### Unreleased — a one-time notice when a corrected holiday list moves your dates

Owner request, after asking what happens to previously-saved calendars when the holiday data ships.
Local, not pushed at time of writing.

⚠️ **The question had a real answer and it is not "nothing".** A saved calendar stores INPUTS —
start dates, durations, notes — and never computed dates, so opening one recomputes the schedule
against whatever holiday data the app now has. Measured by running one calendar through both builds
side by side:

| Region | 40–60 shoot days from 2026-07-06 | Old | New |
|---|---|---|---|
| Ontario | 60 days | wraps **9/28/26** | wraps **9/29/26** |
| London | 40 days | wraps **9/1/26**, 9 weeks | wraps **8/28/26**, **8 weeks** |

Ontario slips a day because the Civic Holiday is now correctly a non-shoot day. London comes back
four days early and **one grid row shorter**, because the old single UK list was charging England
for Scotland's early-August bank holiday. Every other list is date-identical, so every US calendar
— the majority — reopens unchanged.

⚠️ **A note on a week the shorter schedule no longer covers SURVIVES but is stranded.** Reproduced
with a legacy UK save carrying "FINAL DAY — wrap party booked" on the week of 31 Aug: after the fix
that row renders as `8/31/26 | | FINAL DAY...` — the note intact, the phase label gone, three days
after the real wrap. Nothing is destroyed and it returns if the schedule grows again, which is why
the notice **informs rather than trying to repair anything**.

**`#holiday-notice`** is a third strip in the existing `#legacy-notice` / `#update-notice` family
(same markup shape, same amber as the legacy strip — HANDOFF §6 warns this app already has more
warning looks than it should). It names which list changed and why, and says the plan is unchanged
— only the days the shoot skips.

**It fires only for files that genuinely predate the fix.** `migrateRegionSnapshot()` now RETURNS
whether it migrated, which is the only reliable signal: legacy region keys prove the file was
written before the correction, and a file carrying `union-place` already returns early and can
never raise it. Verified across four fixtures — legacy UK ✅ fires, legacy Ontario ✅ fires, legacy
US ❌ silent (date-identical list), current-format UK ❌ silent **even though it resolves to UK-EW**.

⛔ **Two traps this had to clear, both already documented and both live.**

- **`collectFieldValues()` sweeps every `input[id]`/`select[id]`/`textarea[id]`.** The dismiss
  control is a `<button>`, so it cannot be swept into a saved file or add a phantom undo step. The
  dismissal itself is a per-user PREFERENCE in `localStorage` (`sptcal.prefs.holidayFixNoticeSeen`),
  never `captureSnapshot()` — it must not travel inside someone else's calendar.
- **The shareable-copy clone.** The strip ships `hidden` and is un-hidden with `el.hidden = false`,
  which REMOVES the attribute that `outerHTML` serialises — exactly the bug that once baked a
  permanent banner naming someone else's file into exported copies. `#holiday-notice` is added to
  the clone's re-hide list alongside the other two.

⚠️ **The first version broke `tests/verify_migration.mjs`** by having `migrateRegionSnapshot()` set
a module-scope flag. That harness lifts the function out of the source and evals it in an isolated
scope on purpose — which is what stops it drifting from the code — so a free variable is an instant
`ReferenceError`. Returning the fact instead is both the fix and the better design. **Keep that
function free of outer references.**

⚠️ **`tests/harness/t/sharecopy.js` was extended to cover the new strip, and that extension is
UNVERIFIED** — the leg times out earlier, waiting for the Export-shareable-copy menu item, on the
unmodified build too (checked against a stashed tree). It is not in `gate.sh`'s list, consistent
with being a known-broken manual leg. The clone guard itself was confirmed present in the built
bundle by hand.

### Unreleased — the Production Region became a LOCATION picker, and the holiday data was regenerated from rules

Applied from `city-select.patch` (written 14 Sep 2026 against `5c069bc`). Local, not pushed.

**The user now picks where they shoot; the agreement resolves behind it and is never selected.** Three
selects — `#union-country` plus a dependent `#union-usregion` / `#union-subregion` — became one
`#union-place` with 27 options under five `<optgroup>`s: 20 production markets, six province-wide
Canadian entries, and an *Elsewhere in the U.S. — Area Standards* fallback so nothing the old model
could express was lost. A UPM knows the city and should not have to know that Florida is an Area
Standards market. Nine US markets share one list, so `20 places → 12 lists` is structural, not a
coincidence. Under the select, two lines say what the city name hides — which agreement it resolved
to and which locals hold the card — and Chicago, San Francisco, New Orleans, Oahu and Puerto Rico
carry an amber caveat, because their list is a **proxy** rather than a finding.

⚠️ **This is a deliberate save-format change, and the migration is the whole risk.**
`applyStateSnapshot()`'s replay is `const node = document.getElementById(id); if(!node) return;` — so
the moment `#union-usregion` stopped existing, a v1.2.0 save would have had its region **silently
dropped**: a New York calendar reopening on the General list, a different wrap date, and no error
anywhere. `migrateRegionSnapshot()` runs as the **first statement of `applyStateSnapshot()`**, before
the replay can ever see the legacy keys. Two rules inside it are easy to get wrong: a blank
`union-country` meant *None* while the other two selects still held resting values — promoting those
would switch holidays **on** for a calendar that deliberately had none — and a province-level save
migrates to the **province-wide** entry, not that province's city, so a restore is faithful to what
the user actually picked.

**Holiday data is now generated from rules by `tools/gen_holidays.py`, never transcribed.** Change a
rule and regenerate; do not edit a date. Four new lists (`UK-EW`, `UK-SCT`, `AU-VIC`, `LT`), every
list extended to 2030, and two corrections:

| | before | after |
|---|---|---|
| Ontario | 9 days | **11** — gained the August Civic Holiday and the National Day for Truth and Reconciliation |
| United Kingdom | one `UK` list carrying **both** August bank holidays — correct for neither nation | split into `UK-EW` (31 Aug) and `UK-SCT` (3 Aug, plus 2nd January and St Andrew's Day, no Easter Monday) |

Verified by set-differencing every `date:` line across the diff: the **only** removals in 2026–2029
are the four bogus `Summer Bank Holiday (Scotland)` entries from the old merged `UK` list. `US-GEN`,
`US-NY`, `CA-BC`, `CA-QC`, `CA-AB`, `CA-MB` and `CA-NS` are date-identical — which is why the grid
gates could be held to *unchanged* rather than merely *explained*.

**What was verified.** `node tests/verify_migration.mjs` → **105/105** legacy combinations resolve to
the same holiday list, plus eight edge cases, exit 0; it reads `PLACES` and `migrateRegionSnapshot`
out of `app.js` at runtime so it cannot drift from what it tests. The real `v1.0.0-saved.html`
fixture restores through the picker to `union-place: "us-general"` on `US-GEN` with an **identical
grid signature** — 52 rows, 154 cells, `gridWidthPt` 324, 0 clipped. Gates 1–4 unchanged (waterfall
PDF byte-identical, Excel parts identical). Gate 5 failed by design and was re-cut: `fields.byId`
moves **55 → 53** ids, `changed: []`. In the browser: Mantine's `NativeSelect` passes `<optgroup>`
through intact (5 groups, 28 options), the caveat renders in the intended amber, and the holiday
panel's empty state correctly distinguishes *no region picked* from *none in range*.

⛔ **Three defects found in the patch and fixed here — it had never been built or run by its author.**

- **`Reset All` was dead on arrival.** The reset block still cleared `#union-country` and read
  `DEFAULT_PROVINCE` / `DEFAULT_US_AREA` / `lastCountry` / `lastSubregion` / `lastUsArea`, all six of
  which the patch deletes. `null.value` threw **first**, so the reset died half-done: phases and
  sim-post cleared, the show title, episodes, notes and hiatuses below it untouched. Now clears
  `#union-place` to `''`, which is the same *None* the old `country=''` meant.
- **`normalizeRegionSelection()`'s comment was false.** It claimed an unknown place "falls back to the
  default rather than silently resolving to None". A `<select>` coerces an unmatched value to `''` at
  assignment, so the guard is already false and the fallback never fires. Behaviour left alone —
  *None* is the safer landing, and forward compatibility is out of scope — but the comment now says
  what actually happens.
- One stale `union-country` reference in a code comment.

⚠️ **Found while re-cutting: five keys in the committed `restore.json` baseline were already
stale**, from the 8 Sep probe rework and not from this change — proven by running the leg against a
stashed pre-patch tree. Only `form` was re-cut; the rest were left alone and written up rather than
silently absorbed.

### Unreleased — Single Column Mode now fills the page width, not just its height

Owner: *"how would you make adjustments such that the collumn fills the vertical page as shown in
the example."* Local, not pushed at time of writing.

⚠️ **It already filled the page vertically — the wasted space was at the sides.** One column is tall
and narrow, and both writers fit the whole grid onto one page, so the scale is pinned by HEIGHT.
Measured on the reference calendar: printable area 576 × 698pt, grid 416 × 810pt, so the scale was
698/810 = 0.86 and the grid printed **358pt wide of 576** — 38% of the page empty at the sides,
while being exactly as tall as the page allows.

`sheetColumnWidths` now grows the columns in that mode by
**`f = (availW × gridH) / (availH × gridW)`** — the factor that makes a height-bound grid fill the
width too. ⭐ `gridH` does not depend on column widths (`sheetGridMetrics` derives it from the row
*count*), so there is no feedback loop and one pass is exact.

| | grid | printed | fills |
|---|---|---|---|
| Blocked | 572 × 795 | 502 × 698 | 87% wide, 100% tall |
| Single, before | 416 × 810 | 358 × 698 | **62% wide** |
| Single, after | 655 × 810 | 565 × 698 | **98% wide**, 100% tall |

Columns grow proportionally — date 53→89, phases 92→158, notes 144→250 — so the proportions you see
on screen are kept. 0 clipped cells either way.

⛔ **A frozen edit in `sheetColumnWidths`, written as a POST-PASS so everything above it is
untouched**, and it cannot run at all while the setting is off — the blocked layout's widths measured
byte-identical before and after. ⛔ **A hand-dragged column keeps exactly the width it was dropped
at**: stretching those too would move the user's own drag out from under them and leave no way to
set a width that stayed set, so the auto columns absorb the slack instead.

⚠️ **Two assumptions worth knowing.** It sizes against **portrait** — with one block
`sheetPageOrientation` prefers portrait and only flips if landscape prints 15% larger, which a tall
narrow grid never does, so sizing against the orientation that will actually be chosen keeps this to
one pass. And the stretch is applied **after** `clampChars`, so the notes column may exceed
`COL_MAX_CHARS_NOTES` in this mode — deliberately, since filling the page is the point.

### Unreleased — Single Column Mode was collapsing the printed header

Owner: *"the single column mode is messing up the entire header in the export — the header should
look/work exactly the same as it always does even in single collumn mode."* Local, not pushed at
time of writing.

⛔ **`buildWaterfallPdf` pinned the header band to the GRID's edges, not the page's.** That is
correct when the grid fills the page — Excel centres a shrunk sheet and puts `&L`/`&C`/`&R` over it,
and the PDF matches. One column makes the grid narrow (4 columns instead of 7), so it is centred
with wide side margins — and the header collapsed with it.

Measured off the real PDF content stream, before and after:

| | header span | date drawn at |
|---|---|---|
| Blocked | **543pt** (x 20 → 563) | x = 20 |
| Single, before | **338pt** (x 123 → 461) | x = 123 |
| Single, after | **548pt** (x 18 → 566) | x = 18 |

Cramped at best, and overlapping as soon as the show title or the production summary is long. The
band now spans the printable **width** in that mode instead of the grid — which is what "the same
as it always does" means in practice, since in every other layout the grid already fills the page
and the two are the same thing.

⛔ **A frozen edit, 5 code lines in `buildWaterfallPdf`**, and inert by construction with the
setting off: `hdrLeftX` collapses to `originX` and `hdrRightX` to `originX + gridW*scale`, so `midX`
and `rightEdge` are the expressions they always were. Confirmed empirically as well as by
inspection — the blocked span measured 543pt before the change and 543pt after.

⚠️ **The workbook was never affected** and is now asserted not to be: Excel's `&L`/`&C`/`&R` are
page-relative, so the grid's width cannot reach them. Checked rather than assumed, because the
report said "the export" and this app has four of them.

⚠️ **Nothing about the header's TEXT changed, which is why nothing caught it.** This was a pure
coordinate bug, and every existing header assertion compares strings. The new `onecol` checks
measure **positions** out of the PDF content stream, and compare the two layouts against each
other rather than against a baseline — so the guard survives any future change to what the header
says.

### Unreleased — Preferences gets a real switch, and a divider between its settings

Owner: *"this should be a toggle like in iOS settings and there needs to be visible seperation
between the different settings. Refer to mantine for styling ideas."* Local, not pushed at time of
writing.

Named **Single Column Mode** at the owner's request in the same breath, and the grid-lines control
was reshaped to match it: label left at the same `size="sm"`, a small selector right, both controls
flush to the same right edge so the card reads as a list of settings rather than two unrelated
widgets. Its label is a plain `Text` rather than `NativeSelect`'s own `label` prop precisely so the
two rows share one type scale — the built-in label renders at a different size.

⚠️ **It reads "Grid Lines in Exports", and the plural is load-bearing.** It was first written as
*"Grid Lines in PDF Export"*; the setting drives `SHEET_GRIDLINES`, which **both** writers read —
`exportExcel` draws the workbook's cell borders from it just as `buildWaterfallPdf` draws the PDF's
— so PDF-only understated its reach. Flagged rather than silently corrected, because naming is the
owner's call, and corrected by the owner the same day.

A full-width button that changed colour was standing in for a switch. It is a Mantine **`Switch`**
now — label left, 46×24 pill right, the settings-row shape everyone already knows — with a
**`Divider`** between it and the grid-lines select so two unrelated controls stop reading as one
group. The on-state is the app's own primary (`#2C3E50`), so it matches the active tab without a
line of custom CSS.

⛔ **A Mantine component added without its per-component CSS renders as a bare checkbox, silently.**
This app imports `@mantine/core` styles **one file per component**, so `Switch` needed
`Switch.layer.css` adding — and **the order of that list is derived, never alphabetical**: they
share one `@layer`, so order decides the cascade, and sorting it once put `UnstyledButton` after
`Button` and stripped every button in the app of its background, border and padding. I read the
canonical position off the byte offsets of each component's first hashed class in
`node_modules/@mantine/core/styles.layer.css` rather than guessing: Switch sits **after Stack**, and
the app's existing list already matched that bundle order exactly. Verified afterwards that buttons
still have their background, border and padding — that being the documented way this goes wrong.

⚠️ **THE SWITCH IS AN `input[id]`, WHICH `collectFieldValues()` SWEEPS — and it is safe only because
of the card.** `.prefs-card` is the one class that sweep skips, so the switch is **not** in
`fields.byId`; One column travels through `captureSnapshot()`'s own key, which stays the single
source of truth. `pref-gridlines` is the same arrangement and predates it.

⛔ **A comment I wrote yesterday was wrong and is corrected in place.** It claimed a checkbox here
"would be skipped by the sweep AND stored by the snapshot, and the two would disagree". Skipped by
the sweep means exactly **one** store, so nothing can disagree. The genuine hazard is the mirror
image — an id'd control of any kind placed **outside** that card lands in `fields.byId` *and* the
snapshot, and those two can drift.

⚠️ **The gate assertion changed with it, and the old one would have rotted.** `onecol` asserted the
control "is a `<button>`, so the sweep cannot reach it". That stops being the reason the moment it
becomes a `Switch` — the tag check would have stayed green while guarding nothing. It now asserts
what is actually load-bearing: the control sits inside `.prefs-card`, and (already there) its id
never appears in a saved calendar's `fields.byId`.

**Verified.** `onecol` and `rowmigrate` both pass against the switch — `btnTag` reports `INPUT`,
`btnSkippedBySweep` and `notInFieldIds` both true. Clicking it still takes the calendar from 52×7
(`1/5/26 → 12/28/26`) to 53×4 (`10/5/26 → 10/4/27`).

### Unreleased — One column moves into Preferences, and that card gets its name back

Owner: *"what if instead the button goes under 'Preferences' in settings and we just retitle that
section to just 'Preferences'."* Prompted by the plainest possible signal — *"wait how do i turn it
on"*. Local, not pushed at time of writing.

The toggle sat beside Waterfall/Month because it changes the shape of that view, and because
`viewMode`, its closest relative, is driven from there. That reasoning was about the code, not about
where anyone would look for a setting. It is now the last row of the **Preferences** card, which
drops the *Export* qualifier it picked up in yesterday's split.

⛔ **The card's ⓘ had to change with it, and this is the part worth keeping.** It promised *"These
stay on this computer and are not part of a saved calendar — send someone a calendar and they keep
their own settings."* That is true of grid lines and **false of One column**, which is calendar data
by the owner's own ruling — it is in `captureSnapshot()` and travels inside a file you send. Moving
the control without the copy would have left the app confidently lying about where someone's
settings go. It now names both cases.

⛔ **It is a `<button>`, and inside `.prefs-card` that matters MORE, not less.** That class is what
`collectFieldValues()` skips, so anything id'd in there is deliberately kept out of saved calendars
— while this setting must travel, and does, via its own snapshot key. A `<button>` is never swept,
so both facts hold at once. ⚠️ Replace it with an `<input type="checkbox" id=…>` and it would be
skipped by the sweep **and** stored by the snapshot, and the two would disagree the moment the file
met a build that reads only one of them.

⚠️ **It no longer hides itself in Month view.** Beside the view toggle, a control that did nothing
to the month calendar was noise; in a settings card, a row that vanishes depending on which view you
happen to be looking at is the more confusing of the two.

**Verified.** The id is unchanged, so the engine binding and both gate legs moved with it untouched:
`onecol` passes in full from the new location — one block, starting on the first working week,
swapping works, row heights follow their week, widths are per layout, toggling back is
byte-identical, one undo step.

### Unreleased — dragged row heights follow their week; each layout keeps its own column widths

The two problems the previous entry left open, both found by testing rather than by a report.
Local, not pushed at time of writing.

⭐ **A dragged row height now belongs to a WEEK, not a row number.** It was keyed by row index, and
a row index means a different week in each layout — measured, row 4 is `2/2/26` with one-column off
(the grid is padded to 1 January) and `11/2/26` with it on. So you would make one week taller,
toggle, and find a *different* week tall instead. `rowHeightsByWeek` is the stored truth now, keyed
by ISO date, the way `userNotes` and every other per-week store already works.

⛔ **The render-facing `rowHeights` stays index-keyed and that is not laziness** —
`renderSpreadsheetView`, `exportExcel` and `buildWaterfallPdf` all read `rowHeights[r]` by row
number and all three are frozen. It is rebuilt from the by-week map in `update()`, which is the only
place the week list can change. **No frozen edit; 0 lines inside a frozen function.**

⭐ **Each layout keeps its own column widths.** `y2026:s0` names a different column blocked vs
single, so one shared set meant widths landing on the wrong column, or on none at all for a year
with no block. `colWidths` is now always the *active* layout's set and `colWidthsAlt` the other;
they swap on toggle, inside the same undo step. Lossless in both directions — verified by round trip.

⛔ **The risky half is old files, and it has its own gate leg.** Every calendar anyone has dragged a
row in stores `rowHeights: {"<index>": px}`. Without a migration those open with every dragged row
silently back to default. `syncRowHeights()` converts on first update — detected by state (index
keys present, by-week map empty) rather than a flag, so it cannot run twice and a calendar with no
dragged rows needs nothing. New `rowmigrate` leg drives a **genuine minted save** with the three keys
this build added stripped back out: row 40 = the week of `10/12/26` at 45px restores onto exactly
that week and no other, the setting defaults off, and toggling moves the week to row 1 **carrying
its height**.

**Verified.** `onecol` gained three assertions — the height follows its week across a toggle (row 40
→ row 1, still 45px), each layout has its own widths (161 vs 92 on the same key), and a round trip
is byte-identical — plus the `rowmigrate` leg's four. ⚠️ The sizing section runs **last** in `onecol`
on purpose: it drags things, and running it earlier made the pre-existing "toggling back is
identical" assertion fail against a grid the test itself had resized — which reads exactly like a
regression in the app.

### Unreleased — column swapping was silently dead in one-column mode

Found by testing at the owner's request — *"also test collumn swapping and report back"* — rather
than by anyone hitting it. Local, not pushed at time of writing.

⛔ **The Swap Block button simply never appeared with the setting on, and nothing said so.** The swap
and selection machinery identified a column BLOCK by the hovered week's own calendar year, via
`String(weekIso).slice(0, 4)`, at **ten sites**. That was correct for as long as there was exactly
one block per calendar year. One-column mode has a single block labelled with the **first** year, so
a cell in Feb 2027 reported `2027`, the code looked up the column `y2027:s1`, found nothing, and
returned early. No error, no console output — the affordance just did not exist.

Diagnosed by control: the same overlap week, the same two phases, the same visible cell and the same
synthetic hover — works blocked, does nothing single. That comparison is what turned "my test
harness is probably wrong" into "the feature is broken".

**`blockYearOf(weekIso)` is the fix** — *which block does this week belong to*, rather than *what
year is it*. Nine call sites now use it; the tenth reads the year back out of a key those sites
build, so it needed no change. ⭐ It returns exactly `+weekIso.slice(0,4)` whenever the setting is
off, so every existing calendar is unaffected by construction. All ten sites were in **non-frozen**
code — `swapRowSegs`, `swapRunFor`, `swapSelectionMode`, `stintRunFor`, `swapSeed`,
`redrawGridOverlay` and two module-level handlers.

**Verified.** `onecol` gained a swap section: with the setting on the button appears naming the
BLOCK year (`2026`, not the hovered week's `2027`), the swap lands
(`prePrep@1 writersRoom@0` → `prePrep@0 writersRoom@1`) and **survives the next render** — a swap
that only paints is not a swap. Blocked mode is asserted unchanged alongside it.

⚠️ **Two related findings from the same test session, NOT yet fixed** — manual column widths and row
heights are keyed in ways that do not survive the toggle cleanly. Neither is destructive and both
are recorded in `HANDOFF.md`; they are awaiting an owner decision.

### Unreleased — One column: a multi-year calendar that runs down a single column

Owner, 10 Sep 2026, with a reference calendar running `10/5/26 → 10/4/27` in one column: *"I want to
add an option to build a multi-year calendar like in the example that can fit all in a single
column. Please consider very carefully how we can implement this feature."* Local, not pushed at
time of writing.

**A new toggle.** Off by default, and off is exactly today. *(It launched beside Waterfall/Month
and moved into the Preferences card on 10 Sep 2026 — see the later entry.)*

⛔ **IT IS ONE FLAG DRIVING TWO CHANGES, AND THE MEASUREMENT IS THE REASON.** The obvious half —
stop splitting the waterfall into a block per calendar year — is **not enough on its own, and alone
it makes calendars worse.** `computeSchedule` also pads every calendar out to whole years (*"so
every export is a consistent, familiar full-year shape"*), so a 52-week show that straddles a year
end really spans Jan of the first year to Dec of the last. Measured on exactly that shape:

| | rows × cols | print scale |
|---|---|---|
| Today (a block per year) | 52 × 7 | **0.81** |
| Merge the blocks only | 104 × 4 | **0.41** |
| Merge **and** drop the padding | 53 × 4 | **0.80** |

Both writers fit the entire grid onto **one page** (`fitToWidth:1`/`fitToHeight:1`, and the PDF's own
`fit()`), so rows drive legibility directly. Merging alone halves the print size. Doing both costs
essentially nothing and reproduces the reference exactly — `10/5/26 → 10/4/27`, one `2026` header.

⭐ **No edit inside any renderer or writer.** `computeBlockLayout`, `sheetColumnWidths`,
`sheetRowCount`, `exportExcel` and `buildWaterfallPdf` all take `yearBlocks` as **data**, so changing
what produces it changes all four outputs — the *change the declaration, not the call sites* pattern.

⛔ **Three traps found while prototyping, all of which would have shipped silently:**

1. **Column keys are `y<year>:s<slot>`, matched by `/^(y\d+):s(\d+)$/`.** A first cut labelled the
   merged block `'2026 – 2027'`, producing `y2026 – 2027:s0` — which fails that regex and kills
   column resizing and stint swaps with no error. `year` stays **numeric**; the header shows the
   start year, which is what the reference does anyway.
2. **`rowHeights` is keyed by row INDEX**, and dropping the leading padding shifts every index. Both
   it and `colWidths` are in `captureSnapshot()`, so this is save-format territory.
3. **The toggle is a `<button>`, not a checkbox.** `collectFieldValues()` sweeps `input[id]` into
   every saved calendar, so an id'd `<input>` would store this **twice** — once in `fields.byId`,
   once as the snapshot key — and the two could disagree on restore. The Waterfall/Month buttons
   carry ids safely for the same reason.

**Calendar data, not a preference** (owner's call): it sits in `captureSnapshot()` beside `viewMode`,
so a calendar you send someone opens laid out the way you built it. Restored **unconditionally** —
a file without the key gets `false`, never the previously open calendar's value.

⚠️ **A documentation discrepancy found on the way:** `computeYearBlocks` is in MANTINE-SEAM's frozen
geometry list but **missing from CLAUDE.md's**, and CLAUDE.md says to read the freeze *by its symbol
list*. Added to CLAUDE.md so the two agree; treated as frozen throughout.

**Verified.** New `onecol` gate leg, 11 assertions: off is today, on gives one year header starting
on the first working week, the row count stays sane (the guard against re-splitting the two halves),
column keys stay numeric, it travels in a real saved calendar and is not double-stored, **toggling
back is byte-identical to never having toggled**, and it is one undo step. ⚠️ That last one first
passed vacuously — it fired a Cmd+Z that nothing listens for, since undo here is `#undo-btn` only.
Full gate re-run.

### Unreleased — Template mode is read-only on the calendar; the header is edited only in the editor

Owner, 10 Sep 2026: *"the app needs to freeze editing the header when you're on template mode in the
regular app view. It should only be editable in the template editor screen. This means also remove
the styling menu view from there."* Local, not pushed at time of writing.

Template mode's header lines are no longer `contenteditable` on the calendar, and the header
formatting bar is gone from that mode. Auto and Manual are **untouched** — Manual still edits in
place with its full styling bar, exactly as it always has.

⛔ **This is a frozen edit: four code lines in `renderSpreadsheetView`.** `manual` still means *the
header is hand-controlled* and still drives the mode button and the `.hdr-manual-mode` tint; a new
`manualEdit = manual && !headerTemplates` means the narrower *and you edit it here*. One name rather
than the condition written three times, because three copies are three chances for one to drift.
⚠️ **Inert by construction while `headerTemplates` is false** — `manual && !false === manual`, so
Auto and Manual render byte-for-byte what they did, and no calendar saved before Template mode
existed (8 Sep 2026) can reach the new branch. The byte-compare is the other half of that claim.

⭐ **Clicking a header line now opens the editor, at that line.** Not requested, but the header still
*looks* like text you would click, and after this change it would have done nothing at all — a dead
affordance is worse than none. The line you point at arrives selected. ⚠️ The hover-and-pointer
affordance is CSS that **derives** the state instead of tracking it: in Manual every line carries
`.hdr-editable`, in Auto the bar has no `.hdr-manual-mode`, so
`.cal-header-bar.hdr-manual-mode .hdr-line:not(.hdr-editable)` matches Template and only Template —
no body class, no observer, nothing to go stale. ⛔ `cursor` and inset `box-shadow` only: a
ResizeObserver measures the header into `--header-h`, which frozen
`.sheet-scroll{max-height:calc(100vh - var(--header-h) - 140px)}` reads and the print-fallback PDF
measures too, so nothing here may change the header's rendered height.

⚠️ **A CONSEQUENCE WORTH KNOWING ABOUT: the anchored Insert ▾ token palette is now unreachable.**
`.hf-insert` was only ever rendered when `!mv && headerTemplates` — the waterfall header, in Template
mode — and it lived *inside* the bar this change removes from exactly that mode. So its condition can
no longer be satisfied anywhere. Token insertion now happens only in the editor's rail. **The code is
left in place and flagged, not silently deleted**: `buildHdrTokenList()` still backs the rail;
`openHdrTokenPop()` and `.hdr-token-pop` are what is orphaned, pending a decision.

**And the tests moved with the feature rather than being retired.** About 100 lines of `hdrtemplate`
drove that panel — the dead-end fix, the scroll fix, insert-at-caret. What they actually proved is
now asserted in `hdreditor` against the rail: every phase offered under its **current** name, the
bracket snippets present, and clicking an entry **appending** to the selected line and resolving
(`'Planning Calendar'` → `'Planning Calendar{episodes}'` → `'Planning Calendar10'`). Deleting a test
because its button moved would have quietly retired three real assertions.

⛔ **Two `gate.sh` assertions were INVERTED, and the old ones were not wrong** — they recorded a
decision this one reverses. `gate.sh` used to assert *"Template IS manual to the frozen gate — lines
editable, format toolbar present"*, which was an exact description of what shipped on 8 Sep.

**Verified.** `hdrtemplate` green (Template read-only, toolbar gone, spacer in its place, click opens
the editor at the clicked line, Insert ▾ absent in all three modes); `hdreditor` green with the four
ported assertions. Full gate re-run.

### Unreleased — three help strings cut, and the bracket rule rewritten around an example

Owner, 9 Sep 2026, reading the editor: cut *"Live header — click a line to edit it"* and *"Empty
lines show a dotted box so you can click them; the real header hides them entirely."* — then, of the
bracket paragraph, *"rewrite and give me a few better options cuz im confused what this means."*
Options were offered and the example-first one chosen. Local, not pushed at time of writing.

**Both cut labels described something already obvious from looking at it** — a header with a cursor
sitting under a formatting toolbar, and a dotted box that looks exactly like a thing you click.

⭐ **The stage note now says nothing at all when it has nothing to say.** It used to always print a
sentence; it now appears only when a dashed placeholder is actually on screen, which is the one
thing here that is genuinely unguessable — why words the user never typed are showing up in their
header. ⚠️ It is `hidden`, not blanked: an empty `<p>` keeps its margin, so the leg asserts the
measured height is 0 rather than just that the text is empty.

**The bracket rule was confusing for three reasons, and the third was the worst.** It led with the
*mechanism* — "square brackets hide everything inside them when a token in them is empty" — an
abstract conditional stated before you know why you would ever want one. It spent a third of its
length on `{{` / `}}`, the literal-brace escape, for a case almost nobody hits. And it closed with
"anything unrecognised stays exactly as you typed it", reassurance about a failure that has not
happened, crowding out the one rule people need. It now reads:

> `[{episodes} Episodes]` prints "10 Episodes" — or nothing at all, if you haven't entered an
> episode count. That's what the square brackets do: hide the whole chunk when the data inside it
> is missing.

⚠️ **`{{` and `}}` still work** — still resolved, still covered by `prove-header-template`, still
specified in `HEADER-PRESETS-PLAN` §3.1. They are just no longer in the sentence most people read.

⚠️ **One near-miss worth recording.** The new assertions first stored the panel's whole
`textContent` on the result object to grep it. That is ~2 KB of token previews, and it **truncated
the JSON**, which would have left `gate.sh` unable to parse the leg at all — a leg that reports
nothing reads like a leg that is fine. It is a local variable now. **A result file is a report, not
a DOM dump.**

**Verified.** Four new `hdreditor` assertions: the foot collapses to 0px when silent, both cut
strings stay cut, and the bracket rule leads with the example. Full gate re-run.

### Unreleased — primary buttons now wear the accent, like the active tab

Owner, 9 Sep 2026, with a screenshot of the active Settings tab: *"can we make primary buttons this
same bg color? For example 'edit header template' and 'Save current header as preset'."* Local, not
pushed at time of writing.

Not a new colour — the **same two tokens** `.side-tab-btn.active` and `button.secondary.add-hiatus-btn`
already use, whose comment has said since August that it is *"a deliberate echo of the active tab so
the accent reads as one system"*. The header buttons just were not part of that system yet. Now
**Edit header template…**, **Apply** and **Save current header as preset…** are, along with the
**Save** that confirms a new preset's name.

⚠️ **Two judgement calls worth stating, since neither was in the request.** *Import preset file…*
stays plain — it is the rarer path, and three identically-weighted full-width buttons in one stack
rank nothing. And **disabled drops the tint entirely** rather than dimming the label: Save-as is
refused in Manual mode (H8), and an accent-filled button that does nothing when clicked is worse
than a plain grey one, because the tint is precisely how the app says *press this*.

⚠️ **One trap found while testing, now written into UI-CONVENTIONS §3b.** `.side-tab-btn` transitions
`background` over `.12s`, so reading a live tab's computed background returns `rgba(0,0,0,0)` if the
read lands before the transition advances — which it did, in the harness *and* in a browser, and it
reads exactly like "the rule is not applying". The assertion measures an **off-screen probe carrying
the class** instead, and compares the buttons to **that** rather than to a hardcoded `#D3DAE1` — a
literal would pass while the two grounds silently drifted apart, which is the only failure worth
catching here.

**Verified.** New `hdrpreset` assertion: all 3 primary buttons render the same ground as
`.side-tab-btn.active`, Import does not. Full gate re-run.

### Unreleased — Preferences splits into Export Preferences and Headers

Owner, 9 Sep 2026: *"this UI needs work. First remove the descriptions, theyre not necessary. Next,
lets seperate preferences into 'Export Preferences' and a seperate section for 'Headers'."* Local,
not pushed at time of writing.

One card had become two unrelated things — a gridlines dropdown and the whole header system — under
a heading that described neither. It is now **Export Preferences** (gridlines) and **Headers**
(the template editor, the Excel budget, and the preset library), and the explanatory paragraphs
under each control are gone; what was load-bearing in them moved into the ⓘ, which is where an
explanation belongs once you already know what the control is.

⛔ **`prefs-card` is the reason this needed care, and it carries no styling at all.** `grep` it in
`legacy.css` and you find only comments — the class exists for exactly one job: `collectFieldValues()`
sweeps every `input[id]` / `select[id]` / `textarea[id]` in the document and skips it. Split the card
and forget the class on the new half, and every control in that half is silently baked into every
saved calendar with a phantom undo step per keystroke. **Both** cards carry it. Nothing in Headers
has an `id` today, so nothing would have broken today — which is precisely why it is there now,
rather than after someone adds the first id'd control.

**Two things fixed on the way, both in the app rather than the tests.** *Header presets* was the
label above the *Edit header template…* button, and editing a template is not a preset operation;
the presets now have their own sub-label under the card's own title. And the Excel budget moved up
beside the editor button, because it describes **this calendar's header** and among the preset
controls it read as a property of the selected preset.

⛔ **Moving it exposed a class collision — the second of the day.** The budget and the "why Save-as
is disabled" line both used `.hdr-presets-hint`, so `querySelector` returned whichever sat first in
the markup; re-ordering them changed what every such lookup found, and the `hdrpreset` leg began
asserting the budget text against the save hint. The budget is `.hdr-presets-budget` now and the two
share the CSS **rule**, not the class. `hdrexcel` had been working around the same collision by
scanning every hint and matching on the rendered words *"Excel header"* — a wording change would
have quietly returned null; it asks for the class directly now.

**Verified.** `hdrpreset` green (`.hdr-presets` still resolves `.closest('.prefs-card')`, zero ids in
the block), `prefs` green, `hdrexcel` green. Full gate re-run.

### Unreleased — the live header restyled itself when you clicked it, and the Insert rail cut its values in half

Both owner-reported, immediately after the editor shipped, and both are the same kind of mistake:
a detail that reads as a nice touch in isolation and undermines the panel's whole job in context.
Local, not pushed at time of writing.

⛔ **The stage restyled itself the moment you touched it.** *"The font/size of the header text lines
are changing when you click into them."* `.hde-line.is-editing` set `font-family:monospace` and
`font-size:10.5px` — my idea, to signal *you are looking at raw template code now*. But the stage
exists to show what the header will **look like**, and one that changes font the instant you click a
line is not showing you that. Worse, it was **half wrong in a way that hides**: per-line size arrives
as an *inline* style from `headerFormatCss()`, which outranks a stylesheet rule — so a line you had
sized to 18px kept its size and only changed face, while an unstyled line changed both. Two different
wrong behaviours depending on state. The tint stays as the raw-mode signal, and the template fields
below are still monospace, which is where reading tokens as code belongs.

⛔ **The Insert rail truncated the values it exists to show.** *"The text is truncated in the insert
section. Can you widen the entire window?"* `.hdr-token-desc` truncates with an ellipsis, which is
**correct** for the anchored popover — a narrow panel floating over the calendar that must not grow.
It is wrong in a fixed rail inside a modal, and the reason is the point of the feature: this list
shows live values instead of descriptions so you can pick by what you would actually get, and half a
value is not one. The window is wider (1040 → 1280px), the rail is wider (280 → 400px), and the rail
**wraps** rather than truncating — scoped to `.hde-rail-list`, so the popover still truncates.
Measured, not eyeballed: **0 of 41 entries clipped**, and the longest live value —
`16-Week Production Span / 8-Day Shooting Schedule` — now fits on one line.

**Verified.** Two new assertions in the `hdreditor` leg, both measuring rather than reading the CSS:
computed `font-family`/`size`/`weight`/`style` identical before and after focus (on a line already
styled to 18px/700, so it covers the case the inline style was masking), and `scrollWidth <=
clientWidth` on every description in the rail. Full gate re-run green.

### Unreleased — a screen for building a header, and a third line in the left column

Owner, 9 Sep 2026, after using the Insert menu: *"I still feel like you miss the Insert button.
Would it be crazy for there to be a separate screen entirely for building your header templates?"*
Mocked up first, then built to the mock. Local, not pushed at time of writing.

**The header is now three lines per column, not 2 / 4 / 3.** The left column had two slots and the
centre had four, which is the shape the header grew into rather than one anybody chose. Adding `l3`
is **three frozen edits** — `renderSpreadsheetView`'s left column, `exportExcel`'s `lIds`,
`buildWaterfallPdf`'s `hLeftArr` — taken under exactly the guarantee `l2` and `c4` were given on
31 Aug: the slot is **empty by default**, hidden on screen by
`.hdr-line.hdr-slot.hdr-empty:not(.hdr-editable)`, dropped from the workbook by `withCodes()` and
from the PDF by `.filter(x=>x.t)`. So no calendar that has not used it renders differently, and the
byte-compare says so rather than the argument. **528 lines of `app.js` changed; 3 are inside a
frozen function, and they are those three.**

⛔ **`c4` is kept and hidden, not deleted.** Three-per-column retires the fourth centre slot from
what the editor *offers*, not from the *format*. `c4` shipped on 31 Aug and is already in saved
files, so it still renders, still exports, still restores — and a calendar that has text in it sees
it in the editor, marked `4*`, with a note saying it is kept so nothing is lost. Removing it would
silently drop a line from someone's header, which is the one thing the save-format contract forbids.

**The editor itself.** A body-level modal, not another tab, opened from the header's mode button
(*Open the template editor…*) or the sidebar. Top to bottom: the styling bar, then a **live header**
you edit directly, then the nine template fields, with the token rail beside them.

- **The live view is the editing surface, not a preview beside one.** Click a line and type; the raw
  template swaps in on focus and the resolved text comes back on blur, the same contract the header
  on the calendar has. The styling bar above it is the same six controls the manual header has and
  writes to the same `headerFormat` store — so styling done in the panel *is* the header's styling,
  and the gate proves it by reading the resulting `style` attribute off the real header behind the
  modal. There is no second renderer: the canvas calls `buildHeaderCtx()` + `resolveHeaderTemplate()`,
  the pair `headerLine()` uses.
- **It fills in what you have not entered yet.** A token with no data draws a dashed placeholder —
  `{localization.open}` → *Localization Opens* — so you can lay out a header before the dates exist.
  Editor-only: the real header prints nothing for it, and a toggle turns them off.
- **The Excel budget is on screen while you build**, because the 255-character cliff is invisible
  until Excel calls the file corrupt. ⚠️ Worth knowing: the **default** template on a fully-filled
  calendar measures **241 of 255**. That is 14 characters of headroom, and a long show title spends
  it. The gate now asserts the default still fits, so this stops being a surprise.

**Two fixes found while building it.** The mode menu's Template row used to open a read-only copy of
the token list; it opens the editor now, which shows the same tokens *and* lets you use them.
And `.hde-ph` was the class on **both** the placeholder marker and the show-placeholders checkbox —
`querySelector('.hde-ph')` found the checkbox only because the toggle happens to sit above the stage
in the markup, so moving the stage up would have bound the change listener to a `<span>` and killed
the toggle silently. The checkbox is `.hde-phbox` now.

**Verified.** New `hdreditor` gate leg, 17 assertions: `l3` present and hidden while empty, three
slots per column, **not one `id` anywhere in the panel** (it is body-level, so `.prefs-card` does not
cover it and one `id` would bake every field into every saved calendar), styling reaching the real
header, an edit resolving identically in both places, placeholders staying editor-only, `c4`
revealed only when used, the budget warning firing. Byte-compare re-run after the three frozen
edits: waterfall PDF and every Excel part still identical to the baseline, 0 clipped cells. Full
gate green — 285 checks, 0 failures.

⛔ **And a hole in the gate itself, closed on the way past.** `gate.sh` serves `dist/index.html` and
**never rebuilds it**, so editing `src/legacy/app.js` and running the gate without `npm run build`
gates *the previous build* and prints `GATE PASSED` — the worst possible failure, because the green
is exactly what you were trying to earn. It now refuses (exit 2) when any source is newer than
`dist/index.html`, rather than warning: a warning scrolls past 285 lines of PASS. Same family as the
`run.sh` / `gate.sh` different-default-page trap already in `CLAUDE.md`. Also: `hdrtemplate`'s
mode-menu section still expected the read-only token list and would have thrown once that row began
opening the editor — rewritten, and `gate.sh` now asserts `peekWorks`, which it never had.

### Unreleased — the token menu existed and could not be used: it dead-ended, and it would not scroll

Owner feedback on the shipped Step 3 palette, and one of the two problems was reported in the
plainest possible terms — *"I also don't seem to be able to scroll within the Insert menu."* Local,
not pushed at time of writing.

⛔ **It would not scroll, and that was literal.** The panel has forty-odd entries and
`overflow-y:auto`, so it scrolls — but the window `scroll` listener that closes it is
**capture-phase**, copied from `openPhaseColorPop`, which is a nine-swatch grid that can never
scroll internally. So a wheel inside the list reached the window handler and shut the menu before it
moved a pixel. A scroll that starts inside the panel is now the user reading it; anything else still
closes it, because a panel anchored to a moving element should not be left pointing at nothing.

⛔ **Opening it with no line focused was a dead end.** It answered *"Click a header line first"* — at
exactly the moment someone opens the menu to find out what tokens even exist. It now defaults to the
Title line and **says which line it will use**, so the fallback is never a surprise. The nine slots
get human names (*Top left*, *Title*, *Right, 2nd*) for this one purpose; `l2` is not an answer.

**Every entry shows its live value now, not its name.** `{titleSeason} → Test Show S2`,
`{shootDaysPerEp} → 8`, `{production.summary} → 16-Week Production Span / 8-Day Shooting Schedule`.
A list of tokens is jargon you have to decode before you can choose; the same list showing what you
would actually get is something you can shop from. A token with nothing to say falls back to its
description and stays dimmed — which is its own signal: the *data* is missing, not the token.

**The tokens are reachable before you commit to Template.** They are the reason to choose that mode,
so the mode menu's Template row offers *"See what you can put in a line"* — the same list with the
same live previews, read-only.

**Two smaller things:** Insert ▾ is now separated from the formatting icons by a divider, because it
does a different kind of job; and Snippets gained `[{version}]` beside `[{episodes} Episodes]`, so
the square-bracket grammar — the non-obvious half of templates — is discoverable by seeing an entry
vanish from the preview when its data is missing.

**Verified.** The `hdrtemplate` leg now guards all of it: the palette opens with nothing focused and
names its target (41 usable entries), 40 of 41 show live values, it is scrollable, **it survives its
own scroll** and still closes on an outside one, and the browse view is read-only. Byte-compare
re-run: waterfall PDF and every Excel part still identical to the baseline.


### Unreleased — the Excel header has a 255-character cliff, so now the app says how close you are

Step 6 of the six in [`HEADER-PRESETS-PLAN.md`](HEADER-PRESETS-PLAN.md), and the last.
**All six steps of the header-presets plan are now built.** Local, not pushed at time of writing.

**A budget meter under the preset controls** — *"Excel header: about 67 of 255 characters."* Excel
rejects a header/footer string over **255 characters in total**, codes included, and it does not fail
gracefully: the workbook still writes and still validates as XML, but Excel refuses it on open with
*"We found a problem with some content"*, which reads as a corrupt file rather than a long header. A
real calendar hit this at exactly 256. `exportExcel`'s trimmer drops trailing lines to stay under, so
nothing breaks — the user just loses lines without being told. Templates make long headers very easy
to write, so the number is now on screen before they hit it, and turns red past the cap.

⚠️ **"about" is not hedging.** `estimateExcelHeaderLength()` is a **second copy** of a frozen
function's arithmetic and can drift; `exportExcel` stays authoritative because it is the thing that
actually writes the file. The `hdrexcel` leg is the guard, and its claim is deliberately not "the
estimate is exact" — it is *a header the estimate calls near the limit still produces a workbook
`check-xlsx.sh` accepts, and the trimmer drops the lines it is supposed to, in the order it is
supposed to*. Measured: an estimate of **439** produced a **195**-character header in the file, and
the sections came back 2 / 1 / 1 — right-hand detail given up first, every section keeping its lead
line, exactly as documented.

**Help rewritten for three modes.** The old entry described a two-state toggle. It now explains Auto,
Template and Manual, what square brackets do, where **Insert ▾** lives, and that Template → Manual
freezes values — plus a second paragraph on presets, and the one rule a user needs to know about
them: they stay on your computer and are never part of a saved calendar.

**A fourth restore fixture, `hdrtemplated.sptcal`** — a real `captureSnapshot()` taken in Template
mode. It is the mirror of `hdrmanualbraces.sptcal`: **the same kind of braces, the opposite
outcome**, decided by one flag that no pre-existing file carries. Together they are the whole of
decision H3, proved against actual files rather than by construction.

**Verified.** New leg `hdrexcel`, plus `hdrverload` now running against four fixtures.
⚠️ **Two more of my own assertions were wrong before the code was** — the Manual fixture stores a
*baked* date (`9.8.26`) that overrides the auto default, so expecting today's date failed a day after
minting; and a Template line may legitimately render braces (an unknown token, an escape), so
"no braces" was too strong and became "no *known* token survives unresolved". Both are the same
mistake in different clothes: asserting the absence of a character rather than the absence of the
thing that matters.


### Unreleased — presets as files, so a header can be sent to someone

Step 5 of the six in [`HEADER-PRESETS-PLAN.md`](HEADER-PRESETS-PLAN.md). Local, not pushed at time of
writing.

**Export and Import, as `.spthdr` files.** *"Save to your computer"* was half the original ask: a
preset should be sendable to a colleague, not trapped in one browser's `localStorage`. Export writes
`{ kind:'spt-header-preset', version:1, name, lines, format }` through the same picker +
download-fallback pair `saveAsFile` uses; Import reads one back. Import is offered even with an empty
library — it is how someone gets their *first* preset.

⛔ **A preset file never goes through `parseCalendarText()`.** That function is the one reader of
*calendar* files and is contract (`CLAUDE.md` §0 rule 3): teaching it a third shape would put every
saved calendar's restore path at risk to serve a preference file. The preset gets its own small,
strict reader and the two never meet.

⛔ **Validate, do not trust — the file came from someone else's machine.** `kind` is the gate.
Unknown line ids are dropped rather than stored (`headerManual` is keyed by hid and a stray key would
sit there forever); format values are filtered to the six known keys, because `headerFormat` is read
by *both* writers. A file that fails is refused **entirely** — never half-imported, because a
half-imported preset is one the user believes in and cannot see the holes in. Nothing is executed or
injected: templates are strings resolved by the §3.1 scanner, and the renderer escapes them with
`escH` exactly as it escapes today's manual text.

⛔ **An imported preset gets a fresh `hp_…` id**, even when the file carries one. Two machines can
trivially mint the same id, and reusing the file's would let one import silently overwrite an
existing preset.

**Verified.** New leg `hdrfile`: Export opens the real picker with `Studio standard.spthdr` and the
*Calendar header preset* type, the written file carries **templates** (`{version}`, `{titleSeason}`)
rather than values, export → import is identity with a **different** id, a file without `kind` and a
file that is not JSON are both refused with the list unchanged, a file carrying `notAHeaderId` and an
`evilKey` format entry imports as `{c1, l2}` / `{c1:{bold}}` with both dropped, the imported preset
applies like any other, and it still never reaches a saved calendar. Byte-compare re-run: waterfall
PDF and every Excel part still identical to the baseline.


### Unreleased — header presets: save an arrangement once, apply it to any calendar

Step 4 of the six in [`HEADER-PRESETS-PLAN.md`](HEADER-PRESETS-PLAN.md), and the plan's own
feature-complete milestone for what the owner asked for — everything except the `.spthdr` files.
Local, not pushed at time of writing.

**A Header presets block in the Preferences card.** Pick a preset and Apply; save the current header
under a name; rename and delete your own. *Default* ships built in, first in the list, and cannot be
renamed or deleted.

⛔ **A preset is a PREFERENCE, and that is the whole reason it lives in that card.** It goes in
`sptcal.prefs` — per user, per machine — and never into `captureSnapshot()`. Applying one **copies**
its lines into `headerManual`/`headerFormat`, which *do* travel in a `.sptcal`, so a calendar opened
on another machine renders correctly without that machine owning the preset. It is the exact mirror
of the version field, which is calendar data and must travel. Getting either backwards fails
silently, so both directions are asserted.

⛔ **Presets store templates, never values** (decision H8), and **Save-as is disabled in Manual mode**
with the reason shown — *"Switch to Template to save this header as a preset."* Manual lines are
literal text; a preset whose `l2` said `v3` would stamp v3 onto every calendar it was ever applied
to. The leg asserts the saved `l2` is `{version}`.

⛔ **Not one `id` on any control in the block.** `collectFieldValues()` sweeps every id'd input into
saved calendars; the `.prefs-card` skip covers this card, but a Mantine `Modal` portals to `<body>`
*outside* it — which is why the Save-as name field is inline rather than a modal, and why these are
plain elements with classes taking their look from `legacy.css`.

**Ids are generated (`hp_…`), never the name** — a rename must not orphan anything, and two presets
may legitimately share a name. **Applying is one undo step** covering all nine lines and their
formats. **Deleting the last preset removes the key** rather than storing `[]`, the same rule the
gridlines preference follows.

⚠️ **A temporal-dead-zone crash, found in the browser and not by the harness.** The boot-time
`pushHeaderPresets()` first sat beside `reflectGridlines()`, which runs far earlier in the IIFE than
the `let`/`const` declarations it reads (`HDR_IDS`, `DEFAULT_HEADER_TEMPLATE`, `headerMode`,
`headerTemplates`, `headerFormat`). It threw *"Cannot access … before initialization"* and **took the
rest of the IIFE with it** — React still rendered the chrome, so the page looked alive while the
engine was dead and the sidebar had no phase rows at all. The call now runs last. A gate leg would
have reported a confusing *"no #start-production"*; loading the page said exactly what was wrong.

**Verified.** New leg `hdrpreset`: the block is inside `.prefs-card` with **zero** ids, Default is
first and read-only, Save-as refused in Manual and offered in Template, the saved preset's lines are
`{today}` / `{version}` / `{titleSeason}` / `[{episodes} Episodes]`, ids match `hp_`, applying
switches to Template and resolves and reverts in **one** undo step, the preset is absent from a real
shareable copy while the applied header is present in it, rename keeps the id, and deleting the last
preset leaves `{"version":1}` behind. `fields.byId` unchanged at 55. Byte-compare re-run: waterfall
PDF and every Excel part still identical to the baseline.


### Unreleased — the Default template, and a menu that tells you which tokens exist

Step 3 of the six in [`HEADER-PRESETS-PLAN.md`](HEADER-PRESETS-PLAN.md). Local, not pushed at time of
writing.

**`DEFAULT_HEADER_TEMPLATE` — the auto header, written as templates.** *Header: Auto → Template* now
seeds from it, so the lines keep **tracking** the data. Before this, that transition seeded from the
resolved values: the header looked identical and then quietly stopped updating, which is Manual
wearing Template's name.

⚠️ **It is a second statement of the auto header, and the `hdrdefault` check is what stops it
drifting.** The leg captures the nine lines in Auto — `computeHeaderDefaults()`'s hand-coded output —
switches to Template, and requires the nine resolved lines to be **identical**. They are.
⛔ Do not "simplify" by making Auto read the template: Auto's strings are the byte-identical baseline
the gate compares against. Note `r3` is `[{episodes} Episodes]`, not `{episodes} Episodes` — the auto
line is *empty* with no episode count, and only the conditional group reproduces that.

**A token palette.** The header format toolbar gains **Insert ▾** — Show, Dates, one group per phase
(built-in *and* custom, under their current names), and Snippets. Picking one inserts it at the caret
of the line you are editing. Nobody can type `{production.summary}` without being told it exists.

⛔ **Waterfall and Template only.** A token in a Manual line prints as braces, so offering the palette
there would offer a feature that does nothing. `headerFmtToolbarHtml()` is non-frozen and reads the
flag at call time, so the control simply is not built unless it would work.

⚠️ **The caret is the whole difficulty.** The line is `contenteditable` and the palette is a
body-level panel, so a click in the panel would normally blur the line and destroy the selection
before the insert runs. Two things prevent it: `mousedown` is `preventDefault`ed over the panel, and
the range is re-validated rather than trusted — if the saved selection is no longer inside the target
line, the token goes at the end rather than silently nowhere. The insert then commits through the
*same* `focusout` path a typed edit uses, so there is one definition of "a line changed".

**Verified.** Gate legs green, and the inertness byte-compare re-run: waterfall PDF and every Excel
part still identical to the baseline. ⚠️ **Two false alarms in the test, both mine, both worth
recording** — the palette insert was first asserted against `c4`, which the Default template leaves
**empty**, so "append at the caret" had nothing to append after and read as the insert replacing the
line; and a synthetic `focusin` sets `hdrFmtTarget` but creates no selection, so Chrome supplies a
caret at position 0 and the token landed at the start. Both are artefacts of driving the DOM, not
app behaviour; the leg now places a real caret and targets a line with content.


### Unreleased — header lines can be templates now, and there are three modes rather than two

Step 2 of the six in [`HEADER-PRESETS-PLAN.md`](HEADER-PRESETS-PLAN.md), and the largest. Local, not
pushed at time of writing.

**A header line can hold live data.** Write `Principal Photography {production.open} / Wrap:
{production.wrap}` and it renders from the same schedule the auto header reads. Four constructs and
nothing else: `{token}`, `{token:format}`, `[ … ]` conditional groups that vanish when any token
inside them is empty, and `{{` `}}` `[[` `]]` for a literal brace or bracket. Every phase gets
`.open` `.close` `.weeks` `.name` — built-in and custom alike — plus Show Info, dates in four
formats, and three compound tokens that reproduce today's composite lines verbatim.

**Three modes: Auto · Template · Manual** (owner decision H3). The mode button stopped being a
two-state toggle and now opens a small menu, because a toggle cannot express three.

⛔ **The frozen layer never learns about the third mode, and that is the whole design.**
`renderSpreadsheetView` gates editability and the format toolbar on `headerMode === 'manual'`. That
gate is untouched: `headerMode` keeps its two values, and Template is `manual` **plus** a new
module-level `let headerTemplates` that the frozen function reads at call time — the pattern
`CLAUDE.md` sanctions and `SHEET_GRIDLINES` already uses. `headerManual` holds raw templates while
the flag is on and literal text while it is off. One store, one flag.

**Resolution happens in `headerLine()`** — the one function the screen, `exportExcel` and
`buildWaterfallPdf` all call. So the three consumers cannot disagree, and its signature did not
change (three of its call sites are frozen). The token context rides on `computeHeaderDefaults()`'s
return value.

⚠️ **That carriage had a trap the plan did not catch, and it would have polluted the save format
forever.** The plan says to hang the context on `defaults.__ctx`. But that return value is assigned
*directly* to `headerManual` in two places — the popover's Auto → Manual snapshot and the legacy
`headerOverrides` restore path — and `headerManual` goes into `captureSnapshot()`. An ordinary
property would therefore have been serialised into every saved calendar and every undo frame, as a
junk key in a permanent contract. It is defined **non-enumerable**, which `JSON.stringify`,
`Object.assign` and spread all skip while `defaults.__ctx` still reads normally. The `hdrtemplate`
leg asserts the consequence rather than trusting the flag.

**⛔ ONE FROZEN EDIT, and it is the one that was signed off** (H3b, 1 Sep 2026): the mode button's
label and title expressions each gain a case for *Header: Template*. Nothing else in
`renderSpreadsheetView` changed — not the `class` expression, not the `manual` gate, not `hline()`.
With the flag false both expressions collapse to today's exact strings, which is what the sign-off
was conditional on, and the leg asserts it in both Auto and Manual.
⚠️ The Auto and Manual **titles are left verbatim** even though the button now opens a menu, so
*"Take over the header: snapshot the current values into editable lines"* is no longer quite what a
click does. Rewriting them would change the flag-false output and widen an edit whose scope is
"gains a case". Correcting that wording is a second frozen edit and needs its own ruling.

**Editing a template line shows the template.** Frozen `hline()` emits *resolved* text, so a line
holding `{version}` displays `v3` — and committing that on blur would have destroyed the token
silently. A `focusin` listener swaps the raw template in while the line has focus; blurring
re-renders it resolved.

⚠️ **The leg found a real bug in that pair while it was being written.** The `focusout` handler
returned early when the text was unchanged — correct for Manual, wrong for Template, because the
swap had already put the raw form on screen. Focus a template line, blur without typing, and
`{version}` stayed visible until something else happened to re-render. It now re-renders in that
case, and deliberately does **not** mark the file dirty: a repaint is not an edit.

⚠️ **A design flaw in the resolver, caught by its own test.** The first cut resolved in stages —
protect the escapes, then groups, then tokens — and staged passes cannot tokenise `{{{title}}}`: the
escape pass eats the leading `{{` and then the first `}}` it meets, which is the token's own closing
brace plus one, so the token never forms and the line came out `{{title}}` — neither literal nor
resolved. Replaced with a single left-to-right scanner, which also makes **one pass** true by
construction rather than by sentinel trickery: a resolved value is appended to the output and never
looked at again, so a show titled `{today}` prints the words `{today}`.

**Verified.**

- **`prove-header-template.mjs`** — 73 cases in Node against the **real** resolver, its source
  sliced verbatim out of `src/legacy/app.js` so the test cannot drift from the implementation. Every
  §3.1 rule, every §3.2 token, all four date formats, the unknown-token and escape rules, group
  collapse, and both local/UTC formatting paths.
- **`hdrtemplate`** — the engine end to end in the real app: tokens resolve on screen, in the
  workbook's header and in the PDF's drawn text; no *known* token survives unresolved in either
  export; the compound tokens still equal the hand-coded auto lines (the drift guard for the one
  duplicated statement); a real saved copy stores `T={title} V={version} E={episodes}` **raw**;
  `__ctx` is absent from the snapshot; the bake warns before it bakes; each transition is one undo
  step; and Manual prints `Draft {today} - {version} - {episodes}` **with the braces**.
- **`hdrverload`** now runs against a third fixture, `hdrmanualbraces.sptcal` — real
  `captureSnapshot()` output saved in Manual with braces in two header lines. It reopens rendering
  every stored line verbatim. ⭐ That is decision **H4** proved against an actual file rather than by
  construction, and it is the assertion that says this feature is safe for calendars already in the
  wild.
- ⭐ **Both Node provers now run inside `gate.sh`, and neither ever did.**
  `prove-col-permutation.mjs` has existed since the column-swap work and was named in a comment as
  something to run *by hand* — so the invariance theorem that whole feature rests on was, in
  practice, unguarded. They are sub-second. They run now, and both are green
  (`RESULT: THEOREM HOLDS.`).

**Gate: 220 pass, 0 fail.** ⭐ **And the freeze claim was checked mechanically, not by eye:** of the
460 lines this step adds to `src/legacy/app.js`, brace-matching every frozen function's range against
the diff puts exactly **one** inside any of them — the authorised H3b line. The other 459 are
outside the frozen surface.

⏭ **Steps 3–6 remain.** The built-in `DEFAULT_HEADER_TEMPLATE` and the token palette (Step 3), the
preset library (Step 4), `.spthdr` files (Step 5), the Excel budget meter (Step 6). Auto → Template
currently seeds from the resolved auto values rather than the default template, which is honest but
means the seeded lines carry no tokens until Step 3 lands.


### Unreleased — gate 5 had not run since the baseline was cut, and the stall everyone blamed was never the problem

Local, not pushed at time of writing. No app code changed: this is entirely the test harness and the
docs that described it.

**Gate 5 is the save-format contract check** — `fields.byId` is keyed by DOM element id, so its key
SET is what must not move, and a silent change there is how every saved calendar loses a setting. It
had not executed since 29 Aug 2026. Nobody knew, because it fails *quietly*: it sits downstream of
the `restore` leg, and when that leg throws the gate prints one honest failure and never reaches the
assertion at all.

**Three separate things were wrong. All three are fixed.**

**1. The readiness probe could not fire.** `appReady()` waited for `renderRecents()` to reveal the
file menu. `renderRecents()` runs inside `loadRecents().then(...)`, and
`indexedDB.open('spt-planning-cal')` never settles in headless Chrome under
`--virtual-time-budget` — no `success`, no `error`, no `blocked` (measured by `t/fsprobe.js`, and
identically on the untouched deployed page, which is what proved it environmental). So the `restore`
leg failed on **every** run, not the "roughly one in three" it had been written up as. It was
recorded as a known environmental flake and routed around, and that write-off is what cost us the
save-format check for ten days.

⭐ **The stall never blocked the Open path — only the probe that waited on it.** Measured directly:
`#file-menu` is `keepMounted`, so its `Open…` item is in the DOM and enabled while `#file-menu-wrap`
is still `display:none`; the engine binds **one** delegated listener to `#file-menu`, so a `.click()`
on the hidden item reaches it and bubbles regardless of visibility; and `window.showSaveFilePicker`
**is** a function in headless, so `supportsFsAccess` is true and `openFileViaPicker()` does not
early-return. A probe stubbing `showOpenFilePicker` confirmed the engine really is reached.
`appReady()` now waits on engine-generated sidebar markup — `#start-production`, minted by
`buildPhaseRows()` as an HTML string that React cannot produce and the static skeleton does not
carry, plus the four `DEFAULT_HIATUSES` rows. Live-code-only, IndexedDB-free.
⛔ **Not `table.sheet-table`** — a blank page has no grid until Show Info is complete, so it never
appears before a file is opened. That was the first attempt and it timed out in a way that looks
identical to the bug it was fixing.

**2. The assertion tested the wrong set.** `formSignature()` was a raw
`input[id], select[id], textarea[id]` sweep with **neither** of `collectFieldValues()`'s exclusions,
so it reported a *superset* of the save format: the eight transient `tool-*` popover ids the engine
deliberately drops, plus `pref-gridlines` — a per-user **preference**, which must never enter a saved
file and would have shown up here as a format change. Two different questions had merged into one
assertion. It now carries the same two `.closest()` skips the engine has. Verified rather than
assumed: its 55 keys are **identical, in both directions**, to the key set inside a real
`captureSnapshot()` output (`tests/fixtures/hdrversion.sptcal`).

**3. `gate.sh`'s own comment asserted the thing that was false** — *"`formSignature()` reports it"*.
Corrected, with the reason, so the next reader does not re-derive this.

**The baseline's `form` was re-cut, 56 keys → 55, with not one value changed.** Recorded in
`tests/baselines/2026-08-29-stage-7/README.md` with the full list and dates: 8 `tool-*` **removed**
(never in the format), 6 `phiatus-name-<key>` **added** (1 Sep 2026), `show-version` **added**
(8 Sep 2026), `pref-gridlines` **still absent** and now correctly so. ⛔ Re-cutting a red baseline is
normally how a real regression gets absorbed; it is defensible here only because the leg now runs, so
the new set could be checked against a real saved file rather than declared.

**Verified.** The `restore` leg runs and matches the baseline exactly — 52 rows, 154 cells,
`gridWidthPt` 324, `bytes` 756,473, identical grid signature, 0 horizontally clipped, no alerts.
Gate: **188 pass, 0 fail** — green, with nothing skipped and nothing written off. ⚠️ Not claimed as
a first: the baseline's own `restore.json` records `menuWrapShown: true`, so IndexedDB evidently
worked on the machine that cut it 29 Aug 2026 and the gate was presumably green then too. What is
certain is that it has not been green in this environment for as long as the stall has been recorded,
and that gate 5 had not executed in that time.

⏭ **Still missing, and now cheap.** No test opens a **`.sptcal`** through the real picker; `restore`
opens the legacy `.html` fixture. `CLAUDE.md` names that as the outstanding insurance for §0 rule 3.
The picker path is provably drivable now, so it is a short leg rather than a project. The IndexedDB
stall itself is still real and still unfixed — it now costs only the recents list and the crash
backup in headless, neither of which any leg asserts.


### Unreleased — a version number typed once in Show Info, and the header slot that was waiting for it

Step 1 of the six in [`HEADER-PRESETS-PLAN.md`](HEADER-PRESETS-PLAN.md), shipped alone because it is
the smallest piece worth having on its own. Local, not pushed at time of writing.

**Show Info has a `Version` field, and the header's bottom-left line prints it.** Asked for directly
(owner, 1 Sep 2026): *"a version number (lowercase "v" then a number you input. I also want this
version number thing to be part of the default header and be in the very bottom left side text box of
the header. You should be able to type your version number into the "Show Info" section and this
should autopopulate into the header."* Type `3` and `v3` appears in the `l2` slot — on screen, in the
workbook's `&L` section and in the waterfall PDF's left column, from that one field, with no header
mode to switch into first.

**`l2` was chosen because `l2` had no job.** It and `c4` are the two header slots added 31 Aug 2026.
Neither carried an auto value and CSS hides them while empty
(`.hdr-line.hdr-slot.hdr-empty:not(.hdr-editable){display:none}`), so the only way to put anything in
the bottom-left was to take the whole header into Manual mode and type it — which stops every other
line auto-updating. Now `computeHeaderDefaults()` returns `l2: versionLabel()` and the slot has
exactly one thing to say.

**The label is always `v` + what you typed, with one leading `v`/`V` stripped** (owner decision H1):
`3` and `v3` both read `v3`, `V3.1` reads `v3.1`, `3a` reads `v3a`. A `TextInput`, deliberately not a
`NumberInput` — owners write `3.1` and `3a`, so this is a label and not arithmetic. It is **not** part
of `showInfoStatus()`'s completeness test and can never gate Production: a calendar with no version
number is a complete calendar.

⛔ **An empty field returns the empty string, never a bare `v`** — and that one line is the whole of
this feature's inertness. Every calendar ever saved has no version, and an empty `l2` is filtered out
of the workbook by `withCodes()`, filtered out of the direct PDF by `.filter(x=>x.t)` and hidden on
screen by the CSS above. Return `v` for an empty field and every existing calendar silently gains a
stray line in all three outputs. What buys it is the first `.trim()` plus the `num ?` ternary, so `v`,
`V` and a field of spaces all come out empty; the second `.trim()` is a different job — `v  3` reads
`v3`.

⚠️ **One change beyond the plan's six items, because the plan's own claim about it was wrong.**
§3.3 says *"a file without the key restores an empty field."* It does not.
`applyStateSnapshot()` step 3 iterates the **snapshot's** keys, and the open path deliberately does
not call `resetAll()` first — so a field the snapshot never mentions keeps whatever the previously
open calendar left in it. That has been harmless for years because every id'd field predated the save
format, so no key was ever absent; `show-version` is the first that can be. Open a calendar with
version 3, then open one saved before this field existed, and the second show's header prints **`v3`**
— someone else's version number, on screen and in both exports. A guard immediately above step 3 now
clears the field when the snapshot has no such key, which is `CLAUDE.md`'s *"a missing key falls back
to a default, never to whatever is in memory"*. It is cleared there rather than in `resetAll()`
because the open path does not go through `resetAll()`; undo/redo is unaffected, since
`collectFieldValues()` always sweeps the field and an undo snapshot therefore always carries the key.
⚠️ **This is a narrow instance of a general defect.** The same leak waits for every future new id'd
field. Generalise it when the second one arrives.

**No frozen edit.** All five engine changes are in non-frozen code — `versionLabel()` and
`computeHeaderDefaults()`, the `input` listener, `resetAll()`, `applyStateSnapshot()` — and the React
field is chrome. The three consumers' text paths, the editability gate, Excel and the PDF are
untouched. The one authorised frozen edit in that plan (**H3b**, the mode button gaining a
*Header: Template* label) belongs to Step 2 and has not been made.

**Verified.** Two new gate legs, both against the build:

- `hdrversion` — with the field empty, the `l2` line is hidden, the workbook's `&L` is the bare date
  `9.8.26` and the PDF's left column holds one string, `["9.8.26"]`. A bare `v` and a field of spaces
  are both still no version. Typing `V3` reads `v3`; typing `3` reads `v3`, `&L` becomes
  `"9.8.26\nv3"` with one font code and no per-line format codes, and the PDF's left column gains
  **exactly one** line, `["9.8.26", "v3"]`, drawn at the same x and 9 pt below the date. A real
  shareable-copy export carries `"show-version": {"value": "3"}` in `fields.byId`, which goes from 54
  ids to 55. The value survives `captureSnapshot` → JSON → `applyStateSnapshot`, driven through
  undo/redo. Clearing the field restores the bare `&L` character for character.
- `hdrverload` — the same version **restored from a file**, with nothing typed, run twice against two
  real fixtures through the inline `?state=` path. `hdrversion.sptcal` (minted from a real
  `captureSnapshot()`, 55 ids) comes back with the field at `3` and `l2` reading `v3`;
  `colswap-2col.sptcal`, written before the field existed, comes back with the field **empty** and the
  slot hidden — the guard above, doing its job on a legacy file.

The byte-compare that matters was run before and after: the waterfall PDF and every Excel part are
identical to `tests/baselines/2026-08-29-stage-7/`, with only the header's date stamp normalised. Gate
before the change, on untouched `HEAD`: **150 pass, 1 fail**. After: **181 pass, 1 fail** — the same
one, the known `restore` IndexedDB stall, which fails identically on untouched code. Running the gate
first, before any edit, is what makes that a measured fact rather than an assumption.

⚠️ **What is NOT proven, said plainly.**

- ~~**`gate.sh`'s gate 5 — the `fields.byId` key-set compare — can neither pass nor fail here.**~~
  ✅ **FIXED the same day — see the entry above.** Left here rather than deleted, because it was true
  when written and the next entry is the answer to it.
- **The original text, for the record:** gate 5 **can neither pass nor fail here, and that
  predates this change.** The `restore` leg throws on the IndexedDB stall, so gate 5 never executes;
  if it did it would go red, because its baseline records 56 swept ids and does not contain
  `pref-gridlines` either (added 3 Sep, inside `.prefs-card`, and a false positive by design —
  `formSignature()` is a raw sweep with none of `collectFieldValues()`'s exclusions, so it reports a
  *superset* of the save format, and `gate.sh`'s comment claiming otherwise is wrong). So the single
  riskiest thing here — a DOM id becoming file format forever — arrives with its dedicated automated
  check inoperative. The baseline was **deliberately not re-cut** in this commit: it cannot be
  verified in this environment either, and re-cutting a baseline inside a commit about a text field is
  how a real regression gets absorbed. The `hdrverload` leg is the insurance actually built instead.
- **The two-files-in-sequence case is proved by inspection, not by the harness.** Both `hdrverload`
  runs go through the inline `?state=` path; opening a second file needs the real picker, which stalls
  on IndexedDB in headless Chrome. That is the same missing insurance `CLAUDE.md` already names for
  §0 rule 3.
- **The field's `description` renders at 9 px**, a size `theme.js` explicitly retired — Mantine's
  `InputWrapper` computes `xs (11px) − 2px` and `legacy.css` pins the label but not the description.
  Pre-existing: `#pref-gridlines`'s description already does this, so this is the second site, not the
  first. One line fixes both, and it is not this step's business.
- The description says *"Shows as “v3” in the header’s bottom-left."* ⚠️ It is **false in Manual
  mode** — `headerLine()` returns `headerManual[id]` there, so a version typed onto a manual header
  changes nothing. Title has behaved that way since the header gained modes; the difference is that
  Title makes no claim. Step 2's mode popover is where that gets explained, not in 9 px of copy.

**Not a version cut.** `APP_VERSION`, `version.json` and `package.json` all stay at `1.2.0`. This is
one of six steps, and bumping `version.json` raises the *"a new version is available"* strip on every
installed PWA — for one optional text field. That mechanism only works while it stays credible.


### Unreleased — renamed to SPT Calendar Builder, and the header's Principal Photography date was wrong

Two changes. Local, not pushed at time of writing.

**The app is now "SPT Calendar Builder".** The PWA manifest `name`, the browser tab title, the help
panel, and the brand in the top-left all follow. `short_name` and the iOS home-screen title are the
shorter **"SPT Calendar"** — those sit under an icon and both platforms truncate hard. ⛔ The root
`index.html` is deliberately untouched: it is byte-identical to `releases/v1.2.0.html` and is the
one-click rollback, so only the build was renamed. ⚠️ Changing a manifest `name` changes the
installed identity — anyone who already installed the PWA may see this as a **new install** rather
than a rename, with the old icon lingering until they remove it. The *documents* were not renamed:
export filenames, the Excel worksheet tab, the file-picker type label and the calendar's own
"Planning Calendar" header line all still say Planning Calendar, because they describe the document
rather than the app.

**The wrap date was right; the date beside it was not.** Reported as *"the wrap date sometimes seems
wrong"*. It isn't — verified against an independent day-by-day walk across five shapes, including a
start buried in a hiatus, a start on a holiday and a per-phase Production hiatus: **5 of 5 correct**.

The bug was the other half of the same line. `Principal Photography <date>` printed
`mondayOf(entered start)` — the date you typed, snapped to its Monday — while `Wrap:` printed a
*computed last shoot day*. One end measured, the other a calendar guess. Whenever that Monday was a
union holiday or fell inside a hiatus, the header named a day nothing happens **and contradicted the
grid beside it**. Measured: a Production entered as 12/21/26 — inside the default winter hiatus —
claimed *12/21* while the grid plainly showed it starting **1/4/27**. Two weeks out. A start on
Memorial Day Monday was out by a day.

**The same bug was in the grid**, found while fixing it: the *Start Principal Photography* auto-note
was dropped on that same entered Monday, so it could land on a hiatus week where nothing shoots.

`simulateProductionSchedule` already walked to the first real shoot day, so the fix is to keep it:
`productionInfo` now carries **`firstShootDay`** alongside `startDate`, and both the header and the
note use it. The two are deliberately distinct — `startDate` is the Monday the phase's first *week*
begins, which is what the grid lays out; `firstShootDay` is when the camera actually rolls.

⚠️ **Worth recording, because it is the trap here:** the first version of the probe reported the wrap
as wrong in *every* case, and the probe was wrong — it hardcoded a holiday list (counting Veterans
Day, which is US-NY only, not US-GEN) and ignored the four `DEFAULT_HIATUSES` the app ships with. The
wrap legitimately jumps ~2 weeks whenever a shoot crosses December, which is exactly what makes it
*look* wrong. The gate leg now reads holidays and hiatus rows **from the app**, so it cannot repeat
that mistake.

**Verified.** New gate leg `wrapdate`: five scenarios, each comparing both ends of the line against
an independent walk, with the two previously-broken cases pinned by name — a start inside the winter
hiatus must report 1/4/27, a start on Memorial Day must report 6/1/27.

### Unreleased — user settings: a preference store, and grid lines you choose for the exports

The first user-settings work, and the first use of `localStorage` in this app. Local, not pushed.

**A Preferences card** now sits third in the Settings tab, above *Export App With Data*, with one
control: **Grid lines in exports — None / Solid / Dashed (Excel style)**, None being the default.
⛔ There is deliberately no separate *Default* entry (owner, 3 Sep 2026): a Default that merely meant
None was a second name for the same output, and it let the store hold a value that changed nothing.
An absent key and a chosen None are the same thing, so choosing None **removes** the key. It carries a line
saying these stay on this computer and are not part of a saved calendar, because nothing else in that
tab behaves that way — Production Region and Holidays above it *do* travel inside a `.sptcal`.

⛔ **It is an export setting, not a view setting** (owner: *"these gridline settings are about the pdf
export, thats where it matters, not in the live app view"*). An earlier cut of the same day drove the
on-screen grid from a body class; it was removed. The waterfall editor keeps the solid `#D4D4D4` lines
it has always drawn, and the gate leg asserts that in every state rather than merely omitting it.

**The store.** One key, one flat JSON object with its own `version`, try/catch on every access —
`localStorage` throws outright in a private window or with site data disabled, and a throw would take
the whole engine down before the grid rendered. Choosing *Default* **removes** the key rather than
storing an empty string. ⚠️ Measured: `localStorage` works from `file://`, persists, and every
`file://` copy on one machine shares one bucket, so a preference set in an emailed copy is honoured by
the next one opened. The deployed site keeps a separate bucket.

⛔ **A preference never reaches a saved calendar**, and the mechanism is one line: `collectFieldValues()`
sweeps every id'd input in the document, and the engine skips `.prefs-card`. Without that, the control
would be baked into every save *and* add a phantom undo step per change. Proved against a real exported
copy — the snapshot contains neither the value nor the control's id, and `fields.byId` is unchanged at
54 ids.

**No frozen edit was needed to wire the setting itself.** `SHEET_GRIDLINES` went `const` → `let`,
seeded from the store; all three readers — `exportExcel`, `buildWaterfallPdf`, the print fallback —
read the identifier at call time, so re-assigning it reaches every output with no frozen line touched.
That is the "change the declaration, not the call sites" pattern.

**But the PDF could not express the setting, so four frozen edits were made — owner-approved,
and gated.** The writer drew **horizontal row separators only**: no vertical column rules, always
solid, with only the colour varying. Solid and Dashed were therefore *indistinguishable in the file*,
and Excel's `solid` had no branch at all, so choosing it produced dashed borders in the workbook.

- `page.line` gained an optional `dash`. Every existing call site passes none, so their bytes are
  unchanged — which is exactly what keeps the baseline compare valid.
- `interior` gained a `solid` branch (`#D4D4D4`) and a per-style dash array, in points rather than
  scaled: a dash that shrank with the fit scale would read as solid on a dense calendar, which is
  where the distinction matters most. ⚠️ The dash is **1.5pt on / 1pt off**, chosen by the
  owner against a reference image and three sampled exports. The route is worth keeping: an equal
  `2 2` reads as a grey hairline at export scale, `3 2` reads as dashed but too coarse. ⚠️ Judge any
  future change at 100% zoom or on paper — a viewer smears a fine dash into a solid line at low zoom.
  Both axes take that one value, so it is tuned in one place.
- **The PDF now draws interior column rules.** Body only, below the grey header band, and drawn
  *before* the frame and block separators so a heavier edge always paints over an interior rule at
  the same x.
- `exportExcel` gained its `solid` branch — Excel's `thin` style is its plain solid hairline.

⚠️ **A PDF dash is graphics state, not a per-stroke argument.** Without the trailing `[] 0 d` every
later stroke on the page — the black frame included — inherits it. The leg asserts set-count equals
reset-count for exactly that reason.

**Verified.** New gate leg `prefs`, measured by reading the exported files back: None produces no
interior rules; Dashed produces 57 with 56 balanced dash set/reset pairs and real verticals; Solid
produces 56 in `#D4D4D4` with **zero** dash operators; the preference is absent from a real saved
copy; the editor is untouched throughout. And the safety argument for the frozen edits: **with nothing
stored the waterfall PDF and every Excel part are byte-identical to the baseline.** Gate: 144 pass,
1 fail — the known `restore` IndexedDB stall.

### Unreleased — a block swap can reshape a block, so it now says which one, and paints the weeks

Second report from the owner's own use, and it corrects the premise this whole feature was built on.
Local, not pushed.

**What they saw.** Swapping Pre Prep ↔ Writer's Rm traded the columns correctly — and then Writer's
Rm widened from one column to two for **34 of its 37 weeks**. Nothing was lost, no column width
changed, nothing clipped, and the chip did say *"34 weeks re-flow"* first. But a bare count is not a
warning, and the sprawl is the opposite of what a block swap promises.

⚠️ **The premise was wrong, and this is the correction.** [`COLUMN-ORDER-PLAN.md`](COLUMN-ORDER-PLAN.md)
§1 argued — and measured — that a block swap reflows nothing: the phase keeps its whole run in the new
column, and the neighbour that held it narrow still sits inside that run. **True with two phase
columns. False with three or more.** Moving a block changes *which* column is beside it. Here Writer's
Rm sat at slot 0, held to one column because Pre Prep occupied slot 1 inside its run; after the swap
it sits at slot 1, on the far side of Pre Prep, and its new right-hand neighbour is slot 2 — empty for
its entire run, because Prod Prep does not start until after Writer's Rm ends. So it absorbs it. The
three weeks that stay narrow are exactly the three it shares with Pre Prep, where the even-share cap
holds every phase to one column. The original measurement used a fixture where the phase was blocked
in *both* directions, which is precisely the gap §1 flagged as unmeasured.

**Owner ruling (2 Sep 2026): keep offering it, warn harder.** So:

- **The warning names the phase, the new width and the extent** — *"⚠ Writer's Rm would widen to 2
  columns in 34 weeks"* — instead of *"34 weeks re-flow"*. The confirmation after the move says the
  same in the past tense, so nothing is discovered only afterwards.
- **The chip turns amber** (`.grid-swap-chip.is-warn`), matching the collateral rectangles, because
  the promise of a block swap is that blocks keep their shape and the exception should look like one.
- **The amber preview is painted on selection, not only mid-drag.** One rectangle per affected week —
  34 here. This matters because the toolbar buttons commit with no drag at all, so a preview that
  only appeared while dragging the knob was no warning for the primary path.

**Verified.** New gate leg `stintreshape`, driven by the owner's second calendar — schedule intact,
titles genericised. It asserts three phase columns and Writer's Rm held to one for all 37 weeks; the
warning naming phase, width and extent; the amber chip; exactly 34 amber rectangles *before* the
commit; the widening actually landing; the confirmation matching; no cell lost; no clipping; and the
reverse restoring the year exactly.

### Unreleased — a block swap in a year that already had one was refused; it should not have been

**Fixes the first defect the block swap produced in real use**, reported by the owner on their own
calendar within an hour of the push: *"Can't swap: two phases would need the same column in the same
week"* on a swap that is plainly legal on screen. Local, not pushed.

**It was a false refusal, and the cause is one word: *isolation*.** `applyStintSwaps` checked each
stored exchange on its own, mapping that group's cells and leaving every other phase at its
**natural, un-exchanged column**. In a year that already carries one swap, that judges the new swap
against a layout that no longer exists. Concretely: 2027 already held Post ↔ Pre Prep, and the whole
effect of that swap is to move Post out of Production's column — Post's *natural* column **is**
Production's; it renders elsewhere only because of the stored swap. A Writer's Rm ↔ Production swap
was then refused for colliding with a Post that had already moved out of the way. Applied together,
all four exchanges are collision-free, which is exactly what the screen showed.

**Fix:** validate the whole set together first and apply if it is clean; only when something really
does collide fall back to a deterministic greedy subset. That fallback is now reachable only by a
drifted or hand-edited store, where refusing more than strictly necessary is the safe error.

**A refusal now names names.** `collide` was the one reason in the feature with no subject — no
phases, no week, no action. It now reads *"Post and Writer's Rm would both need the same column in
the week of 4/12/27."*

**The general lesson, worth more than the bug:** the gesture reasons about the **rendered** grid
(slots, after swaps) while the reconciler reasons about the **schedule** (columns, before swaps).
Those two spaces diverge precisely when a swap is already stored. Any new check has to say which
space it is in.

**Verified.** New gate leg `stintchain`, driven by the owner's own calendar — schedule intact, show
titles genericised, since fixtures live in a public repo. It asserts the stored swap restores and
applies, the second swap is *offered* rather than refused, it lands, the already-swapped pair does
not move, no cell is lost or reshaped, and reversing restores the year exactly. `stintcollide` still
proves a genuine cell-losing exchange is refused.

### Unreleased — the block swap has its gesture: "Swap Block", and a swap that names everyone it moves

Steps 5 and 6 of [`COLUMN-ORDER-PLAN.md`](COLUMN-ORDER-PLAN.md), plus the second half of owner
decision E1 and §6 items 6 and 7. **Pushed as `2a75929` and LIVE** — the deploy workflow publishes the build on every push, and the live page was verified byte-identical to a local build. Nothing in the frozen surface changed.

**The gesture (owner decision E2).** Hover any cell of a phase's block in the waterfall and a small
teal **Swap Block** button appears at the top-right of that block's first visible week. One click
selects every cell of the block, and the existing machinery takes it from there: one outline round
the block, the blue knob at the seam, the toolbar's *◀ Swap / Swap ▶*, Alt+arrows. The button lives on
the overlay layer, never inside a grid cell; it stays visible while the pointer is anywhere over the
block or on the button itself (so travelling toward it cannot kill it); it anchors to the topmost
*visible* week when the first is scrolled under the sticky header; and it does not appear at all on a
block with one phase column, where nothing can move. It is not offered on touch, where there is no
hover — the toolbar buttons still work there. ⛔ The label is *Swap*, never *Move*: the shift controls
a few pixels away move the calendar in time (rulings D10 and E2).

**Mode inference (§6 item 5).** A selection that is exactly every cell of one block resolves to the
block swap; anything else resolves to the per-week swap, exactly as before. A near-complete selection
is **never** snapped up to the whole block — that would be the assumptive behaviour the block swap
exists to remove — and with the button there, nobody needs it. The chip states the resolved mode
**before** commit: *"All 6 weeks of Prod Prep in 2026 — Swap ▶ trades the whole block with Post ·
nothing re-flows"* against *"5 of 6 weeks of Prod Prep selected — Swap moves the 4-week run at
11/16/26–12/7/26 only · Swap ▶: 2 weeks re-flow"*. The knob's label and the toolbar tooltips carry the
same sentence.

**E1, finished — a block swap exchanges with EVERY block in the neighbouring column that overlaps
it, and names them all.** The previous commit refused such a pair outright (measured: exchanging with
one of two loses four weeks, silently, in the grid and both exports). Now the gesture closes the set
itself — the other column's occupants over the block's weeks, then this column's over theirs, until
nothing new joins — and the store's `with` relation is read as a **graph**: each connected component
is one exchange, its members must sit in exactly two columns, and every member trades one for the
other. A mutual pair is the two-member case, so every store written before this reads exactly as it
did. From the long side the chip says *"trades the whole block with Post and Localization"*; from
the short side, *"trades the whole block with Writer's Rm (Localization moves with it)"*; the
confirmation after the move names them all. The reconciler still refuses a group that would lose a
cell — reachable now only by drift or a hand-edited file — and a hand-edited **one-sided** entry
yields no reorder rather than a wrong one.

**Two honest refusals that did not exist before, both stated in the chip.** *Mixed*: a block some of
whose weeks are already swapped one by one cannot be block-swapped until those are swapped back —
two orders at once is not something either store can express. *Chained*: a block already swapped
with one column cannot be swapped with a third; the store holds disjoint pairs and a three-cycle is
not one of them. The verdict detects it by reading where every member actually lands in the trial
and refusing when that is not the column beside it. ⚠️ This is a real limitation for a block with
three phase columns — recorded in `HANDOFF.md`, and the per-week swap shares it.

**One thing the block swap deliberately does NOT refuse: a column-width change.** A column's width
follows the labels in it, so two columns trading their phases trade their widths too. That *is* the
two blocks looking the same in their new places; the per-week gate's G3 rule would have refused every
block swap between phases of different label length. What it does check: the year still needs the
same number of columns, the Simultaneous Post lane has not moved, and **every occupant of the block
keeps its colspan** — any week where a cell changes shape is reported as collateral, and the chip says
how many.

**One outline per contiguous run (owner decision E3).** The selection used to draw one rectangle per
cell. It now draws one per contiguous run, breaking wherever the rows stop being consecutive or the
rendered width changes, so every outline is a true rectangle of selected cells: a ⌘-click set or a
marquee that skipped an all-phase hiatus week gets an honest box per piece rather than one box
enclosing cells that are not selected. A mixed run keeps its solid outline and marks its no-room cells
inside it, so the count chip's "(2 has no room)" still points at something visible.

**Verified — five new gate legs, all against `dist/index.html`:**

- `stintgroup` — the collide schedule with the complete group stored: Writer's Rm to slot 1 for all
  20 weeks, Post *and* Localization to slot 0, nothing lost, nothing wider. `stintcollide` keeps
  proving that naming only one of them is still refused.
- `stintoneside` — a hand-edited one-sided entry: natural order stands, every cell present (§6 item 6).
- `stintbtn` — the button and the inference, through real pointer events on the owner's screenshot
  shape: button on the first week, survives travel, re-anchors, disappears; one outline; the block
  mode line before commit; all six weeks move and **not one changes width** (the per-week leg on the
  same fixture widens two); the affordance follows; swapping back restores the natural layout exactly;
  a partial selection resolves to the per-week mode and says so; no button on a one-column block.
- `stintmulti` — E1 through the gesture, from both sides of the seam: both partners named before
  commit, all three blocks move, the confirmation names them, the reverse is exact.
- `stintexport` — §6 item 7, by reading the files back: the workbook via ExcelJS and the PDF by
  inflating its content stream, both read `Pre Prep | Writer's Rm` in the swapped week exactly as the
  screen does, and every screen column width appears in the PDF at the page's fit scale (0.9).

Inertness still holds: with nothing stored the waterfall PDF and every Excel part are byte-identical
to the baseline. `prove-col-permutation.mjs`: theorem holds. Gate: every leg passes except the known
`restore` IndexedDB stall, identical on the untouched page.

**Learned the hard way, in the harness.** (1) The hover handler was first written on
`requestAnimationFrame`, and headless Chrome starves rAF the way a hidden pane does — the button was
unreachable from the harness while looking fine by hand. It runs synchronously now: one
`elementsFromPoint` per move, a draw only when the block under the pointer changes. (2) The cached
swap verdicts were left standing for the 140 ms debounce after a selection changed, so the chip
narrated the *previous* selection's swap for a beat; they are cleared the moment the key changes.
(3) `DecompressionStream`, unlike `zlib.inflateSync`, refuses the newline every PDF stream carries
before `endstream` — trim it, or the content stream silently reads as absent.

### Unreleased — a genuine block swap: two blocks trade sides and neither changes shape

Steps 3 and 4 of [`COLUMN-ORDER-PLAN.md`](COLUMN-ORDER-PLAN.md). **No gesture yet** — this is the
store, the reconciler and the one authorised frozen edit, landed and gated before any UI is built on
top of them, the same way the per-week swap was.

**Why this exists.** The shipped per-week swap reflows weeks you did not select: measured on the
owner's own calendar, swapping a 4-week overlap widened **16** other weeks. Their verdict, and it
reframed the feature — a swap should be *"a genuine swap, where the two blocks swap positions but look
the same"*, and doing the widening for you is *"confusing and assumptive"* when **Expand** already
does it in one click. A block swap moves the phase's *entire* run in that year, so the run is never
split and the layout rule that was holding it narrow keeps holding it narrow. ⚠️ **Corrected 2 Sep
2026: that last sentence originally read "a block swap reflows nothing", and it is only true when the
year has TWO phase columns** — with three or more, moving a block changes *which* column is beside it
and the new neighbour may be free where the old one was not. See the entry above.

**Vocabulary.** The unit is a phase's weeks within **one year block** — the thing that actually owns a
column. Production running Nov 2026 → Mar 2027 has two, each independently swappable. The UI calls it
a **block** (the owner's word, and the right one for users); the code calls it a **`stint`**, because
`block` already means the year group in 117 places in the engine and 577 in the harness. Same
deliberate split as the app's user-facing *Load…* over the code's `open`.

⛔ **It moves only the blocks you named — not the whole column.** An earlier draft of the plan argued
this was impossible and recommended disclosing it as an unavoidable surprise. The owner rejected that
(*"there's gotta be a way to just move the phase you selected"*) and was right. Re-reading `segCol` is
what shows why: it reuses a freed column **only to the right of every earlier phase still running**, so
two phases share a column only across a clean break in the whole schedule — which means the column
beside your block, *during your block's life*, holds exactly one other block. A second occupant is
adjacent to something else, months later, and has no business moving.

⛔ **Two halves, and half of it alone visibly does nothing.** The move is a `col`-value exchange over
the two blocks, in **non-frozen** `computeSchedule`, applied per **cell** within the block's week range
(a phase has exactly one segment and therefore one column for its whole life, so exchanging at the
segment level would move it in every year at once). On its own that is invisible: `blockSlotMaps`
re-derives slot order from **first appearance**, so the phase present in week 1 is still sorted into
slot 0 and nothing moves — the trap the store's own comment describes when it forbids a `seat` field.
The frozen hook's only job is to **pin the order the block already had**, so the exchange shows
through. Read it as *preserve*, not *reorder*.

**The frozen edit, and why it is defensible.** Two functional lines inside `computeBlockLayout` — the
`.map` gains an index, and the slot-order assignment takes its list from a non-frozen helper instead of
the derived one. Owner sign-off E0, scoped to the slot-order assignment only. The safety argument is
**inertness**, and it is measured, not promised: the helper returns `null` unless a swap is stored, and
with nothing stored the gate's byte-compare shows the **waterfall PDF and every Excel part identical to
the baseline**. One decision, four consumers — screen, workbook, direct PDF writer, and the gate's own
fingerprint — so they cannot disagree.

**Measured, not asserted.** Three results, each of which could have killed the design:

- **Bystanders don't move.** A fixture where *both* columns are shared — slot 0 is Writer's Rm then
  Localization, slot 1 is Pre Prep then Post — swapping Writer's Rm ↔ Pre Prep leaves Localization at
  slot 0 and Post at slot 1. Column count unchanged, no cell lost.
- **Nothing reflows.** On the exact fixture where a per-week swap widens two weeks, a block swap widens
  **zero** — not one cell in the grid changes shape.
- **A correction to something I told the owner earlier.** I said a phase alone in a row must fill the
  row, so a narrow band sitting in the right-hand column with space to its left was unreachable. It is
  reachable: the block's solo weeks travel *with* it and stay one column wide, because the left-absorb
  branch refuses while the partner occupies that column inside the run. That is the layout the owner
  described wanting, and it falls out of the design rather than needing anything extra.

**Save format:** new `gridStintSwaps` key, keyed `'<year>|<phaseKey>'` — never by column or slot,
because `col` is an opaque identity that shifts whenever any start date changes and a slot index means
a different column in each year. Restored unconditionally (`? {...} : {}`), cleared by Reset All,
deliberately **not** cleared by Reset Notes & Hiatus, and deliberately **not** re-keyed by a shift
(owner ruling E5 — the keys hold a year, not a date; a block pushed into a new year simply has no entry
there, and the old year's entry is *ignored* rather than deleted so undoing the shift brings it back).
No `SNAPSHOT_VERSION` bump: an absent key means "no order", correct for every file ever written.

Verified: `stintswap` and `stintnoreflow` gate legs (the two measurements above), the full existing
gate still green at **68 checks** including the byte-identical PDF/Excel inertness proof, and
`prove-col-permutation.mjs` still holding its theorem. That prover needed its slice updated — the
frozen function now references one non-builtin — and it gained a second check while it was open: the
reconciler's own first-appearance walk is fuzzed against `computeBlockLayout`'s across all 20,000
generated schedules, because that duplication is the feature's one drift risk and a disagreement would
pin the wrong order and land a phase in the wrong column.

⏭ Still to build: the **Swap Block** hover button, the selection-driven mode inference, and the
one-outline-per-run change. Nothing in the UI can create a block swap yet.

### Unreleased — fix: "clear the hand-set width" on a width nobody set

Owner bug report: a swap was refused with *"Clear the hand-set width on Writer's Rm 9/7 to swap its
column"* — on a column that had never been hand-set. Both halves of that complaint were right, and
they turned out to be the same defect in two places.

**The mechanism.** Frozen `applyCellSpanOverrides` deliberately **keeps** a cell-width override that
the schedule has moved under — its own comment says *"a stale override shrinks to whatever is
genuinely free rather than being dropped outright"* — so that the fill comes back if the dates move
back. The consequence is that a claim written while a week still had a free column beside it survives
**invisibly** once another phase moves into that column. Nothing on screen is wide. Nothing is
clearable. But the entry is still in `cellSpans`.

Both features were reading that store rather than asking whether the override was doing anything:

- **The swap refusal (D4)** tested `cellSpans[week|phase]` directly, so it blocked over a width that
  granted nothing and named a cell the user could do nothing about. It now refuses only when a stored
  claim exists **and** the cell is genuinely drawn wider than its own column — i.e. only when there is
  real work to lose. A consequence worth stating: with two phases sharing a two-column block, neither
  cell can be wider than its own column, so this refusal is now rare by construction. That is the
  point of it, not a weakening.
- **Batch expand's chip** had the same shape (`cellSpans[key] !== undefined`), which is why the
  screenshot offered *"1 cell · double-click to pull back"* on a cell one column wide. It now needs
  the override to be currently widening the cell. ⚠️ The clause could not simply be deleted: a cell
  *filled* by an override has no empty neighbour left, so `maxL`/`maxR` are zero and that clause is
  the only thing that lets it be pulled back at all. And it has to stay gated on the override
  existing, or a batch could write `{0,0}` over an **automatic** span and narrow a cell nobody had
  ever touched — which the frozen single-cell handler explicitly refuses to do.

**The message was also wrong even when the refusal was right.** It said "…to swap its column", which
reads as a claim that the *column* had been hand-set. It is a **cell** width. It now names the cell,
says what state it is in, and says what to do: *"Prod Prep 11/16 has a width you widened by hand.
Double-click that cell to pull it back, then swap."*

⛔ What deliberately did **not** change: the stale entries are neither deleted nor mirrored. `cellSpans`
is persisted, and the user's fill has to come back if the schedule moves back — the gate leg asserts
the claims survive the swap untouched.

Verified: new `colswapstale` gate leg, driven by a fixture carrying two claims on overlap weeks where
the phase has no room. It asserts the claims are genuinely inert first (or the leg would silently stop
testing anything), then that the swap is offered with no width complaint, that no phantom "pull back"
is offered, that the swap applies, and that the claims are still there afterwards.

### Unreleased — swap two phases' columns however little they overlap

Two restrictions removed, both on the owner's instruction, both of which were blocking the feature's
central purpose rather than protecting anything.

**1. "At least one side must be a phase's whole run."** This was Phase 1's scope limit (D7), and it
sounded narrower than it was: it refuses the *ordinary* shape of two phases that merely overlap. Two
phases each running twelve weeks, sharing six in the middle, each sticking out beyond the other —
there is no whole run to select, so there was no knob at all and the chip said "select a phase's
whole run", which is advice you cannot act on. The original request's screenshot passed only because
one phase's entire life happened to sit inside its overlap.

Lifting it does **not** enable arbitrary partial runs (still a separate decision). It cannot: the run
walk always yields the *maximal* contiguous stretch where the two phases sit side by side, and it is
never clipped to the selection — so a hand-picked sub-slice is still unreachable and a phase's column
can still never zig-zag mid-run.

**2. "Don't re-flow more weeks than you move."** A count-based collateral refusal, and it was the
wrong rule for four reasons:

- **It was never the owner's ruling.** D2 decided a *magnitude* cap — an unswapped week may shift by
  at most one column. The count rule was added on top by the gate's design and was strictly stricter
  than the decision of record.
- **A count is not a measure of harm.** Every one of those weeks moves by exactly one column, which is
  the thing D2 allowed. Twelve of them is not twelve times worse than one.
- **What it called collateral is usually the layout correcting itself.** A phase held to one narrow
  column in weeks where it runs *alone* — because `phaseRunBounds` spanned its column-run across an
  overlap — fills the row once that run splits. That is the grid's own rule, not damage.
- **It scaled backwards.** The longer the phases, the more likely it fired, and long phases are
  exactly where column order matters most.

What still protects the calendar is untouched: the block's **column count** (G2), any change to a
**column width** (G3), and a reflow of **two or more** columns (G5, D2's actual ruling). The
disclosure is untouched too — amber rects before you drop, a chip with the count afterwards.

Measured on the case that was refused twice: 6 shared weeks move, 12 tail weeks widen by one column
each, chip reads *"Swapped Pre Prep ↔ Writer's Rm. 12 other weeks changed width to fit."*

Verified: new `colswapmid` gate leg, driven by a fixture that is deliberately the case a count rule
rejects — neither phase's run confined to the overlap, both tails held narrow beforehand, one gesture
moving all six shared weeks, both six-week tails keeping their slot and widening by exactly one
column, and the count reported. It fails loudly if either restriction is reinstated.

### Unreleased — swap two phases' columns (Feature 2, Phase 1)

Steps **F2-c and F2-d** of [`GRID-DIRECT-MANIPULATION-PLAN.md`](GRID-DIRECT-MANIPULATION-PLAN.md),
and the point where Feature 2 becomes something a user can see. F2-a gave the store and the
reconciler, F2-b the gate; everything shipped so far was invisible. This adds the layer that decides
*what would move*, and the gesture that moves it.

**What you get.** Highlight a cell of the phase you want to move — ⌘-click one, or drag across a run
of them — and a small teal circle appears on the column boundary beside it. **Click the circle**, or
drag it across the boundary, or press **◀ Swap** / **Swap ▶** in the preview toolbar (Alt+← / Alt+→ does the same),
and the two phases exchange columns for **every week they run alongside each other**, in one step and
one undo. Nothing about the phases changes — same dates, same durations, same labels, same widths —
only which column each occupies, and both exports follow because the swap happens upstream of the one
shared layout pass.

**Scope this round is whole runs** (owner ruling D7): at least one side of the swap must be a phase's
entire run within the year block. That is exactly the case the request was made about — a four-week
overlap where the later phase's whole life is inside it — and it is the half with no third phase to
displace and no reachable column-count change. Arbitrary partial runs stay a separate, later
decision.

**One consequence is real and is disclosed rather than hidden.** Moving a phase out of a column can
let it *widen* in the weeks above or below, because the column beside it is now free for its whole
run. Measured on the request's own scenario: the two weeks above the overlap go from one column to
two. That is the magnitude-1 collateral the owner sanctioned (D2), so it is previewed in amber
**before** you let go and reported in a chip afterwards. A change of two columns or more still
refuses the swap outright, and so does anything that would move a column width or the column count.

**Refusals say why, and the buttons stay enabled so they can.** A disabled button explains nothing,
and the top UX risk here is a gesture that appears to do nothing — so pressing an unavailable
direction puts the reason on the grid: no phase in the column beside it, mismatched widths, a
hand-set cell width to clear first, or Production's column being anchored to the Simultaneous Post
lane.

Details worth keeping:

- **`computeSwapRun` reads the rendered `<td>`s**, not the layout internals — `data-week`,
  `data-pkey`, `data-own`, `data-a`, `data-b`. So it carries no second copy of a span rule to drift
  from `computePhaseRowLayout`, and the harness asserts the whole layer with no test hook. Two DOM
  facts make the block-local coordinate space free: every year block starts at table row 0, so
  `tr.dataset.row` **is** the block-local week index; and a year appears in exactly one block, so
  `data-week`'s year **is** the block identity.
- **The partner is found by scanning for the segment whose edge touches**, in both directions —
  never by arithmetic on the seed's own slot. `own − 1` names a slot a spanned neighbour merely
  covers, which silently never offers the left move; `own − span` can name a partner two slots away.
- **`canSwapRun` installs the candidate store, recomputes, and reads the gate's return value**, then
  always restores. It does *not* re-fingerprint afterwards: the gate has already reverted the bad
  block by then, so a re-diff finds nothing and every candidate reads as legal — which is precisely
  the "drag and see nothing" failure. It also saves and restores `swapSuppressed`, which the gate
  rebuilds.
- **Verdicts are debounced and cached**, never computed per repaint. One verdict is a trial
  `computeSchedule` plus the gate's own passes, and the overlay repaints on every render — which is
  every keystroke in a date field.
- **A move that reverses one already stored deletes both entries** rather than storing an identity,
  so a saved file never carries a no-op. The store write is derived by one function shared with the
  trial, so a verdict can never describe a different write than the one that lands.
- **The knob takes a click as well as a drag** (owner, after trying it). The plan had it drag-only,
  and its reason was real but was about a *different* affordance: the earlier draft drew a full-height
  rail along the whole column seam, where a click anywhere near a boundary would have permuted the
  schedule. This is a 21px circle that exists only while a swap-eligible selection is live. What the
  drag threshold still buys is kept — a press that **travels more than 12px the wrong way does
  nothing**, and Escape cancels. A **350 ms re-arm** makes a double-click one swap rather than a swap
  and an immediate un-swap, which (since moving back over the same partner deletes the pair) would
  otherwise land back where it started with two undo steps for nothing.
- **The knob is keyboard-operable.** It carries `role="button" tabindex="0"` and a real aria-label
  (*"Swap Post with Prod Prep (11/16/26–12/7/26)"*), so Enter or Space on it has to work — an element
  that announces itself as a button and then ignores Enter is worse than one with no role.
- **A knob, not a rail on the seam.** An earlier draft drew a full-run-height purple rail on the
  column boundary; it is visually identical to the two purple resize affordances already there, and
  it covered the boundary for every row of the run. One 21px circle in a hue outside that vocabulary
  leaves the boundary grabbable — verified: the column drag and its double-click-to-autofit both
  still work on the shared seam, with a knob on it.
- **Two overlay layers, one draw pass.** The selection rects must stay at `z-index:1` to scroll under
  the frozen sticky header, but `z-index:1` makes that layer a stacking context — and a knob trapped
  inside it sits below the full-height column handle centred on the same seam, unclickable at its own
  centre. Grips therefore live in a sibling layer above the handles.
- **Chip placement, three fixes, all from looking at it.** Feature 1's count chip moved **above** the
  selection — below, it covered the next week's labels, and with the knob centred vertically on the
  run it also landed squarely on the knob. It is hidden outright while the knob is held (CSS, via
  `body.grid-swapping`) and while a column-order message is up, because both of those are usually
  *about* the weeks beside the selection; the count is on the toolbar button throughout, so nothing
  is withheld. And the confirmation chip sits on whichever side of the run the **collateral is not**
  on — a chip reading "2 other weeks changed width" while covering those two weeks is worse than no
  chip at all.
- No frozen code changed, and no save-format change: `gridColSwaps` was added in F2-a.

**And a regression the two features introduced together, found by looking at the shipped app.** The
preview toolbar is one `nowrap` flex row with `overflow: visible` and no scroller, so anything past
the window's edge was simply painted off-screen and unreachable. Measured at a 611px viewport with a
selection live: the row needed **802px**, so `Expand`, both Swap buttons **and Undo/Redo** were all
outside the window. Feature 1's button added ~79px to that row and Feature 2's added ~138px, to a row
that previously needed ~585px and fitted. `.preview-tools` now wraps — and `max-width:100%` is what
makes it wrap, because `flex:none` sizes the block to max-content and the row's own `flex-wrap` only
ever moves the whole block to its own line rather than breaking it up. On a wide window max-content
is under 100%, nothing wraps, and the layout is byte-identical to before.

Verified: new `colswapmove` gate leg — from a fixture with no stored order at all, one ⌘-click at
real coordinates plus one button press moves the whole four-week run, the unselected weeks keep their
phase and slot, the sanctioned collateral applies **and** is reported, the affordance follows the
move, and moving it back deletes the pair (proved by the layout returning byte-identically, since a
surviving no-op would be re-applied by the reconciler). In the browser: the knob drag with its ghosts
and amber collateral preview, the settle animation's measured ±77px deltas, one undo reverting the
whole run, Alt+arrow, a dblclick on the knob staying inert, and the note editor still opening and
committing.

### Unreleased — the column-order gate: refuse what would disturb the calendar, and say so

Step F2-b of [`GRID-DIRECT-MANIPULATION-PLAN.md`](GRID-DIRECT-MANIPULATION-PLAN.md). Still **no
gesture** — this is the safety layer, and it lands before anything can create a swap, because a gate
that is wrong underneath a drag is undiagnosable.

The swap model preserves each week's column multiset by construction, which is why the slot map
cannot move. What construction does *not* protect is everything downstream: the Simultaneous Post
lane is derived from Production's column, `sheetColumnWidths`' spanned-label pass sums a per-slot
**maximum** (so a permutation genuinely can move every column's width), and splitting a phase's run
changes what the automatic layout grants in weeks nobody selected. So the gate **measures the
observable grid** rather than reasoning about it: `layoutFingerprint` calls the frozen pipeline
read-only and compares the slot map, the column count, the SimPost lane, every column width, and
each week's segment layout against the same fingerprint taken with the store suspended.

Six checks, honestly labelled — three of the five an earlier draft proposed were tautologies sold as
the primary detectors, so they are now marked as cheap sanity checks rather than protection. The one
with real teeth confirms the two phases **actually traded places**, which catches the swaps that pass
every structural test while one side merely gains a column at an empty run's expense.

**Rejection is per pair, never per block.** Reverting a whole year block killed unrelated legal swaps
in it — silently, permanently, re-running on every keystroke, recoverable only by Reset All or
hand-editing the saved file. And rejected entries are **suppressed for the pass, never deleted**:
the same rule a stale cell width follows, because otherwise a temporary duration typo would destroy
the user's column order for good. The suppression set is rebuilt every pass, so an override starts
applying again by itself the moment the schedule allows it.

**Refusals are visible.** A new `#colswap-notice` strip (same shape and CSS as the legacy and update
strips) names the phases, the week and the reason — *"Column order paused for Production and Post
(11/30/26): it would re-flow weeks you did not select."* It carries no action button, because there
is nothing safe to do automatically; fixing it means changing the schedule back or clearing the
order, both the user's call. Dismissal is per message, so a different problem later still speaks up.
When a swap applies *with* permitted collateral it says so too: *"Column order applied. 2 other weeks
changed width to fit."*

**Perf.** The reconciler stays inside `computeSchedule` (a per-week two-value exchange); the gate runs
**once from `update()`**, never inside `computeSchedule`, which the backward date solver calls up to
300 times. `update()` is bound undebounced to every phase date and duration field, so the gate is
cached on a structural key covering week count, each week's column multiset, the stored overrides,
the hand-dragged widths, and whether Simultaneous Post is on — the last because it flips the SimPost
lane and can turn a legal swap illegal with no gesture involved.

⚠️ **A bug this found in itself, worth recording.** The first version of the content check compared
each week's whole segment list, `empty` filler included. A legal swap routinely makes an `empty`
segment disappear when a cell absorbs the slot beside it — so the gate reported *"a cell would be
lost"* and refused every correct swap, including the owner's own screenshot case. Filler is now
excluded and only real occupants are compared. This is exactly the class of mistake that would have
been undiagnosable behind a drag gesture, which is why the gate ships before one.

New harness leg `colswapgate`, wired into `gate.sh` beside `colswap`: the two now prove opposite
halves — a legal swap applies with its collateral disclosed, and an unsafe one is refused with the
notice shown, a reason given, and all four store keys still present.

### Unreleased — the selection outline wraps the whole cell, and grows with it

Reported: the purple highlight covered only part of the row. Two separate things were behind that,
and only one of them was a bug.

**The bug.** The outline was drawn from the cell's OWN single column rather than its rendered box, so
a cell spanning two columns got an outline round only the first one — and it stayed that size when a
batch widened the cell. `ownSlotBox` exists for a good reason and keeps its job: deciding *which*
cells a sweep selects has to be per-column, or dragging down one column also grabs every full-width
cell that merely straddles it. But *drawing* needed the whole cell. Now a separate `tdBox` does the
drawing, and because the apply ends in a render the outline follows the cell for free — measured
86px → 172px as a cell expands to two columns, where it previously stayed at 86px.

**Not a bug.** The strip still left uncovered on the right is the **Notes column** (measured: 46px of
a 191px row, which is exactly the gap in the report). The owner's ruling is to leave it outside the
highlight: the box then means precisely what the operation does — expanding moves a phase cell across
empty *phase* columns and can never occupy the Notes column, so outlining it would promise something
the feature does not do. It also keeps the boxes symmetric in multi-phase weeks and lets them scale
visibly, where spanning to Notes would make every box end at the same right edge regardless of the
cell's actual width.

### Unreleased — seven more batch-expand fixes, from the review's verify pass

The adversarial review's second stage tried to *refute* each of its own findings against the real
code, and confirmed six. Two of those were already fixed; these are the rest, plus the minors from
the freeze and gesture lenses.

- **The batch was stealing the frozen autofit gesture.** Double-clicking a column boundary to refit
  it — advertised in that handle's own tooltip — silently batch-expanded instead, whenever a
  selection happened to be live. The batch's `dblclick` listener is capture-phase and resolves cells
  geometrically, so it walked straight *past* the handle to the cell beneath and then
  `stopPropagation`'d the frozen handler out of existence. Handles now own their band here, the same
  rule the marquee's pointerdown already followed.
- **Typed note text could still be lost — through the toolbar button.** The fix in the previous
  entry covered the marquee, but the button's click listener is registered *ahead* of the note
  editor's outside-click commit, so pressing Expand with an editor open re-rendered first and
  `render()` discards an orphaned editor without committing it. `batchFill` now commits any open
  editor as its very first statement — before reading the selection, because committing re-renders
  and detaches every cell it would have been holding.
- **A cell under an open popover was still clickable.** `elementsFromPoint` keeps descending past
  whatever is on top, so a click inside a note editor or date picker could resolve to the grid cell
  beneath it. The walk now stops at any body-level panel.
- **The overlay painted over the pinned header.** The selection rects and count chip rode above the
  frozen sticky header row instead of scrolling under it (`z-index` 8 against the header's 2). Now 1.
- **The chip contradicted the button.** With every selected cell already at its limit the button
  correctly read "Pull back" while the chip still said "double-click to expand" — the chip's verb was
  hard-coded. Both now derive from the same value.
- **The marquee took no pointer capture** and never checked the button was still held, unlike every
  frozen drag in the file. A missed pointerup left it extending the selection under a free cursor
  with `user-select:none` stuck across the whole document. It also now ignores touch pointers, so
  dragging to pan on a touchscreen scrolls instead of selecting — previously recorded as a
  limitation but not actually enforced.
- **Counts were computed before contention clamping,** so the chip could promise more cells than
  pressing the button would deliver, and a cell that had lost its only free column to a neighbour was
  drawn solid rather than dashed. Both now use the resolved rows.
- **Two transient body classes were serialized into exported copies.** `grid-cell-hover`
  (`cursor:cell`) and `grid-selecting` (`user-select:none`) were baked into a shareable copy exported
  mid-interaction, and the hover handler could never clear the class it started out believing was
  absent — so that copy opened with a cell cursor over the whole page, permanently. The clone strips
  them, and the handler seeds its state from the DOM.

### Unreleased — six fixes to batch expand, from an adversarial review of the shipped code

Design review and implementation review catch different classes of bug, so the batch-expand commit
was put through its own adversarial pass. Six real defects, none of which the browser verification
had surfaced:

- **Shift-click could select cells in a year block you never touched.** It extended over a DOM-index
  range from a document-order query — and document order is row-major across *all* year blocks,
  because one `<tr>` holds every block side by side. Shift-clicking down one column of 2026 therefore
  swept up everything in 2027 that sat between them in the DOM. It is now a spreadsheet-style
  **rectangle** computed from the two cells' own-slot boxes, the same membership test the marquee
  uses, which cannot leak into another block unless the drag genuinely spans it. Verified: a range in
  2026 selects 4 cells, not the 44 of 2027.
- **Enter could fire the batch *and* a focused button.** Enter and Space are the native activation
  keys for buttons, so the INPUT/TEXTAREA guard borrowed from the ⌘Z handler wasn't enough: with
  focus on Undo after a click, Enter did both. Those keys are now claimed only when nothing focusable
  holds focus.
- **The overlay query reached into `#print-root`.** Both print paths fill it with a *second* complete
  render carrying duplicate `data-week`/`data-pkey`, so a document-wide query returned every cell
  twice during an export. Scoped to `#table-wrap`.
- **Month view kept a stale toolbar button.** Switching views cleared the selection but never pushed
  the empty state through the bridge, so an enabled "Expand 3" survived for a selection that no
  longer existed.
- **An empty batch still dirtied the file.** A selection whose cells were all already at their limit
  wrote identical values back — both undo pushes correctly no-op'd, but `markDirty()` fired anyway,
  flagging unsaved changes for an edit that didn't happen. It now compares before writing.
- **A highlight survived loading a different calendar.** The overlay's prune only drops keys with no
  matching cell, and two calendars can share a week and phase key, so the highlight silently
  reappeared on unrelated cells of the newly opened file. `refreshAfterRestore` clears it.

### Unreleased — grid column order: the store and the reconciler (no gesture yet)

Step one of Feature 2 in [`GRID-DIRECT-MANIPULATION-PLAN.md`](GRID-DIRECT-MANIPULATION-PLAN.md),
authorised by an explicit owner ruling that grid **column order** may be user-overridable (recorded
in `HANDOFF.md`; it covers column order only, and nothing about a cell's appearance, its text
fitting or the width model). **There is no gesture yet** — this lands the model, the save format and
the tests, because getting either wrong underneath a drag is undiagnosable.

`gridColSwaps` stores a swap as **mutual pointers** — swapping A and B in week W writes both
`W|A → {with:'B'}` and `W|B → {with:'A'}` — keyed exactly like `cellSpans`, so `splitWeekKey` parses
it and `hiatusKeyStays` is already the right shift predicate. A pair applies only when both
directions resolve *and* both phases have a cell that week, so a shift that moves one phase and not
the other makes the swap cleanly evaporate instead of half-applying. `swapPairsForWeek` validates
the whole relation before building any pair (self-pointers, non-mutual entries and 3-cycles all
yield nothing for that week), and `applyColSwaps` runs at the end of `computeSchedule` exchanging
two cells' `col` values — so screen, Excel and both PDFs see one consistent schedule and cannot
disagree. Stale entries are **ignored, never deleted**, matching `applyCellSpanOverrides`' precedent:
deleting would let a temporary duration typo permanently destroy the user's column order.

**Why a transposition and not a position index.** A "seat" can only be implemented as rank-by-column,
but frozen `computeBlockLayout` orders slots by *first appearance in the block*, not by column value
— so with a legitimately reused column a seat model was measured moving a phase **the wrong way**,
with no error. Exchanging column values is direction-agnostic and immune to slot ordering.

**The load-bearing theorem is now a test, not a claim.**
`node tests/harness/prove-col-permutation.mjs` slices the **verbatim source** of
`computeBlockLayout` out of `src/legacy/app.js` and fuzzes it, so it cannot drift from the
implementation the way a hand-transcription would. Over 10,000 real permutations:
`blockSlotMaps` and its size never move. That matters because those slots are what the
`y<year>:s<slot>` colgroup keys — and therefore every hand-dragged column width — are stored
against, so a violation would be silent corruption of saved user work. The script also isolates the
**one documented exception**: `blockSimSlot` reads Production's column, so moving Production can move
the Simultaneous Post lane and change the column count. It measured 119 such cases, which is why the
plan refuses Production swaps in a SimPost block *and* why the validation gate must run on every
update rather than only when the gesture fires (a swap accepted while SimPost is off becomes a
column-count change the moment it is switched on).

New harness leg `colswap`, wired into `gate.sh`, proves the plumbing end to end through a **real**
app path: `HARNESS_STATE=<name>` now substitutes a fixture into the page's own
`<script id="saved-state">` block — the shareable-copy restore path — so a test can start from an
arbitrary saved calendar with **no debug hook in the app** and, deliberately, **no IndexedDB**, which
is what makes this leg trustworthy where the existing `restore` leg stalls under headless Chrome.
The fixture is a genuine capture reproducing the owner's screenshot, and the leg asserts the four
overlap weeks transpose, the weeks above keep their phase and slot, no cell is dropped or
duplicated, the colgroup key set is unmoved, and the phase columns still share one width.

⚠️ **One finding worth recording, caught by that leg.** Applying the swap changes the two weeks
*above* the overlap from one column to full width. That is not a bug: ending Prod Prep's slot-0 run
early (frozen `phaseRunBounds` bounds a run by occupant key, and slot 0's occupant changes at the
overlap) makes `freeForRun` newly succeed, so those weeks legitimately auto-span. It is
**collateral** — a layout change in weeks the user did not select, measured at ~25% of swaps — and
the owner has ruled it allowed when capped at one column and refused beyond that. It is also what
makes the result match the owner's screenshot, where those weeks *are* full width. The leg asserts
the cap rather than asserting the old value, which would have been asserting the feature is broken.

### Unreleased — expand a whole run of cells in one go

The first of the two features in [`GRID-DIRECT-MANIPULATION-PLAN.md`](GRID-DIRECT-MANIPULATION-PLAN.md).
Closing the gap beside a phase cell used to be one double-click or one edge-drag **per cell**. Now
you drag across a run of cells to highlight them — phase cells and per-phase hiatus bands alike,
across columns and year blocks — and **Expand** in the preview toolbar (or a double-click on any
highlighted cell) fills every one of them in a single step, each to its own row's limit. Again pulls
them all back. Shift-click extends, ⌘/Ctrl-click toggles, Esc clears, and **one undo reverses the
whole batch**.

**No frozen code was edited and no save-format surface was added.** `cellSpans` already carried
exactly the per-cell `{l,r,k}` a batch produces, so a batch is N of the writes it already accepts.
The highlight itself is deliberately *not* state: it lives in module-scope session vars, never in
`captureSnapshot()` — a highlight is not calendar data, and capturing it would bake one user's
selection into another user's file and add phantom undo steps. It needs no entry in `resetAll()`,
the Reset Notes & Hiatus branch, `applyStateSnapshot()` or `shiftCalendar()`'s re-key either: every
one of those paths ends in a render, and the overlay's redraw prunes retired keys against the live
DOM. That single cleanup mechanism is the whole reason the five-site checklist does not apply — noted
here because "completing" it later would reintroduce stale keys.

Things that had to be got right, each of which a simpler version gets wrong (all four were caught by
the plan's adversarial review before any code existed, and re-verified in the browser):

- **The apply gesture has to survive its own first click.** A plain "a bare click dismisses the
  selection" rule clears it on the *first* pointerup of the double-click, so the batch handler always
  bails and the single-cell handler fills exactly one cell — the batch would have been 100%
  unreachable. A bare click *inside* a live selection is therefore a no-op.
- **Cells are resolved geometrically, not from `e.target`.** The resize handles take pointer events
  and cover roughly 29% of a 77px cell — all of a hand-narrowed one — and in that band the frozen
  handle's own double-click runs instead and does the *opposite* thing. `document.elementsFromPoint`
  walks past them.
- **Uncommitted note text must not be destroyed.** The note editor commits on outside click via a
  document *bubble* listener, and `render()` discards an orphaned editor without committing it — so
  a capture-phase `stopPropagation` (the obvious way to stop the editor opening) silently loses
  whatever you had typed. Instead one line in the opener, which is not frozen, declines to open while
  letting the click bubble on so the commit still happens.
- **Per-row contention.** Two highlighted cells in the same week can both reach the same empty
  column. Writing both full claims stores a value the layout will never grant, and the loser's
  over-claim survives to resurrect later and move a cell nobody touched. Claims are now clamped
  left-to-right before writing, which is what makes "any state a batch can reach is reachable by N
  manual double-clicks" actually true.
- The marquee arms on a real drag threshold (10px, plus leaving the origin cell) rather than any
  1px drift, or a stationary double-click near a 20px row boundary would start selecting instead of
  filling. The overlay's `MutationObserver` watches `childList` **only, without `subtree`** — with
  `subtree` it would observe its own paint and hang the tab.

Verified in the browser on the build: a 4-cell sweep across two year blocks expands and pulls back
as one step; one ⌘Z reverses all four; a mixed selection of phase cells and per-phase hiatus bands
expands together; all-phase hiatus bands are structurally unselectable (no column of their own);
typing a note then ⌘-clicking a phase cell **commits** the note rather than losing it. The toolbar
button is present at first commit and hidden by `display` — never conditionally unmounted, per the
rule that cost Save As earlier — and its label is derived from bridged state rather than written as
`textContent`, which would destroy a Mantine Button's inner spans.
`cd tests/harness && HARNESS_PAGE=/dist/index.html ./gate.sh` is green on every leg including 0
console errors, a byte-identical waterfall PDF and identical Excel parts; the lone `restore` failure
is the known environmental IndexedDB stall.

### Unreleased — the per-phase hiatus toggle's own label is the name field

Simplification, requested right after the per-phase name field shipped: instead of a checkbox
labeled "Writer's Rm Hiatus" with a separate "Name" text box underneath, the checkbox's own
caption now *is* the editable name. `phaseHiatusBlockHtml()`'s `<label>` (checkbox + static
`<span>`) became two independent sibling controls — the checkbox and a `phiatus-name` text input
— so clicking the checkbox toggles and clicking the text edits, with no overlap between the two
(nesting the input inside the checkbox's `<label>` would have made clicking into it also toggle
the checkbox). Empty, it shows the same auto default ("Writer's Rm Hiatus") as a full-strength,
borderless placeholder — not a greyed-out empty box — so an unnamed hiatus still reads exactly
like the old static label at rest, and only reveals it's editable on hover/focus (styled after
the existing `.phase-name-input` pattern). The separate Name row inside `.phase-hiatus-fields` is
gone; that row is back to just Start date/Weeks.

Along the way, closed a small pre-existing gap: renaming a *built-in* phase never updated its
hiatus toggle's label live (only custom phases had that sync). Since the label is now the name
field's placeholder — more load-bearing than a static caption was — added the same live-sync
built-in phases were missing, plus a restore-time refresh (both built-in and custom) so reopening
a save with a renamed phase shows the right placeholder immediately rather than the stale
original name.

No save-format change — same `phiatus-name-<key>` id as before, still a plain `fields.byId`
field.

Verified in the browser: clicking the checkbox toggles without touching the text; clicking the
text focuses it without touching the checkbox; typing a name updates the band immediately; a
previously-set name from an earlier save/session restores into the merged field correctly;
clearing it falls back to the placeholder look; a custom phase's placeholder tracks its typed
name. `cd tests/harness && HARNESS_PAGE=/dist/index.html ./gate.sh` passes cleanly (only the
known IndexedDB restore-stall leg fails, as always).

### Unreleased — name a per-phase hiatus from the sidebar too

The all-phase hiatus naming built earlier only covered `#hiatus-list` rows — a per-phase hiatus
(the toggle inside each phase card, e.g. "Writer's Rm Hiatus") had no sidebar Name field, so it
could still only be renamed by clicking the band. Added one, reusing the same mechanism end to
end: `phaseHiatusBlockHtml()` gets a `phiatus-name-<key>` field (a singleton id'd input, so it
round-trips through `fields.byId` for free — no save-format change needed, unlike the all-phase
case), and `syncHiatusNamesFromSidebar()` now also walks every phase whose own hiatus toggle is
on, writing into the exact same `hiatusTexts`/`hiatusNameSyncedKeys` stores under the
`"week|phaseKey"` key shape a phase-hiatus band's click-to-rename and drag override already use —
so the shift re-keying and save/restore work that already existed for that key shape covered this
for free too.

Verified in the browser: naming a 2-week per-phase hiatus labels the un-overridden week while
leaving a previously hand-typed override on the other week untouched; clearing the name reverts
it; undo/redo round-trips it correctly; a shift carries both the hand-edit and the sidebar name to
their new weeks, and renaming again *after* the shift still updates the band (the exact case the
ownership-tracking design has to get right, or a rename would silently stop working post-shift).

### Unreleased — a per-phase hiatus band sizes and drags like any other phase cell

Reported as a layout bug: a phase's own hiatus band (e.g. "Writer's Rm Hiatus") was stuck at
exactly one column wide even in a block where that phase would normally span several, leaving
dead white space beside it. Root cause in `computePhaseRowLayout()`: a phase-hiatus segment was
hard-coded to `colspan:1` and carved out of the width-sharing math as a fixed reservation
(grouped with the Simultaneous Post marker) instead of computing its width the way an active
phase cell does.

Fixed by having a phase-hiatus segment count as one of the phases sharing the row and walk the
same `freeForRun`/`spanCap` logic a `phase` segment already does, inside the same (frozen, single
shared-source) function that feeds the screen, `exportExcel`, and `buildWaterfallPdf` alike — so
screen and both exports agree by construction, same as always.

Also added the double-click-to-fill and drag-to-resize affordance regular phase cells already
have. This came free: `installGridResizers`, `beginSpanDrag`, and both `dblclick` handlers are
already generic over any `.sheet-phase-cell` with the right `data-*` attributes, so giving a
phase-hiatus `<td>` that class and those attributes (own/lmin/rmax/a/b/nphases) was enough — none
of those four functions changed. `applyCellSpanOverrides()` needed one guard widened to accept
`phaseHiatus` segments as claimable, reusing the exact `weekIso|phaseKey` `cellSpans` key shape a
dragged phase cell already uses (no new store, no save-format change).

One real snag found during implementation: the drag system and the existing click-to-rename
popover both read a phase-hiatus cell's `data-week`, for two different purposes. The drag system
needs `data-week` + a separate `data-pkey` (the generic phase-cell contract); the rename system
needs them pre-combined as `"week|phase"` (the `hiatusTexts`/`hiatusColors`/`hiatusFontSize` key
shape). Resolved by making `data-week` plain (matching phase cells) and rebuilding the combined
key at the three places that need it — `openNoteEditor()`, `applyCellFitLive()`, and the
cell-switch re-locate lookup (which also gained a `data-pkey` match, so two phases hiatused the
same week can no longer collide on a bare date match).

Verified in the browser: a hiatus band now matches a concurrent regular phase cell's width
exactly in the same row (both capped or both full-width, depending on what else shares the row);
double-click fills/un-fills it; a manual drag persists and un-does correctly; the click-to-rename
popover and per-band font size still work; an ordinary phase cell's own width and drag behavior
are unchanged. `cd tests/harness && HARNESS_PAGE=/dist/index.html ./gate.sh` passes every
frozen-surface check — the existing fixture doesn't exercise a multi-column per-phase-hiatus
scenario, so that leg proves nothing broke elsewhere rather than proving the new behavior itself;
the browser checks above are what prove that.

### Unreleased — the header toolbar and its two buttons read as real Mantine, not an approximation

- **"Reset Notes & Hiatus" and the header mode toggle now match a real Mantine
  `<Button variant="default" size="xs">` exactly** (Header.jsx's New/Save/Reset All), measured
  live rather than guessed: 30px height, 0 14px padding, gray-4 border, "default" radius,
  font-weight 500, black ink. They previously matched the *smaller* `.hf-ctl` toolbar-control
  look (22px) instead. Along the way, found and deleted a pre-Mantine leftover CSS block for the
  same two buttons that was silently winning by source order at equal ID specificity — the same
  shape as the `button.primary`/`.secondary` cleanup on 29 Aug 2026 — which is also why the
  month-view mode button looked different from its waterfall twin (the old block never covered
  it).
- **The mode toggle now just reads "Header: Manual" / "Header: Auto"** — dropped the
  "— Switch to Auto/Manual" half, which was redundant with the button's own filled/outline state.
- **The formatting toolbar no longer hugs the header bar below it** — added a small gap
  (`margin-bottom`) between `.hdr-tools` and `.cal-header-bar`.
- **Fixed an incidental finding**: `#print-root .mv-tools` was hidden for print, but the
  waterfall's equivalent `.hdr-tools` had no matching rule — so the print-fallback waterfall PDF
  (`WF_PDF_MODE:'print'`, not the default direct writer) would have printed the Bold/Italic/Reset
  toolbar across the top of the sheet. Added `#print-root .hdr-tools{ display:none !important; }`
  to match.

### Unreleased — name an all-phase hiatus from the sidebar

Backlog №6, deferred to the owner because it changes the save format — now built. Each all-phase
hiatus row (`#hiatus-list`) gets a **Name** field. A non-blank name becomes the default label on
every week that hiatus covers — on the waterfall, the month view, and in both Excel and PDF exports
— by writing into the same `hiatusTexts` override store a click-to-rename edit on the band already
uses (`hiatusTextFor()`), so no frozen render or export function was touched.

Clicking a band directly and typing something else still wins over the sidebar name for that one
week: a new `hiatusNameSyncedKeys` map tracks which weeks the sidebar sync currently owns, and only
ever touches a week it still owns. Ownership survives a shift (`shiftCalendar` re-keys it alongside
`hiatusTexts`) and a save/reload (`hiatusNameSyncedKeys` is now part of `captureSnapshot()` /
`applyStateSnapshot()`, append-only — an old save with no `fields.hiatuses[].name` restores exactly
as it did before).

Verified in the browser: naming a 2-week hiatus labels both weeks; hand-editing one week's band and
then renaming the hiatus again updates only the untouched week; clearing the name reverts owned
weeks to the default "Hiatus" label; the name shows correctly in Month view. `cd tests/harness &&
HARNESS_PAGE=/dist/index.html ./gate.sh` passes every frozen-surface check (waterfall PDF and Excel
parts byte-identical to baseline, 0 clipped cells) — the one FAIL (`restore`) is the pre-existing
IndexedDB/headless-Chrome stall (HANDOFF.md), reproduced identically on the untouched `/index.html`.

### Unreleased — drop the current-line readout from the header toolbar

The small text at the end of the toolbar naming the line you were editing ("title", "stat 1", or
"click a header line") is gone at the owner's request. The dimming already communicates "pick a
line first" — the controls sit at 45% and inert until one is clicked — and every control keeps its
own `title`, so the words were carrying nothing the state wasn't already carrying. The bar is
228px instead of 361px.

`hdrFmtLabel()` and the `.hf-target` rules were removed with it rather than left to rot; verified
zero references remain in the source or the build. The dimming behaviour is unchanged: 0.45 before
a line is picked, 1 after, and formatting still applies.

### Unreleased — the header toolbar: highlight hugs its text, and the bar is one Mantine row

- **Highlight now covers the text, not the whole column.** `.hdr-line` is a block filling its
  column, so a background on it painted a full-width band. The line now shrinks to `fit-content`
  when it has a highlight and is re-positioned with auto margins, so it stays where its column
  puts it. Measured on the title: **807px → 104px** around 96px of text, and it **tracks as you
  type** — 104 → 305 on a longer title, → 37 on a short one. Applied only when a highlight is set:
  without one, a full-width line is a bigger target for putting the caret in, and that is worth
  keeping.
- **"Reset Notes & Hiatus" is back beside the mode button.** Adding the toolbar made the strip
  `space-between` with three children, which stranded Reset alone in the middle of the bar. Now
  `flex-end` with the toolbar taking `margin-right:auto`, so it is toolbar-left, the two engine
  buttons grouped right. (The button's *behaviour* was never broken — verified the handler fires
  and rebuilds the grid.)
- **The whole strip is Mantine-styled.** `#notes-reset-btn`, `#hdr-mode-btn` and `#mv-hdr-mode-btn`
  are engine-rendered bare `<button>`s that never picked up the chrome's look. They now match
  `.hf-ctl` exactly — same 22px height, radius, border and hover — so the row reads as one set of
  controls. Manual mode renders as a filled edit-accent chip, because it is a *state* rather than
  an action.
- **The three alignment arrows became one dropdown with ragged-rule icons.** An arrow says "move
  it that way", which is what the Shift tools do; ragged rules say "this is how the text sits".
  Drawn as SVG rather than taken from a font — no dependable unicode glyph exists for these, and a
  native `<select>` cannot show an icon at all, which is why it is a button plus a small menu. The
  toggle wears the line's current alignment, so the toolbar answers "how is this set?" without
  being opened; picking the alignment a line already has clears the override.

Gate re-run: waterfall PDF and Excel parts still byte-identical to baseline.

### Unreleased — three fixes to the header formatting toolbar

Reported straight after it shipped, all three real:

- **The size dropdown could never open.** A `mousedown` `preventDefault` covering the whole
  toolbar — there to stop the edited line losing its caret when a button is pressed — also
  suppresses the native `<select>` popup in Chromium. That is the same behaviour `SelectPop`
  exploits deliberately (`HANDOFF.md` row 30), used here by accident. It is now scoped to
  `.hf-btn` only: buttons keep the caret, native controls keep their own behaviour. Verified:
  mousedown is `defaultPrevented` on a button and **not** on the select.
- **The size selector sat on its own full-width line above everything else.** A `<select>` has no
  intrinsic width, and the bar was `flex:1` with wrapping, so it expanded to the whole strip
  (measured: 260px) and pushed every other control onto a second row. Now `flex:none` on every
  control, an explicit 64px on the select, and no wrapping. Measured at 1600px: the strip is
  **26px tall instead of 52**, with the toolbar leftmost and the mode button hard right, on one line.
- **Bold did nothing on the main title.** The title is `font-weight:700` by default, and the code
  dropped falsy values — so `bold:false` was thrown away and `bold:true` changed nothing visible.
  `bold`/`italic` are now tri-state (unset = inherit, `true` = force on, `false` = force off), and
  the toggle reads the line's **computed** weight so it knows a line the stylesheet already
  bolded. Verified: 700 → 400 → 700 with the button state tracking.

Gate re-run after the fixes: waterfall PDF and Excel parts still byte-identical to baseline.

### Unreleased — header text formatting, and two more header lines

A formatting toolbar at the top-left of the header strip — opposite the mode button — with **text
size, bold, italic, text colour, highlight and alignment**. It appears **only in manual mode**
(in auto mode the lines mirror the inputs and cannot be edited, so the controls would be offering
something impossible), and it works on both the **waterfall** and **month** headers, which keep
their own independent formatting exactly as they already keep independent text.

**The header grew from 7 lines to 9**: `l2` (middle left, under the date) and `c4` (middle bottom,
under the subtitles). They have no auto value, so they are **hidden until used** — `.hdr-line`
carries `min-height:14px`, and leaving them visible-but-empty would have added 28px to every
header for people who never touch them.

**Formatting is real everywhere — screen, Excel and PDF.** That is why this needed
owner-approved edits to four frozen functions (`renderSpreadsheetView`, `renderMonthView`,
`exportExcel`, `buildWaterfallPdf`). It is per **line**, not per selection, because Excel's
header/footer and the PDF writer both format per section rather than per run of characters —
inline markup would have produced a screen the exports could not reproduce.

Three things worth knowing:

- **Excel's `&B`/`&I` are toggles, not setters**, so per-line codes would have leaked into every
  following line. Each line instead states its style outright via the absolute
  `&"Calibri,<style>"` form, and resets colour explicitly — verified in a real export, where line
  2 correctly comes back to `&12&"Calibri,Bold"&K000000`.
- **Formatting costs Excel header budget.** The 255-character cap is unchanged, and codes count
  against it, so a heavily formatted header drops trailing detail lines sooner. Measured on a
  formatted 9-line header: 238 characters, inside the limit, with the existing trimmer dropping
  the last four lines exactly as it does for an over-long unformatted one.
- **Italic in the PDF is synthetic.** Only regular and bold Carlito are embedded, so italic is a
  text-matrix shear — which is how a viewer fakes a missing italic, costs no third font, and does
  not change advance widths, so every existing measurement stays valid.

**One honest gap: highlight cannot reach Excel.** An Excel header/footer has no text-background
code at all. Highlight applies on screen and in the PDF; in the workbook the line keeps its
colour and weight but no background.

**Verified.** `gate.sh` returns **byte-identical** results to the pre-change run — waterfall PDF
identical to baseline, Excel parts identical, 0 clipped cells, grid width 797, 52 rows, no console
errors — because an unformatted header emits exactly the operators and the exact header string it
emitted before. Then with formatting applied: the Excel `oddHeader` carries the codes and the new
`l2` line; the PDF draws **all nine** lines with the right font, size, colour, oblique and a
highlight rect.

### Unreleased — the remove buttons showed two × instead of one

Three buttons — remove custom phase, remove hiatus, delete custom holiday — rendered **`××`**.

The design is sound: the engine emits a `&times;` text character, `font-size:0` hides it, and a
`::before` paints the × as masked geometry so it centres exactly (a text `&times;` sits on a
baseline and never does). Two later rules broke it by re-setting `font-size` on the same elements,
un-hiding the text so it sat beside the drawn glyph:

- `.custom-phase-header .icon-btn{font-size:14px}` — **wins on specificity** (0,2,0 vs 0,1,0)
- `.hv-del{font-size:13px}` — **wins on source order** (same 0,1,0, declared later)

Both `font-size` declarations removed; the geometry they also set is kept. **This is the third time
this exact trap has cost this project time** — `button.primary` over `.tb-btn` was the first
(PROJECT-CONTEXT §12). The rule worth remembering: *when one rule hides text so a pseudo-element
can replace it, nothing later or more specific may set `font-size` on that element.* Both fixes
carry a comment saying so.

Verified on the build: all three buttons compute `font-size: 0px` with a mask present, and render
exactly one glyph.

### Unreleased — descriptions became hover cards, and the fake drag handle is gone

**The six-dot grab handle on custom phase rows is removed.** It was added 29 Aug as a visual-only
placeholder and it promised drag-to-reorder that does not exist — with `cursor:grab` making the
promise twice. An affordance for an unbuilt feature is a bug, not a preview. If reordering is ever
built (it is save-format territory: `customPhaseDefs` order, `PHASE_CHAIN`) the handle comes back
*with* the behaviour. Verified: 0 elements with `cursor:grab`, no CSS rule mentioning it, and the
`::before` resolves to `content: none`.

**Every always-visible description is now a Mantine `HoverCard` behind a small grey "i".** Eight of
them — Production Region, Holidays, Export App With Data, All-phase hiatus, and the four calendar
tools (Shift All, Shift From, Anchor To, Rebuild From). The copy is unchanged word for word; only
*when* you see it changed. The cards were reading as documentation rather than controls, and the
paragraphs cost the sidebar most of its vertical space.

- **Descriptions only.** `#union-lock-hint`, `#custom-hol-err` and `.snap-note` stay visible —
  hiding "Locked — changing the Region would misplace your edits" behind a hover would be a real
  regression, since those appear precisely when something needs attention and attention is the one
  thing a hover doesn't get. `UI-CONVENTIONS.md` §4 had already separated explanation from warning;
  this takes only the explanation.
- **No new Mantine CSS import**, which matters because that list's order is derived from Mantine's
  own `styles.layer.css` and must never be sorted. `HoverCard` is built *on* `Popover` (it uses
  `PopoverStylesNames`/`PopoverCssVariables`), and `Popover.layer.css` was already imported.
- **`position="right"`**, not `top`: every hint sits near the top of the window, so opening upward
  put the card over the header. Right opens into the preview pane — the one direction with room —
  and Mantine's middlewares flip it when there isn't.
- **`zIndex={400}`**, not the default 300: `.tools-menu` is *also* 300, and four hints live inside
  those popovers. Equal z-index left the winner to DOM order, which favours the portal today and
  would silently stop doing so after any reorder — a hint rendering behind the thing it explains.
- The trigger is a real `<button>` so it is keyboard-reachable (HoverCard opens on focus too), and
  it carries no `id` — transient chrome never does in this codebase.

Verified in a real browser on the build: 8 hints, all `<button type="button">`, all focusable, all
`aria-label`led, none with an id; all eight descriptions' copy present verbatim; 0 leftover
`.tools-hint` or `.placeholder-note`; the Region hint opens to the right with the full original
sentence; the nested Shift From hint opens inside its popover at z-index 400 with the right text.

### Unreleased — the deploy Action, and the check script that never existed

> ✅ **Installed and live (31 Aug 2026).** Pages Source is **GitHub Actions**, and this workflow
> builds `src/` and publishes `dist/index.html`. **The Mantine build is now what users get.** The
> root `index.html` stays in the repo as the v1.2.0 legacy app — it is the rollback: flipping Pages
> Source back to "Deploy from a branch" restores it instantly, with no revert and no rebuild.

**`.github/workflows/deploy.yml`** — builds `src/` and, on request, publishes `dist/` to Pages.
This is the item `HANDOFF.md` listed as *"then the GitHub Action, and only then the cutover
conversation"*, and it is built to respect that order:

- **`build` runs on every push and PR.** `npm ci` → `npm run build` → `npm run check` →
  `tools/check-refs.py` (warn-only), then uploads `dist/index.html` as a downloadable artifact.
  Continuous verification with **zero deploy risk**.
- **`deploy` runs only on a manual `workflow_dispatch` with `deploy=true`.** Never on push.

**The live site is unchanged and stays on the v1.2.0 legacy app.** Pages is still
`build_type: legacy` serving repo root, exactly as `vite.config.js` requires until an
owner-approved cutover. Performing that cutover needs a repo **settings** change (Pages Source →
GitHub Actions) that the workflow deliberately cannot do for you — until it is done, a
`deploy=true` run fails at *Setup Pages*, which is the intended guard. The three cutover steps are
written at the top of the workflow file.

**`tools/check-build.mjs`** — written, because it did not exist. `package.json` has referenced it
since the Vite build landed and `vite.config.js` names it (*"asserts it survives the build; do not
delete that check"*), so `npm run check` had been failing with `MODULE_NOT_FOUND` and **nothing was
ever actually asserted**. It now gates 12 properties: one self-contained file with a size floor, no
unexpected external requests (the ExcelJS CDN is the only allowance), no un-inlined local assets,
`#table-wrap` and `#print-root` intact, the NUL sentinel, the Mantine chrome, the `.sptcal` format,
the ExcelJS loader, and `version.json` in step with `package.json`. Passes 12/12.

> **The NUL sentinel check is deliberately not a byte check, and that matters.** `SIM_KEY` is a NUL
> followed by `simpost`. Measured: the legacy `index.html` carries **1 literal NUL byte**, the build
> carries **0** — the minifier re-encodes it as a `\0` / `\u0000` escape. That is semantically
> identical and correct, so the check asserts a NUL-valued sentinel survives *in some form*. The
> obvious byte-level assertion `vite.config.js` implies would have false-failed on every single
> build, which is very likely why the file was easier to leave unwritten than to finish.

Also fixed: the `deploy` job copies `version.json` into `dist/` before publishing. The app polls it
*relative to itself*; it lives at the repo root, so publishing `dist/` alone would 404 that poll and
the update banner could never fire.

### Unreleased — the documentation sweep after rounds 5–7

⚠️ **Not deployed and not cut as a version. No app code changed.** Every project document was
audited against the repo as it actually stands and corrected. This is bookkeeping only in the sense
that no user sees it; three rounds of building had left the docs describing a program that no longer
exists, and several of them would have sent the next session to build something already built — or
to build it the wrong way.

**The corrections that mattered most:**

- **Two docs prescribed designs that were tried and rejected.** `UI-CONVENTIONS.md` §7 called for an
  `AppShell` and an overflow menu in the header; `AppShell` *cannot* be used (a React root that wraps
  the app breaks both print paths) and the overflow menu solved a problem the header never had — it
  was truncating labels, not wrapping. `MANTINE-MIGRATION.md` promised that four hand-rolled popovers
  would collapse into one library call; Mantine's `Popover` is disqualified here on two independently
  fatal grounds. Both now carry what was built and why the original was wrong, rather than being
  quietly deleted.
- **The layer fence was documented inverted** in two places — the app's stylesheet goes *last* and
  unlayered, not fenced into a layer — and the per-component import order is now recorded as
  derived-never-alphabetical, with the failure it caused.
- **Three docs still described the restore-test stall as flaky-under-load** and told the reader to
  re-run it standalone. That advice is a trap: the harness defaults to the *deployed* page, so the
  standalone run tests a different program and passes. All three now carry the measured cause.
- **`CLAUDE.md` gained the patterns that unblocked two "impossible" requests** — how to change frozen
  *behaviour* without editing frozen code, with the preconditions that make each one safe.
- **Corrected throughout:** the reading order, the claim that there is no build system or test runner,
  which font is embedded for which reason (Carlito feeds the frozen width model; Inter is chrome
  only), the `buildSavedHtml()` strip list, and the §2h bug status in the three docs that still
  called it open.

**And the line-number checker got its own hole closed.** `tools/check-refs.py` exists to keep line
numbers out of prose — and the audit found three sitting in prose while it reported CLEAN, because
every pattern it had required a backticked symbol next to the number, and these were written as bare
English instead — the word "line" followed by a number, with no symbol beside it.
Two of the three were also already wrong, which is the entire argument for the rule. The checker now
catches the bare English form, regression-tested against both the text that fooled it and the
legitimate numbers it must not fire on.

### Unreleased — round 7: the backlog cleared, and the app stopped phoning home

⚠️ **Not deployed and not cut as a version.** The owner's seventh round plus the buildable half of
the standing backlog (HANDOFF §2b-3 rows 3, 4, 6, 7, 40–46).

**Three bugs, one of which was losing work:**

- **The date pickers no longer destroy the edit.** Opening the pop-out calendar from *Shift From*,
  *Anchor To* or *Rebuild From* and clicking a day closed the tool popover underneath it — the
  panel is a body-level element, so the click read as "outside". The popover now survives, and
  Escape closes the picker first and the panel second instead of both at once.
- **Undo and redo are actually centred.** Round 4 fixed a text-glyph baseline; the real problem was
  that the drawn arrows sat low *inside their own viewBox* (ink centre 10.75 on a 16 box). Redrawn
  symmetrically — measured ink centre is now exactly 8.0.
- **The title's padding is even** — 28px on both sides, measured; it was 28 left and 6 right.

**The header works at every screen size.** It never overflowed or wrapped — the buttons *shrank*,
so at 1100px the labels read "Expor", "Exp", "Rese". Now no label is ever truncated: controls hold
their natural width, and space is given up in deliberate steps as the window narrows (the file chip
shrinks, then the brand name goes, then New / Save As / the secondary export become icons with
tooltips, then the status text). Save and the primary export keep their labels at every width.
Verified at 1440, 1280, 1150, 1024 and 900.

**Two long-standing backlog items, both built without touching frozen code** — which is the part
worth recording, because both were previously blocked *on* needing a frozen edit:

- **A bad start date now rings its field red**, not just the note underneath. The ring is applied
  from `update()` to the sidebar field, and asks the frozen validity function for the verdict
  rather than copying its rule.
- **The last 8 browser `alert()` popups are gone**, so every dialog in the app is now the app's
  own. They live inside the frozen export functions, so instead of editing them a function named
  `alert` is declared in the engine's own scope and shadows the global — every call site converts,
  no frozen line changes.

**And the app no longer fetches anything from the internet.** Inter is embedded (one variable font,
48 KB, replacing four downloads), so a calendar opened offline or from an emailed file measures
text exactly as it does online — which matters because those measurements set month-view row
heights that print. Verified: text widths at all four weights are *identical* to the fonts Google
was serving, and the built file makes zero external requests. Mantine's stylesheet also went
per-component, so despite adding a font the file **shrank from 1,096 KB to 983 KB**.

**One test-harness limitation found and documented, not papered over:** the gate's restore leg
fails in headless Chrome because `indexedDB.open()` there never settles — no success, no error, it
simply hangs — so the file menu is never revealed and the test times out. It behaves **identically
against the untouched deployed app**, which is what proves it is the environment and not this
work. The earlier advice to "re-run it standalone" turned out to be a trap: the harness defaults to
the *deployed* page, so a standalone pass says nothing about the build. Both facts are now written
down, with the probe that measured them.

**Fixed while verifying:** exporting a shareable copy while a notice strip was showing baked that
strip into the copy — a recipient saw a permanent banner naming someone else's file. And the test
gate's two most valuable checks (the byte-comparisons proving the frozen PDF and Excel writers
haven't moved) had been failing on every run since the baseline was cut, purely because both files
stamp today's date; they now normalise that one token and compare everything else strictly, so a
red there means something real again.

### Unreleased — round 6: fit and finish, and the note editors join the family

⚠️ **Not deployed and not cut as a version.** The owner's sixth review round (HANDOFF §2b-3
rows 34–39), plus the first slice of the standing backlog. The five fixes:

- **New / Save / Save As are equal at the longest button's own size** — a grid wrapper whose
  `1fr` auto-columns all size to the largest content (Save As defines the set at its natural
  padding), replacing round 5's hardcoded 104px. Measured 86/86/86.
- **The file chip trimmed 20%** (280 → 224; the dropdown stays 280).
- **The holiday table's header stopped colliding** — the three note columns widened to 46/46/44
  (header and row cells in lockstep) and the uppercase tracking came off the cell labels;
  "W'FALL NOTE" and "MONTH NOTE" now read as two columns instead of one jam.
- **The "Complete Show Info" warning reads as a sentence again.** The chip was `display:flex`,
  which turns the message's text-plus-`<strong>` into three independently-wrapping anonymous
  flex items — the odd columns in the owner's screenshot. Block layout with the glyph absolutely
  positioned fixes both of the engine's messages with no engine change.
- **The shift readout lands under the button that acted** — `runShift` stamps the direction on
  the group and CSS anchors "1 wk earlier" under ← and "1 wk later" under →. Verified by
  geometry both ways.

And from the backlog, **the note-popover stage (§9.5, ruled in scope) landed its core**: both
note editors wear the app's one overlay look (the file-menu/date-picker shell, token type,
chevroned Day/Size selects, 16px swatches with the primary-colored selected ring), and the
month-view editor's live bug is fixed — it now tracks its anchor on scroll and resize like its
waterfall twin, and a MutationObserver on `#table-wrap` gives it the twin's rebuild protection
*without* touching frozen `render()` (where the twin's guard lives): a rebuild re-finds the
equivalent anchor and follows it, or closes without saving. Verified live: a resize re-glues the
popover at 4px; a sidebar edit that rebuilt the grid under an open editor re-anchored it. The
note's rendered size, wrapping and shrink behaviour back in the cell are untouched — the frozen
gate run confirms it.

### Unreleased — round 5: Load, the loader-look pickers, and one icon everywhere

⚠️ **Not deployed and not cut as a version.** The owner's fifth review round, logged item by item
in HANDOFF §2b-3's master list (rows 27–33) and built the same day. What a user notices:

- **The dialogs breathe.** The app's own warning dialogs were rendering with 8px of side padding —
  `Modal` pads with the `md` *spacing* token, and the chrome's density scale redefines `md` from
  16px down to 8px, silently halving every modal's padding. Fixed once, in the theme's
  `Modal.defaultProps` (`padding:'xxl'` = 20px). Measured 8 → 20px.
- **"Open" became "Load" everywhere a user reads it** — the file-menu item, the dirty-work
  confirm ("Load another calendar?"), the permission and error alerts, the legacy-notice strip,
  and the help guide — completing the round-3 terminology rule (saving = write `.sptcal`, loading
  = open a file into the PWA). Identifiers and the `data-action="open"` engine contract
  deliberately did not change. The help's Save paragraph also stopped claiming Save writes a full
  copy of the tool — that has been `.sptcal` since v1.1.0.
- **The tool popovers' pickers look like the loader.** The phase pickers under Shift From /
  Anchor To / Rebuild From (and Anchor To's starts-on/ends-by) no longer open the OS select popup:
  `SelectPop.jsx` overlays the native selects with the file menu's look — white panel, accented
  current row, dimmed right-aligned dates. The native `<select>`s stay exactly as they were
  (`fillPhaseSelect` still owns their options; handlers still read `.value`; write-back is the
  native setter + real events — verified by watching a pick move the anchor date, and by a full
  Anchor To run through a picked phase). The panel deliberately lives *inside* `.tools-menu`: the
  engine closes all tool popovers on any click outside them, so a body-level panel would shut the
  popover on every pick.
- **The header settled.** The file chip is a fixed 280px (shows much of a real title, never
  resizes), "Save As…" lost its ellipsis (in the chrome *and* in `flashSaveBtn`'s restore string,
  which would have flashed it back), and New / Save / Save As share one 104px min-width.
- **One icon, everywhere.** The header brand mark now *is* the favicon — the red calendar tile —
  and both are instances of one source (`src/chrome/appIcon.js`); the head links carry
  placeholders that main.jsx fills at startup. The installed-PWA manifest icons and the red
  `theme-color` stay as they were, flagged as their own decision.
- **The help guide animates in** (fade + rise, 0.22s) — keyframes on the existing `.open` class,
  since a transition cannot fire across display:none; reduced-motion honoured.
- **More air between the sidebar fields** — the card stacks moved from 8px gaps to 16px.

Verified in the dev server and in the built `dist/index.html` (zero console errors; `--header-h`
unchanged at 63px; Escape closes the picker first and the popover second). **Full gate PASSED**
against `tests/baselines/2026-08-29-stage-7`: 0 horizontally clipped cells, waterfall PDF
byte-identical, every Excel part identical, `v1.0.0-saved.html` restoring to 52 rows / 154 cells /
324 pt with `fields.byId` identical at 56 ids. (One gate run first FAILED on the restore leg's
documented IndexedDB stall — it passed standalone and on a quieter re-run, exactly per the
HANDOFF §2b-3 diagnosis note.)

### Unreleased — round 4: the app's own dialogs, and the polish pass on the polish

⚠️ **Not deployed and not cut as a version.** What a user notices most: **the browser-chrome
popups are gone.** "Start a new blank calendar?", Reset All, removing a phase / hiatus / custom
holiday, the holiday-reset and recompute warnings, and recovery prompts are now the app's own
Mantine dialogs — titled, centred, with the destructive action as a red filled button, and Escape
or clicking outside always answering the safe way. Error alerts in the save/open/share/export
handlers follow. Under the hood the bridge's `dialog` entry deliberately falls back to the NATIVE
dialogs if the chrome ever fails to mount — a silent auto-confirm on a destructive action being
the one unacceptable failure. ⚠️ Eight `alert()` calls remain native on purpose: they live inside
the frozen export functions, and converting them is a frozen edit that needs its own ruling.

Also in this round, from the owner's screenshots: the episode warning chip got real padding and
line-height; **holiday rows split name and date onto two lines** (date smaller and lighter); phase
chips got more side padding; and the remove × plus undo/redo glyphs are now geometrically centred
— the × is drawn (a mask over `currentColor`, so the red hover still works) instead of a text
glyph that sat on a baseline. HANDOFF §2b-3 now carries the reconciled **master list** of every
request in the redesign arc with per-item status.

### Unreleased — round 3: chips crowned, warnings diegetic, terminology settled

⚠️ **Not deployed and not cut as a version.** The owner's third review round, itemised in
HANDOFF §2b-3 and built the same day. What a user notices: every phase chip is crowned by its
**color bar** (the full-width clickable strip is the same color changer, conforming to the chip's
corner radius) with a visual grab handle beside the name (reordering itself is deliberately not
built — it is save-format territory); the production episode warning reads as a real warning with
a drawn glyph on the amber tuple; the phase date/duration readout sits on **two rows**; remove ×
buttons centre their glyph and go red on hover; undo/redo wear drawn glyphs; the tool popovers'
phase pickers wear Mantine's chevron; **"Autosave needs a file" shows as the red badge**; the file
menu searches "**loaded** files" (new house terminology: *saving* writes a `.sptcal` locally,
*loading* opens a `.sptcal`/`.html` into the PWA); and sharing a copy moved to **Settings ▸ App ▸
Export App With Data**. Under the hood: a 600 ms accidental-retrigger guard on New / Save As /
Share / both exports, and label/text-size parity rules so Show, Settings and Phases cannot drift.

⚠️ **One line of this round is the project's first deliberate frozen-function edit**, made at the
owner's direction: the two-row readout changes one separator (` · ` → newline) inside `render()`'s
meta branch. `meta-<key>` is a write-only sidebar element no export reads, and the full gate —
waterfall PDF byte-identical, Excel parts identical, v1.0.0 restore, 56 ids — passed after it.
Also answered this round: the export filename convention is untouched, and the all-phase hiatus
never had a sidebar name field (band labels are edited on the band itself, in the calendar).

### Unreleased — the visual redesign rounds: header, navbar, blocks, split control, date pickers

⚠️ **Not deployed and not cut as a version** — same standing as the entries below. Everything here
was driven live by the owner across three review rounds on 29 Aug 2026, each verified against the
full gate before the next round started (waterfall PDF byte-identical, Excel parts identical, the
v1.0.0 fixture restoring to 52 rows / 154 cells, `fields.byId` at 56 ids, 0 clipped cells).

**The design direction, settled by iteration.** A DoubleNavbar icon rail was built to the
ui.mantine.dev reference, reviewed, and **reverted** on the owner's verdict — the horizontal
icon+label tabs won, on a white sidebar panel that now fills to the bottom of the viewport. What
stayed from that round: the thicker header (51→63px — safe because `--header-h` is measured, not
assumed) led by an **"SPT Planning Calendar"** brand mark, iconed buttons throughout (hand-drawn
inline geometry, no icon package), the right-aligned export pair with the filled **Export PDF** at
the row's end, a red-text Reset All isolated past a divider, and press/caret micro-animations
adapted from the ui.mantine.dev buttons category.

**The owner's seven-point adjustment round, all landed:** Install-as-app above the switchers; Show
info / Region / Holidays content in the **same bounded white blocks as the phase rows** (one shared
`.side-block` recipe); no more pure black — `theme.black` is the warm `#1E1D1B` the app's own scale
tops out at, and input text dropped to 12px in the 30px box (the "Reset All ratio"); Waterfall and
Month segments equal width and centred; **Shift All rebuilt as a joined split control** at the
toolbar's shared height whose centre *is* the dropdown trigger; breathing room before the save
status; one rhythm for the file menu.

**The pop-out date pickers** (owner-selected feature): every sidebar and tool-popover date field
opens a Mantine-styled calendar — the **Monday-snap week band** made visible before the click
(hover previews the week, the Monday is capped), enabled union holidays dotted red and all-phase
hiatus weeks dotted amber ("mark, never exclude"), single-day mode for the custom-holiday field.
Hand-rolled deliberately: Mantine's DateInput is controlled and would silently break restore
(UI-CONVENTIONS §2c); this popover instead writes through the native setter exactly like a
keystroke, carries no ids anywhere, gets its marker data pushed through the bridge
(`chrome.dateContext`), and is stripped from shareable copies by class.

**File menu restructured:** Open… pinned to the top, an id-less search box under it (deliberately
NOT a Mantine input — those mint random ids that would leak into every saved file), only the
recents list scrolls, and **"Export shareable copy" split out of the menu** to its own
document-delegated button.

**Two fixes along the way:** the two dead-listener conditional-render bugs (Save As…, Export
Waterfall to PDF) documented in the entry below were fixed at the start of this arc, and the
engine's export-button labels were shortened at their push site with the icon following the
engine's `primary` flag so the Month-view button truthfully shows a download glyph.

**Verified but worth restating:** the export filename convention is untouched — the workbook still
saves as `<Show Title> Planning Calendar.xlsx`; only button labels changed.

### Unreleased — the engine-generated sidebar rows: restyled to spec, deliberately not rebuilt

⚠️ **Not deployed and not cut as a version** — same standing as the entry below; the root
`index.html` and the live site are still v1.2.0.

**The decision first, because it shapes everything after it.** The phase rows, per-phase hiatus
blocks, all-phase hiatus rows, episode rows and the holiday list are generated by the engine as
HTML strings, and those generators mint the element ids that ARE the save-file format. Asked
whether to rebuild them as React components or restyle them in place, the owner chose **restyle to
spec** (29 Aug 2026, the recommended option). The deciding finding: the settled uncontrolled-input
rule means a React rebuild renders the same native inputs CSS already styles — near-zero visual
gain — while the restore path (`applyStateSnapshot` rebuilds rows, re-keys ids and writes values
in one synchronous tick) and undo/redo would sit squarely in the blast radius, and the acceptance
gate covers none of the custom-phase path a rebuild most endangers.

**What changed for a user:** the last visibly-legacy controls now match the Mantine chrome. Every
sidebar checkbox (hiatus locks, per-phase hiatus toggles, holiday enable/note boxes, sim-post) is
drawn as Mantine's Checkbox — primary fill, white check — instead of a native accent box; native
number-spinner arrows are gone (every count is typed, not stepped); the holiday rows dropped ~7
inline style declarations each for one stylesheet block in the ui.mantine.dev table idiom; the
episode inputs lost their private second input size; the "+ Add phase" / "+ Add hiatus period"
buttons stopped being beaten by a leftover legacy rule that had silently outranked their Mantine
restyle the whole time; the × remove buttons stopped rendering their glyph in Arial; and the last
IBM Plex Mono references went — the readouts now use the system mono stack and the Google Fonts
request is Inter-only.

**Two real bugs fixed in the Mantine build, both the same shape:** `Save As…` and
`Export Waterfall to PDF` were rendered *conditionally* by React, but the engine captures both by
`getElementById` at evaluation time and binds their click listeners through that capture. Save As
started invisible, so its capture was null and the button appeared later fully dead; the export
button started visible, so it worked — until one Month↔Waterfall round-trip remounted a new node
and orphaned the listener. Both are now always rendered with visibility carried by
`display`, the same rule `#file-menu-wrap` already documented. Verified in a real browser: the
export button is the identical node after a round-trip, and Save As is present at load.

**What was verified** (all against the built `dist/index.html`): the full gate passes — waterfall
PDF byte-identical, Excel parts identical, 0 horizontally clipped cells, the real v1.0.0 calendar
restoring to 52 rows / 154 cells / 324 pt with `fields.byId` unchanged at 56 ids, 0 console
errors; a hand-run `fence.js` diff shows every frozen `#table-wrap` computed style identical
between the deployed page and the build; and in a live browser: custom phase add mints
`name/start/weeks/phiatus-*-custom1` correctly and remove works, hiatus rows add/remove, holiday
note toggles re-render and apply, and the sim-post block behaves.

**Harness honesty fixes:** `gate.sh`'s header claimed it ran the fence (it never did — the comment
now says to run it by hand and how); its lost/gained id diagnostic was dead code behind a
wrong-type guard and now prints lost/gained/changed ids on a `fields.byId` failure; and the
date-pinned baseline is now called out in the header — the Excel/PDF legs false-fail from any date
after 2026-08-29 because both embed the export date.

### Unreleased — the Mantine chrome: build, header, preview toolbar, sidebar

⚠️ **Not deployed and not cut as a version.** The live site and the repo's `index.html` are still
v1.2.0 and are byte-identical to `releases/v1.2.0.html`. This work builds from a new `src/` into
`dist/index.html` and deliberately leaves the root file alone — `main` auto-deploys it, so a
source-only `index.html` at the root would break the live site the moment anyone pushed.

**What changed for a user:** the app looks like a different application, and behaves like the same
one. The header, the preview toolbar and the sidebar are rebuilt on Mantine — real keyboard
navigation and Escape in the file menu, one button system instead of six looks, one field system
instead of 166 hand-written inline style declarations, and every phase reading as its own card.
The calendar itself — the waterfall, the month view, both exports — is untouched, deliberately and
verifiably.

Three real bugs fell out of the work: the custom-holiday **name field was functionally zero-width**
on a small laptop (16 px, of which 14 was its own padding); undo and redo were the app's two
most-used disabled controls and the *worst* contrast in the file at 1.72:1; and IBM Plex Mono was
being downloaded at two weights for eight sites that all render at 400.

**Why a build step at all.** React + Mantine cannot be pasted into a single file; the owner priced
that trade on 29 Aug 2026 and chose the minified build (~1.1 MB against today's 667 KB, 307 KB
gzipped) plus a GitHub Action to publish it. The single-file property survives — `dist/index.html`
is still one self-contained document that runs from `file://` — but the *shipped* file is no longer
readable source. That matters less than it used to, because Save has written 4.5 KB of `.sptcal`
JSON since v1.1.0 rather than a copy of the app.

**What is frozen and stayed frozen.** The waterfall grid, the month view, the width model and the
Excel/PDF writers are untouched. The verification is the point, not the claim: the waterfall PDF is
**byte-identical**, every part of the Excel workbook is identical (excluding its timestamp), a real
v1.0.0 saved calendar restores to the same 52 rows / 154 cells / 324 pt grid, `fields.byId` carries
the same 56 ids, horizontally clipped cells stay at 0, and every computed font, padding and box
metric inside `#table-wrap` is unchanged.

**Why the first attempt still looked old, which is the most useful thing here.** Porting the header
and toolbar changed almost nothing visible, because the sidebar is most of what you look at and it
had not been touched — and because its three cards carried **38 inline `style=` attributes, 166
declarations**, hard-coding a border, radius, padding and font-size onto every field. An inline
style beats every stylesheet rule, so no amount of restyling could reach them; only replacing the
markup could. The lesson generalises: a design system cannot be applied to markup that styles itself.

**Four things worth knowing, each found by measurement:**

- Mantine's CSS baseline reaches inside the frozen container through *type* selectors, not its
  hashed classes — `input, button, textarea, select { font: inherit }` is a shorthand, so it resets
  `line-height` on the buttons the frozen renderers emit. Three of them declared none and grew by
  3 px. They now pin `line-height: normal` explicitly. The obvious defensive assertion — "nothing
  inside the grid matches a Mantine class" — would have passed while that shipped.
- Mantine's `Popover` mounts its dropdown from an effect, so the file menu's node did not exist when
  the app's script bound its listener. The menu opened and closed perfectly while doing nothing at
  all, with no error of any kind.
- Mantine writes its own `id` over one you give a menu button. Element ids are part of this app's
  save-file format, so that class of surprise is the main hazard in the rest of this work.
- **Mantine's inputs are *controlled*, and this app restores a saved calendar by writing values
  straight into the DOM.** A controlled field ignores that write — so a saved date would save
  correctly, pass every check, and then silently not come back when you opened the file. Every field
  is therefore deliberately uncontrolled, and a real v1.0.0 calendar restoring identically is what
  proves it.

**Still legacy, and honestly so:** the Phases and All-phase hiatus card *interiors*, the holiday
list and the episode rows are **restyled, not rebuilt**. They are generated by the app as HTML
strings, by code that also mints the element ids that are the save-file format, so rebuilding them
is a separate and more careful job.

**Verified:** `tests/harness/gate.sh` — the whole acceptance gate as one command — passes after every
stage against `tests/baselines/2026-08-29-stage-7`: 0 horizontally clipped cells, the waterfall PDF
byte-identical, every Excel part identical, a real v1.0.0 saved calendar restoring to the same 52
rows / 154 cells / 324 pt grid, the same 56 field ids, 0 console errors. New: `t/fence.js` asserts
positively that computed styles inside the frozen container did not move, which no test covered
before.


### Unreleased — 29 Aug 2026 — The chrome's design system, settled before it is built

**No change to `index.html`.** This is a decision pass, written up in
[`UI-CONVENTIONS.md`](UI-CONVENTIONS.md): the Mantine design work ("Stage 2") that the migration
plan puts *before* any chrome is built. It settles the theme tokens, one feedback system to replace
the many, the component choice for every control, overlay and date picker outside the frozen
surface, and the responsive model.

**What it changes about the plan, rather than about the app.** Every Mantine claim was checked
against the installed `@mantine/core` **9.5.2** source instead of recalled, and five widely-assumed
choices turned out to break the save format silently:

- `DatePickerInput` renders a **`<button>`**, and `collectFieldValues()` sweeps `input[id]` — so
  every `start-<phase>` key would vanish from `fields.byId`. Not saved wrong: **saved not at all.**
  `DateInput` is the only viable picker, and its default `valueFormat` writes `"August 29, 2026"`
  where `parseDateUTC` expects an ISO date.
- `Select` puts the option **label** in the id-bearing input, so the region selects would save
  `"United States"` instead of `"US"`. They must be `NativeSelect`.
- Omitting `id` yields a **randomly generated** id, not none — Mantine's `useId` runs
  unconditionally. ~75 holiday checkboxes plus the note-popover controls would land in every saved
  file and every undo step, under keys that change each session. That is the exact bug the existing
  code comments say was deliberately avoided.
- `Popover` portals by default, which moves the four tool popovers' eight id'd controls out from
  under the single `.tools-menu` ancestor test that keeps them out of saved files.
- Mantine's CSS baseline reaches **five real `<button>` elements inside `#table-wrap`**; `font:
  inherit` is a shorthand that also resets `line-height`, measured at **+3 px** of button height
  *with* the `@layer` fence in place, because a layer settles priority and not matching.

**Measured, and two documented numbers corrected.** The chrome's typography turns out to be a CDN
dependency the grid's font deliberately is not — Inter and IBM Plex Mono are fetched from Google
Fonts while Carlito is embedded — and it is load-bearing for a **frozen export**: `mvNoteLineCount`
measures against Inter and its result sets month-view row heights that `exportMonthPdf` prints.
Nine visible controls render in Arial because their rules omit `font-family:inherit`. The chrome
carries 16 font sizes, 9 radii, 8 shadows for 5 same-elevation surfaces, and 40 inline `style=`
attributes holding 168 declarations. And the toolbar-wrap width recorded in two docs was wrong: the
**preview** toolbar wraps at ~1185 px (that is the 75 px-tall one), while the **header** toolbar
wraps between ~848 px and ~1018 px depending on the file name — never at 1280 px.

**Also recorded:** the owner's standing instruction that the on-screen waterfall editor keeps its
present appearance — formatting, auto-shrinking, font, size, widths and heights — unless
specifically directed otherwise. That **narrows** an earlier reading of "the editable grid could
have a reconsideration on design", and now sits in `CLAUDE.md` and `HANDOFF.md` §4 mapped onto the
symbols it actually names.

**Verified:** `python3 tools/check-refs.py` CLEAN, with `UI-CONVENTIONS.md` added to its scan.
Browser measurements taken against the running app at seven widths, with the pane fronted — an
earlier run gave a false `--header-h` staleness because `ResizeObserver` and `requestAnimationFrame`
are throttled while the pane is hidden, which is the trap PROJECT-CONTEXT §11 already records.

### v1.2.0 — 29 Aug 2026 — The app can tell you it has been updated

**The problem, measured rather than assumed.** There is no service worker (one was removed
precisely because it served a stale app forever), so the received wisdom was that a reload always
fetches the current build. Checking the live site's actual headers showed that is *nearly* true:

```
cache-control: max-age=600
etag: "6a9254a0-a18bb"
```

GitHub Pages sets a **ten-minute** browser cache. A relaunch inside that window is answered from
the browser's own HTTP cache and never learns a new deploy exists. Worse, most people run this as
an installed PWA, which they leave open and return to rather than relaunching at all — so an old
build can persist indefinitely, and shipping a fix does not mean anyone receives it.

**What now happens.** The app knows its own version (`APP_VERSION`) and compares it against a
tiny `version.json` deployed beside it. When the deployed version is genuinely newer, a blue strip
appears under the header: *"Version 1.2.1 is available — this copy is 1.2.0."* with a **Reload to
update** button.

- **It never reloads on its own.** You may be mid-edit with unsaved work, and reloading out from
  under someone is how a production plan gets destroyed. It tells you and lets you choose; the
  existing unsaved-changes guard still applies on the way out.
- **It only nags when the server is genuinely ahead.** Versions are compared numerically per
  segment, so `1.2.10` correctly beats `1.2.9` (a string comparison gets that backwards), and a
  rolled-back deploy leaves you alone rather than inviting you to "update" to an older build.
- **Dismissal is per version.** Waving away 1.2.1 does not hide 1.3.0.
- **Only the deployed app checks.** A *shareable copy* opened from `file://` is a deliberate
  frozen snapshot — telling its holder to "update" would navigate them away from the very file
  they were sent. It stays silent.
- **It gives up after three consecutive failures.** A frozen `releases/vX.Y.Z.html` resolves the
  marker relative to its own folder, where there is none and never will be; without this it would
  404 every thirty minutes forever. Any success resets the count.
- **Offline is silence,** not an error. An update check that cannot run is not worth interrupting
  anyone about.

The check runs 8 s after load, then every 30 minutes, and when the tab becomes visible again after
that long — the likeliest moment for a new deploy to have appeared under a long-lived PWA.

> ### ⚠️ `APP_VERSION` and `version.json` are ONE action, not two
> Bump them in the same commit. `version.json` alone makes every user see an update that does not
> exist; `APP_VERSION` alone makes a real update invisible. Both live at the top of their files
> with this warning attached.

**Also in this release:** the two notice strips now share one set of CSS rules and differ only in
hue — amber for *"your file is an old format"*, blue for *"the app has a newer version"*. This app
already had more warning styles than it should; a second strip built from scratch would have made
that worse. Verified the legacy strip's computed styling is byte-for-byte what it was.

**Verified:** matching versions stay silent; a newer marker raises the strip; a rolled-back marker
stays silent; a missing marker is silent and stops asking; the comparison passes 10/10 cases
including `1.2.10 > 1.2.9`; and the grid is unchanged at 157 cells / 132 filled / **0 clipped**,
identical to before the change. The grid and the exports were not touched.

> **v1.1.0 never shipped on its own.** It was changelogged and committed but never deployed or
> tagged, so v1.2.0 is the release that carries both it and this. Everything in the v1.1.0 entry
> below arrives with this version.

### v1.1.0 — 28 Aug 2026 — Save writes data, not a copy of the app

**Save and Open used to be the same file.** Save wrote `document.documentElement.outerHTML` — a
complete runnable copy of the app — with the state embedded in `<script id="saved-state">`. But
Open never read the app: it lifts that JSON out and replays it into the **running** app, so the
old file's HTML, CSS and JS is never parsed and never executed. Measured on a 10-episode calendar,
that file was **729,172 bytes of which 3,238 (0.44%) was the data**, and 44.5 KB of the rest was
the rendered grid — serialized out of the live DOM, then regenerated from state on load and thrown
away.

There are now **two formats with two different jobs**:

| | **`.sptcal`** — the calendar | **`.html`** — a shareable copy |
|---|---|---|
| Contents | the state, as JSON | the whole app, with the state in it |
| Size | **~4.5 KB** | ~695 KB |
| Written by | **Save, Save As, autosave** | File ▸ **Export shareable copy…** |
| For | working — opening, editing, saving | sending to someone who doesn't have the tool |

**Measured: a save is now 155× smaller** (4,488 vs 695,556 bytes on the same calendar).

- **Every calendar saved before this version still opens, and always will.** `parseCalendarText()`
  is the one place that reads a file: text starting with `{` is a snapshot, anything else gets the
  original `saved-state` regex. Both paths converge on the same `applyStateSnapshot()`, so there
  is no migration to get wrong.

  Verified against a **real** legacy file, not a synthesised one: `tests/fixtures/v1.0.0-saved.html`
  was generated by running the **v1.0.0 build itself** and clicking Save — 760 KB, 27 snapshot
  keys, no `version` field, grid baked in. Opened in v1.1.0 it restores every field (title, season,
  episodes, all four phase dates, week counts, region) and a **154-cell rendered grid identical to
  the one it was saved from**. Re-saved as `.sptcal` it is 4,525 bytes — **168× smaller** — and
  restores identically again. `releases/v1.0.0.html` (the app itself, whose state block is the
  literal `null`) is rejected cleanly rather than opening as an empty calendar.

- **Opening a legacy `.html` now recommends upgrading it.** A dismissible amber strip under the
  header explains that the file carries a whole copy of an old build of the app around ~3 KB of
  plan, with a **Save as .sptcal** button that runs Save As. Amber and not red on purpose: nothing
  failed, and colouring it like an error would teach people to distrust their own saved calendars.
  It is a recommendation — plain Save on a legacy file still writes `.html`, and nothing is ever
  converted without being asked.
- **Save writes back in whatever format the file already is.** Open a legacy `.html` and Save keeps
  it an `.html` — no file is silently converted.
- **The first save still always opens the save dialog**, manual or otherwise. Autosave can never
  reach that path: `showSaveFilePicker()` requires a user gesture, and writing a calendar somewhere
  the user never chose is exactly what the dialog exists to prevent. When autosave finds unsaved
  work with no file linked it now says so — *"Autosave needs a file — click Save"* — instead of
  failing silently. Work is not at risk meanwhile; the rolling IndexedDB backup has been running
  since three seconds after the first edit.
- **The shareable copy got smaller too.** It is built from a **clone** of the document, so the live
  page is never mutated, and the clone drops `#table-wrap`, `#print-root` and any open popover
  before serializing — all regenerated on load. Verified 0 bytes for each in the export.
- **Snapshots now carry a `version` field** (`SNAPSHOT_VERSION = 1`). Nothing branches on it yet;
  it exists so a future migration can ask which app wrote a file instead of sniffing for individual
  keys, which is what `migrateHolidayViewKeys()` and `normalizeRegionSelection()` have had to do.
- **Fixed along the way:** the save status waited on IndexedDB recents bookkeeping before reporting
  a write that had already succeeded — measured at ~1.2 s in a test run, long enough for an
  autosave tick to fire a second redundant write of the same bytes. `markClean()` now runs as soon
  as the bytes are on disk. Verified: status settles within 400 ms and the duplicate write is gone.

The grid and the exports were not touched. See [`HANDOFF.md`](HANDOFF.md) §7 for the full analysis
and [`CLAUDE.md`](CLAUDE.md) for the standing rule that saved calendars must keep opening forever.

### v1.0.0 — 28 Aug 2026 · `305c343` · tag `v1.0.0`

> The tag points at **`305c343`** — the commit where `index.html` was last the shipped app.
> The changelog, the rules and `releases/v1.0.0.html` were added in the commits *after* it, so
> checking out the tag gives you the v1.0.0 **app**, not this documentation. `index.html` is
> byte-identical either way.

**The last single-file build before the Mantine UI overhaul.** Frozen as the known-good baseline;
a byte-identical copy lives at [`releases/v1.0.0.html`](releases/v1.0.0.html)
(SHA-256 `0150be15e97c3ae1a670a181ab55987c9cfd3afeeb42580e13afde4fa20ffc81`).

The state of the app at v1.0.0:

- **Waterfall + month calendar** from phase start dates and durations, with the six built-in
  phases, custom phases, simultaneous post, and per-phase or all-phase hiatuses.
- **Day-level Production simulation** — shoot days, skipping weekends, hiatus days and union
  holidays for the selected region until the count is met.
- **Union-holiday data** for US (General / New York Local 52), six Canadian provinces, and the UK,
  generated from rules rather than hand-transcribed, with observed-day handling.
- **One shared column model** feeding the screen, the Excel workbook and the PDF, so all three
  finally agree. `computePhaseRowLayout()` is the single source for which phase occupies which
  column.
- **Embedded Carlito** (subset, zlib'd, 91 KB) so text measurement cannot drift.
- **Direct PDF writer** — TrueType subsetting, `/FontFile2`, WinAnsi, xref, Flate. No print dialog.
- **Excel export** via ExcelJS with explicit widths, merges and ARGB fills.
- **Direct manipulation** — drag columns and rows, autofit, shrink-to-fit, cell spans,
  double-click to return to automatic.
- **Calendar tools** — Shift All, Shift From, Anchor To, Rebuild From, Close all gaps, undo/redo.
- **Save / open** as self-contained HTML, with File System Access write-back, an IndexedDB recents
  list, a 10-minute autosave and crash recovery.

**Known limits at this version**, all documented in [`HANDOFF.md`](HANDOFF.md) §2:
the Settings menu and per-user preferences are not built; Notes is one column rather than the
reference export's label + right-aligned date; the PDF is height-bound where Excel is width-bound
(row pitch runs ~16% long); the month view still tints phase bars with the palette's text colour.

### Returning to v1.0.0

Any of these work, in increasing order of commitment:

```bash
# 1. Just look at it / run it — no git state changes at all
open releases/v1.0.0.html
```

```bash
# 2. Read a file as it was at v1.0.0, without moving the working tree
git show v1.0.0:index.html > /tmp/v1.0.0-index.html
```

```bash
# 3. Restore v1.0.0's index.html into the working tree as an uncommitted change
git checkout v1.0.0 -- index.html
```

```bash
# 4. Branch off the tag to work from it
git switch -c from-v1.0.0 v1.0.0
```

The tag is immutable and `releases/v1.0.0.html` is a byte-identical copy, so **the baseline
survives even if the working tree, `main`, or the whole build system is replaced.**
