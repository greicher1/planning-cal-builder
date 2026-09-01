# HANDOFF.md

Written at the end of the session that ended at commit `cf51a29` (28 Aug 2026).

**Last updated 31 Aug 2026, on top of `6e3754d`.** ⚠️ **Read the master list in §2b-3 (rows 27–49)
and this preamble together — the rest of this file was written before three build rounds landed and
parts of it are superseded by that table.** Where they disagree, the table is right.

**Three rounds of real app code shipped 30–31 Aug 2026** (`7199ade` round 5, `7a968c1` round 6,
`6e3754d` round 7), all **local, none deployed**. This reverses the previous entry here, which said
the work had become "decisions, evidence and tooling rather than app code". The root `index.html` is
still untouched and still byte-identical to `releases/v1.2.0.html`; every one of these rounds landed
in `src/`, so **the live site is still v1.0.0 and the deploy candidate is still v1.2.0.**

What those rounds did, in one paragraph: the terminology settled on **Load** for opening a file; the
tool popovers got a loader-look picker (`SelectPop.jsx`) and stopped **destroying the edit** when the
date picker was used; the note editors joined the shared overlay look and `.mv-note-pop`'s
never-repositions bug was fixed; the header stopped truncating its labels at every screen size;
**Inter is embedded** and the app now fetches nothing external; Mantine's CSS went **per-component**
(`dist` 1,096 KB → 983 KB); §2h was fixed; and the last two "needs a frozen edit" owner requests
(the invalid-date ring, the eight export-path `alert()`s) shipped with **no frozen edit at all** —
see rows 4, 7 and 49, and the patterns now recorded in `CLAUDE.md`.

Earlier, from `cf51a29` to `83ac3b7`: the notes-column design settled and then held (§2c), line
numbers pulled out of prose entirely and replaced by `tools/check-refs.py` (§2a), Stage 7 stopped at
its gate (§8), the test harness committed as [`tests/harness/`](tests/harness/) with a baseline,
Stage 8 taken apart in [`STAGE-8.md`](STAGE-8.md), the Mantine seam mapped symbol by symbol in
[`MANTINE-SEAM.md`](MANTINE-SEAM.md), and **browser support audited and written down for the first
time** (§3).

