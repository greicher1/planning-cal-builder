# SPT Planning Calendar Builder

A TV production scheduling tool. Phase start dates + durations in, and out comes a week-by-week
waterfall calendar, a month calendar, an Excel workbook and a printable PDF.

**Live:** <https://greicher1.github.io/planning-cal-builder/>
**v1.0.0 (frozen):** `releases/v1.0.0.html` — also reachable at
<https://greicher1.github.io/planning-cal-builder/releases/v1.0.0.html> **once this commit and the
`v1.0.0` tag are pushed.** Until then the copy is local only; `git push && git push --tags`.

One self-contained `index.html`. No build system, no package manager, no server. Open the file and
it runs.

**Browser:** use **Chrome or Edge.** A calendar will *open* in any modern browser, but saving in
place — writing back to the same file, the recent-files list, autosave — needs the File System
Access API, which only Chromium browsers have. In Safari or Firefox, Save falls back to downloading
a new copy each time, and printing has not been tested.

**For contributors and agents, the reading order is:** [`HANDOFF.md`](HANDOFF.md) →
[`CLAUDE.md`](CLAUDE.md) → [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md).

---

## Changelog

This project versions the **built app**, not the repo. A version is cut when the app changes in a
way a user would notice or a future session would need to return to. See
[`CLAUDE.md`](CLAUDE.md) → "⛔ Changelog every substantial change" for when and how.

<!-- Newest first. Add new entries directly under this line. -->

### Unreleased — a per-phase hiatus band sizes and drags like any other phase cell

Reported as a layout bug: a phase's own hiatus band (e.g. "Writer's Rm Hiatus") was stuck at
exactly one column wide even in a block where that phase would normally span several, leaving
dead white space beside it. Root cause in `computePhaseRowLayout()`: a phase-hiatus segment was
hard-coded to `colspan:1` and carved out of the width-sharing math as a fixed reservation
(grouped with the Simultaneous Post marker) instead of computing its width the way an active
phase cell does.

Fixed by having a phase-hiatus segment count as one of the phases sharing the row and walk the
same `freeForRun`/`spanCap` logic a `phase` segment already does, inside the same (frozen, single
shared-source) function that feeds the screen, `exportExcel`, and `buildWaterfallPdf` alike — so
screen and both exports agree by construction, same as always.

Also added the double-click-to-fill and drag-to-resize affordance regular phase cells already
have. This came free: `installGridResizers`, `beginSpanDrag`, and both `dblclick` handlers are
already generic over any `.sheet-phase-cell` with the right `data-*` attributes, so giving a
phase-hiatus `<td>` that class and those attributes (own/lmin/rmax/a/b/nphases) was enough — none
of those four functions changed. `applyCellSpanOverrides()` needed one guard widened to accept
`phaseHiatus` segments as claimable, reusing the exact `weekIso|phaseKey` `cellSpans` key shape a
dragged phase cell already uses (no new store, no save-format change).

One real snag found during implementation: the drag system and the existing click-to-rename
popover both read a phase-hiatus cell's `data-week`, for two different purposes. The drag system
needs `data-week` + a separate `data-pkey` (the generic phase-cell contract); the rename system
needs them pre-combined as `"week|phase"` (the `hiatusTexts`/`hiatusColors`/`hiatusFontSize` key
shape). Resolved by making `data-week` plain (matching phase cells) and rebuilding the combined
key at the three places that need it — `openNoteEditor()`, `applyCellFitLive()`, and the
cell-switch re-locate lookup (which also gained a `data-pkey` match, so two phases hiatused the
same week can no longer collide on a bare date match).

Verified in the browser: a hiatus band now matches a concurrent regular phase cell's width
exactly in the same row (both capped or both full-width, depending on what else shares the row);
double-click fills/un-fills it; a manual drag persists and un-does correctly; the click-to-rename
popover and per-band font size still work; an ordinary phase cell's own width and drag behavior
are unchanged. `cd tests/harness && HARNESS_PAGE=/dist/index.html ./gate.sh` passes every
frozen-surface check — the existing fixture doesn't exercise a multi-column per-phase-hiatus
scenario, so that leg proves nothing broke elsewhere rather than proving the new behavior itself;
the browser checks above are what prove that.

### Unreleased — the header toolbar and its two buttons read as real Mantine, not an approximation

