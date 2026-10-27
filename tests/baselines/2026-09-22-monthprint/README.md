# Baseline — 22 Sep 2026, the month PDF

**What this is.** The before-side of `gate.sh`'s **monthprint** leg (UI-CONVENTIONS §10, item 10):
the month PDF, which until today was the only one of the four outputs with no gate coverage — while
six frozen edits that move or could move it had already shipped.

**Cut from** the build of **`ff1ecbe`** — the commit live on production at the time, and the local
`dist/index.html` it was cut from hashed identical to the deployed file (SHA-256
`82d3d0c9c696842f…`, 1,259,237 bytes). So this baseline is *what users were getting*, not a local
variant of it.

**⛔ It is not deployed and never was.** These are captured outputs, not app files.

## What each case is

| case | how it is loaded | months → sheets | elements | stamp hits | why it is here |
|---|---|---|---|---|---|
| `reference` | `T.buildFixture()` typed into a fresh page | 16 → 16 | 3,782 | 16 | the harness's reference calendar (10 × 8 days from 6/29/26, `us-general`); the one earlier hand A/Bs used |
| `dayoverrides` | `HARNESS_STATE=dayoverrides` | 15 → 15 | 3,542 | 15 | all four `dayOverrides` kinds, a snap-off Wednesday start and a named hiatus — the fixture the four month-view frozen edits were proven on **by hand** |
| `mvheader` | `HARNESS_STATE=mvheader` | 15 → 15 | 3,542 | 15 | month header in **Template** mode, all four slots filled, one format |
| `mvheaderlegacy` | `HARNESS_STATE=mvheaderlegacy` | 15 → 15 | 4,232 | **0** | **Manual** header saved before templates existed: braces must print literally. 0 stamp hits is correct — its date slot holds the literal text `{version}` |

### Added the same day: block shooting (BLOCKS-PLAN.md step 4)

| case | how it is loaded | months → sheets | elements | why it is here |
|---|---|---|---|---|
| `blocks` | `HARNESS_STATE=blocks` | 16 → 16 | 3,790 | Blocks mode ON: Production's pills carry the **block tag** as smaller grey text inside the pill (the step-4 frozen edit, placed there by the owner on seeing the first PDFs). A one-day pill piece carries none (ruling 7) |
| `blocksoff` | `HARNESS_STATE=blocksoff` | 16 → 16 | 3,782 | ⭐ **No baseline of its own — held to `reference`.** The same Blocks calendar with *Schedule by* set to Episodes, its five blocks and hand arrangement still in the file. Byte-identical to a baseline cut before Blocks existed is §5 condition 3 ("no change at all with Blocks off") as a measurement rather than a claim |

**The step-4 A/B** (`monthcmp.py ab`, the Blocks fixture without the tag → with it): ⭐ **the fit
tables are IDENTICAL** — not one row height moved in any month, every month is still `fill`, and 16
months still print as 16 sheets. The whole difference is 22 `span.mv-pill-block` elements (one per
tagged pill piece) and the pills' hover titles. §5 condition 1 allowed "one line, bounded"; the
in-pill tag costs **none**.

⚠️ **The first cut put the tag on its own lane** under the pill. Its A/B was the textbook §5 result —
every tagged week exactly one lane (20 px) taller, nothing else moved — and the owner, on seeing
the PDF, asked why it could not ride in the pill instead. It could, and the evidence above is why
that is strictly better. Recorded because the lane version was gated green and would have shipped.

Each case is two files: **`<case>.html`** is `#print-root`'s innerHTML at the moment
`exportMonthPdf` calls `window.print()`, with the page's own today stamp replaced by `DATESTAMP`;
**`<case>.json`** is what `monthcmp.py` derived from it plus the sheet count and page box of the PDF
Chrome actually printed (`/MediaBox [0 0 792 612]`, landscape Letter, every case).

## ✅ RE-CUT the same day for RULING 8 — episode pills become "Production Week N" + grey episodes

A deliberate change to the month PDF of **every episodic calendar**, on the owner's instruction
(22 Sep 2026): during production the pill's primary text is always *Production Week N*, and the
episodes being shot are grey text inside it. `reference`, `dayoverrides`, `mvheader` and
`mvheaderlegacy` were re-cut; `blocks` did not move, because Blocks mode never had episode pills.

