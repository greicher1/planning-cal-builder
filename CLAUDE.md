# CLAUDE.md

## ⛔⛔ HANDOVER — DO THIS FIRST IN THE NEXT FRESH SESSION, THEN DELETE THIS SECTION

**Read the docs in the reading order below first. Then, before you act on whatever the user asked
you to do — whatever it is — put the four questions below to them in ONE interactive picker
(`AskUserQuestion` takes up to four questions in a single call).** Ask them first, then get on with
the actual request.

**Why this is here.** Rounds 5, 6 and 7 plus a full documentation sweep were built on a *temporary
second machine* (see `HANDOFF.md` §1 — that account cannot push; the repo travels back by AirDrop).
The next session is expected to be **greicher, the original author, on the machine that owns the
repo**. Two decisions were deliberately left for that machine rather than guessed at here, and they
are the only things blocking the backlog.

**The four questions, in this order:**

1. **Commit the local edits.** Check `git status` first — if the tree is dirty, ask whether to
   commit it. ⚠️ Do **not** fold pushing into this question: `main` auto-deploys to a live public
   site, and the never-push rule below is per-action and unchanged. Push is its own conversation.
2. **Blocker: №6, all-phase hiatus naming.** Ask what to do with it. The finding, so you can put it
   fairly: naming hiatus bands from the sidebar **never existed** — bands are named by clicking them
   in the calendar (`hiatusTexts`). Adding a sidebar field means a **new key in the `fields.hiatuses`
   entry shape**, i.e. a save-format change (append-only, permanent). It was deferred on
   29–31 Aug 2026 specifically because it "belongs with the author greicher".
