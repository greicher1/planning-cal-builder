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

Each case is two files: **`<case>.html`** is `#print-root`'s innerHTML at the moment
`exportMonthPdf` calls `window.print()`, with the page's own today stamp replaced by `DATESTAMP`;
**`<case>.json`** is what `monthcmp.py` derived from it plus the sheet count and page box of the PDF
Chrome actually printed (`/MediaBox [0 0 792 612]`, landscape Letter, every case).

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
