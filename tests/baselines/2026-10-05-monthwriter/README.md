# Baseline — 5 Oct 2026, the WRITTEN month PDF (gate 13)

**What this is.** The month PDF that **Export PDF** writes since step 5 of
[`MONTH-PDF-WRITER-PLAN.md`](../../../MONTH-PDF-WRITER-PLAN.md): the direct writer, through the Save dialog. It is
held **byte for byte** on eighteen calendars (seventeen until the 15 Oct 2026 re-cut added `halfdays`; `halfdays` alone
re-cut again on 16 Oct 2026, and all seventeen files on 19 Oct 2026 for the week numbers, below). It is the before-side of `gate.sh`'s **gate 13** (UI-CONVENTIONS §10,
item 13).

Gate 10 (`../2026-09-22-monthprint/`) still holds the PRINT path. That is the rollback now, reached on localhost by
its switch (`localStorage 'sptcal.mvPdfTest' = 'print'`). The two gates hold two different programs, so neither
replaces the other.

**⛔ It is not deployed and never was.** These are captured outputs, not app files.

## The owner's sign-off, before the cut

Plan §5 item 3 says the baselines are cut only after the owner signs off a real Export. That is the rule UI-CONVENTIONS
§10 item 10 sets for the print path: a change to the month PDF goes in front of the owner, and is never re-cut quietly.
Every test before step 6 stood in for the Save dialog. So:

- **2 Oct 2026.** The owner exported one of their own calendars (19 months) from the step-5 build, which was served on
  localhost with its Content-Security-Policy. It went through the real Save dialog and was opened in Preview.
- **Checked here before the cut:**
  - the file is the writer's own layout, not a print;
  - the three Inter weights it used are embedded as the `InterPDF` subsets;
  - it has no `/Info` and no `/ID`;
  - poppler reads it with an empty stderr;
  - it has one Letter-landscape page per month;
  - its name follows `<title> Month Calendar.pdf`.
- **The owner's answer:** "Yes, cut them" (picker). The owner's calendar is not in the repo, and nothing of it is
  recorded here.

## Cut from

- **The build of `d4785e0`**, which is `main` at step 5: `dist/index.html` sha256 `d7bf748a35d0f351…`, 1,464,497
  bytes.
- **The browser:** Google Chrome **154.0.8037.93** on an arm64 Mac (macOS 15.7.9). The browser matters here, and
  "Re-cutting" below says why.
- **The leg:** `monthexport` (`t/monthexport.js`). Its clock is pinned before the app boots: the no-argument
  `new Date()` is local noon on 22 Sep 2026, so every header prints "9.22.26". Each file is the one X2 writes, which is
  the calendar as loaded, before X5 and X6 type their notes. X2 holds that file byte-identical to what the sliced SOURCE
  writes for the same calendar. So each file here is also the source's output, not only the minified build's.
- **Determinism:** three fresh runs of the gate's export section were identical on all nineteen exports: two on
  2 Oct, and the cut itself on 5 Oct. Each run passed 205 checks with no failure. Every gate run also exports the
  reference calendar under `TZ=Pacific/Kiritimati` and in a 1280 × 800 window, and holds both to `reference.pdf`.
  - ⚠️ **A fourth run, on 2 Oct, was stopped.** The Mac was on battery at 1%, its load average was 611, and it slept
    mid-run. In that run, the reference under UTC+14 passed X0 and X1 and then failed X2 to E0. Its detailed result was
    overwritten before it could be read, so the cause is not known. The same case passed in every run on a healthy
    machine. It is recorded, not explained (HANDOFF).

## ✅ RE-CUT 11 Nov 2026 — TWENTY-ONE CASES: the grey tag is centred on the bar's label (frozen edit TC1)

- **The ruling.** Owner, 11 Nov 2026: a screenshot of a Blocks bar, *"S2- production week 4...etc not centered
  properly"*, then *"Yes, PDF too"* (picker) once the screen was fixed. `.mv-pill-block` (the grey tag inside
  Production's pill) hung its own 1.5 × 9 px = 13.5 px line box from the top of the bar's 15 px line, so its letters
  rode 0.6 px high at Standard and Large and 1.8 px at Extra large. TC1 gives the tag the bar's own line
  (`calc(15em / 9)` etc., in em so a shrunk month scales it), and the writer's `tagBase` always takes `mvlBarLine`.
- **The sign-off came first.** The owner saw a 600 dpi before | after close-up of `blocks`' July 2026 bar, and was told
  the classification below; the answer was *"Yes, cut them"* (picker).