3. **Blocker: the two notice strips.** Ask what to do with them, as a *separate* question. State
   plainly that this is **no longer a bug**: §2h (a shareable copy baking in a strip that named
   someone else's file) was fixed in round 7 inside `buildSavedHtml()`, with the strips left as
   static markup. Porting them to React is now optional tidiness — but it still **changes an
   export's output**, which is why it still wants a ruling rather than a quiet decision.
4. **Question: "Thank Anto for his work"** — options, exactly these three:
   *Thank you Anto!* · *Thank you Anto!!* · *Thank you Anto!!!!*

⛔ **Then delete this entire section from `CLAUDE.md`** — once the user has answered (or explicitly
waved the questions away), it has done its job and must not greet a third session. Deleting it is
part of completing the handover, not a separate chore.

## ⛔ READ [`HANDOFF.md`](HANDOFF.md) FIRST — after this file, before anything else

`HANDOFF.md` is the live state of the project: what was just built, what the owner has asked for
and not yet received, what was learned the hard way, and the working conventions in force. It is
the only document that reflects *right now*. Read it after you read this file,
and before you touch `index.html`.

**Keeping it current is a first-class part of the job, not bookkeeping.** After any substantial
change — a feature, a fix that taught you something, a decision about how something should work,
anything an owner request touched — update `HANDOFF.md` in the same breath as the code. A stale
handoff is worse than none: the next session will act on it and be confidently wrong. If you find
it out of date, say so and fix it before continuing.

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Full project context lives in [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md)** — the union-holiday
> research and its primary sources, the development/deploy workflow, the headless-Chrome testing
> harness, bug history, and pending work. Read it when picking this project up fresh, or when
> handing it to a session with no history.

**Reading order:** this file → [`HANDOFF.md`](HANDOFF.md) → [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md).
Add [`UI-CONVENTIONS.md`](UI-CONVENTIONS.md) before any UI work: §10 is the list of acceptance
gates `tests/harness/gate.sh` automates, §9 holds the owner rulings that produced the Inter embed
and the note-popover stage, and §8 carries the id-hygiene traps that protect the save format.
*(Changed by the owner 29 Aug 2026 — this file now comes first. The other docs' copies of the order
have been brought into line.)*

## ⛔ Never commit, push or deploy on your own initiative

`main` **auto-deploys to a live public site that other people are using**. A push is a production
release, not a save.

- Commit locally while you work — that is fine and expected.
- **Never** run `git push` without being asked for that specific push. Approval is per-action and
  per-change: "commit and push" earlier in the session does **not** authorise the next one, and
  "that looks good" is not authorisation at all.
- When work is ready, **ask with an interactive checkbox picker** (`AskUserQuestion`) whether to
  commit, and separately whether to push/deploy. Present it as a choice, not a formality.
- After an approved push, verify the live URL actually serves the change (~40–60 s) before
  reporting it as shipped.

This rule has been broken before. In one session a single "push and commit" was treated as standing
permission and six further pushes went out unasked. Do not repeat that.

## ⛔ Never touch the grid or the exports

**The calendar grid and the Excel/PDF writers are frozen.** They are not to be restyled,
refactored, "modernised", wrapped in components, or migrated to any UI library — including the
Mantine work described in [`MANTINE-MIGRATION.md`](MANTINE-MIGRATION.md). Every number in them is
there for a specific, measured reason, and the reasons are not visible from the code.

**Frozen surface — the seam is exact:**

- **`#table-wrap` and everything inside it.** The waterfall and month-view grids. React/Mantine
  renders this as an *empty container with a ref* and never touches its children.
- **`#print-root` and everything inside it.** Same rule.
- **The width model:** `EXCEL_MDW = 7` (floored, **not** 7.4336), `SHEET_ZOOM = 0.75`,
  `EXCEL_CELL_PAD = 5`, `COL_PAD_CHARS = 1.15`, `ROW_DEFAULT_PX = 20`.
- **Grid rendering + geometry:** `render`, `renderSpreadsheetView`, `renderMonthView`,
  `computeBlockLayout`, `phaseRunBounds`, `computePhaseRowLayout`, `applyCellSpanOverrides`,
  `sheetRowCount`, `sheetGridMetrics`, `sheetPageOrientation`, `sheetColumnWidths`.
- **Text fitting + measurement:** `measureTextPx`, `pxToChars`, `charsToPx`, `charsToScreenPx`,
  `clampChars`, `screenPxToChars`, `wrapLineCount`, `cellTextFit`.
- **Direct manipulation:** `installGridResizers`, `beginSpanDrag`, `spanHandleGeometry`,
  `applyCellFitLive`, `repositionColHandles`, `repositionRowHandles`, `scheduleLiveUpdate`,
  `captureScroll`, `restoreScroll`.
- **Exports:** `exportExcel`, `exportMonthPdf`, `buildWaterfallPdf`, `exportWaterfallPdf`,
  `exportWaterfallPdfDirect`, `pdfSerialize`, `pdfPage`, `pdfEscape`, `pdfRgb`, `pdfDeflate`,
  `ttfRead`, `ttfGlyph`, `ttfAdvance`, `ttfTextWidth`, `setWfPageStyle`, `removeWfPageStyle`,
  `readCfgForMeta`.
- **CSS:** the `/* ---------- Month view ---------- */` block, the
  `/* ---------- Calendar PDF export ---------- */` block, and every `.sheet-*` / `.mv-*` /
  `#print-root` rule. **No third-party CSS baseline may reach them.** As built, the fence is **import order**, not a
  hand-written `@layer`: Mantine ships `*.layer.css` files that already declare `@layer mantine`,
  and `main.jsx` imports those first with the app's **unlayered** `legacy.css` last — unlayered
  normal declarations outrank every layer, so each frozen rule wins with no per-rule work. ⚠️ For
  `!important` the precedence REVERSES, which put `*{print-color-adjust:exact !important}` at risk;
  without it both PDFs print as an empty grid. Cleared by verifying all 20 `!important` declarations
  in @mantine/core 9.5.2 are scoped to hashed `.m_*` selectors. **Re-verify on any Mantine upgrade.**
  ⛔ Mantine's CSS is imported PER-COMPONENT now, and **the order is derived, never alphabetical** —
  they share one layer, so order decides, and sorting it put `UnstyledButton` after `Button` and
  stripped every button in the app of its background, border and padding.

**Why, concretely.** These three cost weeks and are each invisible without measurement:

- Calibri/Carlito's `"0"` advances 7.4336 px, but **Excel floors MDW to 7**. Using the true
  advance yields columns ~6% narrower than Excel's autofit, and every downstream width is wrong.
- The width model budgets **3.75 px** of total cell padding at `SHEET_ZOOM`. Any CSS rule that
  spends more silently ellipsis-clips text. This has already landed twice — 64 of 255 filled
  cells once, then 9 of 52 date cells.
- `computePhaseRowLayout()` is the **single** source of which phase occupies which column, shared
  by the screen, the PDF writer, `sheetColumnWidths()` and the Excel export. The previous
  three-way divergence is what made the PDF never match an Excel print.

**Allowed:** calling into this surface, reading from it, and changing what *surrounds* it — the
toolbar above the grid, the popovers anchored to its cells (anchored to, never injected into),
the container's own layout position on the page.

⛔ **The freeze covers the on-screen waterfall editor's APPEARANCE too, not just the exports.**
Owner instruction, 29 Aug 2026, given as a standing convention:

> *"the waterfall editor and output is to remain as similar to as it is right now to retain its
> identity to user-comfortable conventions of the past, unless given specific instructions from
> the user. This includes formatting styles, auto shrinking, font, font size, width and heights
> etc etc. Outside of the actual grid and export, all is fair game"*

This **withdraws** the latitude an earlier remark (*"the editable grid in the app could have a
reconsideration on design"*) had been read as granting — see `HANDOFF.md` §4, where the "Looser"
bullet is now struck. The default is **hold the waterfall editor as it is.** Redesigning it takes
a specific instruction; it is not implied by permission to modernise the app on Mantine.

Note what the instruction names: *auto shrinking* is `cellTextFit` / `wrapLineCount` / `clampChars`,
*width* is `sheetColumnWidths` / `COL_PAD_CHARS` / `colWidths`, *heights* is `ROW_DEFAULT_PX` and
`rowHeights`. So it names mechanisms already on the frozen list above, and adds their **look** to
what may not change.

**The line a UI pass has to hold:** frozen is anything that changes what a grid cell looks like or
how much text fits in it. Fair game is the chrome around the grid and the floating panels
*anchored to* it — `.note-pop` is a body-level panel, so its own padding, type and controls may be
redesigned, while the note's rendered size, wrapping and shrink behaviour back in the cell may not.

> ⚠️ **"the grid" is the wrong word and it has already caused a collision.** These docs use it for
> the frozen surface listed above; the owner used it (29 Aug 2026) for the whole calendar system,
> when granting permission to redesign the app on Mantine. **Read this rule by its symbol list,
> never by the word.** [`MANTINE-SEAM.md`](MANTINE-SEAM.md) replaces the word with five precise
> ones — *the waterfall view, the month view, the width model, the writers, the print paths* — and
> maps every symbol, CSS rule and element id to one of them. Read it before any Mantine work.
>
> Two things it establishes that are not obvious from the list above:
>
> - **There are four outputs, not two.** `exportExcel` and `buildWaterfallPdf` never read the DOM,
>   but the print-fallback waterfall PDF and `exportMonthPdf` **are** the DOM — they inject
>   `renderSpreadsheetView()` / `renderMonthView()` into `#print-root` and print it. So
>   `renderMonthView` is an export renderer, not chrome, and the month view is frozen too.
> - **The freeze extends to structure the exports depend on**, not just to the listed functions:
>   seven **unguarded** `#table-wrap` listeners that run at IIFE-evaluation time, print selectors
>   written as **child** combinators of `<body>`, `font-carlito-400`/`700` as runtime-read element
>   ids, and `*{ print-color-adjust:exact !important }` — which a `@layer` would demote, stripping
>   every fill from both PDFs.

### ✅ Sanctioned ways to change frozen BEHAVIOUR without editing frozen code

**Ask this before concluding a request is blocked by the freeze.** Three patterns are built, gated
and shipped (30–31 Aug 2026), and two of them delivered owner requests that had been written down
as *needing a frozen edit and an owner sign-off*. The freeze forbids editing those function bodies
— it does not forbid reading from them, calling them, or acting on what surrounds them.

1. **Change the DECLARATION, not the call sites.** The eight `alert()` calls inside
   `exportMonthPdf` / `exportWaterfallPdf*` became the app's own dialogs by declaring
   `function alert(message){ return uiAlert(message) }` inside the engine's IIFE: a hoisted
   declaration shadows the global for every call site in the file, and not one frozen line changed.
   ⚠️ **Its precondition is real** — every one of those eight is `alert(msg); return;`, checked site
   by site, so a non-blocking dialog is unobservable. A future export that must alert *and continue*
   has to `await uiAlert()` explicitly. The same shape is what the Settings menu should use for
   `SHEET_GRIDLINES` / `GRID_TEXT_COLOR` (HANDOFF §2b).
2. **Drive the effect from outside, and ASK the frozen code for the verdict.** The invalid-date ring
   looked like it needed a hook inside `render()`'s validity branch. Instead
   `reflectStartDateValidity()` runs from `update()` (not frozen), rings the **sidebar** field
   (chrome), and calls frozen `readCfgForMeta()` for the answer — so there is no second copy of the
   rule to drift from the meta line it must agree with.
3. **Observe the frozen surface instead of editing it.** The month-view note editor needed the
   teardown-on-rebuild guard its waterfall twin gets from *inside* `render()`. A `MutationObserver`
   on `#table-wrap` gives the same protection from outside; observing mutates nothing.

⛔ **What these do NOT license.** None of them may change what a grid cell looks like, how much text
fits in it, or what comes out of the writers — that is the boundary, and it is unmoved. If your idea
needs the frozen code to *behave* differently rather than to be *read* differently, it is a frozen
edit and the rule below applies.

**If a change genuinely requires touching it:** stop and ask, with the measurement you intend to
use as the acceptance gate (clipped-cell count, PDF diff against a pre-change export). Do not
decide this one alone.

⚠️ **One place chrome geometry legitimately reaches into the frozen surface: `--header-h`.** A
ResizeObserver measures the header and writes it, and the frozen
`.sheet-scroll{max-height:calc(100vh - var(--header-h) - 140px)}` reads it. That is why the header
may change height at all — the grid adapts *because* the value is measured rather than assumed. Keep
it measured; do not replace it with a constant, and do not let the header wrap.

## ⛔ Every saved calendar must keep opening, forever

**A saved `.html` calendar written by *any* past version must open in *every* future version.** A
file that stops opening is a user's plan destroyed, and they will have no copy but the one that no
longer works. This outranks tidiness, consistency, and any refactor.

### 📖 It is called LOAD in the UI, and Open in the code — deliberately

Settled with the owner (round 5): **saving** means writing a `.sptcal` locally; **loading** means
opening a `.sptcal` or `.html` into the PWA. Every user-facing string says Load — the file-menu item
is *Load…*, the unsaved-work guard asks *Load another calendar?*, failures read *Could not load…*.
⛔ **The code did not rename.** `data-action="open"` is the contract the engine's one delegated
file-menu handler matches on, and `openRecentFile` / `openFileViaPicker` / `OPEN_TYPES` keep their
names. Rename either and the menu goes silently dead. New user-facing copy uses Load; new code may
keep saying open.

### How Open actually works — read this before changing anything near it

Save and Open are **not** symmetric, and the asymmetry is the whole point:

- **Save** (`saveToFile` → `buildSavedData`) writes **`.sptcal`** — the state as JSON, ~4.5 KB,
  and nothing else. `buildSavedHtml()` still exists and still writes the old full self-contained
  copy, but only as File ▸ **Export shareable copy…** and as the download fallback where the File
  System Access API is unavailable. A handle pointing at a legacy `.html` keeps being written as
  `.html` (`handleIsLegacyHtml`) — no file is silently converted.
- **Open** (`openRecentFile` / `openFileViaPicker`) reads the chosen file **as text** and hands it
  to `parseCalendarText()` — **the one place that knows how to read a calendar file.** Text
  starting with `{` is a snapshot (`.sptcal`); anything else gets the `saved-state` regex (legacy
  `.html`). Both converge on `applyStateSnapshot()` → `refreshAfterRestore()`.

**The old file's HTML, CSS and JavaScript are never parsed and never executed.** Exactly one thing
crosses the boundary: the snapshot JSON. That asymmetry is why `.sptcal` exists: in the old format
99.6% of a saved file's bytes — measured — were a copy of the app that Open never read.

**The first save always opens the save picker**, and autosave can never reach that path
(`showSaveFilePicker()` needs a user gesture, and writing to a location the user never chose is
what the picker exists to prevent). When autosave finds unsaved work with no linked file it sets
`autosaveNeedsFile` and says so in the status line. Do not "fix" this by having autosave pick a
location.

### What that makes binding

The **snapshot JSON schema is the compatibility contract**, and `captureSnapshot()` defines it.

- **Never rename, remove or repurpose a key** in `captureSnapshot()`. Add new ones; leave old ones
  readable. A renamed key is a silently dropped setting.
- **`fields.byId` is keyed by DOM element `id`** (`start-production`, `weeks-post`,
  `union-usregion`, `name-custom1`, the generated `start-<key>` / `weeks-<key>` per phase). Those
  ids are therefore **part of the file format, not an implementation detail.** Keep them, or ship
  an explicit old-id → new-state migration map. This is the single biggest hazard in the Mantine
  work.
- **Restore unconditionally.** `if(snap.x) x = snap.x` leaves the *previous* file's values in
  place when the new file has no such key. Always `snap.x ? {...snap.x} : {}`.
- **A missing key falls back to a default, never to whatever is in memory.**
- **Migrations are forward-only** — old file into new app. New file into old app is not supported
  and cannot be. `migrateHolidayViewKeys()` and `normalizeRegionSelection()` are the existing
  worked examples; follow their shape.
- **Test with real files**, not synthesised ones. `tests/fixtures/v1.0.0-saved.html` is a genuine
  pre-`.sptcal` calendar, produced by running the v1.0.0 build and clicking Save. **Cut a new
  fixture whenever a version is cut**, alongside the tag and the `releases/` copy.
- **Opening a legacy `.html` recommends upgrading it** — a dismissible strip with a
  *Save as .sptcal* button (`showLegacyNotice`). Recommend, never convert: plain Save on a legacy
  file still writes `.html`.
- ⛔ **`PHASE_COLOR_OPTIONS`'s ARRAY ORDER is part of the file format.** Found 29 Aug 2026 and not
  documented anywhere before. `phaseColorOverride[key]` and `customPhaseDefs[].colorIndex` are
  **indices into that array**, and both are in `captureSnapshot()`. Inserting, removing or
  re-ordering an entry silently recolours every calendar ever saved — no error, no migration, just
  wrong colours in someone's production plan. **Append only.** If a pairing must change, re-pair
  **in place** and change the option's *name* to match. This is the same class of hazard as
  `fields.byId`'s DOM ids, and it is easier to trip over because the array looks like presentation.
- **There is no `version` field in the snapshot yet.** Add one the next time the format is touched,
  and branch on it rather than on the presence of individual keys.

## ⛔ Changelog every substantial change

**`README.md` carries the changelog and it is updated in the same breath as the code**, not
afterwards and not in a batch. "Substantial" means anything a user would notice or a future
session would want to return to: a feature, a behaviour change, a fix that taught us something, a
format change, a decision about how something should work.

- Newest entry first, under the marker comment in `README.md`.
- An entry names **what changed, why, and what was verified** — the same standard as a commit
  message (see `HANDOFF.md` §5e).
- **Cut a version** when the app reaches a state worth returning to. That is now **four** things,
  all in the same commit:
  1. `APP_VERSION` in `index.html`, `APP_VERSION` in `src/legacy/app.js` **and** `version.json` —
     ⛔ **all three together, always.** `version.json` alone shows every user an update that does not
     exist; `APP_VERSION` alone makes a real update invisible. This is the update-delivery contract
     (README v1.2.0), not bookkeeping. ⚠️ The build carries its **own** copy of `APP_VERSION` since
     the engine moved to `src/legacy/app.js` — both read `1.2.0` today, and a bump that touches only
     one ships a build that misreports itself.
  2. A changelog entry in `README.md`.
  3. `git tag -a vX.Y.Z` — immutable history.
  4. `releases/vX.Y.Z.html`, byte-identical, verified with `cmp`/`shasum`.

  The tag and the copy are not redundant: the tag is how you diff and bisect, the copy is the one
  you can hand someone or double-click when `index.html` has moved on.
- Changelog entries are **not** a substitute for `HANDOFF.md`. The changelog is what shipped;
  `HANDOFF.md` is where things stand and what was learned.

## ⏳ Watch the context window — hand off before quality drops

Long sessions degrade: context gets summarised, details are lost, and work starts getting
re-derived or quietly repeated. **Proactively** — without being prompted — tell the owner when the
session is getting long, and recommend migrating:

1. Save all work (commit locally at minimum; ask before pushing).
2. **Update `HANDOFF.md`** with everything learned since it was last written.
3. Start a fresh session, pointing it at `HANDOFF.md` first.

Raise this *before* the session is struggling, not after. Re-read this section periodically during
long sessions — it is easy to forget precisely when it matters most.

## Project

`index.html` — a **single self-contained HTML file** (~10,344 lines / ~667 KB) implementing the *SPT Planning Calendar Builder*: a TV production scheduling tool that turns phase start dates + durations into a week-by-week waterfall calendar, a month calendar, an Excel workbook, and a printable PDF.

> ⚠️ **This describes the DEPLOYED `index.html`, and it is still exactly true of it. It is no longer
> true of the repo.** As of 29 Aug 2026 there is a Vite + React + Mantine build in `src/` that
> produces `dist/index.html` — the chrome's header, preview toolbar and static sidebar cards are
> React now. The root `index.html` is untouched and still IS the live app, byte-identical to
> `releases/v1.2.0.html`; nothing has been deployed. Read [`HANDOFF.md`](HANDOFF.md) §2b-3 for what
> exists, and note that the product is still ONE self-contained file — that is what the build
> produces.

The DEPLOYED FILE has no build step: it is one `<style>` block, static markup, and one `<script>` block wrapped in an IIFE — nothing inside is a global, so a test must drive the DOM rather than call functions. ExcelJS is the only runtime dependency, loaded from a CDN `<script>` tag.

⚠️ **The REPO has all four of the things that sentence used to deny.** A Vite build (`npm run build` → `dist/index.html`), a package manager (`package.json`; React 19 + Mantine 9.5.2), a runner (`tests/harness/`) and a server (`tests/harness/srv.js`). What has *not* changed is the product: the build still emits ONE self-contained file.

⛔ **Two fonts are embedded and they must never be confused.** **Carlito** is the grid and export typeface, and it is embedded (base64 of a zlib'd TrueType subset, ~94 KB) because it feeds the **frozen width model** — `EXCEL_MDW`, `measureTextPx`, every column width in the workbook and both PDFs — so its measurement must never drift; `tools/subset-font.py` regenerates it. **Inter** is the CHROME typeface and is embedded only in the build (`src/styles/inter.css`, one variable woff2, regenerated by `tools/fetch-inter.py`). Touching Carlito changes the exports; touching Inter cannot. Everything else (icons, PWA manifest) is inlined as `data:` URIs — except that the **deployed** file still fetches Inter and IBM Plex Mono from Google Fonts. The build fetches nothing: the link and both preconnects are gone, IBM Plex Mono was dropped, and Inter travels inside the file, so an emailed copy measures text identically offline.

There is a runner now, and fixtures. `tests/harness/` holds a headless-Chrome harness: `run.sh` drives one test, `gate.sh` runs the whole acceptance gate and diffs it against `tests/baselines/2026-08-29-stage-7/`. `tests/fixtures/` holds real saved calendars for the restore path. See PROJECT-CONTEXT §11 and UI-CONVENTIONS §10.

⚠️ **The two entry points default to DIFFERENT pages, and that has already cost a wrong diagnosis.** `gate.sh` defaults to `/dist/index.html` — the build. `run.sh` defaults to `HARNESS_PAGE=/index.html` — the **deployed** app. So "re-run that leg standalone to see if it is really broken" silently tests a different program, and it passes while the build fails. Always pass `HARNESS_PAGE=/dist/index.html` when you mean the build.

⚠️ **`tests/fixtures/` has a hole in the format that matters most: there is no `.sptcal` fixture at all**, only the pre-v1.1.0 `v1.0.0-saved.html`. So the restore gate proves the legacy path and *not* the format every save now writes. Cutting one is the cheapest possible insurance for §0 rule 3.

⚠️ **These docs quote no line numbers.** They name symbols; `grep -n` finds them. Numbers live in exactly one place — [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md) §14 — and `python3 tools/check-refs.py` verifies them. This is not fussiness: the numbers were once scattered through ~107 sites, and twice in one day a single commit to `index.html` invalidated nearly all of them. A wrong line number reads as precision and sends you to the wrong function. **Run the checker after any edit to `index.html`.** ⚠️ **It is blind to `src/legacy/app.js`** — it
resolves §14's symbols against the root `index.html` only. Most work now lands in the build's engine,
where the checker cannot see a thing, so a clean run there proves nothing about it.

**Run the deployed app:** `open index.html` (macOS). Reload the browser to test changes.

**Run and prove the BUILD:** `npm run dev` serves `src/` for iteration; `npm run build` produces `dist/index.html` (one self-contained file, ~983 KB). Before calling any change to the grid, the exports or the save path done, run `cd tests/harness && ./gate.sh` — it is the gate the freeze rule above demands, and it compares the waterfall PDF and every Excel part against the baseline.

**Chrome/Edge are the target browsers — decided, not incidental** (owner's call, 29 Aug 2026). Read
that as **two** constraints, because it was written as one sentence for months and the merge is what
made the question unanswerable:

- **The harness** needs Chrome's `--headless=new --dump-dom`. Safari has neither, and no
  equivalent — its only automation surface is `safaridriver`, a windowed WebDriver browser you must
  enable by hand. Porting the harness is a rewrite, not a change to `CHROME=`.
- **The app** needs the File System Access API (`showSaveFilePicker`) plus `FileSystemFileHandle`
  persistence in IndexedDB, both Chromium-only. Elsewhere, **opening a calendar works fine** and
  saving degrades to a plain download of the legacy `.html` copy — deliberately, since without a
  handle there is nothing to write back to.
- **The print path has never been measured outside Chrome.** The month-PDF print CSS is tuned to
  Chrome's engine specifically. That is an unknown, not a known-good fallback — do not call Safari
  "graceful degradation" without measuring it.

Full reasoning, including the `DecompressionStream` floor that Carlito depends on, is in
[`HANDOFF.md`](HANDOFF.md) §3.

**Keep it single-file.** The self-containment is load-bearing: the PWA manifest and every icon are inlined so the tool can be emailed around as one file and run offline from `file://`, and the *shareable copy* export is a complete working app in one document. Do not split out CSS/JS or add local asset files.

⚠️ **"Saved calendars are copies of the app" is out of date** — as of v1.1.0 Save writes `.sptcal`, ~4.5 KB of JSON. The full-copy format is now File ▸ *Export shareable copy…*. Both open, forever. See "Save / restore" below.

⚠️ **This constraint is under active reconsideration** for the chrome only — see [`MANTINE-MIGRATION.md`](MANTINE-MIGRATION.md) and `HANDOFF.md` §8. The grid and the exports are excluded permanently.

## Core data flow

Everything funnels through one cycle, driven by `update()`:

```
DOM inputs → readState() → computeSchedule(state) → render(schedule) → markDirty()
```

- **`readState()`** reads every `#start-<key>` / `#weeks-<key>` field, hiatus rows, per-phase hiatuses, and Show Info. Note: once Show Info is complete (`showInfoStatus()`), `episodes × days-per-episode` **overrides** whatever was typed in the Production row, everywhere.
- **`computeSchedule(state)`** is the heart of the app. It returns `{weeks:[], maxConcurrent, totalWeeks, error?}`, where each week carries its phase segments, hiatus flags, and auto-notes. Key behaviors, all deliberate:
  - Hiatuses **pause** a phase rather than consuming its weeks — `extendEndForHiatus()` walks week-by-week and only counts non-hiatus weeks, so a phase always delivers its full requested span. Overlapping hiatuses extend by the union, not per-hiatus.
  - Production alone runs a **day-level** simulation (`simulateProductionSchedule()`): skips weekends, hiatus days, and union holidays for the selected country until the shoot-day count is met.
  - Global hiatuses apply to all phases; `phaseHiatuses[key]` pauses only its own phase.
  - `MAX_WEEKS = 600` guards against typo'd years hanging the page.
- **`render(schedule)`** dispatches to `renderSpreadsheetView()` (waterfall) or `renderMonthView()` per `viewMode` (`'sheet' | 'month'`), plus the summary row and holiday-visibility list.

**After applying a state snapshot, `refreshAfterRestore()` must run** — not a bare `update()`. It is the single list of post-restore UI refreshes (sidebar tab, region tracking, episode rows, sim-post, then `update`). The three restore paths each used to keep their own copy of that list and drifted, which left a stale "Complete Show Info" notice and an empty episode list after opening a saved file.

## Calendar adjustment tools

The toolbar above the preview holds **Shift All** (split control: arrows act, caret opens a form), **Shift From**, **Anchor To** and **Rebuild From**. Only two questions distinguish them, and the popover descriptions exist to answer them: *does everything move or part of it*, and *do the gaps between phases survive or get rebuilt*. Anything true of all four — none of them ever change a phase's duration — must **not** appear in a description; it reads as a distinction while distinguishing nothing.

`shiftCalendar(weeks, fromIso)` also re-keys the week-keyed note stores, because a shift that moved only the dates would leave every note behind on the old calendar date. Holidays never move, locked all-phase hiatuses never move, and notes carrying a date never move; per-phase hiatuses always travel with their phase. Full detail, including the two solvers and why Production is searched rather than inverted, is in **PROJECT-CONTEXT.md §7a**.

`PHASES` defines the six built-in phases with their Excel fill/text colors and label templates; `production` is the only one with `inputMode:'days'`. Custom phases are appended via `customPhaseDefs` and get keys `custom<n>`; `getAllPhaseDefs()` returns built-ins + custom together and is what the rest of the app iterates.

## State model

State lives in module-scope mutable objects scattered through the script, *not* in a single store. `captureSnapshot()` is the single **definition** of what counts as state even though the storage is scattered. The main ones, mostly keyed by `'YYYY-MM-DD'` week or day:

| Variable | Purpose |
|---|---|
| `userNotes` | note-cell overrides; `text:''` means "auto-note explicitly cleared" |
| `dayNotes` / `dayNoteColors` | month-view per-day notes and legacy colors (folded in by `dayNoteList()`) |
| `noteColors`, `hiatusTexts`, `hiatusColors` | per-cell appearance overrides |
| `holidayView` | which holidays show in which view (`{sheet, month}`) |
| `headerMode`/`headerManual`, `mvHeaderMode`/`mvHeaderManual` | auto vs. hand-edited header lines |
| `headerFormat`, `mvHeaderFormat` | per-header-line size/bold/italic/colour/highlight/align. Consumed by **four** places — both renderers, `exportExcel` and `buildWaterfallPdf` — so screen and exports cannot disagree |
| `mvExtraLanes` | extra note lanes per month-view week |
| `customPhaseDefs`, `episodeDefs` | dynamic rows |
| `noteFontSize`, `hiatusFontSize` | per-cell font size, set by the note editor or a row drag |
| `colWidths`, `rowHeights` | manual grid sizing from `installGridResizers`; absent = automatic |
| `cellSpans` | a cell dragged across the empty columns beside it |
| `locked` on each `.hiatus-entry` | the "Lock in place" pin: a locked all-phase hiatus keeps its dates when the shift tools move the calendar |

**Not** state, deliberately: `autosaveNeedsFile`, `autosaveFailed`, `isDirty`, `suppressDirty` and the legacy-notice visibility are all session UI, and none belongs in a saved file. Per-user *preferences* (`SHEET_GRIDLINES`, `WF_PDF_MODE`, `GRID_TEXT_COLOR`, once the Settings menu owns them) belong in `localStorage`, **never** in `captureSnapshot()` — they are not calendar data and must not travel inside someone else's file.

Any new persistent state must be added in **both** places or it will silently not survive a save: the `captureSnapshot()` literal and the matching branch in `applyStateSnapshot()` — plus (if it's a DOM field) `collectFieldValues()` / `reflectFieldsToAttributes()` — and the resets, and the shift re-key if it is week-keyed. **Restore unconditionally**: `if(snap.x) x = snap.x` leaves the *previous* file's values in place when the new file has no such key. `captureSnapshot()` is the **single** definition of "what counts as state", consumed by the save file, the crash backup, and the undo stack; it replaced two duplicated snapshot literals.

⚠️ `collectFieldValues()` sweeps every `input[id]`/`select[id]`/`textarea[id]` in the document. Any new id'd control that is *transient UI* rather than calendar data must be excluded, or it gets baked into saved files **and** adds phantom undo steps. The toolbar tool popovers are excluded via `el.closest('.tools-menu')` — matched on the **class**, deliberately not an id, because an id-based test quietly stops matching when markup is reorganised.

## Save / restore

**Two formats, one reader.** "Save" writes **`.sptcal`** — `captureSnapshot()` as JSON, ~4.5 KB. "Export shareable copy…" writes the old full self-contained HTML document (`buildSavedHtml()`), built from a *clone* of the document with `#table-wrap`, `#print-root` and any open popover stripped, and the state serialized into `<script id="saved-state" type="application/json">` (ships as `null`). `<` is escaped to `\u003c` so user text containing a closing script tag can't truncate the file.

`parseCalendarText()` is the **only** thing that reads a calendar file: text starting with `{` is a snapshot, anything else gets the `saved-state` regex. It returns **`{format, snapshot}`** — the format is part of the contract because opening a legacy `.html` is the one moment the app can offer to upgrade it. Both converge on `applyStateSnapshot()`, which rebuilds custom-phase and hiatus rows first (re-keying generated ids to the saved keys), then applies `fields.byId`. On page load, `restoreSavedState()` still reads the inline block — that is how a shareable copy opens itself.

⛔ **What the clone must strip, and the one thing it must HIDE rather than strip.** The strip list is
five classes — `.note-pop, .mv-note-pop, .phase-color-pop, .date-pop, .select-pop` — because each is
a body-level panel that a Share click can catch mid-close (React commits after the synchronous
build). Separately the clone **re-hides** `#legacy-notice` and `#update-notice`: they ship `hidden`
and are un-hidden at runtime by `el.hidden = false`, which *removes* the attribute `outerHTML` would
have serialised, so a copy exported while the upgrade strip was up carried a permanent banner naming
someone else's file. Hidden rather than removed, because the copy is a working app whose own engine
may need to raise them later. (Fixed round 7; it restores v1.0.0's output rather than changing it.)

`reflectFieldsToAttributes()` exists because `outerHTML` serializes *attributes*, not live DOM property values — form fields must have their values written back to attributes before snapshotting.

File handles are kept in IndexedDB (`spt-planning-cal` / `handles`) as a recents list, so a reopened saved file can write back in place after one permission click. `suppressDirty` gates dirty-tracking during load/restore; `markDirty()` schedules the rolling crash backup (debounced 3 s) and the 10-minute autosave. ⚠️ That backup is **IndexedDB**, not `localStorage` — `idbSet(BACKUP_KEY, …)`. **`localStorage` is used nowhere in the app today**, so the Settings menu (HANDOFF §2b) would be introducing it, not joining it.

## Exports

**Frozen — see the rule above.** Listed here so the seam is legible, not so it can be edited.

- **Excel** (`exportExcel()`): builds an ExcelJS workbook directly with explicit column widths, merges, and ARGB fills. `computeBlockLayout()` / `computePhaseRowLayout()` compute the column-slot assignment (which phase occupies which column in a given week, honoring `maxConcurrent` and the fixed sim-post slot) — the **same** layout logic backs the on-screen waterfall and the PDF, so changes there land everywhere at once. Excel caps a header/footer string at **255 characters in total**; one over and Excel reports the file as corrupt.
- **Waterfall PDF** (`buildWaterfallPdf()` → `exportWaterfallPdfDirect()`): **writes PDF bytes directly, no print dialog** — TrueType subsetting from the embedded Carlito, `/FontFile2`, WinAnsi, xref, Flate. `WF_PDF_MODE` selects it; the old print path is the fallback. Orientation comes from `sheetPageOrientation()`, the same rule the workbook uses.
- **Month PDF** (`exportMonthPdf()`): still browser print — renders every month into `#print-root`, adds `body.printing-calendar` (a print stylesheet hides everything else), calls `window.print()`. Always clear the class and `#print-root` before starting; a stuck class hides the app and makes the next print silently do nothing. Cleanup is bound to `afterprint` with a 60 s safety net.

The width model that feeds all three is in PROJECT-CONTEXT §9a.

## Conventions

- All dates are handled as **UTC midnight**; use `parseDateUTC()`, `addDays()`, `mondayOf()`, `isoOf()` rather than raw `Date` math. Weeks are always Monday-snapped.
- Colors are hex strings shared by DOM and Excel; `textColorFor()` picks readable foreground.
- The Production Region selectors **lock** once the user has made note/holiday/hiatus edits (`hasNoteEdits()` → `reflectCountryLock()`), since changing region would regenerate auto-notes and clobber them. All three region selects — `#union-country`, `#union-usregion` and `#union-subregion` — lock and revert together.
- **Region model:** a country (`#union-country`: `US` / `CA` / `UK`) plus a sub-region for US and Canada — `#union-usregion` (`US-GEN`, `US-NY`) and `#union-subregion` (`CA-BC`, `CA-ON`, `CA-QC`, `CA-AB`, `CA-MB`, `CA-NS`). They are **two separate selects** so both option sets stay static and a restored save can set either value directly. `effectiveRegionKey()` resolves country+sub-region to one `HOLIDAYS` key (the bare `US`/`CA` values are never keys); `reflectRegionUI()` shows whichever row applies; `normalizeRegionSelection()` rewrites the legacy `CAN` value and fills a missing sub-region with that country's default; `syncRegionTracking()` re-baselines the change-guard after any programmatic load/restore. All three selects lock and revert together.
- `HOLIDAYS` is keyed by **region**, not country, and is **generated from holiday rules** rather than hand-transcribed — regenerate it rather than editing dates by hand. Both US lists are IATSE's 11 recognized holidays: `US-GEN` (West Coast Studio Locals **and** the Area Standards Agreement — verified identical, so LA = Atlanta = Albuquerque) and `US-NY` (Local 52 Majors), which **swaps Good Friday for Veterans Day**. **Columbus Day appears in neither** (it is on no IATSE calendar), and Veterans Day is *only* correct for New York. Canada is per-province because the statutory lists genuinely differ (Boxing Day is ON-only; Remembrance Day BC/AB; Truth & Reconciliation BC/MB; Fête nationale QC-only). Weekend holidays also emit an `(Observed)` weekday entry — US shifts Sat→Fri / Sun→Mon per the IATSE ASA rule, Canada/UK move forward to the next free weekday.
- The code comments explain *why* (bug history, browser constraints) at length — match that style when the reasoning is non-obvious, and keep existing explanatory comments intact when editing nearby.
