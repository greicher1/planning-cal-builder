# tests/harness/

The headless-Chrome harness described in `PROJECT-CONTEXT.md` §11, committed so it stops being
rebuilt from scratch every time someone needs it. **It is not deployed and not part of the app** —
nothing in `index.html` references it.

## Why it looks like this

The app has no build step, no runner, and one `<script>` block wrapped in an IIFE. Nothing inside
that IIFE is a global, so a test **cannot call the app's functions** — it has to drive the DOM the
way a user does: set a field and dispatch `input`+`change`, or click a button. And because some
tests need to *fetch* a fixture, the page has to be served over HTTP rather than opened from
`file://`.

So: a throwaway server injects a test script into `index.html`, headless Chrome runs it with
`--dump-dom`, and the test writes its result as JSON into a `<pre id="R">` that gets parsed back
out. That is the whole mechanism.

**And that is why it is Chrome-only.** `--headless=new`, `--dump-dom` and `--virtual-time-budget`
are the mechanism, not an implementation detail of it. Safari has no headless mode and no DOM dump
— only `safaridriver`, a windowed WebDriver browser that must be enabled by hand; Firefox has
headless but no `--dump-dom`. `CHROME=` swaps the *binary*, not the browser engine's capabilities:
point it at anything but a Chromium build and nothing works. Porting this is a rewrite as a
WebDriver client. See `HANDOFF.md` §3, which also separates this from the app's own Chromium
requirement — they are different constraints and get confused for each other.

## Running

**Start here: the acceptance gate, in one command.**

```bash
cd tests/harness
./gate.sh                       # the whole gate against /dist/index.html (the BUILD)
./gate.sh /index.html           # ...or against the deployed single-file app
```

`gate.sh` is the entry point the freeze rule in `CLAUDE.md` demands: it builds the fixture, measures
the frozen grid, compares the **waterfall PDF** and every **Excel part** against
`tests/baselines/2026-08-29-stage-7/`, restores the real v1.0.0 saved calendar, asserts
`fields.byId` is unchanged, and — since 22 Sep 2026 — compares the **month PDF** on nine calendars (four when it was added)
against `tests/baselines/2026-09-22-monthprint/` (the printed document byte for byte, and one sheet
per month in the PDF Chrome actually prints). It defaults to **`/dist/index.html`**.

⭐ **A full gate is minutes now, not an hour.** `run.sh` used to wait out every leg's full budget
in wall-clock, because Chrome does not exit after `--dump-dom`; since 22 Sep 2026 it polls for the
dump to finish and kills Chrome then. The `base` leg went from 49 s to 6 s.

⛔ **`run.sh` DOES NOT.** It defaults to `HARNESS_PAGE=/index.html` — the **deployed** app — so the
individual commands below test the single-file build unless you say otherwise:

```bash
./run.sh base 45                                  # ⚠️ the DEPLOYED app
HARNESS_PAGE=/dist/index.html ./run.sh base 45    # the BUILD
HARNESS_PAGE=/dist/index.html ./run.sh restore 60 # open the v1.0.0 fixture in the BUILD
HARNESS_PAGE=/dist/index.html ./run.sh fsprobe 30 # why is the file menu never revealed?
```

This mismatch has already produced one confidently wrong diagnosis — see the Traps section.

Results land beside the script as `<name>.json`, plus `<name>.xlsx` / `<name>.pdf` when the test
captured an export. Those outputs are gitignored — commit a copy into `tests/baselines/` when you
want to keep one.

### The two frozen-output proofs, and why they used to be red

`gate.sh` compares the waterfall PDF and every Excel part against the baseline — these are the
checks that prove the **frozen writers have not moved**, and they matter more than anything else
here.

⚠️ **Both used to FALSE-FAIL on every run after the day the baseline was cut**, because the PDF
header and the Excel header both stamp `todayStr`. That was documented as expected — which meant two
permanently-red gates that nobody read. Fixed in round 7: `pdfcmp.py` decompresses the PDF's content
streams, substitutes **only** the dotted `M.D.YY` stamp, and byte-compares the rest;
`sheet1.xml` gets the same single substitution. Calendar CONTENT renders dates with slashes
(`1/5/26`), so a real change to a printed date still fails.

⛔ **A red there now means something real.** Do not re-widen the exemption to make it green.

⚠️ `pdfcmp.py` compares only successfully-decompressed Flate streams, on purpose: a first version
also compared the **xref table**, whose byte offsets shift mechanically whenever any object's length
changes, so the date stamp alone made it "differ". Excluding it hides nothing — every object's
content is still compared strictly.

Then validate the exports:

```bash
./check-xlsx.sh base.xlsx           # the four things that make Excel cry "corrupt file"
node pdf-info.js base.pdf base.txt  # page box, text/rect counts, grid extent, every string
```