- **What moved, classified line by line** (every stream inflated through `monthbase.parse`, every other object
  identical): in each page's content, the ONLY changed lines are grey-tag text runs (`/F500`), each with the same
  font, size, x and string and its `Tm` y lowered by exactly **0.75 pt** (1 CSS px, as Chrome rounds the line's
  half-leading). No fill, rule, clip, bar or other text moved. Shrunk months moved the same 0.75 pt at their factor's
  size (`/F500 3.164` in `month-lanecap`, `5.168` in `month-dense60`); monthwriter A3 holds them to Chrome to 0.03 px.

  | case | tag runs moved |
  |---|---|
  | `reference` (and its UTC+14 and 1280 px runs, byte-identical), `blocksoff`, `dayoverrides`, `mvheader`, `mvheaderlegacy`, `dayoverrides-onhalf`, `hiatus-blanklabel`, `monthnotes`, `shootorder`, `notewrap`, `mvnotes`, `mvnotesize-14`, `mvbarsize-large` (at `/F500 8.25`) | 24 |
  | `blocks`, `month-lanecap`, `month-dense60`, `carry-rich` | 23 |
  | `stintswap-reshape` | 19 |
  | `halfdays` | 17 |
  | `monthscale` | 16 |
  | `colswap-simpost-refuse` | 7 |

- **Not moved, byte-identical:** `mvnotesize-mixed`. Its bars are 13 px, whose line-height was already a length the tag
  inherited, which is the case TC1 makes universal.
- **Cut from** the working tree on `main` at `6434d4f` plus TC1, build sha256 `4d21191a3c8e6bd0…` (2,080,815 bytes),
  Google Chrome **157.0.8103.39**, port 8393. The month sections of gate.sh (gate 10, mvnotes' written PDF, monthemit,
  bar size, note size, mvtextstyle, monthwriter, monthexport, gate 13) ran green but for gate 13 itself and monthexport
  X6, which failed on a different calendar each run at load average 20-39 and passed alone (the same calendar passed
  and failed with byte-identical PDFs).

## ✅ NEW CASES 2 Nov 2026 — `mvnotesize-14` and `mvnotesize-mixed` (MONTH-NOTE-SIZE-PLAN.md step 4); every other case untouched

- **Signed off** on `monthbase.py sheets` contact sheets of all 17 months of each: the `mvnotes` baseline (the same
  calendar at 10 px) | the new export | difference, so only what the sizes change shows red. The owner was also shown
  the classification below. The answer was *"Yes, cut both"* (picker, 2 Nov 2026).
- **What they hold.** Both are `mvnotes`' calendar with the sizes set and nothing else (each fixture's snapshot differs
  from `mvnotes.sptcal` only by its size keys, plus three empty fields a newer Save writes):
  - `mvnotesize-14`: `mvNoteSize: "14"`, so every note is at 14 px, in a 24 px box (42 px for two lines), cut at two lines.
    Bars stay at Standard. 17 pages, 85,669 bytes, sha256 `4e9044e69ccf2c69…`.
  - `mvnotesize-mixed`: `mvNoteSize: "12"` and `mvBarSize: "13"`. December 2025's two notes on the 10th have sizes of
    their own (`fmt.size` 14 and 8), so one note is above the calendar's size and one is below 10 px. 17 pages,
    85,174 bytes, sha256 `87f31bc80a808fb6…`.
- **What moved against `mvnotes`, classified** (`pdftotext -raw`, word counts page by page, "…" set aside):
  - **`mvnotesize-14`:** the same 17 months, and the same words except where three notes are cut at two lines with
    "…": *Start Principal / Photography…* (on June's page and July's spillover row), *Principal / Photography…*
    (Wraps 10/20/26) and *Day After / Thanksgiving…*. August 2026 and April 2027 hold no note and are pixel-identical.
  - **`mvnotesize-mixed`:** one note cut, *Day After / Thanksgiving…*. At 13 px bars, two one-day bars are cut at two
    lines by the bar rule v1.9.0 already has: *Network Table / Read and Studio…* and *Costume and Hair / Camera Tests
    Wi…* (the second on April's and May's pages). The 10 px baseline's bar reads *…Camera Tests With Th…*.
- **No other case moved:** every one of the 22 existing cases was byte-identical on the step-3 build, and the full
  gate on the merged build holds them (MONTH-NOTE-SIZE-PLAN.md §6 step 4).
- **Deterministic:** two exports of each, from separate runs, were byte-identical.
- **Cut from** branch `month-note-size` with `main` merged in (`7745a86`), build `dist/index.html` sha256
  `3c45a1a8deb91…` (1,958,216 bytes): `monthexport`'s X2 file, run case by case on port 8419 (9/9 each), clock pinned to
  22 Sep 2026, Google Chrome 156.0.8078.74 on macOS 15.7.9. Runs `n4` and `nm` in `gate.sh`.

## ✅ RE-CUT 30 Oct 2026 — FIFTEEN CASES: a holiday's day takes the weekend's grey (frozen edit HT1)

- **The ruling.** Owner, 30 Oct 2026, by picker: *"Weekend tint"* (over the Off hatch), *"Screen and both PDFs"*, and
  *"Approve with that gate"*. `renderMonthView` puts `.mv-holiday` on each day a holiday's line is drawn
  (`mvHolidayDays`), and the writer paints those cells `MVL_PAINT.weekendFill` (`#F4F3F0`).
