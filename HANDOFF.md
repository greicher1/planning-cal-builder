# HANDOFF.md

Written at the end of the session that ended at commit `cf51a29` (28 Aug 2026).

**Read this first — before [`CLAUDE.md`](CLAUDE.md), before
[`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md), before touching `index.html`.** Those two describe the
app as a system and change slowly. This file describes *where things stand right now*: what was
just built, what was asked for and not yet delivered, what was learned the hard way, and the
working conventions the owner and the agent have settled on.

Reading order: **`HANDOFF.md` → `CLAUDE.md` → `PROJECT-CONTEXT.md`**.

Keeping this file current is part of the work. Update it in the same breath as any substantial
change — see §5d.

---

## 0. The rules that override everything else

1. **Never commit or push on your own initiative.** `main` auto-deploys to a live public site with
   real users on it. Ask, with an interactive checkbox picker, every time. See §5a.
2. **Never touch the grid or the exports.** `#table-wrap`, `#print-root`, the width model, the
   layout functions and the Excel/PDF writers are frozen. Not restyled, not refactored, not
   wrapped in components, not migrated to a UI library. The exact frozen surface is listed in
   `CLAUDE.md`. See §4.
3. **Every saved calendar must keep opening, forever.** Open reads *only* the `saved-state` JSON
   out of a file and replays it into the running app — the old file's code is never executed. The
   snapshot schema is therefore a permanent contract, and `fields.byId`'s DOM ids are part of the
   file format. See §4 and §7.
4. **Changelog every substantial change**, in `README.md`, in the same breath as the code. Cut a
   version — tag **and** `releases/vX.Y.Z.html` — when the app reaches a state worth returning to.
   See §5g.
5. **Watch the context window.** When the session is getting long, stop and tell the owner to save
   and migrate to a fresh session. See §5b.

---

## 1. Where the app stands

`index.html` is ~10,000 lines / 662 KB, one file, no build step. Live at
<https://greicher1.github.io/planning-cal-builder/>.

The through-line of the last stretch of work: the app had **three independent column-width
systems** (screen, Excel, PDF) that could never agree, and that — not the rendering — was why the
PDF never looked like an Excel print. Collapsing them into one shared model is what most of the
recent commits are really about.

```
sheetColumnWidths()   → Excel char units, measured with a real canvas
        ├─ screen     → <colgroup> + table-layout:fixed
        ├─ Excel      → column widths directly
        └─ PDF        → the same numbers read as points
```

`computePhaseRowLayout()` is the matching single source for *which phase occupies which column in
a given week*. All four consumers (screen, PDF writer, `sheetColumnWidths`, Excel export) call it,
so a layout change lands everywhere at once. **Keep it that way** — the previous divergence cost
weeks.

### Shipped in this session (21 commits, `ca26df0` … `cf51a29`)

| Area | What landed |
|---|---|
| Excel print setup | Letter, centered, print area pinned; gridlines default to the reference look |
| Embedded font | Carlito subsetted to 91 KB and inlined; the CDN font dependency is gone |
| One column model | `sheetColumnWidths()` now feeds screen, workbook and PDF |
| Resize | Drag columns and rows; autofit; shrink-to-fit for notes, phase labels and hiatus bands |
| Row line budget | Row height decides how many lines a note gets; per-note and per-hiatus font size |
| Direct PDF writer | ~500 lines: TrueType subsetting, `/FontFile2`, WinAnsi, xref, Flate. No print dialog |
| Page geometry | One orientation rule shared by the workbook and the PDF |
| Cell spans | Drag a cell's edge across the empty columns beside it; double-click to fill / un-fill |
| Even splits | Phases running at the same time divide the width evenly; phase columns share one width |
| Scroll | The preview holds its position through every edit |
| Row heights | Every row starts at the default; dragging snaps to matching heights |
| Note editor | A popover anchored to the cell instead of markup injected into it |

Bugs fixed along the way that were not the task at hand — worth knowing they existed, because each
was invisible until measured:

- 64 of 255 filled cells were silently ellipsis-clipped (CSS padding vs. the width model).
- 9 of 52 date cells were clipped the same way, on the one column where it is most obvious.
- ExcelJS omits `<col>` when `width === 9`, so the Date column's width never took effect.
- The workbook and the PDF disagreed about page orientation on a 3-block calendar.
- Excel dropped hard line breaks in notes (`wrapText` was only set at the shrink floor).
- "Reset Notes & Hiatus" never called `markDirty()`.
- A hiatus label walked away from a band that stayed put (locked, or before a ripple's cutoff).

---

## 2. Requested but not yet done

### 2a. Documentation is stale — **do this first**

`CLAUDE.md` and `PROJECT-CONTEXT.md` were last touched at `8a0c4f3`, **21 commits ago**. They still
describe the old three-way width situation and a character-weight table that no longer exists.
Nothing below is documented in them:

- the shared column model and `charsToScreenPx()`
- the embedded font and why measurement can no longer drift
- the resize system (`installGridResizers`, `colWidths`, `rowHeights`, snapping)
- the line-budget model (`cellTextFit`) and per-cell font sizes
- the direct PDF writer and the shared orientation rule
- `cellSpans` and the even-share rule
- scroll preservation (`captureScroll` / `restoreScroll` and the `.form-panel` anchor)
- the note editor being a popover

The width-unit trap and the 53-Monday asymmetry (§4) belong in PROJECT-CONTEXT §12.

### 2b. Settings menu + per-user persistence

The original ask that started this arc: *"Each sub-team within production has slight quirks in how
they like to build their calendars, especially the waterfall. We are going to need a global
settings menu… Ideally these settings save to each user's computer so they don't have to change
them every time."*

Three constants are already seeded as its first tenants — they exist precisely so the menu has
something to own:

```js
const SHEET_GRIDLINES = 'none';   // 'none' | 'dashed' | 'dotted'
const WF_PDF_MODE     = 'direct'; // 'direct' | 'print'
const GRID_TEXT_COLOR = '#000000';
```

Execs differ on gridlines specifically (some want them, some want dashed) — that is the concrete
motivating case. Persistence should be per-user and per-machine, so `localStorage`, **not**
`captureSnapshot()` — these are preferences, not calendar data, and must not travel inside a saved
file (see §4, "what NOT to do").

### 2b-2. Mantine UI redesign of the surrounding chrome — **decided, not started**

The owner has chosen **Option B** from [`MANTINE-MIGRATION.md`](MANTINE-MIGRATION.md): the
surrounding UI — toolbar, header, sidebar, tabs, cards, popovers, menus, labels, warnings,
settings, the help modal — is to be **redesigned** (not merely ported) on Mantine. The grid and the
exports are **frozen**, permanently, and that rule now sits in `CLAUDE.md` and in §0/§4 here.

Measured, not estimated (probe in the scratchpad, reproducible — see the migration doc §2):
React 19 + Mantine 9 as a single inlined file is **664 KB** with per-component CSS, **790 KB** with
the full `styles.css`, **1.50 MB** unminified. It **does run from `file://`** (verified by headless
Chrome `--dump-dom`), so emailing the tool as one file survives. Mantine 9's date components take
`'YYYY-MM-DD'` **strings**, so they fit the UTC-midnight convention without a dayjs hazard.

Two consequences that are easy to miss and hard to reverse:

- **Source stops being the artifact.** A build step means the repo file, the deployed file and a
  saved calendar are three different things, and the shipped one is minified. A saved calendar is
  no longer a *readable* copy of the app. Several past debugging sessions depended on that.
- **The §11 test harness breaks silently.** It drives the app with `el.value = v` plus a dispatched
  `input` event; React ignores that and every fixture would quietly assert against a blank
  calendar. Fix the harness (native value setter + keep the existing element ids) **before**
  porting anything, not after.

### 2c. Multiple / structured notes columns

The reference Excel export splits Notes into **two sub-columns**: a label and a right-aligned date
(`Drop 201, 202, 203  ⟶  7/28/28`). The app concatenates them into one centred string. This is the
single biggest remaining visual difference from a real Excel print, and it is also *why* the
geometry diverges — Excel's grid is 1301 pt wide against the app's 1104, and nearly all of that gap
is the notes columns. Adding the date sub-column would make the app width-bound like Excel and pull
row pitch back toward the reference on its own.

The owner also asked for the ability to **add extra notes columns**.

### 2d. Remaining PDF calibration

Measured against the owner's real Excel-exported reference:

| Metric | Excel | App | Δ |
|---|---|---|---|
| Page | 792 × 612 | 792 × 612 | — |
| Body text | 6.96 pt | 7.04 pt | +1.1% |
| Table top | 54.5 pt | 54.0 pt | −0.5 pt |
| Grid width | 754.5 | 706.5 | −48 |
| Grid height | 452.4 | 527.0 | +75 |
| Row pitch | 8.54 | 9.94 | +16% |

Excel is **width-bound** (its grid fills the printable width exactly and stops 105 pt short of the
bottom); the app is **height-bound**, so it stretches rows to fill the page. Same fit-to-page
intent, different binding constraint — and §2c is most of the cause.

Two smaller items: the app reserves 54 pt above the grid where Excel reserves ~21.5 (Excel puts its
header *inside* that band), and two palette entries differ — Pre Prep and Prod Prep are effectively
swapped versus the reference, and the header row grey is one step lighter (`#D9D9D9` vs `#D0CECE`).

### 2e. Known, deliberately left alone

- **Month view** still tints phase bars with the palette's `textColor`; the waterfall was changed to
  black text and the month view was not. Flagged to the owner, not acted on.
- **Switching to Month view and back** lands the waterfall at the top. The waterfall's scroll
  container does not exist while the month view is up, so there is nothing to restore onto.
- **`hiatusTexts` / `hiatusColors` shifting** now respects locked and pre-cutoff bands, but the
  guard is a different rule from `isPinnedWeek` (which is about date-pinned *notes*). Do not
  "unify" them — they are deliberately separate.
- **Font subsetting is build-time only** (`tools/subset-font.py`); PDFs embed the full subset rather
  than subsetting per document.

---

## 3. Findings worth keeping

### The MDW trap (the single most important number in the project)

Carlito/Calibri's `"0"` actually advances **7.4336 px** at 11 pt. Excel floors MDW to **7**.

```js
const EXCEL_MDW = 7;   // NOT 7.4336 — Excel floors it
```

Dividing measured text by the *true* advance yields columns ~6% narrower than Excel's autofit.
Every width in the app goes through `px = trunc(chars × 7) + 5`.

`SHEET_ZOOM = 0.75` is the other half: the screen renders 11 px type where Excel uses 11 pt, so
screen px and Excel points are numerically the same, and `charsToScreenPx()` serves both the screen
and the PDF.

### Carlito is metric-compatible with Calibri

Verified, not assumed: both give `"0"` an advance of 1038/2048 em, and a 155 px string measures
identically. This is what lets an embedded open-licence font stand in for Calibri without the
column model drifting.

### CSS padding must match what the width model budgets

The model budgets `EXCEL_CELL_PAD = 5` at `SHEET_ZOOM`, i.e. **3.75 px total**. Any cell rule that
spends more than that clips text by the difference, silently, with an ellipsis. This has now bitten
twice — body cells (20 px against 3.75) and the Date column (10 px). Breathing room belongs in
`COL_PAD_CHARS`, where **both** outputs get it equally.

### `table-layout: fixed` scales declared widths to the table's width

So widening one column without also updating the table's explicit width just steals room from every
other column, and the dragged one never reaches the size asked for. That was the entirety of "the
dragging feels weird."

### Excel's fit-to-page is a page CTM

The reference PDF's content stream opens with `0.58 0 0 0.58 0 33.16 cm` and draws all text at
`Tf 1` with `Tm 12`. So its "12 pt" body text is really 6.96 pt. The app bakes the scale into the
font size instead (`Tf 7.04`) — same result, different mechanism. Worth knowing when comparing
content streams.

### `requestAnimationFrame` does not fire while the browser pane is hidden

This silently invalidated a whole test run. If a fix depends on rAF, **front the pane** before
measuring, or the results are meaningless.

### Measure what the user perceives, not the raw number

Three "scroll jump" failures turned out to be Chrome's scroll anchoring correctly holding the view
still while `scrollY` changed. Comparing scroll numbers lied; comparing *where a given week's row
sits on screen* told the truth. Pick the metric that matches the complaint.

### Saved files carry their own copy of the app

A saved calendar is a copy of `index.html` with state baked in, so **it keeps the bugs it was saved
with, forever**. When the owner reports something already fixed, ask which file they are in before
digging. This has already caused one false alarm this session.

There is no service worker (removed deliberately, and old registrations are actively unregistered
on load), so the *live site* always serves current code on a normal refresh.

---

## 4. What NOT to do

**Do not push without being asked.** This is first because it is the one that actually went wrong.
In this session the owner authorised a push once ("lets push and commit all") and the agent then
pushed a further six times unprompted. `main` auto-deploys to a live site used by other people.
See §5 for the process that replaces this.

**Do not touch the grid or the exports.** `#table-wrap` and `#print-root` and everything inside
them, the width-model constants (`EXCEL_MDW`, `SHEET_ZOOM`, `EXCEL_CELL_PAD`, `COL_PAD_CHARS`,
`ROW_DEFAULT_PX`), the layout and text-fitting functions, and the Excel/PDF writers are **frozen** —
see `CLAUDE.md` for the exact list. This is not a style preference. Every number in there is a
measured answer to a specific failure: Excel floors MDW to 7 when the true advance is 7.4336; the
model budgets 3.75 px of cell padding and anything more silently ellipsis-clips (it has landed
twice); `computePhaseRowLayout()` is the one source four consumers share, and its previous
three-way divergence is why the PDF never matched an Excel print. **No third-party CSS baseline
may reach these elements** — Mantine's `global.css`/`baseline.css` must be fenced into a `@layer`
the grid rules outrank. The UI work in `MANTINE-MIGRATION.md` stops at this boundary.

**Do not break a saved calendar.** Open never executes an old file's code — it lifts the
`saved-state` JSON out and replays it into the *running* app (§7). So the snapshot schema is a
permanent contract: never rename, remove or repurpose a `captureSnapshot()` key; never restore
conditionally; a missing key falls back to a default, never to what is already in memory. And
**`fields.byId` is keyed by DOM element `id`**, which makes those ids part of the file format
rather than an implementation detail. `CLAUDE.md` has the full rule.

**Do not let a substantial change ship without a changelog entry.** `README.md`, newest first,
written with the code and not afterwards. `CLAUDE.md` has the rule; §5g has the shape.

**Do not report a fix without evidence from a real browser.** Reading the code is not verification.
The owner expects concrete before/after numbers.

**Do not trust your own measurement harness without sanity-checking it.** Every one of these
produced a confidently wrong report this session:

- Compositing a transparent PDF page onto black instead of white (both the reference and the app's
  PDF have transparent backgrounds — the "all black page" was the measurement, not the PDF).
- `sips` renders a PDF's CropBox; the Read tool renders its MediaBox. The reference has a CropBox.
  Rewrite it to the MediaBox — with a **byte-length-preserving** edit, or every xref offset breaks.
- Reading `wrapText` from `sheet1.xml`. ExcelJS writes alignment into `styles.xml`.
- Keying screen widths by column *role* in an object — `date`/`notes` repeat, so 11 columns
  collapsed to 7 and a comparison "failed."
- Clicking an off-screen cell programmatically and then blaming the app for scrolling it into view.
- A Python edit helper that `sys.exit(1)`'d on a failed match but only wrote the file at the end,
  silently discarding three edits that had already printed "ok". **Write per edit.**

**Do not put transient UI controls behind an `id`.** `collectFieldValues()` sweeps every
`input[id]` / `select[id]` / `textarea[id]` in the document into saved files *and* the undo stack.
The note editor's day/size selects use classes for exactly this reason, and the toolbar popovers are
excluded via `el.closest('.tools-menu')` — matched on the **class**, deliberately not an id, because
an id-based test quietly stops matching when markup is reorganised.

**Do not add persistent state in one place.** New state must go in **both** `captureSnapshot()` and
`applyStateSnapshot()`, plus the resets, plus the shift re-key if it is week-keyed. Miss one and it
silently fails to survive a save — or worse, survives an undo it should not have.

**Do not restore a store conditionally.** `if (snap.x) x = snap.x` leaves the *previous* file's
values in place when the snapshot has no such key. Always `snap.x ? {...snap.x} : {}`.

**Do not split the file.** Self-containment is load-bearing: saved calendars *are* copies of
`index.html`.

**Do not "fix" the deliberate scheduling behaviours** listed in PROJECT-CONTEXT §3 — hiatuses
pausing rather than consuming weeks, the day-level Production simulation, the lane-assignment rule
that forbids a later phase sitting left of an earlier one still running. Each looks like a bug and
is not.

---

## 5. Agreed conventions

### 5a. Commit and deploy — the hard gate

`main` auto-deploys to GitHub Pages (~40–60 s) and **other people use that site live**.

1. Make the change. Verify it in a real browser.
2. Report what was verified, with concrete numbers.
3. **Ask** — with an interactive checkbox picker — whether to commit, and whether to push/deploy.
   Never infer it from "that looks good" or from having asked earlier in the session. Approval is
   per-action, not standing.
4. Only after an explicit yes: commit, push, then verify the live URL actually serves the change
   (poll for a known new symbol; ~45 s is typical).

Committing locally while waiting is fine and expected. Pushing is not.

### 5b. Session migration — watch the context window

Long sessions degrade: context gets summarised, details get lost, and the agent starts re-deriving
things it already knew. **Proactively** — do not wait to be asked — tell the owner when the session
is getting long, and recommend:

1. Save all work (commit locally at minimum).
2. Update this file with anything learned since it was written.
3. Start a fresh session and point it at `CLAUDE.md` → `PROJECT-CONTEXT.md` → `HANDOFF.md`.

Raise it *before* quality drops, not after.

### 5c. Working style the owner has asked for

- **Discuss before building** anything substantial: *"explain to me exactly how X will work before
  you build it."* Mockups help.
- **Research before choosing an approach.** The spreadsheet-engine question was explicitly
  "research this before you build anything."
- **Be honest about what was and wasn't verified.** Corrections are welcomed, not penalised — a
  wrong claim about US holiday uniformity was retracted and that was the right call.
- **Take pushback seriously.** If the owner questions a finding, re-examine it rather than
  defending it. The owner was right to reject the Office Add-in approach (the month view needs the
  same data), and right that column dragging "felt weird" (it was a real table-width bug).
- **Do not pad estimates.** "Why an hour?" was a fair challenge to a padded number.
- **One thing at a time.** *"Before we get too complicated, let's do one thing at a time."*

### 5d. Keep this file current

Updating `HANDOFF.md` is part of doing the work, not a chore afterwards. After anything
substantial — a feature, a fix that taught you something, a decision about how something should
behave, any owner request touched — write it down here in the same breath as the code. A stale
handoff is worse than none, because the next session will act on it and be confidently wrong.
`CLAUDE.md` makes this the first rule in the file for the same reason.

### 5e. Commit messages

Long and explanatory: **what changed, why, what was verified**, including the bug history where it
is relevant. Read `git log` for the tone. Every commit ends with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Match whatever model is actually doing the work.

### 5f. Code comments

Comments explain **why** — the bug, the browser constraint, the failure that motivated the code —
often at length. Match that, and **keep existing explanatory comments intact** when editing nearby.
These comments are the project's real documentation.

---

### 5g. Versioning and the changelog

`README.md` holds the changelog, newest first, under the marker comment. It is updated **with**
the code, not batched at the end of a session.

A **version** is cut when the app reaches a state worth being able to return to. Cutting one means
all three of:

1. A changelog entry in `README.md` saying what the version *is* and what its known limits are.
2. `git tag -a vX.Y.Z` — immutable history.
3. `releases/vX.Y.Z.html` — a byte-identical copy, verified with `cmp`/`shasum`.

The tag and the copy are not redundant. The tag is how you diff, branch and bisect; the copy is
the one you can hand someone or double-click when the build system has moved on and `index.html`
is no longer a runnable app. **v1.0.0** (28 Aug 2026, `305c343`) is the last single-file build
before the Mantine overhaul, and is the baseline everything after it is measured against.

## 6. UI conventions

### Toolbar

- The **filled** (primary) button is the one that exports a **PDF**. In the waterfall that is
  *Export Waterfall to PDF*; in the month view the main button *becomes* the PDF export, so it
  takes the fill there instead. Excel export is the plain white button.
- `.tb-btn` styling must stay off the sidebar button rules (`button.primary:not(.tb-btn)`), or the
  larger sidebar padding makes one toolbar button taller than its neighbours.

### Footer — there isn't one, and that is deliberate

The layout is **header + sidebar + preview**, full stop. `footer.assumptions` survives in the CSS
(lines ~909–910) but nothing renders it — dead rules from an earlier version. Asked directly
during the Mantine scoping (28 Aug 2026), the owner's answer was **no footer now and none
foreseen**. Do not add one on your own initiative, and do not treat the dead CSS as evidence that
one is planned.

If a footer is ever revisited, these are the considerations already worked through, so they don't
have to be rediscovered:

- **A slim status bar** is the only version that earns its space: save state, total week count and
  the active region. Its real argument is that it would move the `.save-status` chip out of the
  top toolbar, which already wraps to two lines below 1280 px, and give warnings a permanent home
  instead of the six different looks they have now (`#gap-warning`, `.tools-msg`,
  `.placeholder-note`, `.snap-note`, `#union-lock-hint`, `#custom-hol-err`).
- **A print-only assumptions line** — region, holiday set, days-per-episode, printed under the
  calendar — is a genuinely useful idea and is **out of bounds by default**: it would mean editing
  the frozen PDF/Excel writers. It is a separate ask with its own acceptance gate (§0 rule 2), not
  something folded into a UI change.
- **Vertical space is the preview's**, not the chrome's. The waterfall is the product; anything
  permanently pinned to the bottom is taken from it. That is most of why there is no footer today.

### The grid

- **All phase columns within a year block share one width.** Two phases each holding one column
  must look equal; columns differing by 15% make an even split read as a mistake.
- **Every row is the default height** (`ROW_DEFAULT_PX = 20`) unless dragged. Text is fitted to the
  row, never the row grown to the text — on screen, in the PDF and in the workbook alike.
- **Dragging a row snaps** to the default and to any height already set on another row (4 px), and
  the handle turns green while it holds.
- **Phases running at the same time divide the width evenly** — two take half each, three a third,
  four a quarter. A phase running alone fills the area.
- **Grid text is black.** Notes and hiatus bands are the exception: they pick black or white for
  contrast against their fill.
- Interior gridlines are **off** by default, matching the reference export.

### Editing

- Editors are **popovers anchored to what they edit**, appended to the body — never markup injected
  into the grid. The grid must keep exactly the shape it had. This applies to the note/hiatus
  editor, the month-view note editor, and the phase colour picker.
- A popover that outlives its anchor must be torn down: `render()` rebuilds the grid, and a
  body-level popover would hang over the calendar pointing at nothing.
- A popover anchored inside the scrolling grid must reposition on **scroll (capture phase)** and
  **resize**, and clamp itself into the window.
- **Direct manipulation over dialogs.** Resizing, filling a cell, changing a row height are all
  drag-or-double-click on the thing itself. Double-click means "back to automatic."
- **The preview never jumps.** Every edit re-renders; scroll position — inner pane and window — is
  restored, and the window is anchored to *where the preview sits on screen*, not to a scroll
  number.

### Tone of user-facing copy

Descriptions exist to answer a real question. Anything true of *every* option must not appear in
one option's description — it reads as a distinction while distinguishing nothing. (The four
calendar adjustment tools are the worked example; see CLAUDE.md.)

---

## 7. The save / open format — how it actually works, and where it should go

Written 28 Aug 2026 after the owner asked whether saves are full app copies and whether that is
the right design. **Measured, not assumed** — headless-Chrome harness, a 10-episode US-General
calendar with four phases dated and four hiatus rows.

### What happens today

Save and Open are **not symmetric**, and that is the crux.

```
SAVE:  captureSnapshot()  →  JSON  →  <script id="saved-state">
       + document.documentElement.outerHTML   ← a complete, runnable copy of the app

OPEN:  read file as TEXT  →  regex out <script id="saved-state">  →  JSON
       →  applyStateSnapshot()  →  refreshAfterRestore()
       ✗ the old file's HTML/CSS/JS is NEVER parsed and NEVER executed
```

So the answer to "are we saving a full snapshot then only parsing the data on open, or fully
loading the old HTML?" is **the first one**. Open takes exactly one thing from the file: the
snapshot JSON. Everything else is inert.

### What that costs, measured

| Part of a saved calendar | Bytes | Share |
|---|---:|---:|
| **The data — `saved-state` JSON** | **3,238** | **0.44%** |
| Embedded Carlito font | 93,797 | 12.9% |
| **The rendered grid, serialized and then thrown away** | **44,568** | 6.1% |
| The rest of the app — CSS, markup, script, help modal | ~587,000 | 80.5% |
| **Total** | **729,172** | 100% |

**99.56% of a saved calendar is a copy of the application that the Open path never reads.**

The 44.5 KB rendered-grid figure is the one to notice: because `buildSavedHtml()` serializes the
*live* DOM, whatever the grid happened to be showing gets baked into the file — and then
`refreshAfterRestore()` regenerates it from the state on load and discards it. It is pure
overhead, it grows with the size of the calendar, and nothing ever reads it.

### Why it is still not simply wrong

The full copy buys one real thing: **a saved calendar is double-clickable.** Mail someone the
file and they have a working app with your schedule in it, no install, no server, offline. That
was a deliberate design goal and it is genuinely valuable.

But it also carries a cost that has already caused a false alarm in this project: **a saved file
keeps the bugs it was saved with, forever.** When someone reports something already fixed, ask
which file they are in before digging (§3).

### The better shape — two formats, one contract

Neither the copy nor the data should be dropped. They should stop being the same file.

| | **`.spcal` — the data file** | **`.html` — the share file** |
|---|---|---|
| Contents | the snapshot JSON, nothing else | today's full self-contained app + state |
| Size | **~3 KB** | ~730 KB |
| Role | **the default.** Save, Open, autosave, recents, backup | "Export a shareable copy" — an explicit, occasional action |
| Opens by | the app | double-click, anywhere, offline |
| Carries app bugs | no — always opened by current code | yes, frozen at export time |

Concretely, this is a **small** change, because the hard part already exists:

- `Save` writes `JSON.stringify(captureSnapshot())` instead of `buildSavedHtml()`. The File System
  Access handle, recents, autosave and dirty-tracking are untouched.
- `Open` gains one branch at the top: if the text starts with `{`, parse it directly; otherwise run
  today's regex for the `saved-state` block. **Both paths converge on the same
  `applyStateSnapshot()`,** which is why old `.html` calendars keep working with no migration.
- `buildSavedHtml()` survives verbatim as "Export shareable copy", and should additionally empty
  `#table-wrap` before serializing — that alone reclaims the 44.5 KB of dead grid markup.

What it buys: saves become ~240× smaller and effectively instant; autosave and the IndexedDB
backup stop moving three-quarters of a megabyte every ten minutes; a saved plan always opens in
*current* code, so fixes reach old files; and files become diffable, greppable and mergeable in a
way a 730 KB HTML blob never will be.

**This matters more after the Mantine overhaul, not less.** Once there is a build step,
`buildSavedHtml()` serializes a *minified* app, so the "readable copy" argument for the HTML
format weakens at exactly the moment the data-only format becomes cleaner to produce.

### If this is taken up

1. **Add a `version` field to `captureSnapshot()` first.** There is none today — 27 top-level keys
   and no way to tell which app wrote them. Every migration so far has had to sniff for individual
   keys (`migrateHolidayViewKeys`, `normalizeRegionSelection`). Do this before adding a second
   format, not after.
2. **Keep `.html` Open working forever** (§0 rule 3). It is the only format that exists today, so
   every calendar in the wild is one.
3. **Do not put preferences in the data file.** Settings are per-user and per-machine —
   `localStorage`, never `captureSnapshot()`.
4. **Sequence it with the migration.** Persistence is being rewritten in Stage 4 anyway
   (`MANTINE-MIGRATION.md` §4.4–4.5); doing the format split in the same stage costs little extra
   and doing it separately means touching the same code twice.
