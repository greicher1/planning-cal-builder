# Mantine UI redesign — scope, rules, and plan

**Written:** 28 Aug 2026, against `305c343` (`main`, clean). **Nothing has been built yet.**
**Decision recorded:** 28 Aug 2026 — the owner chose **Option B**: redesign the surrounding UI on
Mantine, **freeze the grid and the exports permanently**.

Reading order (owner-revised 29 Aug 2026): [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) →
[`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md). This document is the working plan for the redesign.

---

## 1. The rule that governs this work

> ### ⚠️ REVISED BY THE OWNER, 29 Aug 2026 — read this before the rest of the section
>
> The absolute below is **no longer accurate for the on-screen waterfall.** The owner's words:
>
> > *"the build's output should stay the same — even better if using the same render engine —
> > specifically the operating waterfall grid which outputs excel or pdfs — the pdfs should look
> > exactly the same as it exported in v1.0.0 — on the other hand — the full calendar system (the
> > grid, is that what we're calling it?) can be redesigned under MANTINE"*
>
> So the rule has split in two, and the split is not where this document assumed:
>
> - **The OUTPUT is frozen** — the Excel workbook and the waterfall PDF must look exactly as
>   v1.0.0's did, and the writers themselves should not even be rewritten ("same render engine").
>   That part is now *stricter* than what follows: it freezes appearance, not just code.
> - **The on-screen waterfall MAY be redesigned on Mantine.** That part is *looser*, and it
>   contradicts "React renders `#table-wrap` as an empty container and never touches its children"
>   below.
>
> ⚠️ **"the grid" now means two different things** depending on who is speaking — these docs use it
> for the frozen thing, the owner used it for the whole calendar system. **Read the freeze rule by
> its symbol list, never by the word "grid".**
>
> The seam that makes both halves true at once is worked out in
> [`MANTINE-SEAM.md`](MANTINE-SEAM.md), which supersedes this section wherever they disagree.
> `HANDOFF.md` §4 carries the decision and the verification behind it.

> **The grid and the exports are never touched.**

It is written in full in [`CLAUDE.md`](CLAUDE.md) ("⛔ Never touch the grid or the exports") and
in [`HANDOFF.md`](HANDOFF.md) §0 and §4. It is not a preference and not a phase of this project —
it is permanent, and it outranks anything in this document.

### The seam, stated exactly

**React/Mantine owns the entire document except two subtrees:**

| Frozen | Owned by |
|---|---|
| `#table-wrap` and every descendant | the existing imperative renderer |
| `#print-root` and every descendant | the existing PDF/print path |

Both are rendered by React as **empty containers with a ref**, and React never touches their
children. `renderSpreadsheetView()` / `renderMonthView()` keep writing into `#table-wrap` exactly
as they do now; `exportMonthPdf()` and `buildWaterfallPdf()` keep using `#print-root` exactly as
they do now. The existing delegated listeners on `#table-wrap` (note editor open, keydown,
focusout — six of them) continue to work unchanged, because the container is uncontrolled.

Also frozen, wherever they live: the width model (`EXCEL_MDW = 7`, `SHEET_ZOOM = 0.75`,
`EXCEL_CELL_PAD = 5`, `COL_PAD_CHARS = 1.15`, `ROW_DEFAULT_PX = 20`), the layout and text-fitting
functions, the direct-manipulation handlers, the Excel and PDF writers, and the `.sheet-*` /
`.mv-*` / `#print-root` CSS blocks. `CLAUDE.md` carries the function-by-function list.

### Why it is absolute

Three measured facts, none of them visible from reading the code:

- Calibri/Carlito's `"0"` advances **7.4336 px**, but **Excel floors MDW to 7**. Using the true
  advance makes every column ~6% narrower than Excel's autofit and every downstream width wrong.
- The model budgets **3.75 px** of total cell padding at `SHEET_ZOOM`. Any rule spending more
  silently ellipsis-clips text. It has already landed twice — 64 of 255 filled cells, then 9 of
  52 date cells — and neither was visible without counting.
- `computePhaseRowLayout()` is the **single** source of which phase occupies which column, shared
  by the screen, the PDF writer, `sheetColumnWidths()` and the Excel export. Its previous
  three-way divergence is the reason the PDF never matched an Excel print, and collapsing it cost
  most of the last 21 commits.

### The one way this rule can be broken by accident

**Mantine ships a global CSS baseline.** `@mantine/core`'s `baseline.css` / `global.css` set
box-sizing, margins, `line-height`, `font-family` and table defaults document-wide. Dropped over
this app they are a live candidate to re-introduce the clipping bug — and it will not look like a
Mantine problem, it will look like the PDF being wrong again.

**Mandatory mitigation:** import Mantine's `.layer.css` variants and fence them into a CSS
`@layer` that the app's grid rules outrank; assert in review that no Mantine selector matches
inside `#table-wrap` or `#print-root`. **Acceptance gate for every stage:** the ellipsis-clipped
cell count stays at zero and a generated PDF diffs clean against a pre-migration export. Not "it
looks fine."

---

## 2. What is being redesigned

Everything outside the seam — and **redesigned**, not merely ported. Mantine is the design
language, not just a component source.

**Scope of the redesign, decided 28 Aug 2026: same structure, Mantine clothing.** The information
architecture is **fixed** — the three-tab sidebar, the card order within each tab, the toolbar
layout, and where every control lives all stay exactly as they are. What changes is the
*execution*: every control becomes its Mantine equivalent, the six inconsistent warning styles
become one system, and ~2,000 lines of inline `style=` attributes and hand-rolled popover
machinery go away. This is deliberately the lower-risk of the two options considered — it keeps
the diff reviewable surface-by-surface and means no user has to relearn where anything is.

| Surface | Today | Mantine direction |
|---|---|---|
| **App header / toolbar** | `header.app-header`, 7 `.tb-btn`s, `.save-status` | `AppShell.Header` + `Group`; `Button` / `ActionIcon`; save state as a `Badge`/`Text` with a real idle-dirty-saving-failed state, not four CSS classes |
| **File menu** | hand-rolled `.file-menu` dropdown + recents list | `Menu` with `Menu.Item` / `Menu.Divider`; recents get icons, a remove affordance and an empty state |
| **Sidebar shell** | `aside.form-panel`, sticky, `clamp(320px,24vw,420px)` | `AppShell.Navbar` + `ScrollArea`; keeps the sticky-below-header behaviour and the 960/1280 px breakpoints |
| **Sidebar tabs** | `.side-tabs` 3 buttons, manual `.tab-hidden` | `Tabs` (or `SegmentedControl`), real keyboard nav and `aria` for free |
| **Cards** | 5 × `section.card` | `Card` / `Paper` with consistent section headers |
| **Show info** | 4 raw inputs with 8 lines of inline `style=` each | `TextInput`, `NumberInput`, `Select` with proper `label` / `description` / `error` props |
| **Production Region** | 3 `<select>`, 2 conditionally-shown rows, a lock hint | `Select` ×3 with `Collapse`; the lock hint becomes an `Alert` with the real reason |
| **Holidays** | custom 3-column checkbox grid, bulk text buttons, add-form | `Table` + `Checkbox` columns, `Checkbox.Group` for bulk, `TextInput` + `DatePickerInput` + `Button` for the add row |
| **Phases / custom phases** | `.phase-row` grid, `.swatch` popover, inline hiatus block | `Card` per phase, `ColorSwatch` + `Popover` picker, `Collapse` for the per-phase hiatus |
| **Episode rows** | two bare inputs per row | `TextInput` + `NumberInput` pairs, keeping the no-rebuild-mid-typing rule |
| **All-phase hiatus** | `.hiatus-entry` rows, pin checkbox | rows with `DatePickerInput` + `NumberInput` + `Switch` (the "Lock in place" pin) |
| **Preview toolbar** | `.view-toggle` pair, `.shift-group` split control, 4 popovers, undo/redo | `SegmentedControl` for the view; `Button.Group` for the shift split; `Popover` ×4; `ActionIcon` + `Tooltip` for undo/redo |
| **Warnings / status** | `#gap-warning`, `.tools-msg`, `.placeholder-note`, `.snap-note`, `#union-lock-hint`, `#custom-hol-err` | one consistent system: `Alert` for blocking/advisory, `Text c="dimmed"` for hints, `InputBase` `error` for field-level. Today these are six different looks for the same idea |
| **Note / month-note editors** | hand-rolled body-level popovers with manual anchoring, capture-phase scroll repositioning, window clamping, outside-click teardown | `Popover` (floating-ui) — anchored **to** grid cells, never injected **into** them. This is the biggest deletion in the project |
| **Phase colour picker** | `.phase-color-pop` | `Popover` + `ColorSwatch` grid |
| **Help** | `#help-fab` + `#help-overlay` + ~180 lines of static markup | `ActionIcon` FAB + `Modal` with `ScrollArea`; content unchanged |
| **Empty state** | `.empty-state` | proper empty state; also the natural home for the deferred intake hint |

**Not present today, and staying that way:** there is no footer. `footer.assumptions` exists in
the CSS (lines ~909–910) but nothing renders it — dead rules from an earlier version. Asked
directly, the owner's answer was **no footer now, none foreseen**. The considerations for one, if
it is ever revisited, are recorded as a UI convention in [`HANDOFF.md`](HANDOFF.md) §6 — including
that a print-only assumptions footer would mean editing frozen export code and is therefore a
separate ask. **The layout stays header + sidebar + preview.**

### What this buys beyond appearance

- **The `id`-sweep bug class disappears.** `collectFieldValues()` sweeps every `input[id]` /
  `select[id]` / `textarea[id]` into saved files *and* the undo stack — which is why `HANDOFF.md`
  §4 carries a standing rule against giving transient UI an `id`, and why the toolbar popovers
  need a `.tools-menu` escape hatch. With React state as the source of truth, "what counts as
  calendar data" becomes a declaration instead of a DOM query.
- **Four hand-rolled popovers become one library call.** The app currently maintains its own
  anchoring, scroll repositioning, clamping, teardown and outlived-anchor cleanup in four places.
- **Six warning styles become one.** The list above is not a nitpick — it is the clearest
  *visual* argument for the redesign.
- **The pending features get easier.** Settings menu (§2b), multiple notes columns (§2c) and the
  intake modal are all form-and-state work.

---

## 3. What was measured (not estimated)

A Vite 8 + `vite-plugin-singlefile` probe was built in the scratchpad with 22 representative
components and **no application logic**. Resolved versions: **React 19.2.8, @mantine/core 9.5.2,
@mantine/dates 9.5.2, dayjs 1.11.23, Vite 8.2.2**. Mantine 9 peer-requires React ^19.2.

| Single file, everything inlined | Raw | Gzip |
|---|---:|---:|
| **Current app** (`index.html`, incl. 94 KB font) | 661,691 | 253,938 |
| React + ReactDOM only | 191,056 | 59,658 |
| React + Mantine JS, **no** Mantine CSS | 558,642 | 163,383 |
| React + Mantine, **per-component CSS** (34 files) | 663,751 | 179,685 |
| React + Mantine, **full `styles.css`** | 789,914 | 196,920 |
| React + Mantine, full, **unminified** | 1,501,914 | 281,859 |

React runtime ≈ **191 KB**; Mantine JS for 22 components ≈ **368 KB**; Mantine CSS adds **+105 KB**
per-component or **+231 KB** as one file — so **import per component**.

**Projected shipped file: ~1.0–1.15 MB raw, ~330–390 KB gzip** — roughly 1.6–1.75× today.
Assumes the app's 414 KB of commented script minifies to ~200 KB, its 62 KB of CSS to ~45 KB
(grid and print rules survive; chrome rules mostly don't), and the 94 KB font is untouched.

Current file composition, for reference:

| Part | Bytes | Share |
|---|---:|---:|
| Script (one IIFE, heavily commented) | 413,719 | 62.5% |
| Embedded Carlito, 2 weights, base64 | 93,797 | 14.2% |
| CSS | 62,160 | 9.4% |
| Markup (incl. help modal) | 51,386 | 7.8% |
| Head / saved-state / other | 40,524 | 6.1% |

### Two findings that de-risk the plan

- ✅ **The single-file build runs from `file://`.** Verified with headless Chrome `--dump-dom`
  against the built `dist/index.html` — Mantine's rendered classes (`mantine-Button-root`,
  `mantine-TextInput-*`) are present. Inline `<script type="module">` executes from `file://`, so
  **emailing the tool around as one file still works.**
- ✅ **Mantine 9 dates are `'YYYY-MM-DD'` strings.**
  `@mantine/dates/lib/types/GeneralTypes.d.ts` defines `DateStringValue = string`. The hazard I
  expected to be worst — a local-time picker feeding a strict UTC-midnight codebase — does not
  exist. `DatePickerInput` speaks exactly what `parseDateUTC()` takes. dayjs is bundled internally
  but must still never be handed a schedule date.

Reproduce from `…/scratchpad/mantine-probe`: `vite.config.js` = full CSS, `vite2` = React only,
`vite3` = per-component CSS, `vite4` = unminified.

### Line accounting — the scope, in proportion

| Subsystem | Lines | In scope? |
|---|---:|---|
| Engine — schedule, dates, holidays, solvers | 2,447 | No — pure, ports untouched |
| **Grid rendering + geometry + resize** | **1,375** | **FROZEN** |
| **Exports — Excel + direct PDF writer** | **1,211** | **FROZEN** |
| Persistence — save/restore, undo, IndexedDB | 838 | Yes — rewritten, and shrinks |
| **Chrome — forms, tabs, popovers, menus** | **1,790** | **Yes — this is the redesign** |

Plus ~130 lines of top-level event wiring and 51 KB of static markup.

---

## 4. What MUST change

Blocking. Nothing ships until all of it is done.

1. **Introduce a build system.** `package.json`, Vite 8, `@vitejs/plugin-react`,
   `vite-plugin-singlefile`. `npm run dev` to work, `npm run build` to produce `dist/index.html`.
2. **Fix the test harness — first, before porting anything.** PROJECT-CONTEXT §11 drives the app
   with `el.value = v` + `dispatchEvent(new Event('input'))`. **React ignores that**: it tracks the
   last value it set and treats a direct assignment as unchanged, so every fixture would silently
   set nothing and assert against a blank calendar. Fix: use the native setter
   (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v)`) and
   **keep every existing element `id`** on the Mantine equivalents, so the §11 selectors and its
   gotchas table stay valid. This is the item most likely to be found late and blamed on the
   wrong thing.
3. **Fence Mantine's CSS** into a `@layer` the grid rules outrank (§1), and import per component.
4. **Rewrite persistence around React state.** `captureSnapshot()` remains the single definition
   of "what counts as state" — that rule is good and survives — but it captures a state object
   instead of sweeping the DOM. `reflectFieldsToAttributes()` and `collectFieldValues()` are
   deleted. `buildSavedHtml()` **empties the React root before serializing**, so a saved file is
   `[built shell] + [state JSON]` rather than a snapshot of rendered markup React will discard.
5. **Write the legacy-save compatibility branch.** `openRecentFile()` regexes
   `<script id="saved-state">` out of *any* calendar HTML and replays it into the running app.
   Every calendar saved before the migration carries `fields.byId` keyed by DOM id
   (`start-production`, `weeks-post`, `union-usregion`, `name-custom1`, …) plus an ordered,
   id-less hiatus array. `applyStateSnapshot()` needs a legacy branch mapping those onto the new
   state shape, covering the generated per-phase ids and the custom-phase re-keying. **A saved
   calendar that stops opening is data loss for a real user** — this needs real saved files as
   fixtures, not synthesised ones. Now backed by a standing rule — `CLAUDE.md` → "⛔ Every saved
   calendar must keep opening, forever" — and see [`HANDOFF.md`](HANDOFF.md) §7 for how Open
   actually works and the proposed data-only save format, which should be sequenced into this
   same stage.
6. **Redesign the chrome** (§2). ~1,790 lines of function bodies plus ~51 KB of static markup.
7. **Rebuild the deploy path.** Pages currently serves the repo's `index.html` directly; it must
   now serve build output — either a committed `dist/index.html` (simple, noisy diffs) or a
   GitHub Action (cleaner, and it makes the deploy gate easier to honour because there is a named
   workflow rather than a raw file push).
8. **Accept minified output.** The unminified shell alone is 1.50 MB. Consequence: **source stops
   being the artifact** — the repo file, the deployed file and a saved calendar become three
   different things, and a saved calendar is no longer a *readable* copy of the app. The comments
   `HANDOFF.md` §5f calls "the project's real documentation" live in git only. This is the
   property being traded away; it is worth being sure about (§7 Q2).

## 5. What is RECOMMENDED

- **Move the 34 CSS custom properties into the Mantine theme**, so `--c-production`,
  `--edit-accent` etc. are one source shared by Mantine components, the frozen grid CSS and the
  Excel/PDF palettes. The token system already exists; it gets a proper home. **The grid keeps
  reading the same variable names** — that is what makes this safe.
- **Build the Settings menu (§2b) as the first Mantine surface**, not a port: `Modal` +
  `SegmentedControl` + `Switch`, `localStorage`-persisted, deliberately **outside**
  `captureSnapshot()` (preferences are not calendar data and must not travel inside a saved file).
  Its three tenants are already seeded: `SHEET_GRIDLINES`, `WF_PDF_MODE`, `GRID_TEXT_COLOR`.
  Note these are *read* by frozen code — the menu changes their value, never their consumers.
- **Unify the six warning/hint styles** into `Alert` / dimmed `Text` / field-level `error` (§2).
- **Take `DatePickerInput`** for phase, hiatus and tool date fields — it speaks `'YYYY-MM-DD'`
  natively and can carry the Monday-snap hint inline instead of as a separate `.snap-note`.
- **Do the documentation refresh (`HANDOFF.md` §2a) first, on the current code.** It is 21 commits
  overdue, and a redesign is exactly the wrong time to work from a stale map.

## 6. Staged plan

> ⛔ **SUPERSEDED BY WHAT WAS BUILT. [`HANDOFF.md`](HANDOFF.md) §2b-3 is the live status and the live
> order.** Kept because the reasoning still reads correctly and the estimates were roughly right.
> Three things this section assumed turned out differently, and each is worth carrying forward:
>
> - **Stage 3 (the Settings menu) was skipped, not forgotten.** Its justification was proving the
>   provider, theme, CSS layering and build on something small; Stage 1 proved all four on the real
>   app. The owner's §2b ask still stands and is still unbuilt.
> - **§4.4 was wrong, and usefully so.** `collectFieldValues()` and `reflectFieldsToAttributes()`
>   did NOT die and persistence was NOT rewritten around React state. Every Mantine input carries
>   its real id and is **uncontrolled**, so `applyStateSnapshot()`'s `el.value` writes still land.
>   That kept the save-format contract out of the migration's blast radius entirely — which also
>   means **§4.5's legacy-restore branch was never needed**, and §7's Q2 (how many saved calendars
>   exist) stopped being a blocker.
> - **The seam is four portals, not one root.** See `HANDOFF.md` §2b-3 and `MANTINE-SEAM.md` §3.1.

Each stage ends somewhere shippable, so work can pause without leaving a half-migrated app on
`main`. Estimates are working sessions, unpadded. **Every stage ends with the §1 acceptance gate:
zero clipped cells, PDF diffs clean.**

**Stage 0 — refresh the docs (1 session).** `CLAUDE.md` and `PROJECT-CONTEXT.md` to current per
`HANDOFF.md` §2a. Useful regardless of this project.

**Stage 1 — scaffold, zero behaviour change (1–2 sessions).** Vite + singlefile producing a
`dist/index.html` behaviourally identical to today: the whole existing app moved across as one
imperative module, React mounted but rendering nothing, `#table-wrap` and `#print-root` already
ref'd containers. Fix the test harness (§4.2). Establish the deploy path. **Gate: existing
headless-Chrome fixtures pass, Excel export byte-identical, PDF diffs clean.**

**Stage 2 — design pass, before building (1 session).** `HANDOFF.md` §5c is explicit about
discussing before building, and that mockups help. Narrowed by the "same structure" decision, so
this is **not** an IA exercise — it settles three things and nothing else: the **theme tokens**
(the 34 existing CSS variables mapped onto a Mantine theme), the **one warning system** that
replaces today's six, and **mockups of the three chrome surfaces** (header, sidebar, preview
toolbar) at their real breakpoints — 1280 px, where the toolbar currently wraps to two lines, and
960 px, where the layout stacks. **No code.**