| case | episode pills | grey tags | sheets | row heights |
|---|---|---|---|---|
| `reference` | 31 → **0** | 21 | 16 → 16 | **none moved** |
| `dayoverrides` | 30 → **0** | 21 | 15 → 15 | **one row** — Oct 2026, last week: 76 → 95 px |
| `mvheader` | 30 → **0** | 21 | 15 → 15 | the same row (same calendar) |
| `mvheaderlegacy` | 30 → **0** | 21 | 15 → 15 | the same row (same calendar) |

⭐ **The one moved row is a pre-existing gap being closed, not a regression.** In `dayoverrides` a
half day pushes the final shoot day past the episodes' total, and episode pills count ENTRIES (the
owner's 18 Sep ruling). So under the old pills the **wrap day, Tue 10/27, had no pill at all**:
episode 210's pill stopped on Monday. Production's own pill now covers every shoot day, so the
*Principal Photography Wraps* note beside it drops one lane. Every other row, and every sheet
count, is unchanged. The pre-R8 captures were kept outside the repo for the A/B.

⚠️ **Re-cut once more, for text only:** the owner asked for "Ep" before the episode numbers, then
settled on "Ep." ("Production Week 2 · Ep. 205, 202", "Block 1 · Ep. 201, 202"). Written once per
list. All five cases
kept their elements, row heights and sheet counts; only the text runs changed.

`blocksoff` stays held to `reference`, which now means: a Blocks calendar switched to Episodes
prints byte-identically to an Episodes calendar that never had blocks.

## ✅ ADDED 29 Sep 2026: `dayoverrides-onhalf`, a seventh case (a NEW case, not a re-cut)

Batch-3 step 0, on the owner's go-ahead (29 Sep 2026). The `onhalf` override (a weekend or holiday
worked as a half day) shipped with a frozen edit to `renderMonthView` (`bdfec60`: `_ovDays` gives
`'onhalf'` both mark classes, `halfSlices` reads the simulation's `halfDays`). Only the `halfworked`
leg covered it, on screen, so the month PDF's pagination for such a calendar was ungated. Batch
3's step 3.6 edits the same function, so this case was cut first: 3.6's claim that other calendars
print unchanged now covers the half-day marks too.

| case | how it is loaded | months → sheets | elements | stamp hits | why it is here |
|---|---|---|---|---|---|
| `dayoverrides-onhalf` | `HARNESS_STATE=dayoverrides-onhalf` | 15 → 15 | 3,551 | 15 | `dayoverrides` plus `onhalf` marks, as minted by the `halfworked` leg |

**Cut from** the build of `a08bdd7` (app code identical to `0f8327d`, which gated 521/0 in the same
session), `dist/index.html` 1,321,600 bytes.

- **Deterministic:** two fresh runs, cut into scratch dirs, compare identical under
  `monthcmp.py ab` (459,767 bytes, 3,551 elements).
- **Against `dayoverrides`** (the calendar it was derived from): the **fit table is identical**.
  All 15 months are still `fill`, not one row height moved, and 15 months still print as 15 sheets.
  What differs is the half-day marks (cells gaining `mv-day-half`, and pills gaining a
  `halfSlices` gradient on the right days) and the grey episode tags, because the half days
  re-pack which episodes fall in which week (`Ep. 205` → `Ep. 205, 206`, `Ep. 208` →
  `Ep. 208, 209`). It also has three fewer elements: two `+` affordances, which never print, and
  one tag.

## ✅ ADDED 29 Sep 2026: `month-lanecap` and `hiatus-blanklabel`, cases eight and nine (NEW cases, not re-cuts)

After batch-3 step 3.6 (`1661fe1`) and on the owner's go-ahead, once the owner had seen its A/B:

| case | how it is loaded | months → sheets | elements | why it is here |
|---|---|---|---|---|
| `month-lanecap` | `HARNESS_STATE=month-lanecap` | 16 → 16 | 4,245 | 25 notes on Wed 8/12/26, past the old 60-lane cap (L-16). ⭐ **Its August is in `scale` mode** (`scaleY(0.2882)`), so exportMonthPdf's shrink-to-fit branch is gated for the first time |
| `hiatus-blanklabel` | `HARNESS_STATE=hiatus-blanklabel` | 16 → 16 | 3,716 | the reference calendar with a 2-week hiatus whose labels were emptied in the editor: the bands print blank (N-1) |

**Cut from** the build of `44fa23f` (after 3.6 and 3.1; M-8 cannot reach the month PDF).
Both are identical to the "after" captures of 3.6's A/B, taken on the build of `1661fe1`, so the
cut is deterministic and M-8 moved neither. 3.6's before→after, per the A/B shown to the owner:
- `month-lanecap` changed in August only: the 8/12 week 1,520 → 1,882 px, `scaleY` 0.346 → 0.288,
  plus 90 never-printed `+` affordances.
- `hiatus-blanklabel` lost three "Hiatus" text runs.

## ✅ RE-CUT 15 Oct 2026 — one bar per episode or block ("Stacked bars, always"), and a tenth case, `halfdays`

A deliberate change to the month PDF of every calendar with episodes or blocks, on the owner's ruling (15 Oct 2026):
Production is one bar per episode (per block in Blocks mode), "Ep. 201" / "Block 1", with its Production Week in grey,
and a day where an episode or block changes half way through carries both bars, stacked. It replaces ruling 8's one
"Production Week N" bar per week (above). Signed off by the owner on the writer's contact sheets (gate 13's README)
before this cut: **"Yes, re-cut them"**. No frozen code changed: the bars are cut in the non-frozen `pillRunsForWeek()`.