**Read this first — before [`CLAUDE.md`](CLAUDE.md), before
[`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md), before touching `index.html`.** Those two describe the
app as a system and change slowly. This file describes *where things stand right now*: what was
just built, what was asked for and not yet delivered, what was learned the hard way, and the
working conventions the owner and the agent have settled on.

Reading order: **`CLAUDE.md` → `HANDOFF.md` → `PROJECT-CONTEXT.md`** (changed by the owner
29 Aug 2026; `CLAUDE.md` now comes first).

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

`index.html` — the deploy candidate, untouched — is ~10,344 lines / ~667 KB, one file, no build
step. ⚠️ **The repo is no longer that**: `src/` + Vite build a self-contained `dist/index.html`
(~983 KB), and that is where all work since 29 Aug 2026 has landed. Deployed at
<https://greicher1.github.io/planning-cal-builder/>.

### ⚠️ v1.2.0 IS BUILT BUT NOT DEPLOYED — the live site is still v1.0.0

Verified 28 Aug 2026 by fetching the live URL: it is **byte-identical to `releases/v1.0.0.html`**
(SHA-256 `0150be15…`) and contains no `SAVE_EXT`, no `sptcal`, no `SNAPSHOT_VERSION`.

`main` is **several commits ahead of `origin/main`** — everything from the `.sptcal` format
through the Stage 0 docs refresh to v1.2.0's update delivery. **`git log --oneline origin/main..main`
is the live list** (a count written here would be wrong by the next commit); the oldest is
`489f9ee`.

**Two tags are unpushed: `v1.0.0` and `v1.2.0`.** That is what makes the `releases/…` URLs in
`README.md` 404. They need their own `git push --tags`; pushing `main` does not carry them.

⚠️ **v1.1.0 was never cut** — it has a changelog entry but no tag and no `releases/` copy, because
it was superseded before it ever deployed. **v1.2.0 is the release that carries both.** Do not go
back and retro-cut v1.1.0; there is no build of it that was ever public.

### ⚠️ The push must happen from the machine that owns the repo

Attempted 28 Aug 2026 and **rejected**:

```
remote: Permission to greicher1/planning-cal-builder.git denied to antowhsu.
```

`gh api repos/greicher1/planning-cal-builder` reports `pull: true, push: false` for that account —
the token is fine (it carries `repo` scope), the *account* simply is not a collaborator. So:

- **This working copy is a temporary second machine.** The long-running one is the repo at
  `~/Downloads/Calendar Builder` under user `apple` — the stale `.claude/launch.json` path
  (`/private/tmp/claude-510/-Users-apple-Downloads-Calendar-Builder/…`) is the fingerprint of it.
  That machine is authenticated as the repo owner; **push from there.**
- The repo travels back by **AirDrop of the whole folder**, not by pushing. Everything needed is
  committed — working tree clean, no submodules, ~15 MB including `.git`.
- ⚠️ **AirDrop the folder, not just `index.html`.** The 5 commits, the `v1.0.0` tag and the reflog
  live in `.git`; copying the working files alone silently discards all of it.
- If this recurs, the permanent fix is to add `antowhsu` as a collaborator on
  `greicher1/planning-cal-builder`. Until then, expect every push from here to 403.

**What that means concretely.** Everyone using the tool right now is still saving KB `.html`
files. The 155× smaller `.sptcal` format, the legacy-upgrade strip and the autosave-status fix
have reached nobody.

Nothing here is lost or at risk — it is all committed locally. But **do not read the changelog as
a description of what users have.** Ask before pushing (§5a); this is exactly the release that
rule exists to govern.

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

### Shipped in the 27–28 Aug build session (21 commits, `ca26df0` … `cf51a29`)

| Area | What landed |
|---|---|
| Excel print setup | Letter, centered, print area pinned; gridlines default to the reference look |
| Embedded font | Carlito subsetted to 91 KB and inlined; the CDN font dependency is gone |
| One column model | `sheetColumnWidths()` now feeds screen, workbook and PDF |
| Resize | Drag columns and rows; autofit; shrink-to-fit for notes, phase labels and hiatus bands |
| Row line budget | Row height decides how many lines a note gets; per-note and per-hiatus font size |
| Direct PDF writer | lines: TrueType subsetting, `/FontFile2`, WinAnsi, xref, Flate. No print dialog |
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

### 2a. Documentation refresh — ✅ **DONE** (Stage 0)

`CLAUDE.md` and `PROJECT-CONTEXT.md` had gone **24 commits** stale and still described the
pre-`.sptcal` save path and a three-way width situation that no longer exists. Every item on the
original checklist is now written up:

| Was missing | Now in |
|---|---|
| the shared column model and `charsToScreenPx()` | PROJECT-CONTEXT §9a |
| the embedded font and why measurement can no longer drift | §2, §9a |
| the resize system (`installGridResizers`, `colWidths`, `rowHeights`, snapping) | §9a, §7 table |
| the line-budget model (`cellTextFit`) and per-cell font sizes | §9a, §7 table |
| the direct PDF writer and the shared orientation rule | §9 |
| `cellSpans` and the even-share rule | §9a, §7 table |
| scroll preservation (`captureScroll` / `restoreScroll` + the `.form-panel` anchor) | §9a |
| the note editor being a popover | §6 |
| the width-unit trap and the 53-Monday asymmetry | §12 |

Two things found while doing it, both fixed:

- **Every inline line-number reference in `PROJECT-CONTEXT.md` was stale — 35 of 37.** The §14 map
  at the bottom had been regenerated, but the numbers quoted throughout the prose had not, and they
  were off by 2,000–3,000 lines.

  ⚠️ **Superseded 29 Aug 2026 (`37b877a`) — hand-correcting them was the wrong fix, and it did not
  survive the next commit.** Prose now quotes **no line numbers at all**: it names symbols, which
  `grep -n` always finds and which cannot rot. Every number lives in PROJECT-CONTEXT §14 — now
  **74 verified rows** — and `tools/check-refs.py` checks both halves, the map *and* the absence of
  numbers from prose. **Do not go back to maintaining numbers inline**, however precise it feels.

- ⛔ **Three more stale references were still hiding after that sweep, found 29 Aug 2026 — and all
  three slipped past the checker on PUNCTUATION alone.** This is the third time this exact hole has
  been found in one day (§2b's table was the second), so it is worth stating the shape rather than
  just the fix:

  | What it said | Actual | Why the checker missed it |
  |---|---|---|
  | PROJECT-CONTEXT §4's whole date-helper table — `parseDateUTC` at 1474, and four more | 3407, ~2,000 lines out | separator was a **pipe**; the pattern allowed only space or comma |
  | §8: parseCalendarText(text) (7352) | 7384 | parenthesised **without the tilde** the pattern required |
  | §8: showLegacyNotice, 8226 | 8258 | the number had **wrapped onto the next line** |

  (Those two rows are written **without backticks on purpose** — reproduce them faithfully and the
  checker fires on this very file, which is the intended behaviour and a decent proof it works.)

  The last two are the same **+32** drift as §2b — one commit inserted 32 lines above them, and
  every reference below moved. **All three are fixed**: §4's table now names symbols only, §8 quotes
  nothing, and the five date helpers were added to §14 (which is why it is 74 rows, not 69).

  `tools/check-refs.py` now catches all three shapes, scans **seven** docs rather than four, and was
  regression-tested against the known-bad text before being trusted. The pipe form is deliberately
  narrow — it fires on a `Line` column header (singular) or a whole-cell number ≥ 1000, so
  `` `MAX_WEEKS` | 600 `` and MANTINE-MIGRATION's plural `Lines` **count** column do not cry wolf.
  That restraint is the point: a checker that fires on legitimate numbers gets stopped rather than
  fixed.
- **The §7 state table was missing five stores `captureSnapshot()` actually persists** —
  `noteFontSize`, `hiatusFontSize`, `colWidths`, `rowHeights`, `cellSpans`. The code was right;
  only the doc was wrong. It now also records `version` / `fields` and the deliberately-not-state
  list.

⚠️ **§14's numbers rot on every commit that changes `index.html`.** Run
`python3 tools/check-refs.py` after any edit to it — it verifies all 74 rows *and* fails the run if
a line number has crept back into any of the seven prose docs. Last run CLEAN, 29 Aug 2026.

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

**⚠️ Two things checked 29 Aug 2026 that change how this must be built:**

1. **`localStorage` is used NOWHERE in the app today** — zero occurrences. The crash backup is
   IndexedDB (`idbSet(BACKUP_KEY, …)`), not `localStorage`, whatever older prose in `CLAUDE.md`
   implied (now corrected). So this stage *introduces* `localStorage`; it does not join an
   existing mechanism, and there is no established read/write helper to copy.

2. **All three constants are read from INSIDE the frozen surface**, which decides the design:

   | Constant | Read at | Frozen? |
   |---|---|---|
   | `SHEET_GRIDLINES` | `exportExcel` (interior-gridline pass), `buildWaterfallPdf` (`interior`), the print fallback in `exportWaterfallPdf` | **yes** |
   | `GRID_TEXT_COLOR` | `renderSpreadsheetView` (phase + sim-post cells), `exportExcel` (`baseStyle` font colour), `buildWaterfallPdf` (`ink`) | **yes** |
   | `WF_PDF_MODE` | the waterfall-export dispatch | no |

   ⚠️ **This table used to quote line numbers, and all six were stale by exactly +32** — one
   commit had inserted 32 lines above them. `tools/check-refs.py` reported CLEAN throughout,
   because its prose scan skipped any line starting with `|` and this is a table. Both are fixed
   (29 Aug 2026): the checker now scans tables and catches the bare-number form, and the table
   names symbols, which is what the rule asked for in the first place. `grep -n` finds them.

   That is *not* a blocker — §0 rule 2 explicitly allows the frozen code to **read** from
   surrounding state. But it does force one specific shape: **keep the identifiers exactly as they
   are** and change only their *declaration* (`const X = 'none'` → a `let`/getter hydrated from
   `localStorage` at startup). Then **no frozen function body is edited at all** — the diff stays
   entirely in the declaration block and the new settings UI.

   Do **not** refactor these into a `settings.gridlines` object and update the call sites: that
   edits `renderSpreadsheetView`, `exportExcel` and `buildWaterfallPdf`, which is exactly what
   rule 2 forbids, and it buys nothing.

   Changing a value must trigger a re-render — `update()` already does this on every edit, so the
   settings control simply calls it. The PDF and Excel read the value at export time, so they need
   nothing.

### 2b-3. Mantine build — **BUILD + HEADER + PREVIEW TOOLBAR + STATIC SIDEBAR CARDS, ALL GATED** (29 Aug 2026)

> Read this before `MANTINE-MIGRATION.md` §6's stage list, which it partly supersedes. The stage
> ORDER changed: Stage 3 (Settings) was skipped for now because Stage 1 already proved the provider,
> theme, layer fence and build on real code, which was Stage 3's whole justification.

**The four owner rulings that unblocked it**, all taken 29 Aug 2026, all the recommended option:

| §  | Question | Ruling |
|---|---|---|
| UI-CONV §9.6 / MIG Q1 | file size + minified source | **Minified**, accept ~1.1 MB |
| MIG Q3 | deploy path | **GitHub Action** builds and publishes `dist/` |
| UI-CONV §9.5 | is `.mv-note-pop` in scope? | **In scope** — redesign it, and fix its never-repositions bug |
| UI-CONV §9.1 | embed Inter? | **Yes**, drop IBM Plex Mono for the system mono stack |

✅ **§9.1 IS BUILT (round 7) — both halves.** IBM Plex Mono went first (29 Aug 2026: chrome mono
sites take the system stack). **Inter is now embedded** as one variable woff2, latin subset, in
`src/styles/inter.css`, regenerated by `tools/fetch-inter.py`; the Google Fonts link and both
preconnects are gone and the app makes **zero** external requests.

Its gate — a month-PDF diff with the network **on** and **off**, because `mvNoteLineCount()`
measures against Inter and its result sets month-view row heights that `exportMonthPdf` prints —
was satisfied by **measurement rather than by exporting a PDF**, and it is worth knowing why that
is stronger: canvas text widths at 400/500/600/700 came out **byte-identical** to the Google-served
statics (279.322 / 282.599 / 285.875 / 289.152), so the input to `mvNoteLineCount()` is unchanged;
and with no external request left, network state cannot be a variable at all. ⚠️ **Nobody has
actually exported a month PDF before and after**, so if you want the literal diff the ruling asked
for, it is still unrun.

#### What exists now

```
index.html                   ← UNCHANGED. The deployed v1.2.0 app, byte-identical to
                                releases/v1.2.0.html.
src/index.html               ← the Vite entry: the static skeleton only
src/main.jsx                 ← CSS order, one React root, four portals, then initLegacyApp()
src/theme.js                 ← UI-CONVENTIONS §3 as a Mantine theme
src/chrome/bridge.js         ← the engine→chrome state bridge (OUTPUT only; see below)
src/chrome/Header.jsx        ← app header: file menu, six actions, save status
src/chrome/PreviewToolbar.jsx← view toggle, Shift All split control, 4 tool popovers, undo/redo
src/chrome/Sidebar.jsx       ← the three STATIC cards: Show info, Production Region, Holidays
src/legacy/app.js            ← the original IIFE, wrapped and surgically edited at the write sites
src/styles/legacy.css        ← the original stylesheet + the chrome's Mantine-variable rules
dist/index.html              ← build output (gitignored), ~1.03 MB / 324 KB gzipped
```

**The four portal hosts**, all of which stay in the static skeleton and are filled rather than
replaced: `header.app-header`, `.view-toggle-row`, `#sidebar-static`, and (Stage 1 only, now empty)
`#react-root` as the root container.

⛔ **The root `index.html` is deliberately untouched and must stay that way until an
owner-approved cutover.** `main` auto-deploys it, so a source-only `index.html` at the root would
break the live site the moment anyone pushed. Build with `npm run build`; gate with
`cd tests/harness && ./gate.sh`.

#### The three architectural facts that were forced, not chosen

1. **React mounts as one root that PORTALS into the existing containers, and never wraps them.**
   Both print paths hide the app with `body.printing-* > *:not(#print-root)` — child combinators a
   wrapper defeats, printing a blank page; `header.app-header` is resolved by the ResizeObserver
   that writes `--header-h`; and `#table-wrap` must exist before the script runs, for the seven
   unguarded listeners.
2. **The @layer fence is: Mantine's layered CSS first, the app's UNLAYERED stylesheet last.**
   Unlayered normal declarations outrank every layer, so every frozen rule wins with no per-rule
   work. For `!important` the precedence *reverses*, which put
   `*{print-color-adjust:exact !important}` at risk — without it both PDFs print as an empty grid.
   **Verified: all 20 `!important` declarations in `@mantine/core` 9.5.2's `styles.layer.css` are
   scoped to hashed `.m_*` selectors**, so none can reach `#table-wrap`. **Re-check this on any
   Mantine upgrade.**
3. **The bridge carries OUTPUT only.** React re-renders by mutating the node it already made, so
   listeners the engine attaches survive; input needs no bridge. Output must be rerouted because a
   `textContent` write destroys a Mantine Button's inner spans, a `className` assignment wipes
   Mantine's class, and Mantine styles disabled from `[data-disabled]` **only**.

#### ⛔ The rule that cost the most to learn

**Mantine's `Popover` mounts its dropdown from an EFFECT.** `#file-menu` does not exist when the
IIFE evaluates — not inside `flushSync`, not with `keepMounted`. `getElementById` returned null, the
delegated listener silently never attached, and the file menu opened and closed perfectly while
doing nothing. No error; the only symptom was *Open…* not opening anything, which reads as a broken
feature rather than a missing listener.

> **The engine must not capture React-rendered nodes at evaluation time.** Anything it resolves by
> id either lives in the STATIC skeleton, or is reached by delegation from `document`.

Two more traps landed where `UI-CONVENTIONS.md` §8 did not predict them:

- **`Menu.Target` injects its own id.** It delegates to `Popover.Target`, which *clones* its child
  and writes Popover's generated id over yours. Passing `id` to `<Menu>` does not help either. §8.3
  described this for form controls; it also hits a plain `<button>` whose id the engine binds to.
  `#file-menu-btn` is gone; **`.file-menu-btn` is the contract.**
- **`.tb-btn` is shared with the un-ported preview toolbar.** Deleting it with the old header left
  *Shift From*, *Anchor To* and *Rebuild From* as unstyled UA buttons. The block is restored with a
  note saying it goes when `PreviewToolbar.jsx` lands.

#### Harness changes — all three were required, not incidental

- `t/lib.js` `set()` uses the **native value setter**. React tracks the last value it wrote, so
  `e.value = v` leaves the tracker unchanged and React swallows the event — every fixture would
  silently assert against a blank calendar. This is the fix `MANTINE-MIGRATION.md` §4.2 said had to
  land *before* porting.
- **`appReady()`'s probe moved for the third time.** "`#file-menu` has children" worked while the
  dropdown shipped empty; Mantine renders its items from React's first commit, so a page whose
  engine never started now satisfies it. It waits on `#file-menu-wrap`'s display instead.
- `t/fence.js` waits for the row count to **settle**. Waiting on `rows > 1` measured mid-build and
  reported 635 px then 602 px for the *same untouched page* — which reads exactly like a regression.
- `tests/harness/package.json` is new: the root `package.json`'s `"type":"module"` reclassifies the
  CommonJS harness as ESM, and `srv.js` dies on `require is not defined` while `run.sh` reports only
  *"server did not start"*.
- **`./gate.sh` runs the whole gate as one command**, and `run.sh` takes `HARNESS_PAGE` so the same
  tests drive either page. ⚠️ Give `restore`/`sharecopy` a **60 s** budget; 40 s hits the documented
  IndexedDB stall often enough to look like a failure.
- ⚠️ **Never byte-compare the `.xlsx`.** ExcelJS stamps `dcterms:created`/`modified` into
  `docProps/core.xml`, so two exports of an identical workbook differ by ~1 byte. Compare the
  unzipped parts with `core.xml` excluded — `gate.sh` does.

#### ✅ The engine-generated rows: RESTYLED TO SPEC, deliberately not rebuilt (ruled 29 Aug 2026)

The Phases and All-phase hiatus card interiors, the episode rows and the holiday list are
engine-generated markup wearing the full Mantine look — **and that is now a decision, not a
stopping point.** Asked with the trade-off laid out (rebuild as React components vs. restyle the
generators in place), the owner chose **restyle to spec**, the recommended option. The deciding
findings, from a six-way read of the generators, restore path, chrome and harness:

- A rebuild buys almost nothing visually: the settled §2c uncontrolled rule means React would
  render the same native inputs the CSS already styles.
- `applyStateSnapshot` rebuilds custom rows, regex-re-keys their ids and writes `fields.byId`
  values **in one synchronous tick**; React commits asynchronously, so a state-driven rebuild
  silently drops every restored value unless the restore path itself is restructured — §0 rule 3's
  blast radius. Undo/redo replays that path constantly.
- Frozen code reads the rows unguarded every cycle (`render()` writes `meta-<key>`, `readState()`
  reads `start-<key>` on every keystroke), so rows must exist synchronously before the engine's
  first `update()` and must never be reconciled away.
- The generators innerHTML-replace their containers, so a rebuild cannot ship incrementally —
  every generator plus the restore seam in one atomic change.
- **The gate covers none of the custom-phase path** — no test clicks `#add-phase-btn`, the fixture
  has no custom phases, so a rebuild breaking custom-phase restore shows GATE PASSED.

**What the restyle pass landed** (all gated, all verified in a real browser against dist):
sidebar checkboxes drawn as Mantine's Checkbox via `appearance:none` + a white SVG check, scoped
to `.form-panel` so nothing can reach `#table-wrap`; native number spinners hidden in
`.form-panel` and `.tools-menu` (matching the React cards' `hideControls`); the holiday rows'
~7-inline-declarations-per-row replaced by `.hv-row`/`.hv-label`/`.hv-cell`/`.hv-dim`/`.hv-tag`
classes (template edit in `renderHolidayVisList` — the `.hv-en`/`.hv-cb`/`.hv-del` +
`data-hid`/`data-view` contract untouched); the episode inputs' undeclared second input size
removed (UI-CONV §3d); the duplicated legacy `button.primary/.secondary` block **deleted** — it
sat later in the file at equal specificity and had been silently winning over the Mantine-token
block the whole time; `.icon-btn` restyled as ActionIcon-default with `font-family:inherit`
(finding 3's Arial ×s); `.tb-btn` retired (nothing in the build emits it since the preview toolbar
port); IBM Plex Mono dropped per §3a — system mono stack everywhere, Google Fonts link trimmed to
Inter-only (Inter's *embedding* is still item 3 of "what is next", with its month-PDF gate);
`phase-meta`/`snap-note`/`simpost-*`/`ep-panel*`/`placeholder-note`(now roman)/`phase-color-pop`
tokenised onto `--mantine-*` variables.

#### ⛔ Two Mantine-build bugs found and FIXED, one shape (29 Aug 2026)

React rendered `#save-as-btn` and `#export-wf-pdf-btn` **conditionally**, but the engine captures
both by `getElementById` at evaluation time and binds click listeners through the capture. Save As
started `visible:false` → capture null → the button later appeared **dead**. The export button
started visible → worked — until one Month↔Waterfall round-trip remounted a NEW node and orphaned
the listener. Both now render always, visibility carried by `display` — the rule
`#file-menu-wrap`'s comment already stated. Browser-verified: node identity survives the
round-trip; Save As is present at load. **The general law: anything the engine resolves by id at
evaluation time must be in the DOM at first commit and must never be conditionally unmounted.**

#### ⚠️ Two PRE-EXISTING engine bugs found, NOT fixed — they need their own conversation

Identical in deployed v1.2.0 and `src/legacy/app.js`; fixing them means engine edits and (for the
first) a behavior change to shipped restore semantics:

1. **Stale closures after custom-row re-key.** `addCustomPhaseRow`'s remove/swatch/name handlers
   close over the mint-time `custom<n>` key; `applyStateSnapshot`'s re-key renames ids but not
   closures. Restoring a save whose custom keys are non-dense (any calendar where a custom phase
   was ever deleted before a later one) leaves those handlers stale: remove strands a ghost def in
   `customPhaseDefs` and the next `update()` **throws** in `readState` on the missing
   `start-<key>`; swatch picks stop persisting. The delegated handlers are immune (they re-derive
   the key from the live id).
2. **A snapshot with zero custom phases does not clear existing custom rows** — the rebuild is
   gated on `snap.customPhaseDefs.length`, violating the restore-unconditionally rule. Opening a
   customless file over a session with custom phases keeps the old rows.

#### ⚠️ Harness facts that will bite the next session (found 29 Aug 2026; gate.sh header now says all three)

- `gate.sh` **never ran fence.js** despite its old header comment listing gate 7. No fence
  baseline is committed. Run it by hand against both pages and diff — done for this stage: every
  frozen `#table-wrap` computed style identical between `/index.html` and dist.
- **The baseline is date-pinned to 2026-08-29.** The Excel header and the waterfall PDF embed
  `todayStr`, so the PDF byte-compare and the Excel parts-diff FALSE-FAIL from any later date
  against untouched code. Re-cut the baseline on a known-good build before trusting those legs.
- The `fields.byId` failure diagnostic was dead code (an `isinstance(list)` guard on what parses
  as a dict); it now prints lost/gained/changed ids.

#### ⛔ The controlled-input finding, and the fact that it is now SETTLED

`UI-CONVENTIONS.md` §2c records the trap: Mantine's inputs are **controlled**, and
`applyStateSnapshot()` restores a calendar by writing `el.value` into each field by id. A controlled
component ignores that write and re-renders from its own state — so a value would silently fail to
come back on open while still *saving* correctly and passing every id-based assertion. §8.1 caught
`DatePickerInput`'s id problem and prescribed `DateInput`; `DateInput` is controlled too, so it fails
this different and worse way.

✅ **Resolved by demonstration, not by argument.** Every control in `Sidebar.jsx` is **uncontrolled**
— `defaultValue` only, never `value` — and the `restore` gate passes against real Mantine
`TextInput` / `NativeSelect` / `NumberInput` elements, restoring 52 rows / 154 cells / 324 pt with
`fields.byId` unchanged at 56 ids. So option (1) in §2c is proven: **uncontrolled Mantine components
work with the existing save/restore path, unchanged.** The only casualties are the genuinely
controlled ones — `DateInput` / `DatePickerInput` — which is why every date field in the app is still
a native `<input type="date">`, and why §5's Monday-snap week-band affordance needs re-costing
separately rather than being assumed.

#### Where it stands, measured

Full gate **PASSED** after every stage, against `tests/baselines/2026-08-29-stage-7`: 0 horizontally
clipped cells, waterfall PDF **byte-identical**, every Excel part identical, `v1.0.0-saved.html`
restoring to 52 rows / 154 cells / 324 pt, `fields.byId` **56 ids identical**, 0 console errors.
Frozen-surface computed styles are unchanged — table 602 px, note cell 184 px, phase cell 92 px,
date cell 53 px, no typographic or box change. The only deltas are `--header-h` 52 → 51 px and the
1 px that gives back to `.sheet-scroll`'s max-height.

`dist/index.html` is **~1.03 MB** (324 KB gzipped) against the current 667 KB — inside the
~1.0–1.15 MB the probe projected, and item 5 of "what is next" would take ~247 KB back off it.

**Verified by hand in a real browser**, because the gate cannot see any of it: all four tool
popovers open and `fillPhaseSelect` fills their phase selects with the `' — '` separator intact; the
file menu opens, and its *Open…* item drives the real file-open path (which is what the `restore`
gate exercises); the export button's viewMode dispatch flips its label and its fill between
Waterfall and Month; `reflectRegionUI` still shows the US Area row through the React-rendered
markup. The built file also runs from `file://` — checked with headless Chrome straight off the
filesystem, which is the emailing-it-around property surviving the build step.

#### 🎨 The visual-redesign rounds (29 Aug 2026, same session as the restyle ruling)

Three owner-review rounds, each gated before the next. The full inventory is the README changelog
entry ("the visual redesign rounds"); what a next session must know:

- **The DoubleNavbar icon rail was built and REVERTED on the owner's verdict** — horizontal
  icon+label tabs won. Do not rebuild the rail. The white full-height sidebar, thicker header
  (51→63px, safe because `--header-h` is MEASURED), brand block, iconed buttons, red Reset,
  equal view segments, the joined Shift All split control, the searchable file menu (Open…
  pinned) and the `.side-block` = `.phase-row` shared recipe all survived review.
- **The pop-out date pickers are live** (`src/chrome/DatePop.jsx`): hand-rolled popover calendars
  over the untouched native date inputs — Mantine's DateInput stays banned (§2c). Id-less by
  construction, marker data via `chrome.dateContext` (pushed from `update()`), `.date-pop` added
  to `buildSavedHtml`'s strip list. Write-back is the native setter + dispatched events, so the
  engine sees a keystroke.
- **Icons are hand-drawn inline geometry** (`src/chrome/icons.jsx` + raw SVG in the skeleton
  tab strip) — no icon package, deliberately.
- **`theme.black = '#1E1D1B'`** — nothing in the chrome is pure black any more.
- ⚠️ **The gate's restore leg stalls on IndexedDB** — four consecutive stalls were observed here
  while several Chrome instances ran, which is why this was first written up as load.
  ⛔ **It is not load, and the advice that used to end this bullet — "diagnose with a standalone
  run" — is a TRAP now withdrawn.** `run.sh` defaults to `HARNESS_PAGE=/index.html`, so a bare
  `./run.sh restore` tests the **deployed app** rather than the build: it passes while the build
  fails, which reads as a clean bill of health and is not one. Row 49 has the measured mechanism
  (`indexedDB.open()` never settles in headless, identically on the deployed page). Diagnose with
  `HARNESS_PAGE=/dist/index.html ./run.sh fsprobe 30` against **both** pages.

#### 📖 Terminology rule (owner, 29 Aug 2026)

> **Saving** means writing a `.sptcal` locally. **Loading** means opening a `.sptcal` or `.html`
> into the PWA.

UI copy follows this vocabulary (the file-menu search says "Search loaded files"). Use it in all
new user-facing text.

#### 📋 THE MASTER LIST — every owner request of the redesign arc, reconciled (29 Aug 2026, round 4)

Compiled at the owner's instruction from their consolidated re-paste, checked item by item against
what is actually built. ✅ built · ◐ partial · ⏳ open with a reason · ❓ needs an owner decision.

| # | Request | Status |
|---|---|---|
| 1 | Show/Settings/Phases font parity | ✅ label + input-size parity rules |
| 2 | Color changer as top bar on phase chips | ✅ same `swatch-<key>` contract |
| 3 | Grab handles (visual only) | ✅ CSS dots. ⛔ **THE REORDER ITSELF IS STILL UNBUILT AND IS A KNOWN DEBT** — owner, round 7: *"do document that this will need to be implemented, but a later decision."* The handles currently promise a drag that does nothing. What it needs before any code: `customPhaseDefs` ARRAY ORDER is save-format (a reorder rewrites what every saved file means), `PHASE_CHAIN` depends on order, and the "start after previous phase" links resolve through it — so a drag has to define what happens to dated phases, chained phases and `phaseHiatuses` keys. Design it as its own stage with its own gate; do not bolt drag onto the existing handles. |
| 4 | Diegetic warnings in phase chips | ✅ **DONE round 7, and with NO frozen edit.** The ring was thought to need a hook inside frozen `render()`'s validity branch. It does not: `reflectStartDateValidity()` runs from `update()` (not frozen), toggles `.is-invalid` on the SIDEBAR field (chrome), and CALLS frozen `readCfgForMeta()` for the verdict — reading from the frozen surface is allowed, and it means there is no second copy of the validity rule to drift from the meta line. Verified: a year of 0206 rings the field red while the meta line says "Check that year". |
| 5 | Red hover ×, visually centred | ✅ round 3 + round 4: the × is drawn geometry now (mask), not a text glyph |
| 6 | All-phase hiatus naming | ✅ **BUILT 31 Aug 2026, on the owner's own machine, per the owner's ruling once the repo arrived there.** A `Name` field on each `#hiatus-list` row (`addHiatusRow`, `.hiatus-entry`) drives `hiatusTexts` for every week that hiatus covers — writing into the SAME store a click-to-rename edit on the band already uses (`hiatusTextFor()`), so no frozen render/export function was touched. A hand-typed override on a specific week still wins, via the new `hiatusNameSyncedKeys` ownership map (persisted in `captureSnapshot()`/`applyStateSnapshot()`, re-keyed alongside `hiatusTexts` in `shiftCalendar()`). New `fields.hiatuses[].name` key, append-only — see the README changelog entry for the full design and verification. **Extended 1 Sep 2026 to per-phase hiatuses too** (the toggle inside each phase card) — same `hiatusTexts`/`hiatusNameSyncedKeys` mechanism, keyed `"week\|phaseKey"` (the shape a phase-hiatus band's click-to-rename already used), via a new `phiatus-name-<key>` field that needed no save-format change at all (singleton id'd input, already covered by `fields.byId`). |
| 7 | Custom warnings replacing browser popups | ✅ **COMPLETE as of round 7 — all 8 remaining alerts converted with NO frozen edit.** They live inside `exportMonthPdf` / `exportWaterfallPdf*`, so editing the call sites was forbidden; instead a hoisted `function alert(message){ return uiAlert(message) }` declared in the IIFE SHADOWS the global for every call site in it. Same shape §2b prescribes for `SHEET_GRIDLINES`: keep the identifier, change only the declaration. ⚠️ Behaviour-preserving ONLY because all 8 are `alert(msg); return;` — checked site by site — so blocking vs async is unobservable. A future export that must alert AND CONTINUE has to `await uiAlert()` explicitly. `beforeunload` stays native (browser-owned). |
| 8 | Undo/redo symbols fit Mantine | ✅ drawn glyphs; round 4 fixed the baseline offset |
| 9 | Retrigger block on file actions | ✅ `reClickGuard(600ms)` |
| 10 | Tool popover pickers pull from Mantine | ✅ chevron restyle; they stay real `<select>`s (`fillPhaseSelect`) |
| 11 | "Search loaded files" + terminology rule | ✅ built + rule logged (saving = write `.sptcal`; loading = open into the PWA) |
| 12 | Share copy: keep code, disable button; "Export App With Data" in Settings | ✅ Settings ▸ App carries the flow. ⚠️ INTERPRETATION: the header button was REMOVED (code path intact) rather than shown-disabled — say the word if a visible-but-disabled header button was wanted |
| 13 | Autosave-needs-a-file in red | ✅ red Badge |
| 14 | Export naming convention | ✅ never touched — `<Show Title> Planning Calendar.xlsx` |
| 15 | Meta readout two rows | ✅ the one deliberate frozen `render()` edit, owner-directed, gate-proved |
| 16 | Changelog/commit/backlog hygiene | ✅ three commits + this list |
| 17 | Install-as-app above switchers | ✅ |
| 18 | Show/Settings blocks like Phases | ✅ `.side-block` |
| 19 | Warm dark-gray text + picker text ratio | ✅ `theme.black` + `sm` input text |
| 20 | Equal centred Waterfall/Month | ✅ |
| 21 | Shift All merged split control | ✅ |
| 22 | Status padding | ✅ |
| 23 | Menu rhythm (Open vs search) | ✅ |
| 24 | Rail reverted, icons kept, thicker named header, red Reset, button animations, full-height sidebar, preview-toolbar overhaul, menu search + pinned Open, export split | ✅ all |
| 25 | Round-4 images: cramped warn chip · holiday name/date split rows · chip side padding · × and undo/redo centring | ✅ all four |
| 26 | **Note popovers + help modal** (`.note-pop`, `.mv-note-pop` incl. its reposition bug) | ◐ **core built in round 6** — see row 39: both popovers restyled in place, the mv reposition/teardown bug fixed (observer, no frozen edit), help modal tokenized. Still open: the №4 ring and №7 frozen-alert conversions (rulings), optional React port of the help modal |
| 27 | Round 5: more side padding in the warning dialogs | ✅ root cause was the density spacing scale redefining `md` 16→8px, which Modal pads with; fixed once in theme `Modal.defaultProps` (`padding:'xxl'` = 20px), measured 8→20px live |
| 28 | Round 5: "Open"→"Load" in ALL user-facing copy (per the №11 terminology rule) | ✅ menu item "Load…" (Header.jsx — `data-action="open"` and every identifier deliberately KEPT, contract not copy); app.js dialog strings (`Load another calendar?` ×3, `Could not load…` ×2, `Permission to load…`), legacy-notice copy; help copy in src/index.html ("Files, saving & loading", "use Load…", "Loading a file again…") — plus a truth-fix to the help's Save paragraph, which still described the pre-v1.1.0 full-copy Save (now: `.sptcal` + a pointer to Export App With Data). "It opens by double-click" in the share-copy blurb KEPT — OS sense, not file loading. ⚠️ grep on app.js needs `LC_ALL=C grep -a` (embedded base64 makes plain grep classify it binary and silently return NOTHING) |
| 29 | Round 5: more padding between sidebar fields | ✅ the `Stack gap="md"` in Sidebar.jsx = 8px on the density scale (same trap as №27); Show + Region card Stacks now `gap="xl"` (16px, measured) |
| 30 | Round 5: tool-popover pickers = the loader's picker | ✅ `SelectPop.jsx` on the DatePop pattern with ONE deliberate difference: the panel PORTALS INTO the select's own `.tools-menu`, never body-level — the engine's click-away (`closeAllPops` on any click outside `.tools-wrap`/`.shift-group`) would close the parent popover on every option click otherwise. Document-delegated mousedown (preventDefault suppresses the native popup; Chromium behaviour, our decided target), options re-read from the live DOM every open (fillPhaseSelect stays the single source), write-back via native HTMLSelectElement setter + bubbling input/change (verified: syncAnchorDate fired — picking Pre Prep moved the anchor date), Escape closes the PANEL first (capture+stop; second Esc closes the popover — verified), `.select-pop` added to buildSavedHtml's strip list. Covers the three phase selects AND `#tool-anchor-edge`. Verified in dist: empty state renders as a dead row; a real Anchor To run through a picked phase shifted the calendar correctly |
| 31 | Round 5: file chip fixed-larger; "Save As…"→"Save As"; New/Save/Save As equal width | ✅ chip `width:280` FIXED (not dynamic, label ellipsis inside; matches the 280 dropdown); ellipsis dropped in Header.jsx AND in `flashSaveBtn`'s restore string (app.js — it would have flashed the "…" back); `miw={104}` on all three (min-width not width, so the non-Chromium pushed labels "Save to File"/"Downloaded ✓" still fit). Measured: 104/104/104, `--header-h` still 63px |
| 32 | Round 5: header brand icon = the favicon, single-sourced | ✅ `src/chrome/appIcon.js` is the ONE copy of the artwork; Header renders it as `<img.app-brand-mark>` (the old navy chip + drawn glyph retired — the geometry lives on as `IconCalendarPlain`), the head's two links ship placeholder `data:,` hrefs and main.jsx writes the real URI at startup (buildSavedHtml serialises attributes, so shareable copies carry it). ⚠️ DELIBERATELY NOT single-sourced: the manifest's 192/512/512-maskable PNGs (the installed-PWA identity — re-encoding the 32KB manifest data URI is its own step) and `theme-color` #E74C3C — flag both to the owner |
| 33 | Round 5: open animation on the help popup (the ? FAB) | ✅ keyframes on `.open` (`helpOverlayIn` fade / `helpModalIn` rise+scale, .16/.22s) — keyframes, not transitions, because display:none→flex has no from-state for a transition, while animations fire on becoming rendered. Transform kept OFF the overlay (it carries backdrop-filter). prefers-reduced-motion honoured. Close stays instant (an exit animation needs @starting-style machinery; not asked). Verified: computed animation-names present on open |
| 34 | Round 6: New/Save/Save As equal width = the LONGEST button's natural width, not a magic number | ✅ `.file-actions` grid wrapper (`grid-auto-flow:column; grid-auto-columns:1fr` — under an indefinite container width every 1fr track sizes to the largest max-content, so Save As defines all three at its own natural padding); `miw={104}` removed. Measured: 86/86/86 |
| 35 | Round 6: file chip 20% narrower | ✅ 280 → 224 (measured); dropdown stays 280 |
| 36 | Round 6: holiday header labels collide (W'FALL/MONTH jam at 40px columns) | ✅ note columns 40/40/38 → 46/46/44 — header spans and `.hv-cell`/`.hv-cell-month` IN LOCKSTEP — and the uppercase tracking dropped on the three cell labels (kept on HOLIDAY). Verified: fully separated at sidebar width |
| 37 | Round 6: the Show-Info warn chip breaks into columns | ✅ root cause: `.ep-panel-warn` was display:flex, so the innerHTML's text node / `<strong>` / text node were three anonymous flex ITEMS wrapping independently. CSS-only fix: block layout + absolutely-positioned glyph in the reserved left padding — BOTH engine messages (missing-info and dropped-episodes) now flow as one paragraph, zero engine edits |
| 38 | Round 6: "1 wk earlier" readout pops under the WRONG button (always right:0) | ✅ `runShift` stamps `data-shift-dir` on `#shift-group`; CSS anchors the readout left for earlier, right for later. Verified by geometry both directions |
| 39 | Round 6 №6 → **№26 STARTED: the note popovers** | ◐ **built and verified**: both editors restyled in place to the one overlay family (shell = file menu / .date-pop / .select-pop recipe; token type; chevrons on the id-less Day/Size selects; 16px swatches with the primary selected ring; help modal title/body tokenized — its radius 14 was already the xl token). **The §9.5 mv-note-pop bug is FIXED**: scroll (capture) + resize tracking mirroring the waterfall twin, plus a rebuild guard as a **MutationObserver on `#table-wrap`** — deliberately NOT a mirror of the twin's guard, which lives INSIDE frozen `render()`; observing mutates nothing. On a rebuild it re-finds the equivalent anchor via `relocateNoteAnchor` and follows it, else closes without saving like the twin. Verified: resize re-glues at 4px; a sidebar-edit rebuild re-anchored the open editor. ⏳ Remaining of №26: porting the help modal to a React Modal (optional — visually it now matches), and the bundled №4 ring + №7 frozen-alert conversions still await their rulings |
| 40 | Round 7: date picker inside Shift From / Anchor To / Rebuild From **destroyed the edit** | ✅ the exposure round 5 predicted and left latent. `.date-pop` is a body-level panel, so a click on a day is "outside" the tool popover and the engine's click-away (`closeAllPops`) shut it mid-edit. One-line guard: `.date-pop` excluded alongside `.tools-wrap` / `.shift-group`. Escape now also layers — DatePop consumes it (capture + stopPropagation) so one press closes the picker and a second closes the popover, matching SelectPop. Verified with real clicks: panel survives, picked date lands, Go still there |
| 41 | Round 7: undo/redo still not centred | ✅ the GLYPHS were off-centre in their own viewBox, which is why round 4's baseline fix did not settle it: ink spanned y 5.5–16 on a 16 box (centre 10.75 vs 8, i.e. ~2.4px low at render size). Redrawn to span y 3–13, x ~3–13; Redo is the exact mirror of Undo about x=8. Measured after: ink centre y **8.00**, svg offset in button 0,0 |
| 42 | Round 7: title padding left vs right | ✅ measured 28px of page gutter left of the mark against 6px between the name and the divider; `.app-brand{padding-right:22px}` puts 28px on both sides |
| 43 | Round 7: **must work at different screen dimensions** | ✅ the header never truncates a label again. Root cause: nothing overflowed or wrapped — flex items SHRANK, so at 1100px the labels read "Expor"/"Exp"/"Rese". Now every control is `flex:none`, the status readout is the only elastic element, and demand drops in four deliberate steps: chip 224→180 (≤1320), brand name hides (≤1200), New/Save As/secondary export go icon-only with title tooltips (≤1120), status hides (≤980). Save keeps its label at every width (it carries the "Saved ✓" flash) and so does the primary export. Verified at 1440/1280/1150/1024/900: 0 clipped labels, 0 overflow, `--header-h` 63px throughout |
| 44 | Backlog: **Inter embedded** (was §9.1, ruled yes) | ✅ ONE variable woff2 (latin, 48 KB → 66 KB base64) replaces four static weights AND the Google Fonts link; `tools/fetch-inter.py` regenerates it. **The gate the ruling came with is satisfied by measurement, not assumption**: canvas text widths at 400/500/600/700 are byte-identical to the Google-served statics (279.322 / 282.599 / 285.875 / 289.152), so `mvNoteLineCount()` measures exactly what it measured before and month-view row heights cannot move; and the built file makes **zero** external font requests, so "network on vs off" cannot differ by construction |
| 45 | Backlog: **per-component Mantine CSS** | ✅ 26 files instead of the 273 KB bundle. The list is empirical — every `m_*` class the app renders was collected from a live run (every tab, the file menu, all four tool popovers, both pickers, the month view, both note editors) and mapped hash→file — PLUS seven files for states no click can reach (Badge, Loader, Tooltip, Divider, ScrollArea, VisuallyHidden, FloatingIndicator). ⛔ **THE ORDER IS DERIVED, NOT ALPHABETICAL**: all files share `@layer mantine`, so order decides, and an alphabetical list put `UnstyledButton` after `Button` — its reset then won and EVERY button in the app lost its background, border and padding. Measured, not theorised. Verified: 16 elements × 15 computed properties identical to the full-CSS build (the one delta is `min-height auto→0` on one button, same rendered 30px height), every component's classes present in the built CSS, ordering asserted. dist **1,096 KB → 983 KB** *including* the newly embedded font |
| 50 | The documentation sweep (31 Aug 2026, after round 7) | ✅ All eight project docs audited against the repo and corrected — no app code touched. ⚠️ **What it found is the reason to keep doing this:** two docs *prescribed designs that had been tried and rejected* (UI-CONV §7's `AppShell` + overflow Menu; MIG's "four popovers become one library call"), the Mantine layer fence was documented **inverted** in two places, and three docs still told the reader to diagnose the restore stall with a standalone run — the trap in row 49. `CLAUDE.md` gained the "sanctioned ways to change frozen BEHAVIOUR without editing frozen code" section, which is what rows 4 and 7 actually proved. ⛔ **`tools/check-refs.py` had a hole and it is closed**: three prose line numbers survived every existing pattern (all required a backticked symbol adjacent to the number, and these were written as bare English — the word "line" followed by a number, with no symbol near it), and two of the three were already WRONG. It now catches the bare English form, regression-tested against both the text that fooled it and the constants it must not fire on |
| 49 | Round 7: ⛔ **THE RESTORE LEG'S "IndexedDB stall" HAS A MECHANISM, AND IT IS NOT LOAD** | ⚠️ Previously written up as flaky-under-load with "diagnose with a standalone run". That advice is **actively misleading** and cost this session real time: `run.sh` defaults to `HARNESS_PAGE=/index.html`, so a standalone `./run.sh restore 60` tests **the deployed legacy app, not the build** — it passes while dist fails, which reads as "the build is fine" and is not evidence at all. Pass `HARNESS_PAGE=/dist/index.html` or you are testing the wrong page. **The real mechanism, measured with `tests/harness/t/fsprobe.js`:** `indexedDB.open('spt-planning-cal')` in headless Chrome **never settles** — no success, no error, no `blocked` — it simply hangs past 8 s. `renderRecents()` sits behind that round trip, so `#file-menu-wrap` is never revealed and `appReady()` times out. ⚠️ **IDENTICAL on the untouched deployed `/index.html`**, which is the proof it is environmental and not a regression. The File System Access API is present and the context is secure on both (`showSaveFilePicker: function`, `isSecureContext: true`) — capability is not the issue. Prime suspect is `--virtual-time-budget`, which fast-forwards timers while IDB does real async I/O; ⛔ **removing it is NOT the fix** — tried, and `--dump-dom` then produces no output at all, because the budget is what makes Chrome wait before dumping. Fixing this properly means changing how the harness waits (CDP, or a real-time run with an explicit dump trigger) and is its own piece of work. Until then the restore leg is **unprovable in this environment** and a FAIL there means nothing on its own — check it against `/index.html` and treat matching behaviour as environmental |
| 47 | Round 7: the gate's two frozen-output proofs had been DEAD | ✅ `gate.sh`'s own header documented that the PDF byte-compare and the Excel parts-diff FALSE-FAIL on any day after the baseline was cut, because both artefacts stamp `todayStr` — so the two comparisons that prove the frozen writers have not moved were permanently red and therefore ignored. New `tests/harness/pdfcmp.py` decompresses the content streams, substitutes ONLY the dotted M.D.YY stamp (calendar content renders dates with slashes, so real printed dates stay compared), and byte-compares the rest; the workbook's `sheet1.xml` gets the same single substitution. ⚠️ It also taught something: a first version compared the XREF TABLE too, whose offsets shift mechanically when any length changes — excluded, because every object's CONTENT is still compared strictly. Both legs now PASS, and a red there means something real |
| 48 | Round 7: frozen-surface fence, dist vs the deployed app | ✅ run by hand (gate.sh still does not run fence.js). **235 frozen waterfall values compared, 233 identical.** The only two differences are one number — `.sheet-scroll` height 854 vs 865px — which is precisely the 11px taller header (63 vs 52) flowing through the frozen `calc(100vh - var(--header-h) - 140px)`. That is the measured-`--header-h` design working, not drift. Every cell metric, font, padding and width is identical |
| 46 | Backlog: §2h — shareable copy baked in a notice strip | ✅ fixed with the strips left as static markup: `buildSavedHtml()` now re-HIDES `#legacy-notice` / `#update-notice` in its clone (they ship `hidden` and are un-hidden by `el.hidden=false`, which removes the attribute `outerHTML` would have serialised). Restores v1.0.0's output rather than changing it, so §4 permits it. The React port of the strips is no longer needed to fix this |

Nothing from the consolidated paste is unaccounted for.

⚠️ **The open set shrank sharply in rounds 6–7 — this paragraph used to list eight items and six of
them are now closed by rows in the table above.** №4 (the ring) and №7 (the frozen-path alerts) both
shipped **without a frozen edit**, which is why they stopped being blocked; №26's core landed; and
the Inter embed, the per-component CSS and the §2h fix are all done.

**What is genuinely still open, and why:**

| Item | Status |
|---|---|
| **Grid direct manipulation (batch expand + column swap)** | 📋 **PLANNED, NOT BUILT — see [`GRID-DIRECT-MANIPULATION-PLAN.md`](GRID-DIRECT-MANIPULATION-PLAN.md)** (1 Sep 2026). Two owner requests: batch-expand a multi-cell selection, and drag a phase run left/right to swap columns. **Feature 1 (batch expand) is cleared to build** — no frozen edit, no sign-off, zero new save-format surface (`cellSpans` already takes the writes). ⛔ **Feature 2 (column swap) is BLOCKED on owner decision D1** — a per-week column changes which label sits in which grid column, i.e. inside `#table-wrap`, which the 29 Aug appearance convention freezes; its only escape is *"unless given specific instructions"*, so the ruling must be explicit. D2 is already decided (collateral capped at magnitude 1). The plan carries the adversarial review that killed the first-pass designs — 10 blockers, incl. a selection model that could never fire and a store collision between the two halves. |
| **№3 phase reorder** | A real DEBT: the handles promise a drag that does nothing. Needs its own design first — `customPhaseDefs` order is save format, `PHASE_CHAIN` depends on order. Owner: "a later decision". ⚠️ **Do not conflate with the column swap above** — that one reorders grid COLUMNS, this one reorders the SIDEBAR phase list. Shipping either will read as having shipped the other; see the plan's D10. |
| **№12 interpretation** | Owner confirmed round 7: as built is correct. Closed. |
| **The notice-strips port** | No longer a bug fix (§2h is fixed); plain tidiness, still needs sign-off because it changes an export's output. |
| **The help modal** | Tokenised, not ported to a React `Modal`. Cosmetic parity already reached. |
| **Sub-1024 responsive** | The header ladder is done; the layout below the 960 px stacking point is undesigned. |
| **A `.sptcal` fixture** | ⛔ Missing entirely — `tests/fixtures/` holds only the pre-v1.1.0 `.html`, so the restore gate proves the legacy path and not the format every save now writes. |
| **The month-PDF diff** | The one part of §9.1's gate satisfied by reasoning rather than by exporting a PDF. |

#### ✅/⏳ THE OWNER'S ROUND-3 LIST — built same day except where marked (29 Aug 2026)

Logged before building at the owner's instruction, then built and gated. State of each:

1. ✅ Font parity: `.mantine-InputWrapper-label` now matches the engine field labels declaration
   for declaration; Mantine input text pinned to `sm` alongside the plain-control rule.
2. ✅ **Phase chips:** the color changer is a full-width bar crowning each chip (same
   `swatch-<key>` element and engine contract — `style.background` write, color-pop anchor);
   **grab handles are VISUAL ONLY** (six CSS dots, `cursor:grab`). ⛔ Reorder CODE stays unbuilt
   deliberately — `customPhaseDefs` order is save-format and `PHASE_CHAIN` depends on order;
   needs its own design first.
3. ◐ The production episode warning chip is diegetic now (warn tuple + drawn warning glyph).
   ✅ **The red ring on a bad start date IS built (round 7) — and it needed NO frozen hook**, which
   is the interesting part, because this item asserted that it did. `reflectStartDateValidity()`
   runs from `update()` (not frozen), rings the **sidebar** field, and *calls* frozen
   `readCfgForMeta()` for the verdict rather than duplicating the rule. See `CLAUDE.md`'s
   "Sanctioned ways to change frozen BEHAVIOUR without editing frozen code".
4. ✅ × buttons flex-centred; destructive removes go danger-tinted on hover.
5. ✅ **COMPLETE (rounds 4 and 7) — every browser popup is now the app's own dialog.** The last
   eight lived inside the frozen export functions and were converted by **shadowing `alert` at its
   declaration** inside the engine's IIFE, so no frozen line changed. `beforeunload` stays native;
   it is the browser's.
6. ✅ Undo/redo are drawn stroke glyphs from the icon family.
7. ✅ `reClickGuard(600ms)` on New / Save As / Share / both exports (Save already had
   `saveInFlight`).
8. ✅ Tool-popover phase selects wear Mantine's chevron (`appearance:none` + inline SVG; still
   real `<select>`s — `fillPhaseSelect` owns their innerHTML).
9. ✅ "Search loaded files…" per the terminology rule.
10. ✅ Share copy left the header; **Settings ▸ App ▸ "Export App With Data"** carries
    `#share-copy-btn`, so the engine's document-delegated listener needed no change.
11. ✅ "Autosave needs a file — click Save" pushes `tone:'failed'` → the red Badge.
12. ✅ **`.phase-meta` is two rows — THE FIRST DELIBERATE FROZEN-FUNCTION EDIT.** One separator
    inside `render()`'s meta branch (` · ` → `\n`) plus `white-space:pre-line`. Owner-directed;
    `meta-<key>` is a write-only sidebar div no export path reads; the full gate (waterfall PDF
    byte-identical, Excel parts identical) passed after it.
13. ✅ **BUILT 31 Aug 2026** — see row 6 of the master list above for the shipped design.

#### ⏭ What is next, in order

1. ✅ **DONE — the engine-generated sidebar rows, resolved as RESTYLE TO SPEC** (owner ruling,
   29 Aug 2026 — see the section above). The generators keep minting the ids; the look now fully
   matches ui.mantine.dev via the `--mantine-*`-token CSS and two chrome-safe template edits. A
   React rebuild stays *possible* later, but its sane precondition is a custom-phase fixture +
   tests (the gate's biggest blind spot) and a restructured restore seam — do not start it
   casually.
2. ✅ **DONE (round 6) — the note popovers.** Both editors wear the shared overlay look, and the
   §9.5 live bug is fixed: `.mv-note-pop` now tracks its anchor on capture-phase scroll + resize
   like its waterfall twin, and gets the twin's rebuild protection from a **MutationObserver on
   `#table-wrap`** rather than an edit inside frozen `render()`. ⚠️ Both are
   `document.body.appendChild` panels and `buildSavedHtml()` strips them **by class name** — the
   list is now five (`.note-pop`, `.mv-note-pop`, `.phase-color-pop`, `.date-pop`, `.select-pop`);
   add to it whenever a body-level panel is added, or a stray popover exports into a shareable copy.
   ⏳ What is left of this item: the help modal is only **tokenised**, not ported to a React `Modal`
   — cosmetically it already matches, so this is cleanup, not a visible change.
3. ✅ **DONE (round 7) — Inter is embedded.** See the ruling block above for how its gate was met,
   and for the one thing still unrun (an actual month-PDF before/after diff). ⚠️
   `body{font-family:'Inter',…}` is still FROZEN for the original reason — `.mv-bar` and
   `.mv-note-block` declare no font-family and inherit it.
4. ✅ **The §2h bug is FIXED (round 7) — but the STRIPS are still static markup.** They are no
   longer a bug, so this stopped being urgent: `buildSavedHtml()` re-hides them in its clone.
   Porting them to React is now a plain tidiness item, and it still changes an export's output, so
   it still wants the owner's sign-off first. Do not treat it as a bug fix any more.
5. ✅ **DONE (round 7) — per-component Mantine CSS.** 26 `.layer.css` files instead of the 273 KB
   bundle; `dist` went 1,096 KB → 983 KB *including* the newly embedded font. ⛔ **The import order
   is DERIVED from Mantine's own `styles.layer.css` and must never be alphabetised** — they share
   one `@layer`, so order decides, and sorting it put `UnstyledButton` after `Button`, whose reset
   then won and stripped every button in the app of its background, border and padding. Add the
   file whenever a component **or a state** is added (Badge, Loader and Tooltip are all in the list
   for states no click can reach), and re-run the runtime class audit described in row 45.
6. **The sub-1024 responsive pass.** The header ladder is built and verified 1440→900 (row 43); what
   is unbuilt is the layout *below* the 960 px stacking point, which nobody has designed.
7. **Calibrate and document**, then ~~the GitHub Action~~, and only then the cutover conversation.
   ✅ **THE ACTION IS INSTALLED AND THE CUTOVER IS DONE (31 Aug 2026, owner-approved).**
   `.github/workflows/deploy.yml`. Pages Source is **GitHub Actions**; the workflow builds `src/`
   and publishes `dist/`, and **the Mantine build is the live site**. Deploy runs on push to
   `main` as well as on manual dispatch — the repo already auto-deployed before this, so
   manual-only would have silently changed the deploy model; the gate remains the "never push
   unasked" rule in `CLAUDE.md`.
   **ROLLBACK, if ever needed:** Settings ▸ Pages ▸ Source back to "Deploy from a branch"
   (`main`, `/`). That restores the root `index.html` — the known-good v1.2.0 legacy app —
   instantly, with no revert, no rebuild and no waiting on CI.
   ⚠️ One thing that bit on the way, worth keeping: pushing anything under `.github/workflows/`
   needs the token's **`workflow`** scope. Without it the push is rejected, and the Contents API
   is blocked identically but answers **404, not 403**, which reads as a missing repo.

### ✅ The restore leg: row 49's conclusion was right, its evidence was not — RESOLVED 31 Aug 2026

**Bottom line: there is no app bug, and the cutover is not gated on this.** Verified in a real
browser (not headless, no virtual time), on the build, served over HTTP:

| | Result |
|---|---|
| `indexedDB.open('spt-planning-cal')` | **SUCCESS in 1 ms**, object store `handles` present |
| `#file-menu-wrap` | `display: block`, visible |
| `isSecureContext` / `showSaveFilePicker` | `true` / `function` |
| React mount | 2 children, full chrome renders |

So the recents list, the file handles and the crash backup all work. Row 49's *conclusion* —
environmental — is correct.

**But row 49's stated evidence is wrong, and that matters**, because it is the sentence the next
session will reason from. It says the hang is *"IDENTICAL on the untouched deployed
`/index.html`"*. It is not. Same server, same origin, same Chrome, same run:

- `/index.html` (legacy) — restore **PASSES**, IDB settles
- `/dist/index.html` (build) — restore **FAILS**, `indexedDB.open` **TIMEOUT at 8000 ms**

**The mechanism, which that asymmetry actually points at.** `src/index.html` loads the app as
`<script type="module">`, which is **deferred** — a change made deliberately and documented in
that file. The legacy app ran its IIFE *mid-parse*, so `loadRecents()` issued
`indexedDB.open()` almost immediately; the build issues it after parsing **and** after React
mounts. Under `--virtual-time-budget` the clock races ahead as soon as the task queue drains, and
IndexedDB's real disk I/O is not something the virtual clock waits for. The later the `open()` is
issued, the more likely the budget has effectively expired before the I/O lands. Same environment,
different position in the page lifecycle — which is why one page hangs and the other does not.

⛔ **What this costs, and it is not nothing:** the restore leg is the test that proves *saved
calendars still open* — the project's most safety-critical rule (§0 rule 3). It is **unprovable
against the build** under this harness. That is a hole in the gate, not a hole in the app. Fixing
it means changing how the harness waits (CDP, or a real-time run with an explicit dump trigger),
exactly as row 49 said; removing `--virtual-time-budget` is still not an option, because
`--dump-dom` then emits nothing.

**Until it is fixed, verify the build's restore path in a real browser** — it takes a minute:
serve the repo, open `/dist/index.html`, and check `indexedDB.open` settles and the file menu
appears. Do not read a harness FAIL on that leg as a regression without doing so.

### ⚠️ `grep` SILENTLY UNDER-REPORTS ON `src/legacy/app.js`

Cost real time on 31 Aug 2026 and nearly produced a badly wrong conclusion ("the build has no
IndexedDB code at all"). The file contains the **literal NUL** of the `SIM_KEY` sentinel, so GNU
grep classifies it as **binary** and suppresses matches — `grep -c indexedDB src/legacy/app.js`
prints *nothing*, while `grep -ac` prints 2 and the file really has 8 occurrences. `file(1)` still
calls it "UTF-8 text", so nothing warns you.

Use `grep -a`, or better `node -e` with `readFileSync` (which PROJECT-CONTEXT §11 already
recommends for the long-line problem — this is a second, independent reason). Note the same trap
does **not** hit `dist/index.html`: the minifier re-encodes the NUL as an escape, so the built
file greps normally. The source is the dangerous one.

⚠️ **`.portmap/` is gitignored and is NOT the source of truth** — it is the verified per-surface port
spec produced 29 Aug 2026 by mapping every chrome surface against the real file, and it is worth
regenerating rather than trusting if `index.html` has moved.


### 2b-2. Mantine UI redesign of the surrounding chrome — **decided; design pass DONE**

> ✅ **Stage 2 (the design pass) was completed 29 Aug 2026 → [`UI-CONVENTIONS.md`](UI-CONVENTIONS.md).**
> Read it before anything below. It settles the theme tokens, the one feedback system, every
> control/overlay/date-picker choice, and the responsive model — grounded in the real
> `@mantine/core` **9.5.2** source rather than recalled API. Three things in it change what the
> rest of this section assumes:
>
> - **§8 — seven verified traps.** `DatePickerInput` renders a `<button>`, so it would silently
>   drop every `start-<phase>` key from `fields.byId`. `Select` stores the option *label*, not its
>   value. Omitting `id` yields a **random** id, not none — so ~75 holiday checkboxes and the
>   note-popover controls would be swept into every saved file and the undo stack. `Popover`
>   portals by default, escaping the `.tools-menu` guard. `Input.Wrapper`'s id *wins* over the
>   inner input's. Mantine's baseline reaches five real `<button>`s inside `#table-wrap`.
> - **§1 — the phase palette's real source is JavaScript.** The `--c-*` custom properties have two
>   consumers and both are dead CSS; `PHASES[]`, `HIATUS_COLOR`, `SIMPOST_COLOR` and
>   `MILESTONE_COLOR` are what the grid and both exports actually read.
> - **§9 — six items need an owner ruling**, because they turn out to touch `render()` or change a
>   frozen export's output rather than being design choices.

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

### 2c. Multiple / structured notes columns — ⏸ **HELD by the owner, 29 Aug 2026**

> ⛔ **Do not start building this.** It was picked up as build-order Stage 7 on 29 Aug 2026,
> the baseline measurements were taken, and it was then **stopped before a line of `index.html`
> was written** — because the owner set a constraint the stage cannot satisfy. Read
> "Why it was held" at the end of this section before re-opening it. Everything between here
> and there is the design as it stood, and it still stands; what changed is whether it may ship.

The reference Excel export splits Notes into **two sub-columns**: a label and a right-aligned date
(`Drop 201, 202, 203  ⟶  7/28/28`). The app concatenates them into one centred string. This is the
single biggest remaining visual difference from a real Excel print, and it is also *why* the
geometry diverges — Excel's grid is 1301 pt wide against the app's 1104, and nearly all of that gap
is the notes columns. Adding the date sub-column would make the app width-bound like Excel and pull
row pitch back toward the reference on its own.

The owner also asked for the ability to **add extra notes columns**.

### The spec, settled 29 Aug 2026

> **Functionally two separate columns; visually one.** The label and the date are two real columns
> to the layout and width model — that is what right-aligns the date to a consistent edge — but
> they present as a single Notes column: one header, no rule between them.

That is what the reference export itself does, and it is the whole feature.

### Why this is far cheaper than it looks — four findings from the code

1. **`notesColspan` already exists** (`renderSpreadsheetView`, currently `1`), and the
   header is already written as `<th colspan="${notesColspan}">Notes</th>`. It was **>1 before**,
   when Simultaneous Post had its own column beside Notes. *One header spanning N notes columns is
   a shape this code has already shipped.* The empty-row and hiatus-row cells also already span
   `mc + notesColspan`, so they follow automatically.
2. **`cols` is the one list everything walks.** `sheetColumnWidths()` returns
   `cols = [date, ...labels, notes]`, described in its own comment as "the flat left-to-right list
   the renderer and the drag handles both walk, so neither has to re-derive which key belongs to
   which column." Adding `{key:'y<year>:notesdate', chars:…}` feeds the screen `<colgroup>`, the
   drag handles, the Excel widths and the PDF widths **at once**. Measure a second maximum
   (`notesDateMax`) beside the existing `notesMax`.
3. **"No rule between them" is the default, not extra work.** Interior gridlines are off
   (`SHEET_GRIDLINES = 'none'`), and the only border in that region is `.sheet-blockend`, which
   lands on the block's *last* column — the date — not between label and date.
4. ### ⚠️ **It needs NO save-format change. Auto-notes are already structured.**
   `addNote()` has always stored `{label, date}` separately; only `autoNotesText()` joins them for display. Splitting the display is therefore pure rendering.

   For **user-typed** notes, give the cell `colspan="2"`. A free-text note then spans the full
   Notes width — **pixel-identical to today** — so every existing calendar renders exactly as it
   does now, and `userNotes[k].text` is untouched. Structured *user* notes, if ever wanted, become
   a separate opt-in decision rather than a prerequisite.

### ⚠️ Do not reach for `userNotes[k].date` — that field is occupied

It is **not** a display date. It is a day-of-week pin doing two load-bearing jobs: telling the
**month view which day** to place the note on, and making the note **immune to calendar shifts**
(`pinnedWeeks`, is built from notes that have one). A display date needs a **new** key.

The name collides with the pre-git `noteDate` field and that is exactly the trap: see below.

### The history, and what is NOT recoverable

`userNotes` entries were once `{label, noteDate}` and were flattened to `{text}`. The live
migration simply concatenates them — `{text: [lbl, dt].filter(Boolean).join(' ')}` — i.e.
the collapse baked the *display string* into storage.

**Why it was done is not recoverable.** It predates this repo: `d249f60`, the first commit
containing `index.html`, already carries only the migration, and the three 15 Jul 2026 "Add files
via upload" commits have no messages. No doc records it.

One inference, flagged as inference: **auto-notes were never flattened**, only user notes. Had the
motive been data-model simplification, both would have gone. The likelier reading is an *editing*
decision — one free-text box is simpler than two coupled fields inside a small anchored popover.
**Worth asking the owner before reintroducing structure for user notes.** Nothing above depends on
the answer; the `colspan="2"` approach sidesteps it entirely.

### The acceptance gate, before any of this is written

- **Horizontally clipped-cell count stays 0.** The padding trap has landed twice (§3); a new column
  is exactly the shape of change that trips it. **Horizontally** is load-bearing — see the baseline
  below, where counting vertical overflow too produced three failures against untouched code.
- **PDF diff** against an export taken immediately before the change.
- **Excel opens without the corrupt-file alert** (the 255-char header limit is unrelated but the
  export is the thing being changed).
- **`tests/fixtures/v1.0.0-saved.html` restores identically** — the real proof that no existing
  calendar shifted.
- **Grid width measured against the 1301 pt reference**, since closing that gap is the point.

### Why it was held — the constraint and the finding (29 Aug 2026)

**The owner's constraint, in their words:**

> *"the output must not be changed — how the excel looks and the pdf looks should be exactly as
> 1.0.0 was — the editable grid in the app could have a reconsideration on design, but the goal is
> to not deviate from the exports too much so it could be easy to understand for new users coming
> from the old version"*

**The finding: Stage 7 cannot be export-neutral.** This is structural, not a matter of care.
`sheetColumnWidths()` returns **one** flat `cols` list, and the screen, the Excel writer and the
PDF writer all walk it — that shared model is the entire through-line of the 2026 work (§1). So:

- Adding a notes-date column to `cols` feeds all three outputs **by construction**. There is no
  version of "split the column in the model" that reaches the screen and not the workbook.
- And the *point* of the split is the width. Closing 1104 → 1301 pt means the Notes area gets
  wider, which changes the exports' geometry, page fit and scale. A split that changes no export
  geometry has not closed anything.

So "the exports look exactly like v1.0.0" and "close the gap to the reference export" are
mutually exclusive. That is the whole finding, and it is why this stopped at the gate.

**Four options were put to the owner**, with mockups of the notes column in each:

| | | Exports | Reference gap |
|---|---|---|---|
| 1 | Split everywhere (§2c as specced) | change: label flush left, date flush right, Notes wider | closes |
| 2 | Screen only, exports frozen | byte-identical to today | stays open; screen and exports disagree for the first time since the width systems were merged |
| 3 | Split everywhere, labels stay centred | change: Notes wider, dates aligned, labels centred as today | closes |
| 4 | **Hold the stage entirely** ← **chosen** | untouched | stays open |

**What the choice means for the next session:**

- ⛔ **Do not build any of options 1–3 without asking again.** The decision was made with the
  trade-off in front of the owner; it is not an oversight to be corrected.
- **§2d (PDF calibration) has lost its dependency.** It was written assuming Stage 7 would land
  first and shrink the row pitch on its own ("mostly falls out of stage 7"). It no longer does.
  **The +16% row pitch has to be attacked directly**, and the app being height-bound where Excel
  is width-bound is now a standing condition rather than a thing about to be fixed. See §8.
- **The owner's constraint is broader than this stage** and now sits in §4 as its own rule: the
  exports are frozen in *appearance*, not merely in code. The editable grid on screen has more
  latitude — that was said explicitly.
- If it is ever re-opened, the likeliest form is option 3: it is the one that closes the geometry
  gap while leaving the label alignment users recognise alone.

### The baseline, already measured — do not redo it

Taken 29 Aug 2026 against `37b877a`, immediately before the stage was stopped. This is the
before-side of the acceptance gate above, so re-opening the stage starts from here rather than
from another afternoon of harness-building.

**The fixture** (built by driving the real DOM, never by calling into the IIFE): a 2-block
10-episode US-General calendar — Writer's Rm 12 wk from 2026-01-05, Pre Prep 6, Prod Prep 6,
Production 8 days/ep, Post 16, Localization 8 — plus a 2-week all-phase hiatus from 2026-08-24,
**all 14 holidays switched on for the waterfall**, and one free-text two-line user note on
2026-09-07 (the `colspan` path that must stay pixel-identical).

| Measurement | Baseline |
|---|---|
| **Horizontally clipped cells** | **0** |
| Vertically clipped cells | 3 — all multi-line notes at the shrink floor in a 20 px row |
| Grid width, unscaled | 797 pt (`date 53 + s0 88 + s1 88 + notes 179` ×2026, `53 + 86 + 86 + 164` ×2027) |
| Rows | 52 |
| Excel | 10,169 B · XML valid · header 238/255 · 75 merges, 0 overlapping · portrait |
| Waterfall PDF | 76,568 B · 612×792 · 204 text ops · 279 rect ops · grid drawn 573.84 pt wide |
| `v1.0.0-saved.html` restore | 52 rows / 154 cells / 56 fields · 0 clipped · grid 324 pt |

⚠️ **"Clipped cells" has to mean HORIZONTAL clipping.** The first version of the measurement
counted vertical overflow too and reported 3 failures against unmodified code. Vertical overflow
is *deliberate* — rows are a fixed height and text is fitted to the row, so a three-line note in a
20 px row is clipped by design once the shrink floor is reached. Only horizontal clipping is the
padding trap (§3), and only horizontal clipping is the gate.

✅ **The harness that produced this is now committed** at [`tests/harness/`](tests/harness/), at
the owner's later instruction to keep undeployed work in the folder. Reproduce with
`cd tests/harness && ./run.sh base 45`, then diff against
[`tests/baselines/2026-08-29-stage-7/`](tests/baselines/2026-08-29-stage-7/), which holds these
numbers plus the actual `.xlsx` and `.pdf`. Several gotchas that each cost a run are written up in
that README and in PROJECT-CONTEXT §11.

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

⚠️ **This section used to say the row pitch would mostly fall out of Stage 7. It will not** —
§2c was held on 29 Aug 2026 and the notes columns are staying one column wide. So the app stays
height-bound, and the +16% row pitch has to be attacked **directly**, on its own terms, with its
own acceptance gate. Two consequences worth thinking about before anyone starts:

- The gap is a *fit* gap, not a rendering gap. `sheetPageOrientation()` and the whole-percent fit
  scale in `buildWaterfallPdf()` are where a height-bound grid turns into stretched rows.
- Whatever is done here is bound by the same constraint that stopped §2c (§4): the PDF must still
  **look** like v1.0.0's. Closing a row-pitch gap by making the page fit differently is exactly
  the kind of change that shows. Take the before-export first and diff it.

Two palette entries differ: Pre Prep and Prod Prep are effectively swapped versus the reference,
and the header row grey is one step lighter (`#D9D9D9` vs `#D0CECE`). ⏹ **Both are now WONTFIX
too** — they are only "wrong" against the reference, and as of 29 Aug 2026 the reference is not
the target (§4). Changing either would move the exports away from v1.0.0, which is the one thing
the rule forbids.

> ⛔ ~~*"the app reserves 54 pt above the grid where Excel reserves ~21.5 (Excel puts its header
> inside that band)"*~~ — **STRUCK 29 Aug 2026. It is false of the current code.** The app has
> drawn its header inside the top-margin band, exactly as Excel does, since 28 Aug 2026;
> `buildWaterfallPdf` says so in terms and its grid origin is unconditionally `MARGIN_PT.t`. The
> `~21.5` is Excel's *header margin* (0.3 in), which is where Excel puts its header **text** — its
> grid still starts at its 0.75 in top margin. The table two rows above records that agreement
> (*Table top: Excel 54.5, App 54.0*). The sentence contradicted its own table, and left standing
> it would have sent the next session to "fix" a 32 pt band that is already right, inside a
> function byte-identical to v1.0.0. See [`STAGE-8.md`](STAGE-8.md) §7.

### ⏹ Investigated 29 Aug 2026 — and mostly WONTFIX. See [`STAGE-8.md`](STAGE-8.md)

Stage 8 was taken apart before starting it, because §2c had just been held on a constraint that
applies here too. **Read [`STAGE-8.md`](STAGE-8.md) before touching any of this.** The short of it:

- **The four geometry rows above are not four items. They are one number.** `buildWaterfallPdf`
  computes a single whole-percent fit scale and multiplies *everything* by it — every row is
  `15 pt × scale`. There is no row-height knob. **Row pitch IS the fit scale.**
- **Excel runs out of width first; the app runs out of height first — and the app gave itself
  36 pt more height to run into** (`SHEET_PAGE_MARGIN_PT.b` is 18 where the workbook's own bottom
  margin is 54, reclaimed deliberately as "the one free increase available"). Roughly half the
  +16% is that one constant.
- So every route to the row pitch visibly changes the PDF, and §4 forbids that.
  ✅ **ANSWERED 29 Aug 2026: "v1.0.0" means the app's BUILD, not the reference spreadsheet**
  (§4 has the owner's words). That closes `STAGE-8.md` §6 and makes the row pitch, the grid width
  and the body-text size **permanent WONTFIXes**. Do not re-open them; the reference is no longer
  the target.
- ⚠️ **The app's PDF and the app's own workbook do not print at the same size** — ~7% apart
  whenever height binds. That is the app disagreeing with *itself*, independent of any reference,
  and nobody has decided about it.
- ⚠️ **The §2d numbers above are not internally self-consistent** — two imply a 64% scale, two
  imply 66.3%, and the app only ever applies one. Treat +16% as "large and real", not as a target
  to hit to a decimal place. **Anyone re-opening this needs a fresh reference export from the
  owner first**; the original is not in the repo and never was.

### 2f. PWA update delivery to installed devices — discussed, not built

Owner question (28 Aug 2026): most users run this as an installed PWA, not a browser tab — how do
we ship a dev change and get it to actually reach and reload on their devices? Researched, nothing
implemented yet.

**Where the app already stands, and why it's better than it sounds:** there is no service worker
and no cache layer (§3, "no service worker"). An installed PWA with no service worker behaves like
a browser tab on relaunch — it fetches `index.html` fresh from the network every time, no stale
cache to fight. So "quit and relaunch" already gets the newest deploy, with zero extra plumbing,
*as long as the fetch actually reaches the network* (see the private-repo thread below).

**✅ The hosting-layer caching question is now answered (29 Aug 2026).** `curl -I` against the
live URL returns:

```
cache-control: max-age=600
etag: "6a9254a0-a18bb"
```

So GitHub Pages sets a **10-minute** browser cache with an ETag. That qualifies "relaunch always
gets the newest deploy" without overturning it: a relaunch **within 10 minutes** of the last fetch
is served from the local HTTP cache and never touches the network; past that the browser
revalidates against the ETag and picks up a new deploy. The staleness window is **bounded at ~10
minutes** — nothing like a service worker's indefinite cache, which is why removing the SW was the
right call, but it is not zero.

Two consequences for the design below:

- A version marker **served from Pages is cached the same 10 minutes**, and Pages does not let you
  set per-file headers. Poll it with a cache-busting query (`?t=<epoch>`) or accept ~10-minute
  granularity on update detection. Either is fine; just do it deliberately.
- **Verifying a deploy** (§5a says poll the live URL for a new symbol) can show a stale 200 for up
  to 10 minutes. Use a cache-busting query or `curl -H 'Cache-Control: no-cache'` when checking,
  or you will conclude a good deploy failed.

**The private-repo / SSO complication, worked through with the owner:**

- The app deploys via **GitHub Pages** from `main` (§5a). Free-tier Pages requires the *source
  repo* to be public. Private-repo Pages needs **GitHub Enterprise Cloud**.
- GHEC private Pages is **not** a one-time unlock. Every request is checked against a live
  GitHub/SSO session at request time — there is no "authorize once, then open forever" behavior.
  A user with an expired or absent session gets denied on that request, full stop.
- This breaks a silent background update check or fetch from inside an installed, standalone PWA:
  a `fetch()` has no way to complete an interactive SSO login. If the PWA's context doesn't already
  carry a valid session, the request just fails — no error surfaced to the user, no update found.
- **What does still work:** a real top-level page **navigation** (`window.location.href = ...`, a
  clicked link) to a private/SSO-gated URL behaves normally even from inside a standalone PWA
  window — the browser shows the SSO redirect/popup, the user logs in, and lands on the page. The
  failure mode is specific to unattended background `fetch()`, not to navigation.

**✅ BUILT and shipped as v1.2.0 (29 Aug 2026).** The owner chose **`version.json` in this repo**,
served from the same Pages site — zero new infrastructure, now that the repo is confirmed public
(D4). As built:

| Piece | Where |
|---|---|
| `APP_VERSION` | top of the main IIFE in `index.html`, with the bump warning attached |
| The marker | `version.json` at the repo root → `…/planning-cal-builder/version.json` |
| The check | nested IIFE in the PWA block; 8 s after load, then every 30 min, plus on `visibilitychange` when stale |
| The banner | `#update-notice`, sharing the legacy strip's CSS, dismissable **per version** |
| The action | `location.reload()` — a real top-level navigation, never a background `fetch()` |

Decisions baked in, each for a reason worth not re-litigating:

- **Never auto-reloads.** The user may be mid-edit; the existing `beforeunload` guard still runs.
- **Only nags when the server is genuinely ahead** — numeric per-segment compare, so `1.2.10`
  beats `1.2.9` and a *rolled-back* deploy stays quiet instead of inviting a downgrade.
- **Silent on `file://`.** A shareable copy is a deliberate frozen snapshot; "update" would
  navigate its holder away from the file they were sent.
- **Gives up after 3 consecutive failures**, so a frozen `releases/vX.Y.Z.html` — which resolves
  the marker relative to its own folder and will never find one — does not 404 twice an hour
  forever.
- **The fetch is cache-busted** (`?t=` *and* `cache:'no-store'`), because the marker is served
  from the same host and inherits the same `max-age=600` it exists to see past.

⛔ **`APP_VERSION` and `version.json` are now part of cutting a release** — see §5g step 0. This is
the one piece of bookkeeping with a live consequence for people who are not you.

**Still true, and still not built:** if the deploy is ever moved behind GHEC private Pages, the
marker must move somewhere unauthenticated or the check silently dies against the SSO wall. The
`location.reload()` form was chosen partly so that day only requires moving the marker, not
rewriting the mechanism. VPN gating remains explicitly deferred by the owner.

### 2g. Encrypted `.sptcal` — **designed, not built** (28 Aug 2026)

The owner asked for an encryption/decryption method around `.sptcal` "so that only our app can
read/write it". The full design is in **[`SPTCAL-ENCRYPTION.md`](SPTCAL-ENCRYPTION.md)**. Nothing
in `index.html` was touched. What matters for the next session:

**The design is blocked on a decision only the owner can make**, and the decision is not about
cryptography.

The owner's stated assumption is *"our HTML is never accessed — only `.sptcal` is."* Under that
assumption an app key embedded in `index.html` is a real secret and the scheme gives real
confidentiality. **The assumption is not true today**, in four ways, all verified this session:

1. The GitHub repo is **public** (`gh repo view` → `isPrivate: false`). Every version of
   `index.html` is readable forever, including in git history — a key committed once is public
   from that commit on, and rotating later does not un-publish what the old key encrypted.
2. The app is served on **GitHub Pages** at <https://greicher1.github.io/planning-cal-builder/>.
   View Source is the whole attack.
3. `releases/v1.0.0.html` is a byte-identical copy of the app in that public repo — and the
   versioning rule in `CLAUDE.md` says to add one of these *every release*.
4. The `.html` "Export shareable copy" exists specifically to hand someone a working copy of the
   app, i.e. to give away the HTML.

And one that cannot be fixed: this is a client-side app, so **every user necessarily receives the
HTML** in order to run it. The assumption can hold against people who don't have the app; it can
never hold against someone who does.

That is still a useful threat model — "only people with the app can read it" is probably the real
requirement (cloud sync, mail attachments, a lost laptop, a forwarded file). But it has to be
*chosen*, because making it true costs the public URL. Three options, laid out with costs in
§0 of the design doc: **A** make the assumption true (private repo, no public Pages, strip the key
from the `.html` export), **B** leave the app public and claim only tamper-evidence and
write-authenticity, **C** passphrase mode — the only option that survives a public `index.html`.
A and C compose; the container carries both.

**Do not start implementing before the owner picks.** The code is the same either way; what
changes is what may truthfully be said in the UI, and shipping "your calendars are encrypted" on
top of option B would be a lie told to users about their production plans.

Design decisions already made, so they don't get re-litigated:

- Container is one ASCII line, `SPTCAL1.<keytok>.<salt>.<iv>.<ct‖tag>`, AES-256-GCM, with the whole
  header bound in as AAD. Extension stays `.sptcal`; the format is sniffed from content exactly as
  `parseCalendarText()` already sniffs `{` vs. `<script id="saved-state">`.
- The app key must be a **keyring** (`APP_KEYS = {1:…, 2:…}` + `CURRENT_KEY_ID`), decrypt by the id
  in the file, encrypt with the current one, **never delete an entry**. Deleting an old id destroys
  every file it wrote — see rule 3 in §0.
- **The `.html` share export is never encrypted**, under any option. That file *is* a copy of the
  app, so the key would sit kilobytes from the ciphertext. Label it "not encrypted".
- The IndexedDB crash backup and the undo stack stay plaintext. Same-origin storage the browser
  already fences; encrypting them adds key-management failure modes to the crash-recovery path.
- A fresh IV **every write**. The app rewrites the same file on every autosave, and IV reuse under
  one key breaks GCM catastrophically.

**The one thing that could break Save — ✅ VERIFIED 29 Aug 2026, and it is fine.** `crypto.subtle`
requires a secure context, and the documented way to run this app is `open index.html` (a `file://`
origin). Measured in headless Chrome against a real `file://` page:

```
isSecureContext    true      hasCryptoSubtle   true
AES-256-GCM round trip with AAD   PASS
PBKDF2 importKey (passphrase mode, option C)   PASS
```

So the whole scheme — including option C's passphrase derivation — works from `file://` in Chrome
today. This was the biggest technical unknown in the design and it is closed. Gate the whole feature on a runtime
`window.isSecureContext && crypto.subtle` check and fall back to plaintext with a one-time notice.
A calendar that saves in the clear is a disclosed limitation; a Save button that throws is a lost
production plan.

**The seam is clean, which is the good news.** Write side: `buildSavedData()` gains an async
wrapper, three call sites, all already `async`. Read side: `parseCalendarText()` becomes `async`
and grows a third branch *ahead* of the existing two — exactly one caller (`openRecentFile()`,
already async). Both existing branches stay untouched, so every pre-encryption `.sptcal` and every
pre-v1.1.0 `.html` keeps opening through code nobody modified. That is the cheapest possible way
to honour rule 3 in §0 of this file.

A decrypt failure must **never** fall through to today's "doesn't contain calendar data" message —
that reads as "wrong file" and sends the user looking for a file that isn't the problem. Four
distinct messages; see §4 of the design doc.

---

### 2h. ✅ FIXED (round 7) — "Export shareable copy" used to bake in a notice strip

**Found and reproduced 29 Aug 2026 while investigating Stage 8; fixed 31 Aug 2026 in
`src/legacy/app.js`.** ⚠️ The root `index.html` was still not touched, so the sentence that used to
stand here — "not fixed, `index.html` was not touched" — is now doubly misleading: the fix is real,
and it is in the build. Full write-up of the original bug in [`STAGE-8.md`](STAGE-8.md) §4.

**The fix:** `buildSavedHtml()`'s clone now does
`clone.querySelectorAll('#legacy-notice, #update-notice').forEach(el => { el.hidden = true })`.
Hidden, not removed — the copy is a working app whose own engine may need to raise them later. It
**restores v1.0.0's output** rather than changing it, which is why §4 permits it without a ruling.
The strips themselves are still static markup; porting them to React is now optional tidiness.

The original write-up follows, because the mechanism is worth keeping:

`buildSavedHtml()` serialises a clone and strips `#table-wrap`, `#print-root` and the three
body-level popover classes. It does **not** strip `#legacy-notice` or `#update-notice`. Both ship
`hidden` in the markup and are un-hidden at runtime by `el.hidden = false` — which *removes* the
attribute, and `outerHTML` serialises attributes, not properties.

Proved in headless Chrome (`tests/harness/t/sharecopy.js`): open the real legacy fixture, which
raises the upgrade strip, then File ▸ Export shareable copy. What came out:

```html
<div id="legacy-notice" role="status" aria-live="polite">
  ... <strong>v1.0.0-saved</strong> is an older <strong>.html</strong> calendar. It opened fine ...
```

No `hidden`. The control assertions in the same run passed — `#table-wrap` *was* emptied and
`#update-notice` *did* keep its `hidden` — so the test is reading the right file and the strip
really is the exception.

**What the recipient sees:** a working calendar carrying a permanent banner that names *someone
else's* file and urges them to upgrade a file they do not have. The same mechanism bakes in the
blue update banner if one happens to be showing at export time.

**It is a v1.2.0-era regression in an export** — v1.0.0 had neither element — so under §4 fixing it
is not merely permitted, it is *required*: the fix restores v1.0.0's output. One line, adding the
two ids to the existing strip list in `buildSavedHtml()`. **Ask before applying it**, like any
change to `index.html`.

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

### Saved files carry their own copy of the app — the *old* ones, and every shareable copy

⚠️ **Narrowed by v1.1.0, and the old phrasing is now a trap.** Plain **Save** writes `.sptcal` —
~4.5 KB of JSON, no app code — so a `.sptcal` cannot carry a bug at all. The finding still holds,
unchanged, for the two formats that *are* whole documents: **legacy `.html` calendars** saved
before v1.1.0, and every **shareable copy** (File ▸ *Export shareable copy…*), which is a complete
frozen app on purpose.

Those keep the bugs they were saved with, forever. When the owner reports something already fixed,
ask **which file they are in** before digging — that has already caused one false alarm. Two live
consequences of the same fact: §2h, where a shareable copy bakes in a notice strip naming someone
else's file; and the update check staying deliberately silent on `file://`, because telling a
frozen copy's holder to "update" would navigate them off the very file they were sent.

There is no service worker (removed deliberately, and old registrations are actively unregistered
on load), so the *live site* always serves current code on a normal refresh — including on an
installed PWA's relaunch, since with no service worker it fetches like a plain tab. The one caveat,
worked through 28 Aug 2026: if the deploy is ever moved behind GitHub Enterprise Cloud private
Pages (SSO-gated), that gate is checked on *every* request, not once — so an unattended background
fetch from inside the installed PWA (an update check, or the relaunch fetch itself) can silently
fail with no valid session, where a real page navigation would not. See §2f.

---

### "Chrome/Edge" is two constraints, not one — and Safari has never been measured

Asked by the owner 29 Aug 2026: *is there a reason Chromium is the only reliable run, over Safari?*
The audit found **no decision had ever been recorded.** The word "Safari" appeared nowhere in the
repo — not in a doc, not in a code comment. One sentence ("Chrome/Edge are the target browsers")
had been carrying two unrelated constraints, which is why the question had no answer to point at.

**The decision, confirmed by the owner the same day: stay on Chrome/Edge.** Written down here so it
is a choice and not an accident. What follows is **two real constraints and one unknown**, and they
are different in kind — conflating them is how someone ends up "just trying Safari" and drawing a
confident wrong conclusion from it.

**A — the harness is Chrome-only structurally, not by preference.** `tests/harness/run.sh` is built
*around* `--headless=new`, `--dump-dom` and `--virtual-time-budget`: inject a script, let it write
JSON into `<pre id="R">`, dump the serialised DOM to stdout, parse the payload back out. Safari has
**no headless mode and no DOM-dump flag at all.** Its only automation surface is `safaridriver` — a
real windowed browser speaking WebDriver, which must be enabled by hand under *Develop ▸ Allow
Remote Automation* and driven by a client library. Firefox has headless but no `--dump-dom`. Either
port is a **rewrite of the harness**, not a change to `CHROME=`. Budget it that way if it is ever
asked for.

**B — the app is Chromium-first, and degrades on purpose.** `supportsFsAccess` gates on
`window.showSaveFilePicker`, and the File System Access API is Chromium-only; so is
structured-cloning a `FileSystemFileHandle` into IndexedDB, which is exactly what the recents list
is. On Safari that means no save-in-place, no recents, no autosave-to-a-linked-file — and **Save
writes the legacy full-copy `.html`, not `.sptcal`.** That last one is deliberate, and the comment
in `saveToFile` says why: with no handle there is nothing to write back to, so handing someone a
data file they then cannot re-link is worse than a copy that just works. **Opening is unaffected**
— `parseCalendarText()` does not care what browser it is in — so §0 rule 3 holds everywhere.

**C — one thing nobody has measured.** The month PDF is `window.print()`, and the print CSS is
tuned against **Chrome's** print engine specifically: the 2 px page-box inset exists because Chrome
trims frame borders sitting exactly on the clip boundary to a sub-pixel, and the bar-border rule
exists because Chrome's print pipeline rasterises a composited absolute layer. Those are
observations of *one* engine. Safari's print output has never been looked at. Two things are safe:
`buildWaterfallPdf()` writes PDF bytes directly with no print dialog, so no engine is involved; and
`DecompressionStream('deflate')`, which inflates the embedded Carlito, needs **Safari ≥ 16.4** —
below that the font never loads and the whole width model silently measures a fallback.

**So do not describe Safari as "degrades gracefully."** A and B are structural and known; C is an
*unknown*, not a tested fallback. The honest statement, and the one to give a user who asks: **every
calendar opens in any modern browser; saving and printing are only known-good in Chrome/Edge.**

---

### A single-file client-side app cannot hold a secret

Any key embedded in `index.html` ships to everyone who runs the app — that is not an obfuscation
problem to be solved with cleverness, it is what "the browser must execute this file" means. It
came up designing `.sptcal` encryption (§2g) and it will come up again for any licensing, API-key
or "phone home" idea. The only secrets this app can hold are ones the *user* supplies at runtime
and the app never stores. Everything else is tamper-evidence, which is real and useful, and worth
saying plainly instead of dressing up as confidentiality.

Related, and easy to miss: the repo is **public** and the app is on **GitHub Pages**. Anything
committed to `index.html` is published, immediately and permanently, including in git history.

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

**Do not change how the exports LOOK.** New rule, from the owner, 29 Aug 2026:

> *"the output must not be changed — how the excel looks and the pdf looks should be exactly as
> 1.0.0 was — the editable grid in the app could have a reconsideration on design, but the goal is
> to not deviate from the exports too much so it could be easy to understand for new users coming
> from the old version"*

…and, asked directly whether "1.0.0" meant the app's build or the reference spreadsheet, the owner
settled it the same day:

> *"the build's output should stay the same — even better if using the same render engine —
> specifically the operating waterfall grid which outputs excel or pdfs — the pdfs should look
> exactly the same as it exported in v1.0.0 — on the other hand — the full calendar system (the
> grid, is that what we're calling it?) can be redesigned under MANTINE"*

**So: v1.0.0 THE BUILD, not the reference spreadsheet.** That closes `STAGE-8.md` §6 and makes the
row pitch, the grid width and the body-text size permanent WONTFIXes. It also adds a preference
that is stronger than "don't change the output": **keep the same render engine.** Do not rewrite
`buildWaterfallPdf` or `exportExcel` — leave the writers alone and let them keep producing what
they produce.

⚠️ **"the grid, is that what we're calling it?" — no, and the mismatch is dangerous.** In these
docs **"the grid" means the frozen thing**: `#table-wrap`'s contents, the width model and the
shared layout functions. The owner used it to mean the whole calendar system. Both readings appear
in the same paragraph above, so read the freeze rule in `CLAUDE.md` by its *symbol list*, never by
the word "grid". [`MANTINE-SEAM.md`](MANTINE-SEAM.md) fixes the vocabulary properly.

**What this permits, verified by hand 29 Aug 2026** — the good news is that "same render engine"
is nearly free:

| | DOM references |
|---|---|
| `buildWaterfallPdf` | **zero** |
| `exportExcel` | **three**, all in its last lines: the download anchor, `#show-title` for the filename, and appending the anchor |
| `cellTextFit`, `sheetColumnWidths`, `computePhaseRowLayout`, `sheetRowCount`, `sheetGridMetrics`, `sheetPageOrientation` | **zero** |
| `computeHeaderDefaults` | five form fields, read by element id |

The direct PDF writer is pure computation over module state and a measuring canvas. It does not
know the DOM exists, so **a Mantine migration cannot break it as long as the module state and the
form-field ids survive** — and those ids are already frozen by the save-file format. The Excel
writer is the same but for its filename read.

> ⚠️ This table first said `exportExcel` had **four**. It has three — the fourth grep hit was the
> substring `officedocument.` in the xlsx MIME type, a false positive from matching `document\.`
> without a word boundary. Caught by the seam investigation, verified, corrected here. Worth
> keeping as a reminder that `grep 'document\.'` over this file over-reports.

⚠️ **But "cannot break the writers" is not the same as "cannot break the exports."** There are
**four** outputs, not two, and the other two ARE the DOM: the print-fallback waterfall PDF
(`exportWaterfallPdf`, live when `WF_PDF_MODE === 'print'`) and `exportMonthPdf` both inject
`renderSpreadsheetView()` / `renderMonthView()` into `#print-root`, style it with the app's own
stylesheet, measure it with `getBoundingClientRect()` and print it. The full seam — including
seven **unguarded** `#table-wrap` listeners that run at IIFE-evaluation time, and print selectors
written as **child** combinators that a React root would silently break — is in
[`MANTINE-SEAM.md`](MANTINE-SEAM.md). Read it before any Mantine stage.

⚠️ **The two DOM-dependent PDF paths are the exception**: the print fallback
(`WF_PDF_MODE === 'print'`) and `exportMonthPdf` both render HTML into the page and call
`window.print()`. Those *do* depend on the on-screen renderer and on print CSS, and a redesign can
destroy them while the direct writer sails through untouched.

**And the on-screen grid is already NOT a faithful preview of the printout**, which is what makes
redesigning it cheaper than it sounds. Measured against the committed baseline: columns run at
1 screen px per point (`charsToScreenPx` is used as pixels on screen and as *points* in the PDF),
but rows run at 20 screen px per 15 pt (`ROW_DEFAULT_PX` × `ROW_PX_TO_PT`). So for the same width
the screen grid is **~33% taller** than the printed one — 797 × 1060 px on screen against
797 × 795 pt in the PDF, both from `tests/baselines/2026-08-29-stage-7/`. There is no
pixel-fidelity guarantee to give up here, because there never was one.

This sits *beside* the frozen-surface rule above, and it is stricter in one direction and looser
in another, so read both:

- **Stricter:** the freeze is no longer only about the code. The Excel workbook and the waterfall
  PDF are frozen in **appearance**. A change that leaves the frozen functions alone but moves,
  re-aligns or re-widths what comes out of them is still out of bounds. The reason is users, not
  tidiness: people are coming to this from the old version and the printout has to be the document
  they already know.
- ~~**Looser:** the **editable grid on screen** explicitly *may* be reconsidered on design.~~
  ⛔ **NARROWED BY THE OWNER, 29 Aug 2026 — this latitude is withdrawn by default.** See the rule
  immediately below. What survives of it: the *word* "may" was never permission to touch the width
  model, `computePhaseRowLayout()` or the writers — those are frozen by §0 rule 2, and the screen
  shares them with the exports, which is precisely how a "screen-only" change stops being
  screen-only.

**Do not redesign the on-screen waterfall editor either.** The owner's words, 29 Aug 2026, given
as a standing UI convention:

> *"the waterfall editor and output is to remain as similar to as it is right now to retain its
> identity to user-comfortable conventions of the past, unless given specific instructions from
> the user. This includes formatting styles, auto shrinking, font, font size, width and heights
> etc etc. Outside of the actual grid and export, all is fair game"*

This **supersedes** the "Looser" bullet above, which had read the owner's earlier *"the editable
grid in the app could have a reconsideration on design"* as open latitude. It is not. The default
is now **hold the waterfall editor as it is**; a redesign of it needs a specific instruction, not
an inference from a general permission to modernise the app.

Read it by what it names, because it names mechanisms and not just looks:

| Named in the instruction | The symbols it means |
|---|---|
| formatting styles | the `.sheet-*` CSS, cell alignment, the block separators, `SHEET_GRIDLINES` |
| **auto shrinking** | `cellTextFit`, `wrapLineCount`, `clampChars` — the line-budget model |
| font, font size | `'Carlito','Calibri'` at 11 px, the per-cell `noteFontSize` / `hiatusFontSize` |
| width | `EXCEL_MDW`, `COL_PAD_CHARS`, `charsToScreenPx`, `sheetColumnWidths`, `colWidths` |
| heights | `ROW_DEFAULT_PX = 20`, `rowHeights`, the row-snapping behaviour |

The reason is the same one that froze the exports, applied one layer further in: **users are
arriving from the old version and the thing they work in every day has to stay the thing they
recognise.** Identity, not tidiness.

**The boundary this draws, stated exactly** — because a UI pass runs straight into it:

- **Frozen:** anything that changes what a grid cell *looks like* or *how much text fits in it*.
- **Fair game:** the chrome that surrounds the grid, and the floating panels *anchored to* it. A
  note editor popover is a body-level panel, not grid markup (that is the whole point of
  `.note-pop`, §6) — so its own padding, typography and controls may be redesigned. What may
  **not** change is the note's rendered size, wrapping or shrink behaviour once it lands back in
  the cell.

This is what stopped §2c dead at its acceptance gate. Before proposing anything that touches the
grid, work out whether it can change the exports **at all** — and if it can, ask first, with the
before-and-after in front of the owner.

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
all **four** of:

0. ⛔ **`APP_VERSION` in `index.html` and `version.json` — bumped together, same commit.** Since
   v1.2.0 the deployed app compares these to tell installed users an update exists. Bumping one
   without the other either cries wolf at every user or silently suppresses a real update. Listed
   as step zero because it is the one with a live consequence for people who are not you.
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
but nothing renders it — dead rules from an earlier version. Asked directly
during the Mantine scoping (28 Aug 2026), the owner's answer was **no footer now and none
foreseen**. Do not add one on your own initiative, and do not treat the dead CSS as evidence that
one is planned.

If a footer is ever revisited, these are the considerations already worked through, so they don't
have to be rediscovered:

- **A slim status bar** is the only version that earns its space: save state, total week count and
  the active region. Its real argument is that it would move the `.save-status` chip out of the
  top toolbar, ~~which already wraps to two lines below 1280 px~~, and give warnings a permanent
  home instead of the six different looks they have now (`#gap-warning`, `.tools-msg`,
  `.placeholder-note`, `.snap-note`, `#union-lock-hint`, `#custom-hol-err`).

  ⚠️ **The struck clause is wrong, and it was half the argument.** Measured in a real browser
  29 Aug 2026 (`UI-CONVENTIONS.md` §2): the **header** toolbar wraps between **~848 px** (empty
  app, short status string) and **~1018 px** (long file name, longer status) — it is
  content-dependent, bounded by `.file-menu-btn`'s `max-width`, and never wraps at 1280 px. What
  *does* wrap near there is the **preview** toolbar (`.view-toggle-row`), at **~1185 px**, going
  to **75 px** tall — which is the measurement PROJECT-CONTEXT records under "the toolbar", one
  section over. Two different toolbars, and this bullet credited the wrong one.

  The warning-count half of the argument stands and got stronger: the real count is **32 feedback
  surfaces**, not six. That is now designed out in `UI-CONVENTIONS.md` §4, without a footer.
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
| The rest of the app — CSS, markup, script, help modal |,000 | 80.5% |
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

### The better shape — two formats, one contract  ✅ **SHIPPED in v1.1.0**

Neither the copy nor the data should be dropped. They should stop being the same file.

| | **`.spcal` — the data file** | **`.html` — the share file** |
|---|---|---|
| Contents | the snapshot JSON, nothing else | today's full self-contained app + state |
| Size | **~3 KB** | KB |
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

What it buys: saves become× smaller and effectively instant; autosave and the IndexedDB
backup stop moving three-quarters of a megabyte every ten minutes; a saved plan always opens in
*current* code, so fixes reach old files; and files become diffable, greppable and mergeable in a
way a 730 KB HTML blob never will be.

**This matters more after the Mantine overhaul, not less.** Once there is a build step,
`buildSavedHtml()` serializes a *minified* app, so the "readable copy" argument for the HTML
format weakens at exactly the moment the data-only format becomes cleaner to produce.

### As built (v1.1.0)

All of the above shipped, plus the `version` field that was listed as its prerequisite.

| Symbol | Job |
|---|---|
| `SAVE_EXT` / `SAVE_MIME` / `SAVE_TYPES` / `OPEN_TYPES` | the two formats, declared once |
| `SNAPSHOT_VERSION` = 1 | stamped into every snapshot; nothing branches on it yet |
| `buildSavedData()` | the data format — `captureSnapshot()` as pretty JSON |
| `buildSavedHtml()` | the share format, now built from a **clone** |
| `parseCalendarText()` | **the one reader.** `{` → snapshot; otherwise the `saved-state` regex |
| `handleIsLegacyHtml()` | so Save writes back in the format the file already is |
| `autosaveNeedsFile` | autosave found work but no file; surfaced in the status line |

Measured on the same fixture: **4,488-byte `.sptcal` vs 695,556-byte `.html` — 155× smaller.**
Both formats round-trip to a byte-identical rendered grid; a snapshot with no `version` key still
opens; garbage, empty text and HTML with no state block are all rejected cleanly.

Three things deliberately **not** done, and why:

- **`buildSavedHtml()` was not deleted.** Emailing someone a double-clickable working calendar was
  a real design goal and it still is. It is just no longer what Save means.
- **Legacy `.html` files are not auto-converted.** Open one, hit Save, and it stays an `.html`.
  Converting a file the user did not ask us to convert is how you lose someone's trust once.
- **Preferences still do not go in the data file.** Settings are per-user and per-machine —
  `localStorage`, never `captureSnapshot()`. That was true before and the format split does not
  change it.

### Still true for the Mantine work

`MANTINE-MIGRATION.md` §4.4–4.5 is *smaller* now but not gone. `captureSnapshot()` is still a
DOM sweep via `collectFieldValues()`, so `fields.byId` is still keyed by element id and the legacy
branch is still needed — the difference is that `parseCalendarText()` has already isolated
"reading a file" from "applying a snapshot", so only the second half has to change.

---

## 8. Build order

Written 28 Aug 2026, after three sessions' findings landed at once (the `.sptcal` format split,
the PWA update-delivery research in §2f, and the encryption design in §2g). This is the **one
sequenced list** of what to build next. `MANTINE-MIGRATION.md` §6 still holds the detail of the
redesign stages; this says where they sit relative to everything else.

Two items are **decision-gated**, not effort-gated — no amount of work moves them until the owner
answers. They are listed first because a wrong guess there wastes a whole stage.

### Gate 0 — decisions the owner owes, before anything is built

| # | Decision | Blocks | Where it's laid out |
|---|---|---|---|
| D1 | **Encryption threat model: A, B or C.** Public repo means an embedded app key is not a secret. ⏸ **Deferred 29 Aug 2026** — asked and explicitly parked, not unanswered. Ask again before starting §2g. | all of §2g | `SPTCAL-ENCRYPTION.md` §0 |
| D2 | **Is losing "a saved calendar is readable" acceptable?** Largely answered by `.sptcal` shipping — the thing you inspect is now 4.5 KB of JSON. Worth confirming. | Mantine Stage 4 | `MANTINE-MIGRATION.md` §7 Q1 |
| D3 | ~~**Committed `dist/` or a GitHub Action?**~~ ✅ **ANSWERED 29 Aug 2026: a GitHub Action** builds and publishes `dist/` (§2b-3's ruling table; `.gitignore` records the same decision). Unbuilt, but no longer an open question. | Mantine Stage 1 | `MANTINE-MIGRATION.md` §7 Q3 |
| D4 | ~~**Repo visibility.**~~ ✅ **ANSWERED 28 Aug 2026: the repo is PUBLIC** (`gh repo view` → `isPrivate:false`, `visibility:PUBLIC`). So an app key baked into `index.html` is *published*, and D1 must be decided knowing that. What remains open is only the **hosting plan** — whether it ever moves behind GHEC private Pages. | §2f, §2g | §2f |

### The order

| Stage | What | Depends on | Est. |
|---|---|---|---|
| ~~**0**~~ | ✅ **DONE — docs refresh.** `CLAUDE.md` + `PROJECT-CONTEXT.md` are current as of `83ac3b7`; prose names symbols and quotes **no** line numbers, §14 map at **74 verified rows**, enforced by `tools/check-refs.py` across seven docs. See §2a. | — | — |
| ~~**1**~~ | ✅ **DONE — PWA update delivery** (§2f). `version.json` in this repo (owner's call, 29 Aug 2026), `APP_VERSION`, a per-version-dismissable blue strip, `location.reload()` not `fetch()`, gives up after 3 failures, silent on `file://`. Shipped as **v1.2.0**. | D4 | — |
| **2** | ⏸ **DEFERRED by the owner, 29 Aug 2026.** Encryption (§2g). The design and the `crypto.subtle` verification stand; nothing is blocked *technically*, it is simply not being done now. Re-open by answering D1. | **D1** | 2–3 |
| **3** | 🔒 **HELD as the first Mantine surface** (owner's call, 29 Aug 2026) — so it is built **once**, in Mantine, not twice. Do **not** build it in plain JS. Its constraints are worked out in §2b and still apply. | Mantine | 1–2 |
| **4** | **Mantine Stage 1** — scaffold, zero behaviour change. ✅ The harness prerequisite is **done**: [`tests/harness/`](tests/harness/) is committed and green, with a pre-Mantine baseline at `tests/baselines/2026-08-29-stage-7/` to diff the scaffold against. It is Chrome-only by construction — see §3. | D3 | 1–2 |
| ~~**5**~~ | ✅ **DONE — Mantine Stage 2**, 29 Aug 2026, at the owner's request. Theme tokens, the one feedback system, the responsive model and the component choice for every chrome control, date picker and overlay are settled in [`UI-CONVENTIONS.md`](UI-CONVENTIONS.md). No code written. ⛔ **Read its §8 before Stage 4** — seven verified traps, five of which silently break the save format; and its §9, six items that need an owner ruling because they turn out to touch `render()` or a frozen export. | — | — |
| **6** | **Mantine Stages 3–5** — sidebar, toolbar, popovers, editors. | D2 | 5–7 |
| ~~**7**~~ | ⏸ **HELD by the owner, 29 Aug 2026.** Structured notes columns (§2c). Picked up, baselined, and stopped at the gate: the split cannot be export-neutral, and the exports must look exactly as v1.0.0 (§4). Design and baseline both stand in §2c; **do not build it without asking again**. | — | — |
| ~~**8**~~ | ⏹ **INVESTIGATED 29 Aug 2026 and mostly WONTFIX** — see [`STAGE-8.md`](STAGE-8.md). Its four geometry rows are one whole-percent fit scale, every route to them visibly changes the PDF, and §4 forbids that. What is left is not a stage: two colour decisions, one real bug (§2h), three internal disagreements and some cleanups. **Recommendation: strike it from the build order.** | — | — |

**Why this order, where it isn't obvious:**

- **Stage 0 first, always.** The docs now lag far enough that a fresh session would act on a save
  path that no longer exists. That is exactly the failure `CLAUDE.md`'s first rule exists to stop.
- **PWA delivery before the redesign, not after.** It is small, it is independent, and it is the
  mechanism by which every later change actually reaches the people using this. Shipping a
  redesign that installed users never receive is the worst possible ordering.
- **Encryption before the Mantine work** *if* D1 comes back as A or C. It touches
  `buildSavedData()` and `parseCalendarText()` — two functions the redesign does not go near — so
  doing it while the save layer is freshly in mind and stable is cheaper than doing it on top of a
  half-migrated app. If D1 comes back as B, drop it down the list; tamper-evidence alone is not
  urgent.
- **Settings menu before Mantine Stage 3, and again after.** It is listed once here, but
  `MANTINE-MIGRATION.md` also proposes it as the first Mantine surface. Pick one: build it now in
  plain JS if it is wanted soon, or hold it as the Mantine proving ground. **Do not build it
  twice.**
- **Notes columns last.** It is the largest change to what the grid contains, and the grid is
  frozen (§0 rule 2) — so it needs its own conversation and its own acceptance gate before anyone
  starts, not to be folded into a UI stage. ✅ **That ordering paid off exactly as intended:** the
  stage got its own conversation, the conversation surfaced a constraint nobody had written down,
  and it was stopped before any code was written rather than after. Keep doing this.
- ~~**Stage 8 is now the odd one out.**~~ ✅ **Done, same day.** Stage 8 was the only remaining
  stage that still wanted to change the exports, so its first task was to establish whether a
  version of itself was allowed to exist. It mostly is not — [`STAGE-8.md`](STAGE-8.md). Note the
  investigation cost a few hours and would have cost a whole stage to discover by building; the
  same "work out whether it is permitted before estimating it" step is worth applying to anything
  else that touches the exports.

### One thing the next session must not trip on

`parseCalendarText()` **now returns `{format, snapshot}`**, not a bare snapshot — the format is
needed so opening a legacy `.html` can offer the upgrade. `SPTCAL-ENCRYPTION.md` §3 was written
against the older signature and shows a third branch returning the snapshot directly. The design
is unaffected; the code sketch in it needs `{format:'data', snapshot:…}` on the encrypted branch.

### Test fixtures now exist

`tests/fixtures/v1.0.0-saved.html` — a **genuine** pre-v1.1.0 saved calendar, produced by running
the v1.0.0 build itself and clicking Save. 760 KB, 27 snapshot keys, no `version` field, grid baked
in. This is the file to test any future change to the restore path against. **Generate a new
fixture each time a version is cut**, alongside the tag and the `releases/` copy (§5g) — the
fixtures are only useful if they keep pace with the formats that exist in the wild.