**Stage 3 — Settings menu, new in Mantine (1–2 sessions).** The owner's live ask, built as the
first React surface. Proves the provider, theme, CSS layering and build pipeline on something
small and genuinely wanted. **Gate: gridlines toggle survives a reload and does not appear in a
saved file.**

**Stage 4 — sidebar (2–3 sessions).** Show info, Region, Holidays, Phases, All-phase hiatus,
episode rows. Where `collectFieldValues()` dies and the legacy-save branch (§4.5) is written and
tested against real saved calendars. Largest stage, highest chance of surprise. **Gate: every
pre-migration saved file in hand opens and round-trips.**

**Stage 5 — header, preview toolbar, popovers, help (2 sessions).** File menu, view toggle, shift
split control, the four tool popovers, note and month-note editors, colour picker, help modal.
Mostly deletion. **Gate: popovers still reposition on scroll and tear down when `render()`
rebuilds the grid.**

**Stage 6 — measure, calibrate, document (1 session).** Re-run the clipped-cell count and the PDF
diff. Update `HANDOFF.md` and `PROJECT-CONTEXT.md`. Only then ask about deploying.

**Total: 9–12 sessions**, Stage 4 the realistic place to run long. Stages 0–3 are useful on their
own even if the rest stops — which is the main reason to order it this way.