| case | elements | Production bars | sheets | row heights |
|---|---|---|---|---|
| `reference` | 3793 → 3806 | 21 → 31 | 16 → 16 | **none moved** |
| `dayoverrides` | 3554 → 3566 | 22 → 31 | 15 → 15 | none moved |
| `mvheader` | 3554 → 3566 | 22 → 31 | 15 → 15 | none moved |
| `mvheaderlegacy` | 4244 → 4256 | 22 → 31 | 15 → 15 | none moved |
| `blocks` | 3790 → 3795 | 22 → 26 | 16 → 16 | none moved |
| `dayoverrides-onhalf` | 3551 → 3566 | 22 → 33 | 15 → 15 | none moved |
| `month-lanecap` | 4245 → 4250 | 22 → 26 | 16 → 16 | none moved |
| `hiatus-blanklabel` | 3716 → 3728 | 20 → 28 | 16 → 16 | none moved |
| `halfdays` *(new)* | 3827 | 22 | 16 | July and August grow one lane (57 → 78 px) on each week with a switch day |

⭐ **Why no row moved:** with whole day counts the bars split SIDE BY SIDE in the lane Production already used, so lane
occupancy is identical and every note lands where it did. Only a half-day switch day stacks a second bar, and only
`halfdays` has one. `blocksoff` stays held to `reference` and is still byte-identical to it.

`halfdays` is `tests/fixtures/halfdays.sptcal`: 4.5-day episodes with Episode 201 at 5, 45.5 shoot days from 6/29/26.

## ✅ RE-CUT 20 Oct 2026 — ALL NINE CASES: a hiatus day takes notes; and an eleventh case, `mvnotes`

MONTH-NOTES-PLAN.md §4 (owner, by picker: *"Every hiatus day"*): a frozen edit removed `renderMonthView`'s
`if(isHiatusDate(schedule, d)) continue;` from its "+" loop, so every hiatus day gets its "+" lanes. Those lanes are in
the print document, hidden by `#print-root .mv-note-add{display:none}`. Signed off on the A/B and a before / after /
difference sheet of `dayoverrides`' July: **"Re-cut all ten"** (picker, 20 Oct 2026).

**Hidden "+" only, proven:** each new document equals its old one, character for character, once every
`.mv-note-add` element is removed; every month still prints one sheet; and the PRINTED sheets, rendered from the print
path's PDF on the live build (`b3cae2ac…`, built into `dist-mut/base`) and on this branch, are pixel-identical: 156
pages, 0 differ.

