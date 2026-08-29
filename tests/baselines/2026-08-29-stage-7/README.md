# Baseline — 29 Aug 2026, before Stage 7

**What this is.** The before-side of the acceptance gate in `HANDOFF.md` §2c, taken against commit
`37b877a` immediately before build-order Stage 7 (structured notes columns) was picked up. Stage 7
was then **held by the owner** and no line of `index.html` was written — see §2c, "Why it was held".

**Why it is kept even though the stage was held.** Re-deriving a baseline is an afternoon of
harness work, and the gate it belongs to is not specific to Stage 7: *"horizontal clipping stays 0,
the exports still validate, and a real v1.0.0 calendar still restores"* is the right gate for any
change that touches the grid or the width model. Anyone re-opening Stage 7, or starting Stage 8,
starts here.

**⛔ It is not deployed and never was.** These are captured outputs, not app files.

## The fixture

Built by driving the real DOM (`tests/harness/t/base.js`), never by calling into the IIFE:

- 10 episodes, 8 shoot days/ep, show "Test Show", season 2, region US / US-GEN
- Writer's Rm 12 wk from 2026-01-05 · Pre Prep 6 from 2026-04-06 · Prod Prep 6 from 2026-05-18 ·
  Production from 2026-06-29 · Post 16 from 2026-11-02 · Localization 8 from 2027-03-01
- a 2-week all-phase hiatus from 2026-08-24
- **all 14 holidays switched on for the waterfall** (they default to month-view only), so the notes
  column is exercised at its most crowded — which is where clipping shows up
- one free-text two-line user note on 2026-09-07

Two year blocks, 52 rows.

## The numbers

| Measurement | Baseline | File |
|---|---|---|
| **Horizontally clipped cells** | **0** | `base.json` → `hClipCount` |
| Vertically clipped cells | 3 | `base.json` → `vClipCount` |
| Grid width, unscaled | 797 pt | `base.json` → `gridWidthPt` |
| Column widths | `2026: 53 / 88 / 88 / 179` · `2027: 53 / 86 / 86 / 164` | `base.json` → `cols` |
| Rows | 52 | |
| Excel | 10,169 B · XML valid · header 238/255 · 75 merges, 0 overlapping · portrait | `base.xlsx` |
| Waterfall PDF | 76,568 B · 612×792 · 204 text ops · 279 rects · grid drawn 573.84 × 572.4 pt | `base.pdf` |
| `v1.0.0-saved.html` restore | 52 rows / 154 cells / 56 fields · 0 clipped · grid 324 pt | `restore.json` |

`base.pdf.json` is `pdf-info.js` run over `base.pdf`; `base.pdf.txt` is every string the PDF draws,
in order — diff that file against a new export and you have the cheapest honest answer to "did the
PDF change".

⚠️ **"Clipped cells" means HORIZONTAL clipping.** The first version of this measurement counted
vertical overflow too and reported three failures against *untouched* code. Vertical overflow is
deliberate: rows are a fixed height and text is fitted to the row, so a three-line note in a 20 px
row is clipped by design once the shrink floor is reached. Only horizontal clipping is the padding
trap that has landed twice (`HANDOFF.md` §3), and only horizontal clipping is the gate.

## Reproducing it

```bash
cd tests/harness
./run.sh base 45
./run.sh restore 35
./check-xlsx.sh base.xlsx
node pdf-info.js base.pdf base.pdf.txt
```

Then diff `base.json` and `base.pdf.txt` against the copies here. The fixture is deterministic
except for one thing: **the header's left-hand line is today's date**, so `sampleTexts[0]` and the
first line of `base.pdf.txt` will differ, and the PDF's byte length can shift by a byte or two.
Nothing else in the capture depends on the clock.