- **The sign-off came first.** The owner saw `monthbase.py sheets` (old | new | difference) of `reference`'s November
  2026 (Thanksgiving and the day after) and June 2026 (Juneteenth, and the observed July 3 in the spillover row), with
  the classification below; the answer was *"Yes, cut them"* (picker).
- **What moved, classified line by line** (every content stream inflated through `monthbase.parse`, then compared):
  in all fifteen, every part but the pages' contents is identical. In each page's content every change is one of two:
  - an inserted pair, `0.9569 0.9529 0.9412 rg` and `… re f`: a new grey cell fill;
  - for a holiday in another month's spillover row, a same-length swap of `rg` lines only. The cell's fill goes from
    `#FAFAF9` to the grey, and the faded day number's mixed ink follows it, as an out-of-month weekend's does.

  No text run, position or clip moved. The classifier was shown red on a real change first (`blocks`' file against
  `reference`'s baseline).

  | case | new grey cells | recoloured `rg` lines |
  |---|---|---|
  | `reference`, `blocks`, `blocksoff`, `monthscale`, `month-lanecap`, `hiatus-blanklabel`, `month-dense60`, `monthnotes`, `shootorder`, `notewrap` | 13 | 4 |
  | `stintswap-reshape` | 21 | 8 |
  | `carry-rich`, `halfdays` | 12 | 4 |
  | `mvnotes`, `mvbarsize-large` | 15 | 6 |

- **Not moved, byte-identical:** `colswap-simpost-refuse`, `dayoverrides`, `mvheader`, `mvheaderlegacy`,
  `dayoverrides-onhalf`. None of their months draws a holiday's line.
- **Cut from** build `cb7c30ac89690772…` (1,935,211 bytes), branch `holiday-tint` at `6f10a6a`, rebuilt from the
  committed source to the same bytes before the copy. The files are the `monthexport` leg's, run case by case on port
  8361 (all 9/9). The full gate that follows proves the cut. Google Chrome **156.0.8078.74**.

## ✅ RE-CUT 21 Oct 2026 — ALL NINETEEN CASES: phases ringed in their own darker colour (ring paint only)

- **The ruling.** Owner, 21 Oct 2026, in chat (SPAN-NOTES-PLAN.md §1 D1, shown both routes mocked): *"go for the
  darker outline for phases"*. A frozen CSS edit, approved in that message: `.mv-pill{ border-color:currentColor;
  box-shadow:inset 0 0 0 .5px currentColor }`, so every pill (a phase's, an episode's, Simultaneous Post's) is ringed
  1.5 px in its own ink, with no layout change. The writer paints the same ring (`MVL_PAINT.bar.pillRim`,
  `mvlPaintBar`). Notes and hiatus bands keep the 18% rim.
- **The sign-off came first.** The owner saw `monthbase.py sheets` contact sheets (old | new | difference) of
  `colswap-simpost-refuse` (December 2026: episodes, Post, Simultaneous Post, a note, the hiatus) and
  `dayoverrides-onhalf` (July 2026: half days), and the classification below; the answer was *"Yes, update the gate
  13 month PDF baselines to the outlined version, then run the full gate."*
- **What moved, classified line by line** (every content stream inflated through `monthbase.parse`, then compared):
  in all nineteen, every part but the pages' contents is identical (fonts, page tree, page count). In each page's
  content, with the ring lines (`… f*`) and colour lines (`… rg`) set aside, every other line is identical and in
  order: every text run and its position, every fill, every clip. The one other change is whole per-slice ring
  re-draw groups (`q <clip> W n` / `Q`) gone, because a pill's ring is opaque and no longer re-drawn over a half
  day's shade: 2 in `carry-rich`, 5 in `dayoverrides-onhalf`, 1 each in `dayoverrides`, `mvheader` and
  `mvheaderlegacy`, and the ring counts drop by exactly those. The classifier was shown red on a real change first.
  In the sheets the difference is red on pill outlines only.
- **Re-cut:** all nineteen (`reference` also holds `rz` and `rw`).
- **Cut from** build `591820ac444ca2ac…` (1,684,726 bytes), branch `phase-outline` at `c4f6114`, rebuilt from the
  committed source to the same bytes before the copy. The files are the `monthexport` leg's, run case by case through
  gate.sh's own loop on port 9352 (all 9/9). The full gate that follows proves the cut: gate 13 passes only if the
  gate's own exports are these bytes. Google Chrome **155.0.8059.85**.

## ✅ RE-CUT 20 Oct 2026 — FOURTEEN CASES: "Shoot" before every episode bar (and nothing else)

- **The ruling.** Owner, 20 Oct 2026, by picker: an episode's month bars read **"Shoot Ep. 101"** by default on every
  calendar, old files included; a block's bars have no prefix by default; each unit's own prefix is set from its bar's
  day menu (`unitBarLabel`, `barPrefix`). A switch day's one-day half bar keeps plain "Ep. N" (the 16 Oct ruling, kept).
  No frozen code changed: the label is composed outside `renderMonthView`, and the writer reads the renderer's HTML.
- **The sign-off came first.** The owner saw `monthbase.py sheets` contact sheets (old | new | difference) of
  `reference` and `halfdays`, July 2026, and the classification below; the answer was **"Re-cut both"** (picker).
- **What moved, classified line by line** (every content stream inflated through `monthbase.parse`, then compared):
  every changed line is either the same text run with `(Ep. N)` become `(Shoot Ep. N)` (7 to 32 runs a calendar), or a
  grey-text run after it whose x moved right by **23.14 pt** exactly, the width "Shoot " takes at the bar's 7.5 pt / 600.
  No run was added, removed, truncated or re-wrapped; no y moved; no page was added or lost. Pages without an episode
  bar are pixel-identical (`sheets`: 0 pixels).
- **Re-cut:** `reference` (and `rz`, `rw`, `bo`, held to it, which are byte-identical to `r`), `carry-rich`,
  `colswap-simpost-refuse`, `dayoverrides`, `dayoverrides-onhalf`, `halfdays`, `hiatus-blanklabel`, `monthnotes`,
  `mvheader`, `mvheaderlegacy`, `mvnotes`, `notewrap`, `shootorder`, `stintswap-reshape`.
  **Held byte-identical, no re-cut:** `blocks` (a Blocks calendar labelled by block), `monthscale`, `month-dense60`,
  `month-lanecap` (no episode bar).
- **Cut from** build `a53e5344…` (1,663,652 bytes), branch `shoot-prefix` at `12e06ac`, by that build's own full gate
  (port 9247, 17:38–18:03): `/tmp/gate9247-mxa/<run>.pdf`. Google Chrome **155.0.8059.85**.

## ✅ RE-CUT 19 Oct 2026 — ALL SEVENTEEN CASES: the month view numbers weeks as the waterfall does

**A deliberate change to text only** (OFF-WEEK-PLAN.md step B, owner ruling Q5: "match the waterfall").
- **What changed.** `prodWeekLabel()` names a bar's week by the number the waterfall's week loop handed out
  (`seg.weekNo`). It used to count calendar weeks from the phase's start. So after any hiatus a bar now reads, for
  example, *Post Week 8* (as the waterfall's *Post wk 8*) where it read *Post Week 10*. No frozen code changed.
- **The sign-off came first.** The owner saw `monthbase.py sheets` contact sheets of the written PDF (baseline |
  new | difference) for the calendars below, plus `offweek`. The answer was **"Re-cut both"** (picker, 19 Oct 2026).
- **What moved.** Every case moved, because every one runs a phase through a hiatus (the default winter hiatus at
  least). **Text only, proven:** each new file's words, page by page in reading order with whitespace collapsed, equal
  the old file's once every `Week <n>` is masked. Changed pages differ by 0.01–0.06% of their pixels, the digits only.
  Byte counts move by at most 8 (a number gains or loses a digit). From 3 of 14 "Week N" labels renumbered
  (`colswap-simpost-refuse`) to 42 of 120 (`stintswap-reshape`).
- **Cut from** build `eadef87e89bcd27b…`, worktree `offweek-step-b`, by the full gate's `monthexport` runs
  (`/tmp/gate8963-mxa/`). `rz`, `rw` and `bo` were byte-identical to `r`. Google Chrome **155.0.8059.85**.

## ✅ NEW CASE 27 Oct 2026 — `mvbarsize-large` (MONTH-BAR-SIZE-PLAN.md): the Large phase bar size; every other case untouched

- **Signed off** on `monthbase.py sheets` contact sheets of all 16 months: the same calendar exported at Standard |
  Large | difference, so only what the size changes shows red. The answer was **"Yes, cut it"** (picker, 27 Oct 2026).
- **What it holds:** `mvnotes`' calendar at `mvBarSize: "large"` (the fixture minted by the `mvbarsize` leg):
  - every phase bar, episode bar, Simultaneous Post and hiatus band at 12 px in a 22 px bar, with notes unchanged;
  - two one-day custom bars that wrap at the bars' size: "Camera Prep Day / For T" wraps only at Large (it fits one
    line at 10 px), and "Wardrobe Fittings / For The" wraps at both sizes;
  - the 26-week fill months.

  16 pages, 84,839 bytes, sha256 `2208e3ae4806e9d0…`.
- **No other case moved:** at Standard the step-3 build's gate 13 was byte-identical on reference, blocks, mvnotes,
  hiatus-blanklabel, month-dense60, halfdays, notewrap, monthscale, month-lanecap and dayoverrides, and the full gate
  (MONTH-BAR-SIZE-PLAN step 4) holds the rest.
- **Deterministic:** two exports from separate runs, step 3's and this one, were byte-identical.
- **Cut from** the build of `76315d2` on branch `month-bar-size` (`dist/index.html` sha256 `dac2a0cc16149561…`, 1,836,927
  bytes): `monthexport`'s X2 file, clock pinned to 22 Sep 2026, Google Chrome 156.0.8078.48 on macOS 15.7.9.

## ✅ NEW CASE 20 Oct 2026 — `mvnotes` (MONTH-NOTES-PLAN.md); every other case untouched

- **Signed off** on a contact sheet of its December 2025, April, May and December 2026 pages, print path beside the
  written file: **"Cut both"** (picker, 20 Oct 2026).
- **What it holds:** an edge month (December 2025) printed because it holds day notes and a custom holiday; No fill
  notes drawn as text alone (their fill and border LISTED `clear`, never painted); Pink, Red and Dark grey notes; a note
  on a hiatus day; two one-day custom pills that wrap to two lines, one cut with "…" on its second. 17 pages, 85,250
  bytes, sha256 `00f769160ea5dffc…`.
- **No other case moved:** the full gate's gate 13 on build `f6a7393896109030…` was byte-identical for every one of the
  twenty runs here, so items 2, 6, 10 and 17 changed no existing calendar's written PDF.
- **Cut from** that build's `monthexport` run (`/tmp/gate8985-mxa/nn.pdf`), Google Chrome 155.0.8059.85.

## ✅ RE-CUT 16 Oct 2026 — `halfdays` ONLY: a switch day's two bars meet half way through the square

**A deliberate change to one case**, the only baselined calendar with a .5 switch day.
- **The ruling.** The owner's own idea, 15 Oct 2026 (HALF-SQUARE-BARS-PLAN.md): *"the bar ends half way thru the
  calendar square and the next pill starts in the second half of the square"*. On a switch day the earlier episode's
  bar stops half way through the day's square and the next one starts there, in ONE lane, instead of stacking.
- **The frozen edit.** It changes frozen `renderMonthView` (the Production `place()` call, `takeLane()`, `halfSlices()`).
  The owner approved it by picker on 16 Oct 2026, against the plan's §4 gate. The writer (`mvlParseItem`,
  `mvlPackLanes`, the painter) was taught the same inset. It is not frozen.
- **The sign-off came first.** The owner saw `monthbase.py sheets` contact sheets of `halfdays` (old | new |
  difference), with a poppler render of the print path's July and August beside them. The answer was **"Yes, re-cut
  halfdays"** (picker).
- **What moved, by `check`:** pages 7 and 8 (July and August 2026), their content only. No text runs were added or
  removed, no page has a `…`, and the other 14 pages are pixel-identical. The file went from 80,141 to 80,147 bytes.
  The four switch weeks lose the stacked lane, so their rows fall back to the standard height, and every row of those
  two months is re-divided.
- **Every other case was held byte-identical, with no re-cut.** Each has whole day counts, or (Week label) no split,
  so no run carries a half flag, and the renderer writes exactly what it did.
- **Cut from** build `be311b275aa4d884…` (1,482,152 bytes), worktree `sweet-mestorf-8d18b8`, by the `monthexport`
  leg. The file is byte-identical to the one the owner was shown. Google Chrome **155.0.8059.82** (155.0.8059.40 at
  the 15 Oct cut).

## ✅ RE-CUT 15 Oct 2026 — one bar per episode or block ("Stacked bars, always"), and a new case

**A deliberate change to the month PDF of every calendar with episodes or blocks**, on the owner's ruling (15 Oct
2026): Production is drawn as one bar per episode (per block in Blocks mode), "Ep. 201" / "Block 1", with its
Production Week in the grey text, and a day where an episode or block changes half way through carries both bars,
stacked (HANDOFF, "HALF DAYS ARE AN EPISODE'S OR BLOCK'S .5"). It replaces ruling 8's one "Production Week N" bar per
week. No frozen code changed: the bars are cut in the non-frozen `pillRunsForWeek()`.
- **The sign-off came first.** `monthbase.py sheets` contact sheets (old | new | difference) for `reference` and
  `blocks`, and the new `halfdays` pages, went to the owner, with `check`'s report that all seventeen cases moved and
  nothing else did. The owner's answer: **"Yes, re-cut them"** (picker).
- **What moved, by `check`:** every case, and only Production's bar text and bar boundaries. In every case every month
  is still one page. `colswap-simpost-refuse` moved by 2 bytes: its bars read "Ep. 101" where they read
  "Production Week 1".
- **New case `halfdays`** (`tests/fixtures/halfdays.sptcal`, cut by the `halfdays` leg). Its switch days are the first
  files gated with two Production bars on one day.
- **Cut from** the build `7f0141bb409293f5…` (1,466,813 bytes) on worktree `half-day-episodes`, Google Chrome 155.0.8059.40 , in a full gate run in which every other
  check passed (1,301). `reference`, its UTC+14 and 1280 px runs, and `blocksoff` were byte-identical to each other.

## The cases

| case | pages | bytes | sha256 |
|---|---|---|---|
| `blocks` | 16 | 80,924 | `c30d64051e08f7c0…` |
| `blocksoff` | 16 | 81,797 | `334b7201d00cbc0a…` |
| `carry-rich` | 12 | 81,364 | `fd6eb0c3f17a0560…` |
| `colswap-simpost-refuse` | 3 | 52,093 | `e7c61351f91249b2…` |
| `dayoverrides-onhalf` | 15 | 79,062 | `d8412a2ff8c423fc…` |
| `dayoverrides` | 15 | 78,483 | `823760508bb58e5a…` |
| `halfdays` | 16 | 80,175 | `0d7fe82c12ab1c8c…` |
| `hiatus-blanklabel` | 16 | 81,771 | `7f1d74d966aef221…` |
| `month-dense60` | 16 | 82,774 | `7eaffbd744e68abd…` |
| `month-lanecap` | 16 | 82,027 | `9826805849c0d083…` |
| `monthnotes` | 16 | 81,914 | `a08f307d213e9ae6…` |
| `monthscale` | 16 | 82,604 | `1ac8beccb6def66a…` |
| `mvbarsize-large` | 16 | 84,839 | `2208e3ae4806e9d0…` |
| `mvheader` | 15 | 93,711 | `3b27269ca9927293…` |
| `mvheaderlegacy` | 15 | 78,664 | `040e7fa35a7c88b1…` |
| `mvnotes` | 17 | 85,263 | `548db8b44109b249…` |
| `mvnotesize-14` | 17 | 85,669 | `4e9044e69ccf2c69…` |
| `mvnotesize-mixed` | 17 | 85,174 | `87f31bc80a808fb6…` |
| `notewrap` | 16 | 82,381 | `c6859e3548abb580…` |
| `reference` | 16 | 81,805 | `bc2f28cdedd335fd…` |
| `shootorder` | 16 | 81,796 | `57d295b56f8d85e7…` |
| `stintswap-reshape` | 25 | 102,988 | `ac8edffe491e1932…` |

Loaded with `HARNESS_STATE=<case>`, except `reference`, which is `T.buildFixture()` typed into a fresh page.

| case | why it is here |
|---|---|
| `reference` | the harness's reference calendar; gate 10's and every hand A/B's first case |
| `blocks` | Blocks mode: Production's pills carry the block tag as grey text |
| `monthscale` | a dense August, **shrunk evenly** to 39/64 (step 4, ruling 3) |
| `colswap-simpost-refuse` | the Simultaneous Post band, the one kind of bar tier 1 never prints |
| `stintswap-reshape` | 25 months, the longest calendar |
| `dayoverrides` | all four `dayOverrides` kinds, a snap-off Wednesday start, a named hiatus |
| `mvheader` | the month header in Template mode, all four slots, one format |
| `mvheaderlegacy` | a Manual header saved before templates: braces print literally, so its date slot prints `{version}` and the file reads no clock at all |
| `dayoverrides-onhalf` | `onhalf` marks: the on tint plus the ½ |
| `month-lanecap` | 25 notes on one day; its August is shrunk to 30/64 |
| `hiatus-blanklabel` | a hiatus whose labels were emptied: the band prints blank at full height (step 4, ruling 4) |
| `month-dense60` | 60 notes in one week; its August is shrunk to 49/64 |
| `monthnotes` | edited month-view notes |
| `shootorder` | the episodes' shooting order in the grey "Ep." text |
| `notewrap` | four long texts, made through the real UI |
| `carry-rich` | every store populated |
| `halfdays` | ⭐ ADDED 15 Oct 2026: 4.5-day episodes (one of 5), so Production splits per episode. Its switch days' two bars stacked; since the 16 Oct re-cut they meet half way through the square in one lane |
| `mvnotesize-14` | ⭐ ADDED 2 Nov 2026: the month view's Note size at 14 px; notes on two lines at most, cut with "…" |
| `mvnotesize-mixed` | ⭐ ADDED 2 Nov 2026: 12 px notes, 13 px bars, and notes with sizes of their own (14 and 8 px) |

**Held to another case's file**, with none of their own:
- the reference under UTC+14, and in a 1280 px window, are held to `reference`;
- ~~**`blocksoff`** is held to `reference`, as gate 10 holds it.~~ **Until 20 Oct 2026 (late).** It has its own file now,
  `blocksoff.pdf` (re-cut entry above): an older file's episodes read "Episode N" and reference's "Shoot Ep. N". It is
  still held to `reference`'s TEXT once both names are read as the episode.

## The rule (owner rulings, 2 Oct 2026, picker)

- **The gate passes only on identical bytes.** `monthbase.py check` does the comparison.
- **On a mismatch it says which of two things happened, and it fails either way:**
  - **"ONLY CHROME'S COMPRESSOR CHANGED":** every object is identical once its streams are inflated, with `/Length`
    and the xref offset set aside. Each page's content goes through the frozen `pdfDeflate`, which is Chrome's own
    `CompressionStream`, so a Chrome update can compress the same content to other bytes. The four font programs cannot
    move this way: they travel pre-compressed inside the build.
  - **"THE CONTENT MOVED":** each part that differs is named by its role: the page and month, a font's `/Widths`,
    the page tree. It gives the first differing line, and the text runs added and removed.

## ✅ RE-CUT 28 Oct 2026 — SIXTEEN CASES: episode bars read "Shoot N" (episodes are named "Episode N" again)

The ruling and the owner's sign-off are gate 10's (its README, the same day, *"Re-cut + gate"*): episodes are named
"Episode 101" again and a bar for one episode reads "Shoot 101". The contact sheet (`monthbase.py sheets`, halfdays)
was put in front of the owner: only June–September move, red only on the bar names and the grey text after them, which
starts closer because "Shoot 201" is narrower than "Episode 201". Classified: each file's `pdftotext -raw` text equals
the old baseline's once "Shoot Ep. N" / "Episode N" and "Shoot N" are all read as the episode, the counts below equal,
and no "Shoot Ep" or "Episode" left.

⭐ **`blocksoff.pdf` is byte-identical to `reference.pdf` again** (both draw "Shoot N"). It keeps its own file, and the
gate's text check against `reference.pdf` still runs.

| case | bytes before → after | bars now "Shoot N" (pdftotext) |
|---|---|---|
| `reference` | 81,805 → 81,785 | 31 (were "Shoot Ep. N") |
| `colswap-simpost-refuse` | 52,093 → 52,089 | 7 |
| `stintswap-reshape` | 102,988 → 102,978 | 26 |
| `dayoverrides` | 78,483 → 78,468 | 30 |
| `mvheader` | 93,711 → 93,708 | 30 |
| `mvheaderlegacy` | 78,664 → 78,652 | 30 |
| `blocksoff` | 81,797 → 81,785 | 31 |
| `dayoverrides-onhalf` | 79,062 → 79,048 | 32 |
| `hiatus-blanklabel` | 81,771 → 81,756 | 28 |
| `monthnotes` | 81,914 → 81,898 | 31 |
| `shootorder` | 81,796 → 81,785 | 31 |
| `notewrap` | 82,381 → 82,370 | 28 |
| `carry-rich` | 81,364 → 81,343 | 27 |
| `halfdays` | 80,175 → 80,164 | 20 |
| `mvnotes` | 85,263 → 85,251 | 31 |
| `mvbarsize-large` | 84,839 → 84,814 | 31 |

Held, untouched and byte-identical: `blocks`, `monthscale`, `month-lanecap`, `month-dense60` (no episode bars). Each
file is the `monthexport` leg's X2 file from a run of the gate's own invocation (`HARNESS_PORT=9533`) on build
`465e3e03…` (branch `ep-shoot-bars` at `bb940e6`), Google Chrome 156.0.8078.49; `monthbase.py check` byte-identical
against each new file. The full gate that follows holds `rz` and `rw` to the new `reference.pdf`.

## ✅ RE-CUT 20 Oct 2026 (late): thirteen cases read "Episode N"; `blocksoff` gets its own baseline

The ruling and the owner's sign-off are gate 10's (its README, the same night): an episode's bar reads its NAME; a new
calendar names episodes "Shoot Ep. 101", so `reference` and every calendar typed in fresh print exactly as before; old
files keep "Episode 101", so every Episodes FIXTURE here now prints "Episode N" where the last cut said "Shoot Ep. N".
Contact sheets (`monthbase.py sheets`, halfdays and shootorder) were put in front of the owner: red only on the bar names
and the grey text after them, which moves left because "Episode 201" is narrower than "Shoot Ep. 201". `check` said
**THE CONTENT MOVED** for each. Classified: each file's `pdftotext -raw` text equals the old baseline's once "Shoot Ep. N"
and "Episode N" are both read as the episode, with the counts below equal and no "Shoot Ep" left.

⚠️ **`blocksoff` has its own baseline now** (`bo:blocksoff:blocksoff`): it was held to `reference.pdf`, and an older file's
"Episode N" cannot set the same bytes as "Shoot Ep. N". Its text is still held to `reference.pdf`'s, page by page, once
both names are read as the episode (a block after the gate-13 loop, proven to fail against another calendar).

| case | bytes before → after | "Shoot Ep. N" → "Episode N" (pdftotext) |
|---|---|---|
| `colswap-simpost-refuse` | 52,134 → 52,135 | 7 |
| `stintswap-reshape` | 103,019 → 103,011 | 26 |
| `dayoverrides` | 78,471 → 78,468 | 30 |
| `mvheader` | 93,776 → 93,764 | 30 |
| `mvheaderlegacy` | 78,655 → 78,650 | 30 |
| `dayoverrides-onhalf` | 79,160 → 79,155 | 32 |
| `hiatus-blanklabel` | 81,757 → 81,744 | 28 |
| `monthnotes` | 81,924 → 81,922 | 31 |
| `shootorder` | 81,785 → 81,779 | 31 |
| `notewrap` | 82,362 → 82,347 | 28 |
| `carry-rich` | 81,491 → 81,490 | 27 |
| `halfdays` | 80,183 → 80,182 | 20 |
| `mvnotes` | 85,293 → 85,287 | 31 |
| `blocksoff` (NEW; was held to `reference`) | 81,780 | 31 |

Held, untouched and byte-identical: `reference` (and `rz`, `rw`), `blocks`, `monthscale`, `month-lanecap`,
`month-dense60`. Copied from `/tmp/gate9261-mxa/` (build `be984cdc…`, branch `ep-shoot-names` at `f84b378`, Google Chrome
155.0.8059.85); `monthbase.py check` byte-identical against each new file.

## Re-cutting

Only deliberately, and record it here with a table of what moved and why. An undocumented re-cut cannot be told apart
from absorbing a real regression.

1. **A deliberate change to what the month PDF draws** (the writer, its fonts, or anything it reads from the
   renderer). The session that makes the change does the following:
   - runs `python3 monthbase.py sheets <baseline>.pdf <new>.pdf <dir> --name <case>` for every case that moved. It
     makes a contact sheet of old | new | difference per calendar, plus the full-size triptych of each page that
     differs. Red marks every pixel that differs, with no tolerance;
   - puts the sheets and `check`'s report of what moved in front of the owner;
   - re-cuts only on the owner's yes.
2. **The one exception: only Chrome's compressor changed.** This applies when every failing case says so, and nothing
   else in the gate failed. Re-cut without contact sheets, since nothing a reader can see has moved. Record the Chrome
   version before and after, and `check`'s output, here, and **tell the owner**.
3. **Never re-cut on a red gate 13 you cannot explain.**

**How to cut.** Run the gate (or its export section). The files land in `/tmp/gate<port>-mxa/` as `<run>.pdf`.
Copy each run to its case:

```
r→reference  b→blocks  ms→monthscale  sp→colswap-simpost-refuse  sr→stintswap-reshape  do→dayoverrides
mh→mvheader  ml→mvheaderlegacy  oh→dayoverrides-onhalf  lc→month-lanecap  hb→hiatus-blanklabel
d6→month-dense60  mn→monthnotes  so→shootorder  nw→notewrap  cr→carry-rich  hd→halfdays  nn→mvnotes  bo→blocksoff
bl→mvbarsize-large  n4→mvnotesize-14  nm→mvnotesize-mixed
```

Then run `python3 tests/harness/monthbase.py table tests/baselines/<dir>` for the table above. A new case needs a run
in `gate.sh`'s `MXSPEC` list and a line in its gate-13 list.

## ⭐ Proven to fail, not only to pass

**`check`, on files made to differ from `reference.pdf`.** Each was red with the right diagnosis:

| control | `check` says |
|---|---|
| every content stream re-deflated at level 1 (a stand-in for a Chrome update) | ONLY CHROME'S COMPRESSOR CHANGED, 16 streams, by page and month |
| a fill colour changed by 0.0006 | THE CONTENT MOVED: page 3 (March 2026), the `rg` line |
| a week's top line moved 1 px | page 5 (May 2026), the `re f` line |
| a weekday label changed | page 7 (July 2026); text runs removed `SUN`, added `SUM` |
| one `/Widths` entry changed | font F600, code 65 |
| the last page dropped | pages 16 → 15, April 2027 removed |
| a truncated file | does not parse as the writer's layout |
| no file | "the run wrote no file" |

**The whole chain:** the same edit on copies of the BUILD and the SOURCE (`dist/_mut.html`, `?src=`). `monthexport`
stays green, since build and source still agree, while gate 13 goes red and names the change:

| mutant | gate 13 |
|---|---|
| the weekend fill `#F4F3F0` → `#F4F3F1` | every page's weekend `rg` |
| the month bar's padding 7 → 8 px | every page, from the month bar down (≈ 125 lines a page) |

⚠️ **The byte gate is stricter than the eye.** The 0.0006 colour change renders to the same grey level, so `sheets`
shows 0 pixels for it, and only the bytes catch it. And `sheets` counts every differing pixel, unlike `monthab.py`'s
1 px allowance, which is right for the print against the writer but reported 0 pixels for a row moved by exactly one
pixel.

**Not applicable: the plan's "a date from the 1st to the 9th" control.** Nothing here normalises a date. The clock is
pinned, and a real date never reaches these files.