| case | "+" elements | elements | sheets |
|---|---|---|---|
| `reference` (and `blocksoff`, held to it) | 1812 → 1878 | 3806 → 3872 | 16 → 16 |
| `dayoverrides`, `mvheader`, `dayoverrides-onhalf` | 1711 → 1803 (onhalf 1709 → 1801) | +92 each | 15 → 15 |
| `mvheaderlegacy` | 1711 → 1803 | +92 | 15 → 15 |
| `blocks` | 1807 → 1873 | 3795 → 3861 | 16 → 16 |
| `month-lanecap` | 2237 → 2303 | 4250 → 4316 | 16 → 16 |
| `hiatus-blanklabel` | 1734 → 1869 | 3728 → 3863 | 16 → 16 |
| `halfdays` | 1853 → 1919 | 3831 → 3897 | 16 → 16 |

**New case `mvnotes`** (signed off: **"Cut both"**, picker): `tests/fixtures/mvnotes.sptcal`, minted by the `mvnotes`
leg's own Save. 17 months (December 2025, an edge month that prints because it holds notes and a custom holiday,
through April 2027), 17 sheets, 4116 elements: No fill, tint and grey day notes, a note on a hiatus day, and two
one-day custom pills that wrap (`.mv-pill-2l`).

Cut from build `f6a7393896109030…` (worktree `month-notes-2951a8`) with Google Chrome 155.0.8059.85, from the full gate's own
`monthprint-<case>.json` captures.

## ✅ RE-CUT 19 Oct 2026 — ALL NINE CASES: the month view numbers weeks as the waterfall does

OFF-WEEK-PLAN.md step B, owner ruling Q5 ("match the waterfall"). `prodWeekLabel()` reads the number the
waterfall's week loop handed out (`seg.weekNo`) instead of counting calendar weeks, so after a hiatus a bar reads
*Post Week 8* where it read *Post Week 10*. No frozen code changed. Signed off on the written PDF's contact sheets
(gate 13's README): **"Re-cut both"** (picker).

**Text only, proven:** each new document equals its old one, character for character, once every `Week <n>` is
masked. Elements, sheets and every row height are unchanged.

| case | "Week N" labels renumbered | elements | sheets |
|---|---|---|---|
| `reference` (and `blocksoff`, held to it) | 22 of 158 | 3806 → 3806 | 16 → 16 |
| `dayoverrides`, `mvheader`, `mvheaderlegacy`, `dayoverrides-onhalf` | 64 of 142 each | unchanged | 15 → 15 |
| `blocks` | 22 of 156 | 3795 → 3795 | 16 → 16 |
| `month-lanecap` | 22 of 156 | 4250 → 4250 | 16 → 16 |
| `hiatus-blanklabel` | 46 of 158 | 3728 → 3728 | 16 → 16 |
| `halfdays` | 22 of 144 | 3831 → 3831 | 16 → 16 |

Cut from build `eadef87e89bcd27b…` (worktree `offweek-step-b`) with Google Chrome 155.0.8059.85, from the full gate's
own `monthprint-<case>.json` captures.

## ✅ RE-CUT 16 Oct 2026 — `halfdays` ONLY: a switch day's two bars meet half way through the square

The owner's idea, 15 Oct 2026 (HALF-SQUARE-BARS-PLAN.md). It is a frozen edit to `renderMonthView`, approved by
picker on 16 Oct 2026 against that plan's §4 gate. On a day where an episode changes half way through:
- the earlier episode's bar now stops half way through the square, by a `margin-right:calc(P% + 1px)`;
- the next one starts there, by a `margin-left`;
- both sit in ONE lane, because `takeLane()` counts the two halves of that column separately.

A bar with no switch day gets no new text, so every other case here is unchanged, byte for byte, with no re-cut.
Signed off on the written PDF's contact sheets (gate 13's README) and a render of this print path's July and August:
**"Yes, re-cut halfdays"** (picker).

| case | elements | Production bars | insets | sheets | row heights |
|---|---|---|---|---|---|
| `halfdays` | 3827 → 3831 | 22 → 22 | 0 → 8 | 16 → 16 | July weeks 3 and 4 and August weeks 2 and 4: 78 → 57 px. Every other row is unchanged |