### Options considered and closed

| | A — restyle, no framework | **B — Mantine for chrome only** | C — full Mantine |
|---|---|---|---|
| Grid / exports | untouched | **frozen by rule** | rebuilt as components |
| Effort | 1–2 sessions | **9–12 sessions** | 15+ sessions |
| Risk to grid / PDF / Excel | none | low, if §1 is respected | **high** |
| Makes §2b/§2c/intake easier | no | **yes** | yes |

**B chosen** 28 Aug 2026. **C is closed permanently** by the rule in §1.

---

## 7. Open questions

Still open — none block Stage 0, all block Stage 4.

### Q1 — is losing "a saved calendar is a readable copy of the app" acceptable?

After the build step, `buildSavedHtml()` serializes a **minified** app. The file still *runs*
identically; it can no longer be read, grepped or hand-patched, and several past debugging
sessions depended on exactly that.

**Partly answered by the format proposal in [`HANDOFF.md`](HANDOFF.md) §7.** If Save moves to a
~3 KB data-only `.spcal` file and the HTML copy becomes an explicit "export a shareable copy",
then the readability of the HTML matters much less — the thing you actually open and inspect is
3 KB of JSON, which is *more* readable than today's 730 KB blob, not less. Q1 is really "do we
take the format split?" and the answer to that is probably yes.

