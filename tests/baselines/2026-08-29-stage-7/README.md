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
| `v1.0.0-saved.html` restore | 52 rows / 154 cells / **55 fields** · 0 clipped · grid 324 pt | `restore.json` |

`base.pdf.json` is `pdf-info.js` run over `base.pdf`; `base.pdf.txt` is every string the PDF draws,
in order — diff that file against a new export and you have the cheapest honest answer to "did the
PDF change".

## ⚠️ `restore.json`'s `form` was RE-CUT on 8 Sep 2026 — 56 keys to 55

Everything else in this directory is untouched and still dates from 29 Aug 2026. Only the `form`
object moved, and **not one value changed** — it is a key-set re-cut, and it was made for a reason
worth recording, because "the baseline was red so I re-cut the baseline" is normally how a real
regression gets absorbed.

**What gate 5 asserts** is that `fields.byId`'s key SET has not moved — the save-format contract,
since those keys are DOM element ids. It reads that set from `formSignature()` in
`tests/harness/t/lib.js`. But `formSignature()` was a **raw** sweep of `input[id], select[id],
textarea[id]` with none of `collectFieldValues()`'s exclusions, so it reported a **superset** of the
save format: the eight transient `tool-*` popover ids the engine deliberably drops, plus
`pref-gridlines`, a per-user preference that must never enter a saved file. Two different questions
had merged into one assertion, and it could fail for something that was not a format change at all.

`formSignature()` now carries the same two `.closest()` skips the engine has, so it reports the
actual `fields.byId` key set. Verified rather than assumed: the 55 keys it returns are **identical,
in both directions**, to the key set inside `tests/fixtures/hdrversion.sptcal`, a real
`captureSnapshot()` output. The re-cut baseline is that set.

| | ids | why |
|---|---|---|
| **removed (8)** | `tool-anchor-date`, `tool-anchor-edge`, `tool-anchor-phase`, `tool-ripple-phase`, `tool-ripple-weeks`, `tool-shift-weeks`, `tool-solve-date`, `tool-solve-phase` | transient tool-popover controls; `collectFieldValues()` skips `.tools-menu` and always did, so these were never in the format |
| **added (6)** | `phiatus-name-<key>` × 6 | per-phase hiatus names, 1 Sep 2026 |
| **added (1)** | `show-version` | the version number, 8 Sep 2026 (`HEADER-PRESETS-PLAN.md` Step 1) |
| **still absent** | `pref-gridlines` | a PREFERENCE, 3 Sep 2026. Inside `.prefs-card`, so it is correctly excluded now rather than being a permanent false alarm |

⛔ **This could not have been verified before 8 Sep 2026, and that is the real story.** The `restore`
leg threw on every run — `appReady()` waited for `renderRecents()` to reveal the file menu, and that
sits behind an `indexedDB.open` that never settles in headless Chrome under `--virtual-time-budget`.
Gate 5 is downstream of that throw, so **it had not executed since the baseline was cut**, and the
drift above accumulated invisibly. The probe now waits on engine-generated sidebar markup instead
(`#start-production` plus the `DEFAULT_HIATUSES` rows), which is IndexedDB-free, and the leg runs.
`t/fsprobe.js` still documents the stall itself, which is real and unfixed — it just never blocked
the Open path, only the probe that waited on it.

⚠️ `legacyNotice` in the stored file still reads `false` while a current run reads `true`. It is not
asserted by `gate.sh` and was left alone rather than re-cut on a guess about when the
legacy-upgrade strip started firing.

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
