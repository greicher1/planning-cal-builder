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

## ⚠️ Coverage gap, stated honestly

**Every month in all four cases fits in `fill` mode — none is in `scale` (shrink-to-fit).** So
`exportMonthPdf`'s second branch, where content taller than the page is `scaleY`'d down, is
exercised by no baseline. A change that tips a month *into* `scale` still fails here — the document
differs, and the fit table reports the mode change — but the scale branch's own output is unproven.
A fixture with a comment-heavy week in a six-week month would close it.

## Re-cutting

Only deliberately, and record it here with a table of what moved and why — an undocumented re-cut
is indistinguishable from absorbing a real regression. Copy the invocation out of `gate.sh`; the
cut differs only in the first argument:

```
cd tests/harness
HARNESS_PAGE=/dist/index.html HARNESS_STATE=<fixture or empty> HARNESS_PRINT_PDF=1 ./run.sh monthprint 60
python3 monthcmp.py cut monthprint.json monthprint.print.pdf ../baselines/2026-09-22-monthprint <case>
```