The 4 extra elements are never-printed `+` affordances, on lanes the stacked bars used to fill.
Cut from build `be311b275aa4d884…` with Google Chrome 155.0.8059.82; `monthcmp.py gate` passed against the new cut.

## What the leg asserts

1. The printed document is **byte-identical** to `<case>.html`.
2. Chrome's real print of it has **exactly one sheet per month**, and the count and page box match.
3. The today stamp was normalised the same number of times.
4. One print call, the `afterprint` cleanup ran, and there were 0 console errors.

## ⭐ Proven to fail, not only to pass (22 Sep 2026)

A gate that has only ever been seen green proves nothing. Each of these was run against a scratch
cut before this one was committed:

| control | result |
|---|---|
| a second fresh run of every case | **identical** — the capture is deterministic |
| the page's local date moved to **tomorrow** (`TZ=Pacific/Kiritimati`, stamp `9.23.26`) | **identical** — nothing else in the printout reads the local date |
| the normaliser, in Node, on **5 Oct** (`10.05.26` vs `10.5.26`, the 1st–9th case) | both forms replaced; `110.05.26`, `10.05.261`, `10/5/26` left alone |
| `dist/` patched so the fit pass writes every fill-mode row **+4 px** | **FAIL** — "structure IDENTICAL, only inline styles differ", and the fit table names every moved row |
| `dist/` patched so `.print-page` is `130vh` — a **CSS-only** change | document check **still PASSES**; sheet check **FAILS, 16 → 32** |

⭐ **The last row is why the leg prints a real PDF.** A CSS edit to a frozen `.mv-*` rule changes the
printout without changing one byte of innerHTML, so the document comparison alone is blind to it.
Chrome's own page breaking is not.

## ✅ ~~Coverage gap~~ — CLOSED 29 Sep 2026 by `month-lanecap` (its August is in `scale`); the original note follows

## ⚠️ Coverage gap, stated honestly

**Every month in all four cases fits in `fill` mode — none is in `scale` (shrink-to-fit).** So
`exportMonthPdf`'s second branch, where content taller than the page is `scaleY`'d down, is
exercised by no baseline. A change that tips a month *into* `scale` still fails here — the document
differs, and the fit table reports the mode change — but the scale branch's own output is unproven.
A fixture with a comment-heavy week in a six-week month would close it.

## ✅ RE-CUT 20 Oct 2026 (evening): eight cases, "Shoot" before every episode bar; `mvheaderlegacy` also takes bundle B's sizes

- **The ruling and the sign-off** are gate 13's (its README, the same evening): "Shoot Ep. 101" by default, by picker,
  and **"Re-cut both"** on the contact sheets and this classification.
- **What moved.** In each re-cut document, removing every `Shoot ` gives back the old baseline **byte for byte** (bar
  text and the pill's `title`). Element counts, the fit table (every row height and mode, which are inline styles in
  the document) and months → sheets are unchanged, so no month changed its fit.
- ⚠️ **`mvheaderlegacy` carries one more change, bundle B's, and that is why it moved most.** The entry below records
  bundle B's re-cut (its size options), but when bundle B was merged on `merge-all` its file was HELD at bundle A's
  baseline (both bundles had re-cut it from different starting points). This cut carries both: bundle A's hidden "+"
  on hiatus days (already in the held file), bundle B's three `<option>`s × 15 months (+45 elements, 4,348 → 4,393),
  and the "Shoot" text. The prefix build's document minus `Shoot ` is byte-identical to the merged build's.

| case | bytes before → after | `Shoot ` added | elements | months → sheets |
|---|---|---|---|---|
| `reference` (and `blocksoff`, held to it) | 508,414 → 508,786 | 62 | 3,872, same | 16 → 16 |
| `dayoverrides` | 480,711 → 481,071 | 60 | 3,658, same | 15 → 15 |
| `mvheader` | 481,731 → 482,091 | 60 | 3,658, same | 15 → 15 |
| `mvheaderlegacy` | 526,446 → 528,156 | 60 | 4,348 → 4,393 (bundle B) | 15 → 15 |
| `dayoverrides-onhalf` | 481,395 → 481,779 | 64 | 3,658, same | 15 → 15 |
| `hiatus-blanklabel` | 506,425 → 506,761 | 56 | 3,863, same | 16 → 16 |
| `halfdays` | 515,701 → 515,941 | 40 | 3,897, same | 16 → 16 |
| `mvnotes` | 543,042 → 543,414 | 62 | 4,116, same | 17 → 17 |