### Q2 — how many saved calendars exist, and can we get copies?

**"Saved calendars" means real `.html` files that real people have on their machines** — the
output of the app's Save button, each one a full copy of the app with someone's actual production
schedule baked into its `saved-state` JSON. Not git commits, not versions of the code. If a
scheduler built a plan for a show in June and saved it to their desktop, that file is a saved
calendar.

**"Legacy restore" is the code path that opens one of those older files in a newer app.** It
matters because Open never runs the old file's code — it lifts the JSON out and replays it into
the *running* app (`HANDOFF.md` §7). Today that JSON contains `fields.byId`, a map keyed by DOM
element id (`start-production`, `weeks-post`, `union-usregion`, `name-custom1`, …). A React app
has no such map, so `applyStateSnapshot()` needs a branch that translates old-id-keyed data into
the new state shape. That branch is the legacy restore.

**A "fixture" is just a real saved file kept as a test input.** The consequence of not having any
is precise and unpleasant: the branch gets written against what we *believe* old files contain,
and the belief is checked only by files we generated ourselves — which will faithfully reproduce
our own misunderstanding. Real files carry things a synthesised one won't: calendars saved before
the region model split Canada by province, before the hiatus lock existed, before custom phases,
with hand-edited notes and dragged column widths and `text:''` cleared auto-notes. **Each of those
is a way the restore can silently drop data rather than fail loudly** — the plan opens, looks
roughly right, and three columns are the wrong width and two notes are gone.