Environment: `HARNESS_PORT` (default 8231; ⛔ **any other session on this machine must pick its own** —
a non-default port also namespaces the Chrome profile as `/tmp/tc<port>-<test>` and `gate.sh`'s Excel
diff dirs as `/tmp/gate<port>-xa|xb`, since 29 Sep 2026; the default keeps `/tmp/tc-<test>`, so two
sessions both on the default still kill each other's Chrome), `CHROME` (default the standard macOS path),
`HARNESS_STATE=<fixture>` (start from `tests/fixtures/<fixture>.sptcal` via the inline `?state=`
path), `HARNESS_PRINT_PDF=1` (Chrome also **prints** the page to `<name>.print.pdf` when it dumps
it — the real print pipeline, used by `monthprint`), `HARNESS_WINDOW=<w>,<h>` (the window, default
`1600,1200`; `monthemit`'s determinism control), `HARNESS_QUERY=<k=v&…>` (appended to the page's query,
for a leg that reads its own parameters: `monthemit`'s `src=`, which the mutant runs use so that
`src/legacy/app.js` is never edited), and ⚠️ **`HARNESS_PAGE` (default
`/index.html`)** — the one whose default silently changes *what program you are testing*.
`gate.sh` overrides it to `/dist/index.html`; `run.sh` does not. `TZ` passes through to Chrome
(`monthemit` reports the zone it ran in, so a control that changed nothing is visible).

⚠️ **The `[seconds]` argument is Chrome's VIRTUAL time budget, not a wall-clock limit.** `run.sh`
waits for the dump to end in `</html>` and hold its size across two polls, then kills Chrome; it
reports how long that took on **stderr** (`run.sh: base: dumped after 3.1s wall-clock`) so stdout
stays exactly `parse.js`'s output. The wall-clock cap is `3 × seconds + 30` and exists only to bound
a genuine hang — if it fires, stderr says `no complete dump`, and that is a real problem, not a
timing flake.

## Files

| | |
|---|---|
| `run.sh` | one test, end to end: start server → Chrome → **poll until the dump is complete** → kill → parse → stop server |
| `t/monthprint.js` | the month PDF's document, captured at the `window.print()` call with the today stamp normalised, then put back into print state so `HARNESS_PRINT_PDF=1` prints exactly it. `gate.sh` runs it four times: the reference calendar, `dayoverrides`, `mvheader`, `mvheaderlegacy` |
| `t/blocks.js` | block shooting on the minted `blocks.sptcal`: the restore, labels-not-dates on a hand move, one-step undo, the Blocks↔Episodes round trip, the restore default through the REAL picker, and the in-pill tag's fit (screen, print width, a three-block week, a one-day piece carrying none) |
| `t/shootorder.js` | Episodes mode's shooting order on the minted `shootorder.sptcal`: the grey "Ep." text in shooting order, both drop sides, labels-not-dates, one-step undo, and the two month-view Preferences (no undo step, not in `fields.byId`, rows scoped to their view) |
| `monthcmp.py` | ⭐ gate 10: a `monthprint` capture against `tests/baselines/2026-09-22-monthprint/` — the document byte for byte, one printed sheet per month, the stamp count. On a mismatch it says whether only inline styles moved and prints the per-month **fit table** (fill/scale, every week's height). `cut` makes a baseline; `ab` compares two saved captures, which is the A/B for a frozen edit that is *meant* to move the month PDF |
| `srv.js` | serves the repo root; injects `t/lib.js` + `t/<name>.js` into `index.html?test=<name>` |
| `parse.js` | lifts the `<pre id="R">` payload out of the dump, un-escapes it, splits off base64 files: a `xlsx` / `pdf` / `sptcal` field as `<name>.<ext>`, and a `pdfs: {doc: base64}` map as `<name>.<doc>.pdf` (one per document, since 1 Oct 2026; `run.sh` clears a leg's old ones first) |
| `t/lib.js` | shared helpers: fixture builder, clipping/width measurements, export capture, fake file picker, and `altSwap(dir)` (Alt+←/→, the column swap's keyboard path since the Swap buttons went, owner ruling 2) |
| `t/base.js` | the acceptance-gate measurement: grid, clipping, Excel, waterfall PDF |
| `t/restore.js` | the compatibility test: does a real v1.0.0 saved calendar still open |
| `t/sharecopy.js` | does "Export shareable copy" bake transient notice strips into the file (HANDOFF §2h) |
| `t/probe.js` | diagnostic only: what is alive over time, with real timestamps |
| `check-xlsx.sh` | validates an `.xlsx` the way Excel rejects it, not the way a parser does |
| `pdf-info.js` | reads back a waterfall PDF so two exports can be diffed |
| `gate.sh` | ⭐ **the acceptance gate in one command**, diffed against `tests/baselines/`; defaults to `/dist/index.html` |
| `pdfcmp.py` | byte-compares two waterfall PDFs with ONLY the header's today-stamp normalised (see below) |
| `t/fence.js` | every computed style on the frozen surface, so two pages can be compared property by property |
| `t/noresetall.js` | Reset All is gone from the header and New does its job; A1 is the guard that its unguarded engine listener went with it (owner ruling 3). In the gate |
| `t/hdrcontrols.js` | `HARNESS_STATE=carry-rich`: the header controls off the calendar (owner rulings 1, 4, 5): the toolbar's Header button follows the view and anchors the mode menu, the Manual-only editor strip, nothing above the header otherwise, the view-split notes reset in the app header, "Reset hiatus bands" in the sidebar, one undo step each. In the gate |
| `t/launchopen.js` | double-click a `.sptcal` (1 Oct 2026): a fake `launchQueue` installed before boot hands the engine fake file handles, and the leg checks a cold launch (no recovery question on top, backup kept), Save writing back with no picker, the unsaved-work question (Cancel / Load), two files, a non-calendar and a newer-version file refused, a dialog already up (the launch waits for it), a half-typed note committed first, and a READ-only handle ("Autosave needs permission — click Save"; Save asks once). In-memory IndexedDB. The OS half (manifest → registered handler → the launch reaching the open window) is `tools/probe-file-handling.mjs`, not a leg. In the gate |
| `t/noswapbtns.js` | `HARNESS_STATE=colswap-gesture`: the Expand and Swap buttons are gone, the grid chip names "Alt+←/→ to swap", and Alt+arrows and double-click still do both jobs (owner ruling 2). In the gate |
| `t/interfonts.js` | the month PDF's four static Inter programs (MONTH-PDF-WRITER-PLAN.md §8 step 1): decoded as `loadCarlito()` decodes Carlito, read by the FROZEN `ttfRead`/`ttfGlyph`/`ttfAdvance`/`ttfTextWidth` sliced verbatim from `src/legacy/app.js`, and every glyph's advance within half a font unit of Chrome's own unkerned width of the app's Inter, at all four weights (Chrome's variable advances are fractional; a TrueType advance is a whole number). Also: the names subset-tagged and distinct, the ten WinAnsi characters the app's Inter lacks, each program loading as a font. In the gate |
| `t/monthlayout.js` | the month-PDF writer's LAYOUT MODEL (MONTH-PDF-WRITER-PLAN.md §8 step 2), held to the print document. The model's code (`MVL_GEOMETRY` … `buildMonthLayout` in `src/legacy/app.js`) is sliced verbatim with the frozen `ttf*` readers it calls, per the owner's "Slice it, no hook" (1 Oct 2026), and run in the page. With no `HARNESS_STATE` it reads tier 1, the eight gate-10 baseline documents that cover the nine calendars. With `HARNESS_STATE=<fixture>` it captures that calendar's print document as `monthprint` does. 14 cases: the real loader decodes `font-inter-500` lazily, and nothing calls it yet; the geometry is the leg's own derivation AND the live stylesheet's (a printed month laid out at the page's width); the model's reading of every month equals the leg's own regex reading; half slices sit exactly on the ½ days; a CONTROL re-pack at the document's own spans reproduces every lane; at the PDF's spans no non-note moves; every note's lines equal Chrome's own breaker on the same font program, on tier 1 and on edge cases. Records each span change, and whether the width or the metrics caused it. In the gate twice: tier 1, and `colswap-simpost-refuse` (Simultaneous Post) |
| `t/monthemit.js` | the month-PDF writer's EMITTER and SERIALIZER (MONTH-PDF-WRITER-PLAN.md §8 step 3). The writer (model and emitter, `MVL_GEOMETRY` … `buildMonthPdf`) is sliced verbatim with the frozen primitives it calls (`ttfRead` … `pdfDeflate`), per the owner's ruling that "slice it, no hook" extends. Every print document is laid out off-screen at the page's content size with the app's `@media print` rules transplanted into screen media (selector by selector, since the minifier merges rules), and the emitter is handed Chrome's own week heights (owner ruling: "Chrome's, measured"). The today stamp is pinned to one fixed date first (owner ruling). Tier 1 is the eight gate-10 documents plus six variants made from reference's first page: a wrapping title, highlights, formats, the widest and narrowest real stamps, and cut bar labels. 16 cases: the display list's every box (0.03 px), baseline and anchor against Chrome's layout, with Chrome's kerning measured and corrected for, never tolerated; every colour, font, weight, letter-spacing, italic and strike against Chrome's computed style; the file's structure, fixed font programs and exact `/Widths`; every run as wide by the file's own `/Widths` as the model measured and inside its box; and the bytes the same twice and through JSON. Writes one PDF per document (`monthemit.<doc>.pdf`). In the gate four times: tier 1, and `colswap-simpost-refuse` (its squeezed lanes are the only red for mutant E9), each again under `TZ=Pacific/Kiritimati`, tier 1 in a 1280 px window, all required byte-identical and read clean by `pdfinfo`/`pdftotext`/`pdffonts`. `HARNESS_QUERY=src=<path>` slices another copy of the source: the 24 mutants of 1 Oct 2026 ran that way, each red |
| `t/monthwriter.js` | the month-PDF writer's FIT (MONTH-PDF-WRITER-PLAN.md §8 step 4, ruling 3) and the in-page half of the A/B leg (plan §5.2). The writer (model, emitter and fit, `MVL_GEOMETRY` … `buildMonthPdf`) is sliced verbatim with the engine's `MV_MIN_LANES` and the frozen primitives, and every print document's months are fitted from the model alone, with no DOM. Three oracles, none of them the writer's code: the print path's FIT TABLE written into the document (each week's flex basis and grow); the print path's MEASUREMENT, re-run exactly as `exportMonthPdf` runs it (C0 proves it reproduces the table), which says which notes print measured at another width or span, the only reasons a week may differ; and CHROME'S LAYOUT OF THE WRITER'S DECISIONS: the document re-spanned to the writer's lanes, each note in the writer's lines (`white-space:pre`), the weeks at the writer's rows (rounded cumulatively onto Chrome's 1/64 px grid), a shrunk month restyled at its factor. 12 cases: the table kept wherever print measured as the writer lays out, and an explanation everywhere else (A0); Chrome's rows to 0.02 px in a month whose weeks all keep it (A1); the print path's rule, written in the leg, over Chrome's measure of the writer's lanes, in every month that fits (A2); every box, start and baseline where Chrome lays out the writer's decisions (A3); a shrunk month's factor (whole 64ths, the largest that fits, exactly where print shrinks), rows (filling the room, holding the lanes Chrome lays out), text sizes, first-fit re-pack (the leg's own) and re-wrap (Chrome's breaker on the PDF's program at the smaller size) (A4); a blank band full height (A5, owner ruling 5; the oracle gives Chrome's empty bar a zero-width space, its line box); the files (X0); determinism (R0). It ends with the documents in print state, stamp pinned and its own stylesheets removed, so `HARNESS_PRINT_PDF=1` has Chrome print them. Writes `monthwriter.<doc>.pdf` (and `monthwriter.print.pdf`); `info.ab` maps each print page to its month. In the gate eight times: tier 1, tier 1 under `TZ=Pacific/Kiritimati` (files byte-identical), `monthscale`, `month-dense60`, `notewrap`, `stintswap-reshape` and `colswap-simpost-refuse` fresh, and `notewrap` in a 1280 px window (its file byte-identical while the print document differs). `HARNESS_QUERY=src=<path>` slices a copy: the 19 mutants of 1 Oct 2026 ran that way, each red |
| `monthab.py` | the month PDF's A/B JUDGE (plan §5.2), run after `monthwriter` with `HARNESS_PRINT_PDF=1`: the writer's files against Chrome's real print, page by page. Gated: poppler reads both clean (P0); one writer page per month, one printed sheet per month (P1); 792 × 612 (P2); the month label on every page (P3); the same text tokens per page, strictly (P4: no page of tier 1 or tier 2 needed the hyphenation or "…" normalisation the plan expected); the grid's lines, read from both files' own vector coordinates, paired one for one within 1.5 CSS px in every month that keeps today's fit (P5; Chrome's real print snaps its page box and every border to whole pixels, so the writer's exact 8 mm lines sit up to 1.108 px away, measured on 200 such months). Months the writer lays out differently by design are reported, not judged. The PIXELS are the owner's report, never a gate: both files through `pdftoppm` at 96 dpi, a heat map with a 1 px tolerance, and `--sheets <dir>` writes per document a contact sheet of print, writer and difference for every month, plus the full-size triptych of every month that differs by design; `--no-pixels` skips them (the gate does). 4 mutants (a dropped page, a pill's label not drawn, the week lines 2 px low, the wrong month label), each red |
| `t/filekeys.js` | `HARNESS_STATE=v1.4.2-saved`: the file actions' keys (owner, 1 Oct 2026). ⌘N New, ⇧⌘S Save As and ⇧⌘E Export click their buttons, with ⌘S and ⌘P unchanged. On a Mac only ⌘ triggers them (⌃N and ⌃⇧E stay text navigation); elsewhere, Ctrl. A key repeat, an open dialog or the template header editor (above the dialog tier) does nothing. Each key blurs first, as a press does, so a Manual header line typed but not yet left reaches the file (K14). End to end: Excel and the month PDF, New's question, and Save As on a LINKED calendar writing a new file that the next ⌘S follows. `nofsa` B5 covers ⇧⌘S without the API. In the gate |
| `t/fsprobe.js` | diagnostic only: is the file menu hidden because IndexedDB never opened? Run it on BOTH pages |
| `t/hdrversion.js` | the version number typed into Show Info reaches the header's bottom-left slot — and an EMPTY field changes nothing on screen, in `&L` or in the PDF |
| `t/hdrverload.js` | the same version RESTORED from a file, nothing typed, plus the header MODE that came with it. Needs `HARNESS_STATE`; run three times — `hdrversion` (carries a version), `colswap-2col` (written before the field existed, so the field must come back empty) and `hdrmanualbraces` (saved in Manual with braces in two header lines, which must render verbatim — decision H4 against a real file) |
| `t/hdrpreset.js` | the preset library: H8 (templates, never values), a preset never entering a saved calendar while the applied header does, apply as one undo step, rename keeping the id, and deleting the last one removing the key |
| `t/hdrfile.js` | `.spthdr` export/import: the file carries templates, round-trip is identity with a FRESH id, junk is refused entirely, unknown line ids and format keys are dropped |
| `t/hdrexcel.js` | Excel's 255-character header cap: the budget meter warns, the workbook stays valid, and the trimmer drops right-hand detail before centre subtitles while every section keeps its lead line |
| `t/rowmigrate.js` | forward compatibility for the row-height re-keying: a REAL pre-10-Sep save (`rowheightlegacy.sptcal`) whose dragged row is stored by row INDEX must reopen with that height on the right WEEK and no other, default to one-column OFF, and carry the height with the week when toggled |
| `t/onecol.js` | one continuous column instead of a block per calendar year: off is today, on gives ONE year header starting at the first working week, the row count stays sane (the guard that keeps the two halves of the feature together), column keys stay `y<digits>:s<n>`, it travels in a real saved calendar without being double-stored, toggling back is byte-identical, and it is one undo step |
| `t/hdreditor.js` | the header template **editor**, and the third left slot it was built around: `l3` present on the calendar and hidden while empty (the frozen edits are inert), three slots per column, **not one `id` anywhere in the panel** — it is body-level, so `.prefs-card` does not cover it — styling done in the panel landing on the real header as the same `style` string, an edit resolving identically in both places (there is no second renderer), placeholders staying editor-only, `c4` revealed only for a calendar that uses it, and the default template still fitting Excel's 255-character cap |
| `t/hdrtemplate.js` | the template engine and the three modes end to end: tokens resolve in all three consumers, the store holds RAW templates, `__ctx` never reaches the save format, the bake warns first, Manual never resolves, and the ONE frozen edit (H3b) is inert while the flag is false |
| `prove-header-template.mjs` | 73 cases against the REAL resolver in Node, its source sliced verbatim out of `src/legacy/app.js`. Every §3.1 rule and §3.2 token. ⭐ Run by `gate.sh` |
| `rtleg.mjs` | runs any `t/<leg>.js` in REAL time over CDP, writing the same `<leg>.json` `run.sh` does. For what the virtual clock can't run: a service worker's `register()` (`swscope`), a freeze proved red. `gate.sh`'s `RTSPEC` block |
| `printpaper.mjs` | the month PDF printed at Letter and at A4-with-CSS-size-preferred over CDP (`Page.printToPDF`), because `run.sh` cannot choose a paper (audit L-3). The CDP template the other scripts copy |
| `pilldrag.mjs` | MONTH-9: a month pill dragged out and back in ONE gesture keeps Snap to Mon. Trusted `Input.dispatchMouseEvent`, which the pane's point-to-point drag and a `dispatchEvent` drag can't give |
| `cspproof.mjs` | 4.1: the app under its Content-Security-Policy, ZERO violations, with a recorder installed in every frame before any page script. It covers Excel, both PDFs, the month view, Save/Load, the update check, a shareable copy (framed and `file://`) and the install gate, plus a positive control run last |
| `prove-col-permutation.mjs` | the column-swap invariance theorem, fuzzed against the real `computeBlockLayout`. ⚠️ **Was never run by `gate.sh` until 8 Sep 2026** — it was named in a comment as something to run by hand, so the theorem the swap feature rests on was unguarded in practice. It runs now |

## Traps this harness has already fallen into

Every one of these produced a confidently wrong result. They are guarded in the code now, with the
reason attached; this is the index.

- **`--dump-dom` writes the file and then does not always exit.** The DOM lands on disk, Chrome
  stays alive, and the next command in the shell chain never runs — which looks exactly like the
  test hanging. `run.sh` backgrounds Chrome and hard-kills it for this reason. Never put the parse
  step after Chrome in the same foreground chain.
- ⛔ **A wall-clock kill timer is not a deadline for virtual time — and it produced "flakes" that
  were really kills.** Until 22 Sep 2026 `run.sh` killed Chrome after `[seconds]` REAL seconds. The
  budget is VIRTUAL: Chrome fast-forwards idle time but pays real time for real work, so on a loaded
  machine it ran out later than that and Chrome was killed before writing a byte. Three legs
  (`rowmigrate`, `hdrtemplate`, `stintreshape`) reported *"produced no result"* on a 0-byte dump in
  one session, each passing standalone. Fixed by polling for the dump itself. ⚠️ **The completion
  test is `</html>` at the end AND a size held across two polls**: the app bundle contains `'</html>'`
  string literals, so either test alone can stop early.
- ⚠️ **An HTML capture cannot see a CSS-only change.** `monthprint` proved it on purpose: `dist/`
  patched so `.print-page` is `130vh` left the captured document byte-identical while Chrome's
  print went from 16 sheets to 32. That is why the leg also prints a real PDF.
- ⚠️ **Chrome serialises `flexGrow` / `flexShrink` / `flexBasis` as the `flex:` shorthand.**
  `monthcmp.py`'s first cut read `flex-basis` off the style attribute, found nothing, and reported an
  empty fit table on a change that had moved every row. Read what the browser writes, not what the
  code set.
- **A NodeList held across a click that re-renders its list is detached.** A `forEach` over
  `#holiday-vis-list input.hv-cb` clicked 14 boxes and turned on **one**: the list rebuilds after
  each change. Detached clicks throw nothing and change nothing, so it reads as the app ignoring
  input. Re-query every iteration.
- **"Clipped cells" must mean HORIZONTAL clipping.** Counting vertical overflow too reported three
  failures against untouched code. Vertical overflow is deliberate — rows are a fixed height and
  text is fitted to the row, so a multi-line note in a 20 px row is clipped by design once the
  shrink floor is reached. Only horizontal clipping is the padding trap.
- **Stub `window.alert` into an array** before any Open/Save test. Every failure path in the file
  layer is an `alert()`, so without this a rejected file is indistinguishable from a silent no-op.
- **Allow ~2 s after triggering a restore.** It is async; measuring too early reports an empty
  calendar, which looks like a restore failure.
- **Pick a readiness probe only LIVE CODE can satisfy.** This was wrong twice before it was right.
  `#union-place`'s default option is `value=""`, so an empty string is the *correct* fresh state
  and also what a dead page shows; `#file-menu-label` ships the literal text "Untitled" in the
  markup. A probe a dead page also satisfies turns a broken page into a "broken feature". The
  ⚠️ **The probe that "works" has moved FOUR times.** The version this README used to recommend —
  `#file-menu` having children — is DEAD: Mantine renders the dropdown's items from React's first
  commit, so a page whose engine never started satisfies it. It then waited on `#file-menu-wrap`'s
  computed `display`, which only `renderRecents()` clears — correct as a liveness signal, but
  `renderRecents()` is behind the IndexedDB stall below, so it could never fire and the `restore`
  leg failed on **every** run. ✅ **Since 8 Sep 2026 `appReady()` waits on engine-generated sidebar
  markup** — `#start-production` (minted by `buildPhaseRows()`, which React cannot produce and the
  static skeleton does not carry) plus the four `DEFAULT_HIATUSES` rows. Live-code-only, and
  IndexedDB-free. ⛔ Do **not** substitute `table.sheet-table` here: a blank page has no grid until
  Show Info is complete, so it never appears before a file is opened. That was tried first and it
  timed out in a way that looks identical to the bug it was fixing.
- ⛔ **IndexedDB NEVER SETTLES in headless Chrome — this is not a one-in-three flake.** It was
  written up that way for two rounds ("fresh-profile stall, roughly one run in three"); round 7
  measured it directly with `t/fsprobe.js` and the truth is worse and simpler:
  `indexedDB.open('spt-planning-cal')` fires **no** `success`, **no** `error` and **no** `blocked`,
  past 8 s. `renderRecents()` sits behind that round trip, so `#file-menu-wrap` is never revealed
  and `appReady()` times out — while the app is otherwise completely healthy (grid renders, no
  errors, no alerts).
  **It behaves IDENTICALLY on the untouched deployed `/index.html`, which is the proof it is
  environmental and not a regression.** The File System Access API is present and the context is
  secure in headless, so capability is not the cause; the prime suspect is `--virtual-time-budget`
  fast-forwarding timers while IndexedDB does real async I/O. ⛔ Removing that flag is **not** a fix
  — tried, and `--dump-dom` then emits nothing at all, because the budget is what makes Chrome wait
  before dumping. Fixing it properly means changing how the harness waits (CDP, or a real-time run
  with an explicit dump trigger) and is its own piece of work.
  ✅ **BUT IT NEVER BLOCKED THE OPEN PATH — only the probe that waited on it.** Measured 8 Sep 2026:
  `#file-menu` is `keepMounted`, so its `Open…` item is in the DOM and enabled while the wrap is
  still `display:none`; the engine binds ONE delegated listener to `#file-menu`, so a `.click()` on
  the hidden item reaches it and bubbles regardless of visibility; and `window.showSaveFilePicker`
  **is** a function in headless, so `supportsFsAccess` is true and `openFileViaPicker()` does not
  early-return. With `appReady()` moved off IndexedDB the `restore` leg runs, and **gate 5 — the
  save-format key-set check — executes again after not having run since the baseline was cut.**
  The stall itself is still real, still unfixed, and `t/fsprobe.js` still documents it; it now costs
  only the recents list and the crash backup in headless, neither of which any leg asserts.
  ⏭ **Now cheap, and still missing:** no test opens a **`.sptcal`** through the real picker —
  `restore` opens the legacy `.html` fixture. `CLAUDE.md` names that as the outstanding insurance for
  §0 rule 3. The picker path is provably drivable now, so this is a short leg rather than a project.
  Two consequences: **gate a test only on the subsystem it actually uses** (`base` deliberately does
  not call `appReady()`, because it never touches the file menu), and when `restore` or `sharecopy`
  times out on the file menu, **prove it environmental** with
  `HARNESS_PAGE=/dist/index.html ./run.sh fsprobe 30` and the same against `/index.html`. Matching
  behaviour on both = environment. Only the build hanging = a real regression, start looking.
- ⛔ **`run.sh` defaults to the DEPLOYED app, and that has already produced a wrong diagnosis.**
  `PAGE="${HARNESS_PAGE:-/index.html}"`. So the instinctive move when `gate.sh` reports a failure —
  "let me re-run just that leg on its own" — silently tests a **different program**, passes, and
  reads as a clean bill of health. It is not one. Always pass `HARNESS_PAGE=/dist/index.html`.
- **Measure at the END of an async path, not at its first visible effect.** `showLegacyNotice()` is
  the last thing `openRecentFile()` does — after `applyStateSnapshot`, `refreshAfterRestore`,
  `persistRecents` and `renderRecents`. Reading the strip the moment the grid appears races it and
  reports `false` on a working app.
- **A fresh port per run, and kill the old server first.** `EADDRINUSE` silently leaves the *old*
  `index.html` being served, so a run can "regress" against code that has not changed.
- **Every test must build its own fixture.** Reusing state means an action that happens to be a
  no-op creates no undo step, so the next `undo` pops the test's own setup and every later
  assertion cascades into a false failure. One session lost eight assertions to this.
- **`requestAnimationFrame` does not fire while the browser pane is hidden.** If a fix depends on
  rAF, front the pane before measuring.

### Added during the audit batches (25–30 Sep 2026)

- **`--dump-dom` exits with a 0-byte dump when the DOM holds a lone UTF-16 surrogate.** Proven on a
  bare page, so it is Chrome, not the app. `T.done()` scrubs text nodes and field values first
  (`T.scrubSurrogates()`); the result JSON is safe on its own.
- **Never read the app's dialog with `document.querySelector('[role="dialog"]')`.** The four toolbar
  popovers and `#help-overlay` are also `role="dialog"` and come first, so a first-match selector
  never sees the modal (it produced one false "no dialog" audit result). Use `T.modalText()` /
  `T.clickModalButton()`, which read `.mantine-Modal-content`.
- **`T.modalText()` collapses whitespace.** When a dialog's LINES matter (a list), read the modal's
  own `innerText`: the dialog renders `white-space: pre-line`. And `pre-line` collapses a run of
  spaces, so a double space in a dialog string never reaches the screen.
- **A leg must never contain the closing-script-tag literal, even in a comment.** `srv.js` injects
  each leg inline, so the HTML parser ends the leg there and it reads "STILL PENDING". Write it with
  a backslash before the slash. And no `$` anywhere in a leg: exact-string comparisons, never
  anchored regexes.
- **The build carries a Content-Security-Policy (4.1), and `srv.js` strips it on `?test=` pages
  only**: legs are unhashed inline scripts, which the policy refuses. Pages served without `?test=`
  keep it (the pane's `?state=` pages, the install gate's iframes, a framed shareable copy).
  `HARNESS_KEEP_CSP=1` keeps it on a test page too and adds the injected scripts' hashes, so a leg
  runs under the real policy. No `t/` leg can see the policy itself; `cspproof.mjs` drives the
  policy-bearing page over CDP.
- **`run.sh` cannot prove a FREEZE red.** Under `--virtual-time-budget` a long blocking task costs
  many times its length in wall-clock time (11 s of regex took 2.5 min). Use `rtleg.mjs` (the real
  clock, over CDP) or the pane. `performance.now()` DOES count blocking time.
- **Under `--virtual-time-budget` a service worker's `register()` never settles.** `rtleg.mjs` runs
  such a leg in real time; `srv.js` serves a no-op `/__sw.js` with `Service-Worker-Allowed: /`.
- **Reading a large `File` is real async I/O that the virtual clock doesn't wait for**: poll longer.
  And poll at 100 ms; 20 ms polling is pathological on this page.
- **A fixed sleep after a Load races a busy machine.** `loadfail`'s `open()` slept 1.6 s, and with
  three Chromes running the next step started while the read was in flight. Wait for the load to
  LAND (the title, or a refusal).
- **Two full gates at once stall each other's Chrome**: a leg sits at 0% CPU until `run.sh`'s cap
  and reports "produced no result". Serialize full gates across sessions (message the other one
  first). Re-run a lone stalled leg alone on the SAME build before believing it.
- **Legs with their own `gate.sh` block are judged there, not in the AFSPEC list**: `restore`,
  `blocks`, `shootorder`, `stintexport`, `hdrexcel`, `hdrversion`, `prefs`, `wrapdate`. Copy the
  exact invocation, `HARNESS_STATE` included; without its fixture a leg times out and reads as a
  failure.
- **`T.gridSignature()` returns an ARRAY**: compare two with `JSON.stringify`.
- **`T.memoryIDB()` stores the crash backup by REFERENCE**, and `captureSnapshot()` hands out live
  stores: copy a snapshot you keep across steps. The backup is per page (`T.latestBackup()`).
- **Headless `el.focus()` / `el.blur()` DO deliver focus changes** (Mantine's blur clamp fired,
  `numclamp`), unlike the browser pane, where synthetic `focus()` fires no events.
- **The pane's drag tool goes point to point**, so it cannot make one gesture go out and come back,
  and a `dispatchEvent` drag skips hit-testing. `pilldrag.mjs` uses CDP's trusted
  `Input.dispatchMouseEvent`.
- **In a CDP script, the app's `beforeunload` guard makes a second `Page.navigate` wait on a dialog
  forever** once the calendar is dirty: accept `Page.javascriptDialogOpening`. And the previous
  case's edit leaves a crash backup, so the next fresh page opens "Recover unsaved work" over
  whatever you meant to click: decline it in setup.
- **Mantine's `data-disabled` keeps a button's disabled LOOK while its clicks still fire** (4.10);
  only `disabled` stops them.
- **The pane:** a hidden pane lays out at zero width, so take a screenshot before measuring
  geometry, and re-query the DOM if a screenshot looks stale (a Mantine modal fades in). A pane tab
  frozen by a long task keeps its renderer at 100% CPU until the pane's LAST tab closes. A fresh load
  raises "Recover unsaved work": cancel it (the slot is kept).

### Added during the header-controls build (30 Sep 2026)

- **A scripted `.click()` never moves focus, and the column swap's keys care.** Since owner ruling
  2 removed the toolbar's Swap buttons, a leg swaps with `T.altSwap(dir)` (Alt+←/→). The engine
  ignores those keys while a text field holds focus, so typing is never hijacked, and the removed
  buttons never checked focus. `onecol` left focus in `#shoot-days-per-ep`, then clicked Swap Block
  with `.click()`: the swap silently did nothing. A real click takes focus with it (verified in the
  pane), so the leg now calls `sb.focus()` before `sb.click()`. Do the same for any element a leg
  clicks before `T.altSwap`.
- **A Mantine Button's `textContent` runs the label and the caret together** ("Header: Manual▾").
  Read `.mantine-Button-label` for the label, and check `.caret` separately.
- **The header mode menu binds its outside-press listener one tick AFTER it opens**, so the click
  that opened it cannot close it. A leg that presses outside must wait a tick first.
- **The grid's count chip is held back while a swap's confirmation message is up** (about 4 s).
  After a swap, wait for the chip to appear rather than sleeping a fixed time.

### Added during the file-keys build (1 Oct 2026)

- **On a calendar with no linked file, Save and Save As do the same thing.** The first Save opens
  the save picker, so a Save As case run on an unlinked calendar passes even on a build where
  ⇧⌘S is still plain Save. `filekeys` K11's first draft did exactly that. Link a file first with
  one ⌘S into a stood-in handle. Then Save writes back with no picker, and only Save As asks again.
- **To find out which button a key clicked, record the click instead of delivering it.** Swap
  `HTMLButtonElement.prototype.click` for a recorder around a single `dispatchEvent`, as `cmdprint`
  P5 and `filekeys` do, and restore it in a `finally`. Nothing runs, so routing cases leave no picker,
  download or dialog behind for the next case.
- **A synthetic keydown carries no user activation.** A real ⇧⌘S may open `showSaveFilePicker()`,
  but a dispatched one may not. So stand in for the picker before the press; never let a leg reach
  the real one.

`PROJECT-CONTEXT.md` §11 carries the rest, including the false-failure table (why waterfall rows
look out of order, why `Post wk 1` matches inside `Simultaneous Post wk 1`, and so on). Read it
before believing a FAIL.