Held, untouched and identical: `blocks` and `month-lanecap`. Cut with `monthcmp.py cut` from the gate's own per-case
captures (`monthprint-<case>.json` / `.pdf`) on build `a53e5344…`, branch `shoot-prefix` at `12e06ac`.

## ✅ RE-CUT 20 Oct 2026: `mvheaderlegacy` only, for the month header's sizes 10, 11 and 12

LABELS-SETUP-PLAN.md item 7 (owner: *"10"*). The header's size toolbar is part of a MANUAL month header's
markup, so its new options are in the print document. Signed off by the owner by picker (*"Re-cut it"*)
after an A/B against the v1.5.0 release and a contact sheet of the printed months.

| | before (v1.5.0) | after |
|---|---|---|
| elements | 4,256 | **4,301**: 3 `<option>` × 15 months |
| bytes | 506,543 | 507,893 |
| fit table | | **identical**, every row height and mode |
| months → sheets | 15 → 15 | 15 → 15 |
| printed PDF | | **pixel-identical** on all 15 pages at 150 dpi (`pdftoppm`), and the same `pdftotext` |

The other nine cases were captured on the same build and are identical to their baselines, untouched.

⭐ **Combined with bundle A's re-cut on the merge (20 Oct 2026).** Bundle A (MONTH-NOTES-PLAN.md, "a hiatus day takes
notes", re-cut above) re-cut this case too, so the merge of the two branches re-captured it on the merged build. It is
exactly the union of the two signed-off changes: against bundle A's cut it adds only the 45 size `<option>`s, and
against this cut only bundle A's 92 hidden "+" note slots. 4,393 elements, the fit table identical to both, 15 months
→ 15 sheets, and a second capture byte-identical.

## ✅ RE-CUT 20 Oct 2026 (late): seven cases read "Episode N"; `blocksoff` gets its own baseline

- **The ruling.** An episode's month bar reads its NAME, as typed. A new calendar names its episodes "Shoot Ep. 101" (so
  `reference`, typed in fresh, prints exactly as before), and v1.6.0's separate "Shoot" prefix is retired. Old files keep
  "Episode 101" (owner, by picker: *"Leave them as saved"*), so every Episodes FIXTURE here, saved by an older build, now
  prints "Episode N" where the previous cut said "Shoot Ep. N". Signed off by the owner after the contact sheets
  (`monthbase.py sheets`) and the classification below: *"Re-cut gates 10 and 13 for the Episode N change, giving
  blocksoff its own baseline, then run the final gate."*
- **What moved.** In each re-cut document, reading "Shoot Ep. N" (old) and "Episode N" (new) both as the episode gives
  back the old baseline **byte for byte**, with the count equal. The JSON sidecars differ only in `bytes`, `docSha1` and
  `structSha1`: element counts and the fit table are unchanged, so no month changed its fit.
- ⚠️ **`blocksoff` has its own baseline now.** It was held to `reference`'s to prove BLOCKS-PLAN §5 condition 3 ("no change
  at all with Blocks off"). It is an older file ("Episode N") and `reference` is typed in fresh ("Shoot Ep. N"), so the
  bytes can no longer match. The condition is kept: a block after the gate's monthprint loop holds `blocksoff`'s capture to
  `reference.html` byte for byte once both names are read as the episode (and the dotted date stamp as a stamp). Proven
  to fail against another calendar's baseline.

| case | bytes before → after | "Shoot Ep. N" → "Episode N" | elements | months → sheets |
|---|---|---|---|---|
| `dayoverrides` | 481,071 → 480,951 | 60 | 3,658, same | 15 → 15 |
| `mvheader` | 482,091 → 481,971 | 60 | 3,658, same | 15 → 15 |
| `mvheaderlegacy` | 528,156 → 528,036 | 60 | 4,393, same | 15 → 15 |
| `dayoverrides-onhalf` | 481,779 → 481,651 | 64 | 3,658, same | 15 → 15 |
| `hiatus-blanklabel` | 506,761 → 506,649 | 56 | 3,863, same | 16 → 16 |
| `halfdays` | 515,941 → 515,861 | 40 | 3,897, same | 16 → 16 |
| `mvnotes` | 543,414 → 543,290 | 62 | 4,116, same | 17 → 17 |
| `blocksoff` (NEW; was held to `reference`, 508,786) | 508,662 | 62 | 3,872 | 16 → 16 |