"A handful and yes" makes this manageable. "Unknown, on other people's machines" means Stage 4
gets a defensive posture instead: never drop an unrecognised key, log what could not be mapped,
and refuse to overwrite the source file after a lossy restore.

### Q3 — committed `dist/` or a GitHub Action?

Today there is no build: `index.html` **is** the app, and GitHub Pages serves that file straight
out of the repo. After the migration the app is *built* from source into `dist/index.html`, and
something has to get that built file onto Pages. Two ways:

**(a) Commit `dist/`.** Run `npm run build` locally and commit the output alongside the source.
Pages keeps serving a file from the repo exactly as it does now.
*For:* nothing new to learn, the deploy gate in `CLAUDE.md` works unchanged, and you can always
see precisely what is live by opening the committed file.
*Against:* every commit carries a ~1 MB minified diff nobody can read; it is easy to commit source
without rebuilding, so the repo says one thing and the live site does another.

**(b) A GitHub Action.** A workflow file in the repo tells GitHub: on push to `main`, run
`npm ci && npm run build` on their machine and publish `dist/` to Pages. The built file never
enters the repo.
*For:* clean diffs, source and site cannot drift apart, and the build is reproducible by anyone.
*Against:* one more moving part; a broken workflow means a broken deploy; and there is a lag
between push and live while the Action runs (~1–2 min rather than ~40 s).

**Recommendation: (b), with the deploy gate unchanged.** It also makes the gate *easier* to
honour — a deploy becomes a named, visible workflow run rather than an ordinary file push, so
"did I just deploy?" has an unambiguous answer.

### Settled

| Question | Answer | Date |
|---|---|---|
| Which option? | **B** — Mantine for the chrome; grid and exports frozen by rule | 28 Aug 2026 |
| How far does the redesign go? | **Same structure, Mantine clothing.** IA fixed | 28 Aug 2026 |
| What about footers? | **None now, none foreseen.** Considerations recorded in `HANDOFF.md` §6 | 28 Aug 2026 |