- **"Reset Notes & Hiatus" and the header mode toggle now match a real Mantine
  `<Button variant="default" size="xs">` exactly** (Header.jsx's New/Save/Reset All), measured
  live rather than guessed: 30px height, 0 14px padding, gray-4 border, "default" radius,
  font-weight 500, black ink. They previously matched the *smaller* `.hf-ctl` toolbar-control
  look (22px) instead. Along the way, found and deleted a pre-Mantine leftover CSS block for the
  same two buttons that was silently winning by source order at equal ID specificity — the same
  shape as the `button.primary`/`.secondary` cleanup on 29 Aug 2026 — which is also why the
  month-view mode button looked different from its waterfall twin (the old block never covered
  it).
- **The mode toggle now just reads "Header: Manual" / "Header: Auto"** — dropped the
  "— Switch to Auto/Manual" half, which was redundant with the button's own filled/outline state.
- **The formatting toolbar no longer hugs the header bar below it** — added a small gap
  (`margin-bottom`) between `.hdr-tools` and `.cal-header-bar`.
- **Fixed an incidental finding**: `#print-root .mv-tools` was hidden for print, but the
  waterfall's equivalent `.hdr-tools` had no matching rule — so the print-fallback waterfall PDF
  (`WF_PDF_MODE:'print'`, not the default direct writer) would have printed the Bold/Italic/Reset
  toolbar across the top of the sheet. Added `#print-root .hdr-tools{ display:none !important; }`
  to match.

### Unreleased — name an all-phase hiatus from the sidebar

Backlog №6, deferred to the owner because it changes the save format — now built. Each all-phase
hiatus row (`#hiatus-list`) gets a **Name** field. A non-blank name becomes the default label on
every week that hiatus covers — on the waterfall, the month view, and in both Excel and PDF exports
— by writing into the same `hiatusTexts` override store a click-to-rename edit on the band already
uses (`hiatusTextFor()`), so no frozen render or export function was touched.

Clicking a band directly and typing something else still wins over the sidebar name for that one
week: a new `hiatusNameSyncedKeys` map tracks which weeks the sidebar sync currently owns, and only
ever touches a week it still owns. Ownership survives a shift (`shiftCalendar` re-keys it alongside
`hiatusTexts`) and a save/reload (`hiatusNameSyncedKeys` is now part of `captureSnapshot()` /
`applyStateSnapshot()`, append-only — an old save with no `fields.hiatuses[].name` restores exactly
as it did before).

Verified in the browser: naming a 2-week hiatus labels both weeks; hand-editing one week's band and
then renaming the hiatus again updates only the untouched week; clearing the name reverts owned
weeks to the default "Hiatus" label; the name shows correctly in Month view. `cd tests/harness &&
HARNESS_PAGE=/dist/index.html ./gate.sh` passes every frozen-surface check (waterfall PDF and Excel
parts byte-identical to baseline, 0 clipped cells) — the one FAIL (`restore`) is the pre-existing
IndexedDB/headless-Chrome stall (HANDOFF.md), reproduced identically on the untouched `/index.html`.

### Unreleased — drop the current-line readout from the header toolbar

The small text at the end of the toolbar naming the line you were editing ("title", "stat 1", or
"click a header line") is gone at the owner's request. The dimming already communicates "pick a
line first" — the controls sit at 45% and inert until one is clicked — and every control keeps its
own `title`, so the words were carrying nothing the state wasn't already carrying. The bar is
228px instead of 361px.

`hdrFmtLabel()` and the `.hf-target` rules were removed with it rather than left to rot; verified
zero references remain in the source or the build. The dimming behaviour is unchanged: 0.45 before
a line is picked, 1 after, and formatting still applies.

### Unreleased — the header toolbar: highlight hugs its text, and the bar is one Mantine row

- **Highlight now covers the text, not the whole column.** `.hdr-line` is a block filling its
  column, so a background on it painted a full-width band. The line now shrinks to `fit-content`
  when it has a highlight and is re-positioned with auto margins, so it stays where its column
  puts it. Measured on the title: **807px → 104px** around 96px of text, and it **tracks as you
  type** — 104 → 305 on a longer title, → 37 on a short one. Applied only when a highlight is set:
  without one, a full-width line is a bigger target for putting the caret in, and that is worth
  keeping.
- **"Reset Notes & Hiatus" is back beside the mode button.** Adding the toolbar made the strip
  `space-between` with three children, which stranded Reset alone in the middle of the bar. Now
  `flex-end` with the toolbar taking `margin-right:auto`, so it is toolbar-left, the two engine
  buttons grouped right. (The button's *behaviour* was never broken — verified the handler fires
  and rebuilds the grid.)
- **The whole strip is Mantine-styled.** `#notes-reset-btn`, `#hdr-mode-btn` and `#mv-hdr-mode-btn`
  are engine-rendered bare `<button>`s that never picked up the chrome's look. They now match
  `.hf-ctl` exactly — same 22px height, radius, border and hover — so the row reads as one set of
  controls. Manual mode renders as a filled edit-accent chip, because it is a *state* rather than
  an action.
- **The three alignment arrows became one dropdown with ragged-rule icons.** An arrow says "move
  it that way", which is what the Shift tools do; ragged rules say "this is how the text sits".
  Drawn as SVG rather than taken from a font — no dependable unicode glyph exists for these, and a
  native `<select>` cannot show an icon at all, which is why it is a button plus a small menu. The
  toggle wears the line's current alignment, so the toolbar answers "how is this set?" without
  being opened; picking the alignment a line already has clears the override.

Gate re-run: waterfall PDF and Excel parts still byte-identical to baseline.

### Unreleased — three fixes to the header formatting toolbar

Reported straight after it shipped, all three real:

- **The size dropdown could never open.** A `mousedown` `preventDefault` covering the whole
  toolbar — there to stop the edited line losing its caret when a button is pressed — also
  suppresses the native `<select>` popup in Chromium. That is the same behaviour `SelectPop`
  exploits deliberately (`HANDOFF.md` row 30), used here by accident. It is now scoped to
  `.hf-btn` only: buttons keep the caret, native controls keep their own behaviour. Verified:
  mousedown is `defaultPrevented` on a button and **not** on the select.
- **The size selector sat on its own full-width line above everything else.** A `<select>` has no
  intrinsic width, and the bar was `flex:1` with wrapping, so it expanded to the whole strip
  (measured: 260px) and pushed every other control onto a second row. Now `flex:none` on every
  control, an explicit 64px on the select, and no wrapping. Measured at 1600px: the strip is
  **26px tall instead of 52**, with the toolbar leftmost and the mode button hard right, on one line.
- **Bold did nothing on the main title.** The title is `font-weight:700` by default, and the code
  dropped falsy values — so `bold:false` was thrown away and `bold:true` changed nothing visible.
  `bold`/`italic` are now tri-state (unset = inherit, `true` = force on, `false` = force off), and
  the toggle reads the line's **computed** weight so it knows a line the stylesheet already
  bolded. Verified: 700 → 400 → 700 with the button state tracking.

Gate re-run after the fixes: waterfall PDF and Excel parts still byte-identical to baseline.

### Unreleased — header text formatting, and two more header lines

A formatting toolbar at the top-left of the header strip — opposite the mode button — with **text
size, bold, italic, text colour, highlight and alignment**. It appears **only in manual mode**
(in auto mode the lines mirror the inputs and cannot be edited, so the controls would be offering
something impossible), and it works on both the **waterfall** and **month** headers, which keep
their own independent formatting exactly as they already keep independent text.

**The header grew from 7 lines to 9**: `l2` (middle left, under the date) and `c4` (middle bottom,
under the subtitles). They have no auto value, so they are **hidden until used** — `.hdr-line`
carries `min-height:14px`, and leaving them visible-but-empty would have added 28px to every
header for people who never touch them.

**Formatting is real everywhere — screen, Excel and PDF.** That is why this needed
owner-approved edits to four frozen functions (`renderSpreadsheetView`, `renderMonthView`,
`exportExcel`, `buildWaterfallPdf`). It is per **line**, not per selection, because Excel's
header/footer and the PDF writer both format per section rather than per run of characters —
inline markup would have produced a screen the exports could not reproduce.

Three things worth knowing:

- **Excel's `&B`/`&I` are toggles, not setters**, so per-line codes would have leaked into every
  following line. Each line instead states its style outright via the absolute
  `&"Calibri,<style>"` form, and resets colour explicitly — verified in a real export, where line
  2 correctly comes back to `&12&"Calibri,Bold"&K000000`.
- **Formatting costs Excel header budget.** The 255-character cap is unchanged, and codes count
  against it, so a heavily formatted header drops trailing detail lines sooner. Measured on a
  formatted 9-line header: 238 characters, inside the limit, with the existing trimmer dropping
  the last four lines exactly as it does for an over-long unformatted one.
- **Italic in the PDF is synthetic.** Only regular and bold Carlito are embedded, so italic is a
  text-matrix shear — which is how a viewer fakes a missing italic, costs no third font, and does
  not change advance widths, so every existing measurement stays valid.

**One honest gap: highlight cannot reach Excel.** An Excel header/footer has no text-background
code at all. Highlight applies on screen and in the PDF; in the workbook the line keeps its
colour and weight but no background.

**Verified.** `gate.sh` returns **byte-identical** results to the pre-change run — waterfall PDF
identical to baseline, Excel parts identical, 0 clipped cells, grid width 797, 52 rows, no console
errors — because an unformatted header emits exactly the operators and the exact header string it
emitted before. Then with formatting applied: the Excel `oddHeader` carries the codes and the new
`l2` line; the PDF draws **all nine** lines with the right font, size, colour, oblique and a
highlight rect.

### Unreleased — the remove buttons showed two × instead of one

Three buttons — remove custom phase, remove hiatus, delete custom holiday — rendered **`××`**.

The design is sound: the engine emits a `&times;` text character, `font-size:0` hides it, and a
`::before` paints the × as masked geometry so it centres exactly (a text `&times;` sits on a
baseline and never does). Two later rules broke it by re-setting `font-size` on the same elements,
un-hiding the text so it sat beside the drawn glyph:

- `.custom-phase-header .icon-btn{font-size:14px}` — **wins on specificity** (0,2,0 vs 0,1,0)
- `.hv-del{font-size:13px}` — **wins on source order** (same 0,1,0, declared later)

Both `font-size` declarations removed; the geometry they also set is kept. **This is the third time
this exact trap has cost this project time** — `button.primary` over `.tb-btn` was the first
(PROJECT-CONTEXT §12). The rule worth remembering: *when one rule hides text so a pseudo-element
can replace it, nothing later or more specific may set `font-size` on that element.* Both fixes
carry a comment saying so.

Verified on the build: all three buttons compute `font-size: 0px` with a mask present, and render
exactly one glyph.

### Unreleased — descriptions became hover cards, and the fake drag handle is gone

**The six-dot grab handle on custom phase rows is removed.** It was added 29 Aug as a visual-only
placeholder and it promised drag-to-reorder that does not exist — with `cursor:grab` making the
promise twice. An affordance for an unbuilt feature is a bug, not a preview. If reordering is ever
built (it is save-format territory: `customPhaseDefs` order, `PHASE_CHAIN`) the handle comes back
*with* the behaviour. Verified: 0 elements with `cursor:grab`, no CSS rule mentioning it, and the
`::before` resolves to `content: none`.

**Every always-visible description is now a Mantine `HoverCard` behind a small grey "i".** Eight of
them — Production Region, Holidays, Export App With Data, All-phase hiatus, and the four calendar
tools (Shift All, Shift From, Anchor To, Rebuild From). The copy is unchanged word for word; only
*when* you see it changed. The cards were reading as documentation rather than controls, and the
paragraphs cost the sidebar most of its vertical space.

- **Descriptions only.** `#union-lock-hint`, `#custom-hol-err` and `.snap-note` stay visible —
  hiding "Locked — changing the Region would misplace your edits" behind a hover would be a real
  regression, since those appear precisely when something needs attention and attention is the one
  thing a hover doesn't get. `UI-CONVENTIONS.md` §4 had already separated explanation from warning;
  this takes only the explanation.
- **No new Mantine CSS import**, which matters because that list's order is derived from Mantine's
  own `styles.layer.css` and must never be sorted. `HoverCard` is built *on* `Popover` (it uses
  `PopoverStylesNames`/`PopoverCssVariables`), and `Popover.layer.css` was already imported.
- **`position="right"`**, not `top`: every hint sits near the top of the window, so opening upward
  put the card over the header. Right opens into the preview pane — the one direction with room —
  and Mantine's middlewares flip it when there isn't.
- **`zIndex={400}`**, not the default 300: `.tools-menu` is *also* 300, and four hints live inside
  those popovers. Equal z-index left the winner to DOM order, which favours the portal today and
  would silently stop doing so after any reorder — a hint rendering behind the thing it explains.
- The trigger is a real `<button>` so it is keyboard-reachable (HoverCard opens on focus too), and
  it carries no `id` — transient chrome never does in this codebase.

Verified in a real browser on the build: 8 hints, all `<button type="button">`, all focusable, all
`aria-label`led, none with an id; all eight descriptions' copy present verbatim; 0 leftover
`.tools-hint` or `.placeholder-note`; the Region hint opens to the right with the full original
sentence; the nested Shift From hint opens inside its popover at z-index 400 with the right text.

### Unreleased — the deploy Action, and the check script that never existed

> ✅ **Installed and live (31 Aug 2026).** Pages Source is **GitHub Actions**, and this workflow
> builds `src/` and publishes `dist/index.html`. **The Mantine build is now what users get.** The
> root `index.html` stays in the repo as the v1.2.0 legacy app — it is the rollback: flipping Pages
> Source back to "Deploy from a branch" restores it instantly, with no revert and no rebuild.

**`.github/workflows/deploy.yml`** — builds `src/` and, on request, publishes `dist/` to Pages.
This is the item `HANDOFF.md` listed as *"then the GitHub Action, and only then the cutover
conversation"*, and it is built to respect that order:

- **`build` runs on every push and PR.** `npm ci` → `npm run build` → `npm run check` →
  `tools/check-refs.py` (warn-only), then uploads `dist/index.html` as a downloadable artifact.
  Continuous verification with **zero deploy risk**.
- **`deploy` runs only on a manual `workflow_dispatch` with `deploy=true`.** Never on push.

**The live site is unchanged and stays on the v1.2.0 legacy app.** Pages is still
`build_type: legacy` serving repo root, exactly as `vite.config.js` requires until an
owner-approved cutover. Performing that cutover needs a repo **settings** change (Pages Source →
GitHub Actions) that the workflow deliberately cannot do for you — until it is done, a
`deploy=true` run fails at *Setup Pages*, which is the intended guard. The three cutover steps are
written at the top of the workflow file.

**`tools/check-build.mjs`** — written, because it did not exist. `package.json` has referenced it
since the Vite build landed and `vite.config.js` names it (*"asserts it survives the build; do not
delete that check"*), so `npm run check` had been failing with `MODULE_NOT_FOUND` and **nothing was
ever actually asserted**. It now gates 12 properties: one self-contained file with a size floor, no
unexpected external requests (the ExcelJS CDN is the only allowance), no un-inlined local assets,
`#table-wrap` and `#print-root` intact, the NUL sentinel, the Mantine chrome, the `.sptcal` format,
the ExcelJS loader, and `version.json` in step with `package.json`. Passes 12/12.

> **The NUL sentinel check is deliberately not a byte check, and that matters.** `SIM_KEY` is a NUL
> followed by `simpost`. Measured: the legacy `index.html` carries **1 literal NUL byte**, the build
> carries **0** — the minifier re-encodes it as a `\0` / `\u0000` escape. That is semantically
> identical and correct, so the check asserts a NUL-valued sentinel survives *in some form*. The
> obvious byte-level assertion `vite.config.js` implies would have false-failed on every single
> build, which is very likely why the file was easier to leave unwritten than to finish.

Also fixed: the `deploy` job copies `version.json` into `dist/` before publishing. The app polls it
*relative to itself*; it lives at the repo root, so publishing `dist/` alone would 404 that poll and
the update banner could never fire.

### Unreleased — the documentation sweep after rounds 5–7

⚠️ **Not deployed and not cut as a version. No app code changed.** Every project document was
audited against the repo as it actually stands and corrected. This is bookkeeping only in the sense
that no user sees it; three rounds of building had left the docs describing a program that no longer
exists, and several of them would have sent the next session to build something already built — or
to build it the wrong way.

**The corrections that mattered most:**

- **Two docs prescribed designs that were tried and rejected.** `UI-CONVENTIONS.md` §7 called for an
  `AppShell` and an overflow menu in the header; `AppShell` *cannot* be used (a React root that wraps
  the app breaks both print paths) and the overflow menu solved a problem the header never had — it
  was truncating labels, not wrapping. `MANTINE-MIGRATION.md` promised that four hand-rolled popovers
  would collapse into one library call; Mantine's `Popover` is disqualified here on two independently
  fatal grounds. Both now carry what was built and why the original was wrong, rather than being
  quietly deleted.
- **The layer fence was documented inverted** in two places — the app's stylesheet goes *last* and
  unlayered, not fenced into a layer — and the per-component import order is now recorded as
  derived-never-alphabetical, with the failure it caused.
- **Three docs still described the restore-test stall as flaky-under-load** and told the reader to
  re-run it standalone. That advice is a trap: the harness defaults to the *deployed* page, so the
  standalone run tests a different program and passes. All three now carry the measured cause.
- **`CLAUDE.md` gained the patterns that unblocked two "impossible" requests** — how to change frozen
  *behaviour* without editing frozen code, with the preconditions that make each one safe.
- **Corrected throughout:** the reading order, the claim that there is no build system or test runner,
  which font is embedded for which reason (Carlito feeds the frozen width model; Inter is chrome
  only), the `buildSavedHtml()` strip list, and the §2h bug status in the three docs that still
  called it open.

**And the line-number checker got its own hole closed.** `tools/check-refs.py` exists to keep line
numbers out of prose — and the audit found three sitting in prose while it reported CLEAN, because
every pattern it had required a backticked symbol next to the number, and these were written as bare
English instead — the word "line" followed by a number, with no symbol beside it.
Two of the three were also already wrong, which is the entire argument for the rule. The checker now
catches the bare English form, regression-tested against both the text that fooled it and the
legitimate numbers it must not fire on.

### Unreleased — round 7: the backlog cleared, and the app stopped phoning home

⚠️ **Not deployed and not cut as a version.** The owner's seventh round plus the buildable half of
the standing backlog (HANDOFF §2b-3 rows 3, 4, 6, 7, 40–46).

**Three bugs, one of which was losing work:**

- **The date pickers no longer destroy the edit.** Opening the pop-out calendar from *Shift From*,
  *Anchor To* or *Rebuild From* and clicking a day closed the tool popover underneath it — the
  panel is a body-level element, so the click read as "outside". The popover now survives, and
  Escape closes the picker first and the panel second instead of both at once.
- **Undo and redo are actually centred.** Round 4 fixed a text-glyph baseline; the real problem was
  that the drawn arrows sat low *inside their own viewBox* (ink centre 10.75 on a 16 box). Redrawn
  symmetrically — measured ink centre is now exactly 8.0.
- **The title's padding is even** — 28px on both sides, measured; it was 28 left and 6 right.

**The header works at every screen size.** It never overflowed or wrapped — the buttons *shrank*,
so at 1100px the labels read "Expor", "Exp", "Rese". Now no label is ever truncated: controls hold
their natural width, and space is given up in deliberate steps as the window narrows (the file chip
shrinks, then the brand name goes, then New / Save As / the secondary export become icons with
tooltips, then the status text). Save and the primary export keep their labels at every width.
Verified at 1440, 1280, 1150, 1024 and 900.

**Two long-standing backlog items, both built without touching frozen code** — which is the part
worth recording, because both were previously blocked *on* needing a frozen edit:

- **A bad start date now rings its field red**, not just the note underneath. The ring is applied
  from `update()` to the sidebar field, and asks the frozen validity function for the verdict
  rather than copying its rule.
- **The last 8 browser `alert()` popups are gone**, so every dialog in the app is now the app's
  own. They live inside the frozen export functions, so instead of editing them a function named
  `alert` is declared in the engine's own scope and shadows the global — every call site converts,
  no frozen line changes.

**And the app no longer fetches anything from the internet.** Inter is embedded (one variable font,
48 KB, replacing four downloads), so a calendar opened offline or from an emailed file measures
text exactly as it does online — which matters because those measurements set month-view row
heights that print. Verified: text widths at all four weights are *identical* to the fonts Google
was serving, and the built file makes zero external requests. Mantine's stylesheet also went
per-component, so despite adding a font the file **shrank from 1,096 KB to 983 KB**.

**One test-harness limitation found and documented, not papered over:** the gate's restore leg
fails in headless Chrome because `indexedDB.open()` there never settles — no success, no error, it
simply hangs — so the file menu is never revealed and the test times out. It behaves **identically
against the untouched deployed app**, which is what proves it is the environment and not this
work. The earlier advice to "re-run it standalone" turned out to be a trap: the harness defaults to
the *deployed* page, so a standalone pass says nothing about the build. Both facts are now written
down, with the probe that measured them.

**Fixed while verifying:** exporting a shareable copy while a notice strip was showing baked that
strip into the copy — a recipient saw a permanent banner naming someone else's file. And the test
gate's two most valuable checks (the byte-comparisons proving the frozen PDF and Excel writers
haven't moved) had been failing on every run since the baseline was cut, purely because both files
stamp today's date; they now normalise that one token and compare everything else strictly, so a
red there means something real again.

### Unreleased — round 6: fit and finish, and the note editors join the family

⚠️ **Not deployed and not cut as a version.** The owner's sixth review round (HANDOFF §2b-3
rows 34–39), plus the first slice of the standing backlog. The five fixes:

- **New / Save / Save As are equal at the longest button's own size** — a grid wrapper whose
  `1fr` auto-columns all size to the largest content (Save As defines the set at its natural
  padding), replacing round 5's hardcoded 104px. Measured 86/86/86.
- **The file chip trimmed 20%** (280 → 224; the dropdown stays 280).
- **The holiday table's header stopped colliding** — the three note columns widened to 46/46/44
  (header and row cells in lockstep) and the uppercase tracking came off the cell labels;
  "W'FALL NOTE" and "MONTH NOTE" now read as two columns instead of one jam.
- **The "Complete Show Info" warning reads as a sentence again.** The chip was `display:flex`,
  which turns the message's text-plus-`<strong>` into three independently-wrapping anonymous
  flex items — the odd columns in the owner's screenshot. Block layout with the glyph absolutely
  positioned fixes both of the engine's messages with no engine change.
- **The shift readout lands under the button that acted** — `runShift` stamps the direction on
  the group and CSS anchors "1 wk earlier" under ← and "1 wk later" under →. Verified by
  geometry both ways.

And from the backlog, **the note-popover stage (§9.5, ruled in scope) landed its core**: both
note editors wear the app's one overlay look (the file-menu/date-picker shell, token type,
chevroned Day/Size selects, 16px swatches with the primary-colored selected ring), and the
month-view editor's live bug is fixed — it now tracks its anchor on scroll and resize like its
waterfall twin, and a MutationObserver on `#table-wrap` gives it the twin's rebuild protection
*without* touching frozen `render()` (where the twin's guard lives): a rebuild re-finds the
equivalent anchor and follows it, or closes without saving. Verified live: a resize re-glues the
popover at 4px; a sidebar edit that rebuilt the grid under an open editor re-anchored it. The
note's rendered size, wrapping and shrink behaviour back in the cell are untouched — the frozen
gate run confirms it.

### Unreleased — round 5: Load, the loader-look pickers, and one icon everywhere

⚠️ **Not deployed and not cut as a version.** The owner's fifth review round, logged item by item
in HANDOFF §2b-3's master list (rows 27–33) and built the same day. What a user notices:

- **The dialogs breathe.** The app's own warning dialogs were rendering with 8px of side padding —
  `Modal` pads with the `md` *spacing* token, and the chrome's density scale redefines `md` from
  16px down to 8px, silently halving every modal's padding. Fixed once, in the theme's
  `Modal.defaultProps` (`padding:'xxl'` = 20px). Measured 8 → 20px.
- **"Open" became "Load" everywhere a user reads it** — the file-menu item, the dirty-work
  confirm ("Load another calendar?"), the permission and error alerts, the legacy-notice strip,
  and the help guide — completing the round-3 terminology rule (saving = write `.sptcal`, loading
  = open a file into the PWA). Identifiers and the `data-action="open"` engine contract
  deliberately did not change. The help's Save paragraph also stopped claiming Save writes a full
  copy of the tool — that has been `.sptcal` since v1.1.0.
- **The tool popovers' pickers look like the loader.** The phase pickers under Shift From /
  Anchor To / Rebuild From (and Anchor To's starts-on/ends-by) no longer open the OS select popup:
  `SelectPop.jsx` overlays the native selects with the file menu's look — white panel, accented
  current row, dimmed right-aligned dates. The native `<select>`s stay exactly as they were
  (`fillPhaseSelect` still owns their options; handlers still read `.value`; write-back is the
  native setter + real events — verified by watching a pick move the anchor date, and by a full
  Anchor To run through a picked phase). The panel deliberately lives *inside* `.tools-menu`: the
  engine closes all tool popovers on any click outside them, so a body-level panel would shut the
  popover on every pick.
- **The header settled.** The file chip is a fixed 280px (shows much of a real title, never
  resizes), "Save As…" lost its ellipsis (in the chrome *and* in `flashSaveBtn`'s restore string,
  which would have flashed it back), and New / Save / Save As share one 104px min-width.
- **One icon, everywhere.** The header brand mark now *is* the favicon — the red calendar tile —
  and both are instances of one source (`src/chrome/appIcon.js`); the head links carry
  placeholders that main.jsx fills at startup. The installed-PWA manifest icons and the red
  `theme-color` stay as they were, flagged as their own decision.
- **The help guide animates in** (fade + rise, 0.22s) — keyframes on the existing `.open` class,
  since a transition cannot fire across display:none; reduced-motion honoured.
- **More air between the sidebar fields** — the card stacks moved from 8px gaps to 16px.

Verified in the dev server and in the built `dist/index.html` (zero console errors; `--header-h`
unchanged at 63px; Escape closes the picker first and the popover second). **Full gate PASSED**
against `tests/baselines/2026-08-29-stage-7`: 0 horizontally clipped cells, waterfall PDF
byte-identical, every Excel part identical, `v1.0.0-saved.html` restoring to 52 rows / 154 cells /
324 pt with `fields.byId` identical at 56 ids. (One gate run first FAILED on the restore leg's
documented IndexedDB stall — it passed standalone and on a quieter re-run, exactly per the
HANDOFF §2b-3 diagnosis note.)

### Unreleased — round 4: the app's own dialogs, and the polish pass on the polish

⚠️ **Not deployed and not cut as a version.** What a user notices most: **the browser-chrome
popups are gone.** "Start a new blank calendar?", Reset All, removing a phase / hiatus / custom
holiday, the holiday-reset and recompute warnings, and recovery prompts are now the app's own
Mantine dialogs — titled, centred, with the destructive action as a red filled button, and Escape
or clicking outside always answering the safe way. Error alerts in the save/open/share/export
handlers follow. Under the hood the bridge's `dialog` entry deliberately falls back to the NATIVE
dialogs if the chrome ever fails to mount — a silent auto-confirm on a destructive action being
the one unacceptable failure. ⚠️ Eight `alert()` calls remain native on purpose: they live inside
the frozen export functions, and converting them is a frozen edit that needs its own ruling.

Also in this round, from the owner's screenshots: the episode warning chip got real padding and
line-height; **holiday rows split name and date onto two lines** (date smaller and lighter); phase
chips got more side padding; and the remove × plus undo/redo glyphs are now geometrically centred
— the × is drawn (a mask over `currentColor`, so the red hover still works) instead of a text
glyph that sat on a baseline. HANDOFF §2b-3 now carries the reconciled **master list** of every
request in the redesign arc with per-item status.

### Unreleased — round 3: chips crowned, warnings diegetic, terminology settled

⚠️ **Not deployed and not cut as a version.** The owner's third review round, itemised in
HANDOFF §2b-3 and built the same day. What a user notices: every phase chip is crowned by its
**color bar** (the full-width clickable strip is the same color changer, conforming to the chip's
corner radius) with a visual grab handle beside the name (reordering itself is deliberately not
built — it is save-format territory); the production episode warning reads as a real warning with
a drawn glyph on the amber tuple; the phase date/duration readout sits on **two rows**; remove ×
buttons centre their glyph and go red on hover; undo/redo wear drawn glyphs; the tool popovers'
phase pickers wear Mantine's chevron; **"Autosave needs a file" shows as the red badge**; the file
menu searches "**loaded** files" (new house terminology: *saving* writes a `.sptcal` locally,
*loading* opens a `.sptcal`/`.html` into the PWA); and sharing a copy moved to **Settings ▸ App ▸
Export App With Data**. Under the hood: a 600 ms accidental-retrigger guard on New / Save As /
Share / both exports, and label/text-size parity rules so Show, Settings and Phases cannot drift.

⚠️ **One line of this round is the project's first deliberate frozen-function edit**, made at the
owner's direction: the two-row readout changes one separator (` · ` → newline) inside `render()`'s
meta branch. `meta-<key>` is a write-only sidebar element no export reads, and the full gate —
waterfall PDF byte-identical, Excel parts identical, v1.0.0 restore, 56 ids — passed after it.
Also answered this round: the export filename convention is untouched, and the all-phase hiatus
never had a sidebar name field (band labels are edited on the band itself, in the calendar).

### Unreleased — the visual redesign rounds: header, navbar, blocks, split control, date pickers

⚠️ **Not deployed and not cut as a version** — same standing as the entries below. Everything here
was driven live by the owner across three review rounds on 29 Aug 2026, each verified against the
full gate before the next round started (waterfall PDF byte-identical, Excel parts identical, the
v1.0.0 fixture restoring to 52 rows / 154 cells, `fields.byId` at 56 ids, 0 clipped cells).

**The design direction, settled by iteration.** A DoubleNavbar icon rail was built to the
ui.mantine.dev reference, reviewed, and **reverted** on the owner's verdict — the horizontal
icon+label tabs won, on a white sidebar panel that now fills to the bottom of the viewport. What
stayed from that round: the thicker header (51→63px — safe because `--header-h` is measured, not
assumed) led by an **"SPT Planning Calendar"** brand mark, iconed buttons throughout (hand-drawn
inline geometry, no icon package), the right-aligned export pair with the filled **Export PDF** at
the row's end, a red-text Reset All isolated past a divider, and press/caret micro-animations
adapted from the ui.mantine.dev buttons category.

**The owner's seven-point adjustment round, all landed:** Install-as-app above the switchers; Show
info / Region / Holidays content in the **same bounded white blocks as the phase rows** (one shared
`.side-block` recipe); no more pure black — `theme.black` is the warm `#1E1D1B` the app's own scale
tops out at, and input text dropped to 12px in the 30px box (the "Reset All ratio"); Waterfall and
Month segments equal width and centred; **Shift All rebuilt as a joined split control** at the
toolbar's shared height whose centre *is* the dropdown trigger; breathing room before the save
status; one rhythm for the file menu.

**The pop-out date pickers** (owner-selected feature): every sidebar and tool-popover date field
opens a Mantine-styled calendar — the **Monday-snap week band** made visible before the click
(hover previews the week, the Monday is capped), enabled union holidays dotted red and all-phase
hiatus weeks dotted amber ("mark, never exclude"), single-day mode for the custom-holiday field.
Hand-rolled deliberately: Mantine's DateInput is controlled and would silently break restore
(UI-CONVENTIONS §2c); this popover instead writes through the native setter exactly like a
keystroke, carries no ids anywhere, gets its marker data pushed through the bridge
(`chrome.dateContext`), and is stripped from shareable copies by class.

**File menu restructured:** Open… pinned to the top, an id-less search box under it (deliberately
NOT a Mantine input — those mint random ids that would leak into every saved file), only the
recents list scrolls, and **"Export shareable copy" split out of the menu** to its own
document-delegated button.

**Two fixes along the way:** the two dead-listener conditional-render bugs (Save As…, Export
Waterfall to PDF) documented in the entry below were fixed at the start of this arc, and the
engine's export-button labels were shortened at their push site with the icon following the
engine's `primary` flag so the Month-view button truthfully shows a download glyph.

**Verified but worth restating:** the export filename convention is untouched — the workbook still
saves as `<Show Title> Planning Calendar.xlsx`; only button labels changed.

### Unreleased — the engine-generated sidebar rows: restyled to spec, deliberately not rebuilt

⚠️ **Not deployed and not cut as a version** — same standing as the entry below; the root
`index.html` and the live site are still v1.2.0.

**The decision first, because it shapes everything after it.** The phase rows, per-phase hiatus
blocks, all-phase hiatus rows, episode rows and the holiday list are generated by the engine as
HTML strings, and those generators mint the element ids that ARE the save-file format. Asked
whether to rebuild them as React components or restyle them in place, the owner chose **restyle to
spec** (29 Aug 2026, the recommended option). The deciding finding: the settled uncontrolled-input
rule means a React rebuild renders the same native inputs CSS already styles — near-zero visual
gain — while the restore path (`applyStateSnapshot` rebuilds rows, re-keys ids and writes values
in one synchronous tick) and undo/redo would sit squarely in the blast radius, and the acceptance
gate covers none of the custom-phase path a rebuild most endangers.

**What changed for a user:** the last visibly-legacy controls now match the Mantine chrome. Every
sidebar checkbox (hiatus locks, per-phase hiatus toggles, holiday enable/note boxes, sim-post) is
drawn as Mantine's Checkbox — primary fill, white check — instead of a native accent box; native
number-spinner arrows are gone (every count is typed, not stepped); the holiday rows dropped ~7
inline style declarations each for one stylesheet block in the ui.mantine.dev table idiom; the
episode inputs lost their private second input size; the "+ Add phase" / "+ Add hiatus period"
buttons stopped being beaten by a leftover legacy rule that had silently outranked their Mantine
restyle the whole time; the × remove buttons stopped rendering their glyph in Arial; and the last
IBM Plex Mono references went — the readouts now use the system mono stack and the Google Fonts
request is Inter-only.

**Two real bugs fixed in the Mantine build, both the same shape:** `Save As…` and
`Export Waterfall to PDF` were rendered *conditionally* by React, but the engine captures both by
`getElementById` at evaluation time and binds their click listeners through that capture. Save As
started invisible, so its capture was null and the button appeared later fully dead; the export
button started visible, so it worked — until one Month↔Waterfall round-trip remounted a new node
and orphaned the listener. Both are now always rendered with visibility carried by
`display`, the same rule `#file-menu-wrap` already documented. Verified in a real browser: the
export button is the identical node after a round-trip, and Save As is present at load.

**What was verified** (all against the built `dist/index.html`): the full gate passes — waterfall
PDF byte-identical, Excel parts identical, 0 horizontally clipped cells, the real v1.0.0 calendar
restoring to 52 rows / 154 cells / 324 pt with `fields.byId` unchanged at 56 ids, 0 console
errors; a hand-run `fence.js` diff shows every frozen `#table-wrap` computed style identical
between the deployed page and the build; and in a live browser: custom phase add mints
`name/start/weeks/phiatus-*-custom1` correctly and remove works, hiatus rows add/remove, holiday
note toggles re-render and apply, and the sim-post block behaves.

**Harness honesty fixes:** `gate.sh`'s header claimed it ran the fence (it never did — the comment
now says to run it by hand and how); its lost/gained id diagnostic was dead code behind a
wrong-type guard and now prints lost/gained/changed ids on a `fields.byId` failure; and the
date-pinned baseline is now called out in the header — the Excel/PDF legs false-fail from any date
after 2026-08-29 because both embed the export date.

### Unreleased — the Mantine chrome: build, header, preview toolbar, sidebar

⚠️ **Not deployed and not cut as a version.** The live site and the repo's `index.html` are still
v1.2.0 and are byte-identical to `releases/v1.2.0.html`. This work builds from a new `src/` into
`dist/index.html` and deliberately leaves the root file alone — `main` auto-deploys it, so a
source-only `index.html` at the root would break the live site the moment anyone pushed.

**What changed for a user:** the app looks like a different application, and behaves like the same
one. The header, the preview toolbar and the sidebar are rebuilt on Mantine — real keyboard
navigation and Escape in the file menu, one button system instead of six looks, one field system
instead of 166 hand-written inline style declarations, and every phase reading as its own card.
The calendar itself — the waterfall, the month view, both exports — is untouched, deliberately and
verifiably.

Three real bugs fell out of the work: the custom-holiday **name field was functionally zero-width**
on a small laptop (16 px, of which 14 was its own padding); undo and redo were the app's two
most-used disabled controls and the *worst* contrast in the file at 1.72:1; and IBM Plex Mono was
being downloaded at two weights for eight sites that all render at 400.

**Why a build step at all.** React + Mantine cannot be pasted into a single file; the owner priced
that trade on 29 Aug 2026 and chose the minified build (~1.1 MB against today's 667 KB, 307 KB
gzipped) plus a GitHub Action to publish it. The single-file property survives — `dist/index.html`
is still one self-contained document that runs from `file://` — but the *shipped* file is no longer
readable source. That matters less than it used to, because Save has written 4.5 KB of `.sptcal`
JSON since v1.1.0 rather than a copy of the app.

**What is frozen and stayed frozen.** The waterfall grid, the month view, the width model and the
Excel/PDF writers are untouched. The verification is the point, not the claim: the waterfall PDF is
**byte-identical**, every part of the Excel workbook is identical (excluding its timestamp), a real
v1.0.0 saved calendar restores to the same 52 rows / 154 cells / 324 pt grid, `fields.byId` carries
the same 56 ids, horizontally clipped cells stay at 0, and every computed font, padding and box
metric inside `#table-wrap` is unchanged.

**Why the first attempt still looked old, which is the most useful thing here.** Porting the header
and toolbar changed almost nothing visible, because the sidebar is most of what you look at and it
had not been touched — and because its three cards carried **38 inline `style=` attributes, 166
declarations**, hard-coding a border, radius, padding and font-size onto every field. An inline
style beats every stylesheet rule, so no amount of restyling could reach them; only replacing the
markup could. The lesson generalises: a design system cannot be applied to markup that styles itself.

**Four things worth knowing, each found by measurement:**

- Mantine's CSS baseline reaches inside the frozen container through *type* selectors, not its
  hashed classes — `input, button, textarea, select { font: inherit }` is a shorthand, so it resets
  `line-height` on the buttons the frozen renderers emit. Three of them declared none and grew by
  3 px. They now pin `line-height: normal` explicitly. The obvious defensive assertion — "nothing
  inside the grid matches a Mantine class" — would have passed while that shipped.
- Mantine's `Popover` mounts its dropdown from an effect, so the file menu's node did not exist when
  the app's script bound its listener. The menu opened and closed perfectly while doing nothing at
  all, with no error of any kind.
- Mantine writes its own `id` over one you give a menu button. Element ids are part of this app's
  save-file format, so that class of surprise is the main hazard in the rest of this work.
- **Mantine's inputs are *controlled*, and this app restores a saved calendar by writing values
  straight into the DOM.** A controlled field ignores that write — so a saved date would save
  correctly, pass every check, and then silently not come back when you opened the file. Every field
  is therefore deliberately uncontrolled, and a real v1.0.0 calendar restoring identically is what
  proves it.

**Still legacy, and honestly so:** the Phases and All-phase hiatus card *interiors*, the holiday
list and the episode rows are **restyled, not rebuilt**. They are generated by the app as HTML
strings, by code that also mints the element ids that are the save-file format, so rebuilding them
is a separate and more careful job.

**Verified:** `tests/harness/gate.sh` — the whole acceptance gate as one command — passes after every
stage against `tests/baselines/2026-08-29-stage-7`: 0 horizontally clipped cells, the waterfall PDF
byte-identical, every Excel part identical, a real v1.0.0 saved calendar restoring to the same 52
rows / 154 cells / 324 pt grid, the same 56 field ids, 0 console errors. New: `t/fence.js` asserts
positively that computed styles inside the frozen container did not move, which no test covered
before.


### Unreleased — 29 Aug 2026 — The chrome's design system, settled before it is built

**No change to `index.html`.** This is a decision pass, written up in
[`UI-CONVENTIONS.md`](UI-CONVENTIONS.md): the Mantine design work ("Stage 2") that the migration
plan puts *before* any chrome is built. It settles the theme tokens, one feedback system to replace
the many, the component choice for every control, overlay and date picker outside the frozen
surface, and the responsive model.

**What it changes about the plan, rather than about the app.** Every Mantine claim was checked
against the installed `@mantine/core` **9.5.2** source instead of recalled, and five widely-assumed
choices turned out to break the save format silently:

- `DatePickerInput` renders a **`<button>`**, and `collectFieldValues()` sweeps `input[id]` — so
  every `start-<phase>` key would vanish from `fields.byId`. Not saved wrong: **saved not at all.**
  `DateInput` is the only viable picker, and its default `valueFormat` writes `"August 29, 2026"`
  where `parseDateUTC` expects an ISO date.
- `Select` puts the option **label** in the id-bearing input, so the region selects would save
  `"United States"` instead of `"US"`. They must be `NativeSelect`.
- Omitting `id` yields a **randomly generated** id, not none — Mantine's `useId` runs
  unconditionally. ~75 holiday checkboxes plus the note-popover controls would land in every saved
  file and every undo step, under keys that change each session. That is the exact bug the existing
  code comments say was deliberately avoided.
- `Popover` portals by default, which moves the four tool popovers' eight id'd controls out from
  under the single `.tools-menu` ancestor test that keeps them out of saved files.
- Mantine's CSS baseline reaches **five real `<button>` elements inside `#table-wrap`**; `font:
  inherit` is a shorthand that also resets `line-height`, measured at **+3 px** of button height
  *with* the `@layer` fence in place, because a layer settles priority and not matching.

**Measured, and two documented numbers corrected.** The chrome's typography turns out to be a CDN
dependency the grid's font deliberately is not — Inter and IBM Plex Mono are fetched from Google
Fonts while Carlito is embedded — and it is load-bearing for a **frozen export**: `mvNoteLineCount`
measures against Inter and its result sets month-view row heights that `exportMonthPdf` prints.
Nine visible controls render in Arial because their rules omit `font-family:inherit`. The chrome
carries 16 font sizes, 9 radii, 8 shadows for 5 same-elevation surfaces, and 40 inline `style=`
attributes holding 168 declarations. And the toolbar-wrap width recorded in two docs was wrong: the
**preview** toolbar wraps at ~1185 px (that is the 75 px-tall one), while the **header** toolbar
wraps between ~848 px and ~1018 px depending on the file name — never at 1280 px.

**Also recorded:** the owner's standing instruction that the on-screen waterfall editor keeps its
present appearance — formatting, auto-shrinking, font, size, widths and heights — unless
specifically directed otherwise. That **narrows** an earlier reading of "the editable grid could
have a reconsideration on design", and now sits in `CLAUDE.md` and `HANDOFF.md` §4 mapped onto the
symbols it actually names.

**Verified:** `python3 tools/check-refs.py` CLEAN, with `UI-CONVENTIONS.md` added to its scan.
Browser measurements taken against the running app at seven widths, with the pane fronted — an
earlier run gave a false `--header-h` staleness because `ResizeObserver` and `requestAnimationFrame`
are throttled while the pane is hidden, which is the trap PROJECT-CONTEXT §11 already records.

### v1.2.0 — 29 Aug 2026 — The app can tell you it has been updated

**The problem, measured rather than assumed.** There is no service worker (one was removed
precisely because it served a stale app forever), so the received wisdom was that a reload always
fetches the current build. Checking the live site's actual headers showed that is *nearly* true:

```
cache-control: max-age=600
etag: "6a9254a0-a18bb"
```

GitHub Pages sets a **ten-minute** browser cache. A relaunch inside that window is answered from
the browser's own HTTP cache and never learns a new deploy exists. Worse, most people run this as
an installed PWA, which they leave open and return to rather than relaunching at all — so an old
build can persist indefinitely, and shipping a fix does not mean anyone receives it.

**What now happens.** The app knows its own version (`APP_VERSION`) and compares it against a
tiny `version.json` deployed beside it. When the deployed version is genuinely newer, a blue strip
appears under the header: *"Version 1.2.1 is available — this copy is 1.2.0."* with a **Reload to
update** button.

- **It never reloads on its own.** You may be mid-edit with unsaved work, and reloading out from
  under someone is how a production plan gets destroyed. It tells you and lets you choose; the
  existing unsaved-changes guard still applies on the way out.
- **It only nags when the server is genuinely ahead.** Versions are compared numerically per
  segment, so `1.2.10` correctly beats `1.2.9` (a string comparison gets that backwards), and a
  rolled-back deploy leaves you alone rather than inviting you to "update" to an older build.
- **Dismissal is per version.** Waving away 1.2.1 does not hide 1.3.0.
- **Only the deployed app checks.** A *shareable copy* opened from `file://` is a deliberate
  frozen snapshot — telling its holder to "update" would navigate them away from the very file
  they were sent. It stays silent.
- **It gives up after three consecutive failures.** A frozen `releases/vX.Y.Z.html` resolves the
  marker relative to its own folder, where there is none and never will be; without this it would
  404 every thirty minutes forever. Any success resets the count.
- **Offline is silence,** not an error. An update check that cannot run is not worth interrupting
  anyone about.

The check runs 8 s after load, then every 30 minutes, and when the tab becomes visible again after
that long — the likeliest moment for a new deploy to have appeared under a long-lived PWA.

> ### ⚠️ `APP_VERSION` and `version.json` are ONE action, not two
> Bump them in the same commit. `version.json` alone makes every user see an update that does not
> exist; `APP_VERSION` alone makes a real update invisible. Both live at the top of their files
> with this warning attached.

**Also in this release:** the two notice strips now share one set of CSS rules and differ only in
hue — amber for *"your file is an old format"*, blue for *"the app has a newer version"*. This app
already had more warning styles than it should; a second strip built from scratch would have made
that worse. Verified the legacy strip's computed styling is byte-for-byte what it was.

**Verified:** matching versions stay silent; a newer marker raises the strip; a rolled-back marker
stays silent; a missing marker is silent and stops asking; the comparison passes 10/10 cases
including `1.2.10 > 1.2.9`; and the grid is unchanged at 157 cells / 132 filled / **0 clipped**,
identical to before the change. The grid and the exports were not touched.

> **v1.1.0 never shipped on its own.** It was changelogged and committed but never deployed or
> tagged, so v1.2.0 is the release that carries both it and this. Everything in the v1.1.0 entry
> below arrives with this version.

### v1.1.0 — 28 Aug 2026 — Save writes data, not a copy of the app

**Save and Open used to be the same file.** Save wrote `document.documentElement.outerHTML` — a
complete runnable copy of the app — with the state embedded in `<script id="saved-state">`. But
Open never read the app: it lifts that JSON out and replays it into the **running** app, so the
old file's HTML, CSS and JS is never parsed and never executed. Measured on a 10-episode calendar,
that file was **729,172 bytes of which 3,238 (0.44%) was the data**, and 44.5 KB of the rest was
the rendered grid — serialized out of the live DOM, then regenerated from state on load and thrown
away.

There are now **two formats with two different jobs**:

| | **`.sptcal`** — the calendar | **`.html`** — a shareable copy |
|---|---|---|
| Contents | the state, as JSON | the whole app, with the state in it |
| Size | **~4.5 KB** | ~695 KB |
| Written by | **Save, Save As, autosave** | File ▸ **Export shareable copy…** |
| For | working — opening, editing, saving | sending to someone who doesn't have the tool |

**Measured: a save is now 155× smaller** (4,488 vs 695,556 bytes on the same calendar).

- **Every calendar saved before this version still opens, and always will.** `parseCalendarText()`
  is the one place that reads a file: text starting with `{` is a snapshot, anything else gets the
  original `saved-state` regex. Both paths converge on the same `applyStateSnapshot()`, so there
  is no migration to get wrong.

  Verified against a **real** legacy file, not a synthesised one: `tests/fixtures/v1.0.0-saved.html`
  was generated by running the **v1.0.0 build itself** and clicking Save — 760 KB, 27 snapshot
  keys, no `version` field, grid baked in. Opened in v1.1.0 it restores every field (title, season,
  episodes, all four phase dates, week counts, region) and a **154-cell rendered grid identical to
  the one it was saved from**. Re-saved as `.sptcal` it is 4,525 bytes — **168× smaller** — and
  restores identically again. `releases/v1.0.0.html` (the app itself, whose state block is the
  literal `null`) is rejected cleanly rather than opening as an empty calendar.

- **Opening a legacy `.html` now recommends upgrading it.** A dismissible amber strip under the
  header explains that the file carries a whole copy of an old build of the app around ~3 KB of
  plan, with a **Save as .sptcal** button that runs Save As. Amber and not red on purpose: nothing
  failed, and colouring it like an error would teach people to distrust their own saved calendars.
  It is a recommendation — plain Save on a legacy file still writes `.html`, and nothing is ever
  converted without being asked.
- **Save writes back in whatever format the file already is.** Open a legacy `.html` and Save keeps
  it an `.html` — no file is silently converted.
- **The first save still always opens the save dialog**, manual or otherwise. Autosave can never
  reach that path: `showSaveFilePicker()` requires a user gesture, and writing a calendar somewhere
  the user never chose is exactly what the dialog exists to prevent. When autosave finds unsaved
  work with no file linked it now says so — *"Autosave needs a file — click Save"* — instead of
  failing silently. Work is not at risk meanwhile; the rolling IndexedDB backup has been running
  since three seconds after the first edit.
- **The shareable copy got smaller too.** It is built from a **clone** of the document, so the live
  page is never mutated, and the clone drops `#table-wrap`, `#print-root` and any open popover
  before serializing — all regenerated on load. Verified 0 bytes for each in the export.
- **Snapshots now carry a `version` field** (`SNAPSHOT_VERSION = 1`). Nothing branches on it yet;
  it exists so a future migration can ask which app wrote a file instead of sniffing for individual
  keys, which is what `migrateHolidayViewKeys()` and `normalizeRegionSelection()` have had to do.
- **Fixed along the way:** the save status waited on IndexedDB recents bookkeeping before reporting
  a write that had already succeeded — measured at ~1.2 s in a test run, long enough for an
  autosave tick to fire a second redundant write of the same bytes. `markClean()` now runs as soon
  as the bytes are on disk. Verified: status settles within 400 ms and the duplicate write is gone.

The grid and the exports were not touched. See [`HANDOFF.md`](HANDOFF.md) §7 for the full analysis
and [`CLAUDE.md`](CLAUDE.md) for the standing rule that saved calendars must keep opening forever.

### v1.0.0 — 28 Aug 2026 · `305c343` · tag `v1.0.0`

> The tag points at **`305c343`** — the commit where `index.html` was last the shipped app.
> The changelog, the rules and `releases/v1.0.0.html` were added in the commits *after* it, so
> checking out the tag gives you the v1.0.0 **app**, not this documentation. `index.html` is
> byte-identical either way.

**The last single-file build before the Mantine UI overhaul.** Frozen as the known-good baseline;
a byte-identical copy lives at [`releases/v1.0.0.html`](releases/v1.0.0.html)
(SHA-256 `0150be15e97c3ae1a670a181ab55987c9cfd3afeeb42580e13afde4fa20ffc81`).

The state of the app at v1.0.0:

- **Waterfall + month calendar** from phase start dates and durations, with the six built-in
  phases, custom phases, simultaneous post, and per-phase or all-phase hiatuses.
- **Day-level Production simulation** — shoot days, skipping weekends, hiatus days and union
  holidays for the selected region until the count is met.
- **Union-holiday data** for US (General / New York Local 52), six Canadian provinces, and the UK,
  generated from rules rather than hand-transcribed, with observed-day handling.
- **One shared column model** feeding the screen, the Excel workbook and the PDF, so all three
  finally agree. `computePhaseRowLayout()` is the single source for which phase occupies which
  column.
- **Embedded Carlito** (subset, zlib'd, 91 KB) so text measurement cannot drift.
- **Direct PDF writer** — TrueType subsetting, `/FontFile2`, WinAnsi, xref, Flate. No print dialog.
- **Excel export** via ExcelJS with explicit widths, merges and ARGB fills.
- **Direct manipulation** — drag columns and rows, autofit, shrink-to-fit, cell spans,
  double-click to return to automatic.
- **Calendar tools** — Shift All, Shift From, Anchor To, Rebuild From, Close all gaps, undo/redo.
- **Save / open** as self-contained HTML, with File System Access write-back, an IndexedDB recents
  list, a 10-minute autosave and crash recovery.

**Known limits at this version**, all documented in [`HANDOFF.md`](HANDOFF.md) §2:
the Settings menu and per-user preferences are not built; Notes is one column rather than the
reference export's label + right-aligned date; the PDF is height-bound where Excel is width-bound
(row pitch runs ~16% long); the month view still tints phase bars with the palette's text colour.

### Returning to v1.0.0

Any of these work, in increasing order of commitment:

```bash
# 1. Just look at it / run it — no git state changes at all
open releases/v1.0.0.html
```

```bash
# 2. Read a file as it was at v1.0.0, without moving the working tree
git show v1.0.0:index.html > /tmp/v1.0.0-index.html
```

```bash
# 3. Restore v1.0.0's index.html into the working tree as an uncommitted change
git checkout v1.0.0 -- index.html
```

```bash
# 4. Branch off the tag to work from it
git switch -c from-v1.0.0 v1.0.0
```

The tag is immutable and `releases/v1.0.0.html` is a byte-identical copy, so **the baseline
survives even if the working tree, `main`, or the whole build system is replaced.**