Held, untouched and identical: `reference`, `blocks` and `month-lanecap`. Cut with `monthcmp.py cut` from the gate's own
per-case captures (`monthprint-<case>.json` / `.pdf`) on build `be984cdc…` (branch `ep-shoot-names` at `f84b378`), Google
Chrome 155.0.8059.85; `monthcmp.py gate` passed against each new cut.

## ✅ RE-CUT 27 Oct 2026 — ALL ELEVEN CASES: the month notes' tooltips say "double-click to edit" (frozen edit M2)

MONTH-TEXT-STYLE-PLAN.md §6, M2, signed off by the owner's picker on 27 Oct 2026 (*"Yes, M1 and M2 as planned
(Recommended)"*). Ruling R1 makes a single click on a month note PICK it for the text style bar, so the two note
tooltips, "… — click to edit (also updates the Waterfall)" and "… — click to edit (month view only)", now say
"double-click to edit". A tooltip is a `title` attribute in the markup the print rollback prints, so every case with a
note moved. Done first and alone, so the plan's later steps (M1, the writer) are measured against this cut.

- **What moved.** In each re-cut document, reading " — double-click to edit (" as " — click to edit (" gives back the
  old baseline **byte for byte**. Each case grew by 7 bytes per note tooltip ("double-"). The JSON sidecars differ only
  in `bytes`, `docSha1`, `structSha1` (a title is an attribute, so it is part of the structure) and `run` (only its
  date stamp): every element count, fit table, sheet count and page box is unchanged.
- **Gate 13 does not move:** the writer never reads a tooltip (`mvlParseItem` reads no `title`).

| case | bytes before → after | tooltips | months → sheets |
|---|---|---|---|
| `reference` | 508,786 → 508,933 | 21 | 16 → 16 |
| `dayoverrides` | 480,951 → 480,979 | 4 | 15 → 15 |
| `mvheader` | 481,971 → 481,999 | 4 | 15 → 15 |
| `mvheaderlegacy` | 528,036 → 528,064 | 4 | 15 → 15 |
| `blocks` | 507,217 → 507,364 | 21 | 16 → 16 |
| `blocksoff` | 508,662 → 508,809 | 21 | 16 → 16 |
| `dayoverrides-onhalf` | 481,651 → 481,679 | 4 | 15 → 15 |
| `month-lanecap` | 611,735 → 612,057 | 46 | 16 → 16 |
| `hiatus-blanklabel` | 506,649 → 506,796 | 21 | 16 → 16 |
| `halfdays` | 515,861 → 516,008 | 21 | 16 → 16 |
| `mvnotes` | 543,290 → 543,556 | 38 | 17 → 17 |

Cut with `monthcmp.py cut` from fresh `monthprint` runs (the gate's own invocation, `HARNESS_PORT=8251`) on build
`c5f9a45b…` (branch `claude/sharp-stonebraker-8d2cd2`, M2 on top of `7bf468b`), Google Chrome 156.0.8078.48;
`monthcmp.py gate` passed against the new `mvnotes` cut. The gate's `blocksoff`-vs-`reference` check still holds: both
documents carry the same 21 tooltips.

## Re-cutting

Only deliberately, and record it here with a table of what moved and why — an undocumented re-cut
is indistinguishable from absorbing a real regression. Copy the invocation out of `gate.sh`; the
cut differs only in the first argument:

```
cd tests/harness
HARNESS_PAGE=/dist/index.html HARNESS_STATE=<fixture or empty> HARNESS_PRINT_PDF=1 ./run.sh monthprint 60
python3 monthcmp.py cut monthprint.json monthprint.print.pdf ../baselines/2026-09-22-monthprint <case>
```
