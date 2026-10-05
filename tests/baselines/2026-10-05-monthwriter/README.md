# Baseline — 5 Oct 2026, the WRITTEN month PDF (gate 13)

**What this is.** The month PDF that **Export PDF** writes since step 5 of
[`MONTH-PDF-WRITER-PLAN.md`](../../../MONTH-PDF-WRITER-PLAN.md): the direct writer, through the Save dialog. It is
held **byte for byte** on seventeen calendars. It is the before-side of `gate.sh`'s **gate 13** (UI-CONVENTIONS §10,
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

## The cases

| case | pages | bytes | sha256 |
|---|---|---|---|
| `blocks` | 16 | 80,274 | `f9c9764981add6be…` |
| `carry-rich` | 12 | 80,264 | `f557f5ce19f42f32…` |
| `colswap-simpost-refuse` | 3 | 52,123 | `34c08745f1dcdee3…` |
| `dayoverrides-onhalf` | 15 | 77,282 | `90ea89c47a12df7f…` |
| `dayoverrides` | 15 | 76,906 | `6de59086a2c9db40…` |
| `hiatus-blanklabel` | 16 | 80,318 | `55bcf5e7fa729282…` |
| `month-dense60` | 16 | 82,115 | `7c9355a41dc7d096…` |
| `month-lanecap` | 16 | 81,358 | `4ab8c11a4b3dc301…` |
| `monthnotes` | 16 | 80,178 | `a5bf1fe55ac2e433…` |
| `monthscale` | 16 | 81,958 | `896fa69b1308f1da…` |
| `mvheader` | 15 | 92,222 | `08310f84bbdb8e60…` |
| `mvheaderlegacy` | 15 | 77,088 | `bc533003b85e090d…` |
| `notewrap` | 16 | 80,935 | `12b88222b75c131f…` |
| `reference` | 16 | 80,038 | `bf387fc23cbcfc65…` |
| `shootorder` | 16 | 80,037 | `9788ec07b8d6b4ae…` |
| `stintswap-reshape` | 25 | 102,037 | `0764e9038c75aaf5…` |

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

**Held to another case's file**, with none of their own:
- the reference under UTC+14, and in a 1280 px window, are held to `reference`;
- **`blocksoff`** is held to `reference`, as gate 10 holds it. It is the Blocks calendar switched to Episodes, and it
  is byte-identical to a calendar that never had blocks.

## The rule (owner rulings, 2 Oct 2026, picker)

- **The gate passes only on identical bytes.** `monthbase.py check` does the comparison.
- **On a mismatch it says which of two things happened, and it fails either way:**
  - **"ONLY CHROME'S COMPRESSOR CHANGED":** every object is identical once its streams are inflated, with `/Length`
    and the xref offset set aside. Each page's content goes through the frozen `pdfDeflate`, which is Chrome's own
    `CompressionStream`, so a Chrome update can compress the same content to other bytes. The four font programs cannot
    move this way: they travel pre-compressed inside the build.
  - **"THE CONTENT MOVED":** each part that differs is named by its role: the page and month, a font's `/Widths`,
    the page tree. It gives the first differing line, and the text runs added and removed.

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
d6→month-dense60  mn→monthnotes  so→shootorder  nw→notewrap  cr→carry-rich
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
