# GRID-DIRECT-MANIPULATION-PLAN.md

**Two owner-requested direct-manipulation features for the waterfall editor: batch cell expand
(Feature 1) and grid column swap (Feature 2).**

Written Sep 2026. Self-contained: it assumes no memory of the analysis that produced it. Read
[`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) first, then this. It supersedes nothing;
it is a plan, not a record of work done.

> ⛔ **Feature 2 cannot start until the owner has signed off on grid COLUMN ORDER in writing.**
> See §3.2 and §11 D1. Feature 1 needs no sign-off and can start immediately.

> ✅ **Already decided by the owner (1 Sep 2026) — do not re-open as an open question:**
> **D2, collateral tolerance.** A swap may reflow an *unswapped* week by **at most one column**
> (allowed, previewed, reported); **two or more columns refuses the swap**. This is a decision of
> record, not a tunable default — it is what **G5 COLLATERAL** in §6.5 implements. It does **not**
> loosen **G3 WIDTH**, which stays a hard reject on any change to a block's column widths; the two
> axes were weighed separately and the reasoning is in §11 D2. Every other Dn in §11 is still open.

> ⚠️ **This document quotes no line numbers, deliberately.** `tools/check-refs.py` scans docs for
> them and the GitHub Action runs it — a number in prose fails the deploy. Every claim below names
> a symbol; `LC_ALL=C grep -ano 'symbol' src/legacy/app.js` finds it. The `-a` is mandatory:
> `src/legacy/app.js` carries embedded base64 font data, so plain `grep` calls it binary and
> returns nothing.

---

## 0. What this is, in one page

| | Feature 1 — batch expand | Feature 2 — column swap |
|---|---|---|
| Owner's words | *"highlight cells in any phase or per-phase hiatus and then drag across to expand the rows to fill across the column all together, rather than having to double click or drag each one, one by one"* | *"select an entire phase (if it is all the same row size) OR a portion of a phase … and drag it left or right … the phase next to it will swap positions perfectly"* |
| New persistent state | **None** | One store, `gridColSwaps` |
| Frozen code edited | **None** | **None** |
| Owner sign-off needed | No | **Yes — appearance convention** |
| Risk | Low | High |
| Effort | ~1 session | ~3 sessions, phased |
| Ship order | **First, on its own** | Second, Phase 1 only, then reassess |

Feature 1 is roughly a fifth of the work of Feature 2 and shares its selection model. Ship it
alone, get it in the owner's hands, and let the selection model earn its keep before betting a
column-order model on it.

---

## 1. Context

### 1.1 What the owner asked for

Two requests, given verbatim above, with one screenshot supplied for Feature 2. The screenshot's
content is confirmed:

```
row A: 'Prod Prep wk 1'      <- full width, colspan 2
row B: 'Prod Prep wk 2'      <- full width, colspan 2
row C: 'Prod Prep wk 3' | 'Casting wk 1'
row D: 'Prod Prep wk 4' | 'Casting wk 2'
row E: 'Prod Prep wk 5' | 'Casting wk 3'
row F: 'Prod Prep wk 6' | 'Casting wk 4'
row G: 'Production wk 1'     <- full width
row H: 'Production wk 2'     <- full width
```

The owner's stated target: drag Casting wks 1–4 left and swap them with Prod Prep wks 3–6, so
those four rows read `Casting wk N | Prod Prep wk N+2`, while Prod Prep wks 1–2 **stay put**.

Two semantics fall out of that, and both are load-bearing:

1. **"all the same row size" means the same CELL WIDTH (colspan)**, not the same row height. A
   contiguous run of same-colspan cells is the draggable unit. This is why wks 1–2 stay: they are
   colspan 2 and have no partner beside them.
2. **The swap is genuinely PARTIAL.** One phase must be able to occupy different columns in
   different weeks. That directly contradicts today's one-column-per-segment invariant, and it is
   the crux of the whole design.

### 1.2 Terminology, and a collision to avoid

`HANDOFF.md` already carries an **unbuilt** *phase reorder* debt: sidebar drag handles that change
`customPhaseDefs` **array order**, on which `PHASE_CHAIN` depends and which is part of the save
format. **That is a completely different feature.** Feature 2 changes nothing but which visual
column a cell renders in.

**Call this "column order" or "swap columns" everywhere** — UI copy, changelog, commits, docs — and
never "phase reorder". Shipping one will otherwise read as having shipped the other, and the next
session will act on that belief.

---

## 2. How the column model actually works today

These are the facts an implementer must hold. All verified against `src/legacy/app.js`.

### 2.1 The pipeline

```
readState() → computeSchedule(state) → [render(schedule)]
                                          ├─ computeYearBlocks(weeks)
                                          ├─ computeBlockLayout(schedule, blocks)   FROZEN
                                          ├─ sheetColumnWidths(...)                FROZEN
                                          └─ per week: computePhaseRowLayout(...)   FROZEN
                                                        └─ applyCellSpanOverrides   FROZEN
```

`computeSchedule` builds, per week, a `cells` array whose members are one of:

```js
{type:'phase',       key, label, color, textColor, col}
{type:'phaseHiatus', key, col, weekIso, defaultLabel, color, textColor, label}
{type:'hiatus',      label}      // ALL-PHASE band: no key, no col, sole cell in its week
```

plus `{simPost, simPostNum}` on the week itself.

### 2.2 `col`, and the one invariant Feature 2 must break

`col` comes from `segCol.get(ph)` — a `Map(segment → global column index)` built once **per
segment** inside `computeSchedule`, with strict start-order priority (earliest-starting phase
leftmost; a later phase may reuse a freed column only if that keeps it right of every still-running
earlier phase). So **today a phase occupies one column for its entire run.**

⚠️ **But `col` is written onto each week's cell individually**, at the two `cells.push` sites inside
the per-week loop. **A per-week column is already representable in the data model with no change to
any frozen signature.** `segCol` is the only thing making it constant.

`col` is **read in exactly two functions, five sites** — all inside `computeBlockLayout` and
`computePhaseRowLayout`, and always as an opaque identity fed through `slotMap.get(c.col)` or
`firstAppear.has(c.col)`. It is never compared for order. `renderSpreadsheetView`,
`buildWaterfallPdf`, `exportExcel` and `sheetColumnWidths` never read `.col` — only `colspan` and
`color`. `renderMonthView` never reads it at all (it reads `schedule.segments` and shoot days), so
**the month view and `exportMonthPdf` are provably unaffected by any column change.**

`schedule.maxConcurrent` is computed, returned, and **never read anywhere**. Do not remove it (it
is in the documented return shape), but nothing can act through it.

### 2.3 `computeBlockLayout` — the three constancy assumptions

Per year block it derives:

- **`blockSlotMaps[bi]`**: `Map(global col → local slot index)`, ordered by **first appearance** of
  that col anywhere in the block.
- **`blockMaxConcurrent[bi]`** (`mc`): `slotMap.size`, widened if SimPost conflicts.
- **`blockSimSlot[bi]`**: Production's slot **at its first appearance in the block**, then `break`,
  then `+1`. `-1` when no week in the block flags `simPost`.
- **`blockOccupancy[bi]`**: per slot, `Map(localWeekIndex → occupant phase key)`. All-phase hiatus
  weeks are skipped entirely. `phaseHiatus` weeks **do** mark occupancy under the phase's own key.

**THE INVARIANCE THEOREM (this is what makes Feature 2 possible at all).** `firstAppear` records,
per global col, the earliest local week in which that col appears. If a change leaves every week's
**multiset** of col values identical, then for every col value the set of weeks containing it is
unchanged, so its minimum is unchanged, so `sortedSlots`, the whole `slotMap`, and
`phaseSlots = slotMap.size` are unchanged.

**A within-week exchange of two cells' `col` values preserves that multiset exactly.** Therefore
slot identity, `mc`, the `y<year>:sN` `colWidths` key set and the `<colgroup>` are invariant **by
construction** — not by luck. This is why Feature 2's model is a *within-week transposition* and
nothing else. Any design that moves a col value into a week that did not contain it re-sorts the
whole block and silently flips weeks the user never touched.

### 2.4 `phaseRunBounds` and the collateral effect

`phaseRunBounds(occupiedSlot, localWeek)` walks contiguous **same-occupant-key** weeks in one slot.
This makes it unexpectedly robust: a mid-run column change automatically **splits** the phase into
two independent stints, each span-tested on its own terms. That is the strongest single piece of
evidence that per-week `col` is viable, and it is also the source of Feature 2's one unavoidable
side effect:

⚠️ **A partial swap can change the automatic width of weeks the user did not select.** A phase
alone in a column for ten weeks with a two-week overlap in the middle is one column wide
throughout. Swap those two weeks and its runs become `[0,4]` and `[7,9]`; both now find the
neighbour slot free for their whole run and widen to two columns. Measured over realistic phase
runs: **25.3% of eligible swaps change at least one unswapped week's layout, and 5.4% widen some
untouched row by two or more columns.** This cannot be prevented without editing frozen code — a
`cellSpans` claim can only *take* empty slots, never *narrow* a cell below its automatic span, so
there is no external lever. §6.5 gates and previews it; §11 D2 puts it to the owner.

### 2.5 `computePhaseRowLayout` — the single shared source of truth

Four consumers call it: `renderSpreadsheetView` (screen), `exportExcel`, `buildWaterfallPdf`,
`sheetColumnWidths`. Each walks its output left-to-right with a running cursor and **never indexes
by phase** — so all four follow a per-week column change automatically, with no edit. It:

- fills `bySlot[]` from `week.cells` via `slotMap.get(c.col)`;
- computes `nPhases = bySlot.filter(Boolean).length` and the even-share
  `spanCap = nPhases > 1 ? max(1, floor((mc - fixedSlots) / nPhases)) : mc`;
- grows each occupied slot's span rightward while the neighbour slot is empty **for the whole run**
  (`freeForRun`, which consumes `phaseRunBounds`);
- has a separate branch letting an **empty** run be absorbed **leftward** by the phase to its right;
- ends with `applyCellSpanOverrides(...)`.

⚠️ **The leftward-absorb branch makes a LONE phase's column change completely invisible.** A phase
that moves out of slot 0 into slot 1 re-absorbs slot 0 and paints identical pixels. So Feature 2's
gesture must only be offered where **both** slots are genuinely occupied in **every** week of the
run — otherwise the owner drags and sees nothing. The branch also **excludes** `phaseHiatus` as an
absorb target, so a per-phase hiatus band moved into an empty lane *does* visibly move. Requiring
an occupied equal-colspan partner closes both halves of that asymmetry with one rule.

### 2.6 `sheetColumnWidths` — and why the "widths don't move" claim is FALSE

`colWidths` keys are `y<year>:date`, `y<year>:s<slot>`, `y<year>:notes` — **strictly positional**.
All phase columns in a block share one `slotAuto = clampChars(pxToChars(max(labelMax)))`.

It is tempting — and two earlier drafts of this work did — to conclude that a permutation therefore
cannot move any width. **It can.** The spanned-label second pass computes
`have = sum(labelMax[k])` over **only the slots that span covers**, then tops up the shortfall
evenly. `labelMax` accumulates a per-slot **maximum** over the block, and a maximum is not
additive, so permuting one week's two contributions changes the per-slot maxima, which changes
`have`, which changes `add`, which changes `max(labelMax)`, which changes **every phase column's
width in the block**.

Worked, with real measured Carlito widths at 11pt: two weeks, `mc = 2`, one spanned cell of 100px
over both slots. Contributions `(10, 20)` and `(30, 5)`. Pre: `labelMax = [30, 20]`, `have = 50`,
`add = 25` → `[55, 45]` → `slotAuto` from 55. Swap week 1: `labelMax = [30, 10]`, `have = 40`,
`add = 30` → `[60, 40]` → `slotAuto` from 60. Measured rate over realistic layouts: **3.1% of
eligible swaps change the block's column width.**

Consequences: `gridWidthPt` moves (a gate leg), every Excel column width moves, the PDF's `cx`/`cw`
running sums and `sheetPageOrientation`'s inputs move (**the page can flip portrait↔landscape**),
and `cellTextFit` re-runs against a different `availChars` for every cell in the block — i.e. the
appearance of cells the user never touched changes, which is precisely the stated freeze boundary.

⛔ **Therefore the validation gate MUST call `sheetColumnWidths` and compare its `cols` output.
Never reason about width invariance; measure it.** Note the owner's own screenshot has spanned cells
(wks 1–2 are colspan 2), so that block *is* in the at-risk class.

**Why a WHOLE-RUN swap is nonetheless the low-risk case — an explanation, not a licence.**
The mechanism above is driven by *partial* swapping. Swap only part of an overlap and each of the two
slots ends up holding the **maximum of both phases' labels**, so `sum(labelMax)` over the covered
slots grows, which suppresses a spanned cell's top-up and lowers `slotAuto`. Swap the **whole**
overlap run and each slot's maximum is merely *relabelled* — the multiset of per-slot maxima is
unchanged, so `have`, `add` and `max(labelMax)` all land where they started. Worked against this
section's own example (contributions `(10, 20)` and `(30, 5)`, one 100px span): swapping **week 1
only** gives `[60, 40]` → width from 60, but swapping **both weeks** gives `[45, 55]` → width from 55,
identical to the pre-swap 55.
That is the real reason Feature 2 **Phase 1** (§6.8 — at least one side is a whole run, which is
precisely the owner's screenshot) is the safe increment: it is not merely a smaller feature, it is the
subset where the width mechanism above is inert.
⛔ **Do not turn this into a shortcut.** It is a two-phase, single-span argument; with three or more
concurrent phases, several spans of differing coverage, and hand-dragged `colWidths` in `pick()`, it
stops being obviously true. **G3 still runs on every swap, whole-run included.** This note explains
the risk gradient; it does not replace the measurement.

### 2.7 `applyCellSpanOverrides` and `cellSpans`

`cellSpans[weekIso + '|' + phaseKey] = {l, r, k}` — `l`/`r` are slots claimed left/right of the
phase's **own** slot; `k` is how many phases shared the row when the drag happened. A claim may
only take slots the automatic layout left **empty**, so it can never hide a phase, a band or an
active SimPost marker; a stale claim **shrinks** rather than swallowing. `slotMap` is an unused
parameter of the function — do not "clean that up", it is a frozen signature.

### 2.8 Existing direct manipulation, and the pointer budget

`installGridResizers` rebuilds `.grid-resize-layer` from scratch (`layer.innerHTML = ''`) on every
render, creating three absolutely-positioned handle kinds: `.grid-resize.is-col` (z 5),
`.is-row` (z 4, only across the date column), `.is-span` (z 6, one phase cell's left/right edge).
`beginSpanDrag` drags one edge with a `.span-preview` ghost (z 7) and on pointerup writes
`cellSpans[...]`, renders, and marks dirty. Two document `dblclick` handlers: one on
`.sheet-phase-cell` fills/un-fills, one on `.grid-resize` deletes the override.

⚠️ **Measured pointer budget on a 77px × 20px phase cell:** the four handles cover x 0–3, 4–10,
66–72, 73–76 — **22 of 77 px, 28.6%**. Free band ≈ x 11–65. In a hand-narrowed column the floor is
`charsToScreenPx(COL_MIN_CHARS)` = **20px**, at which the handles cover the **entire cell**. Any new
gesture that resolves its target from `e.target` is therefore unreachable across ~29% of every cell
and 100% of a narrow one. **Resolve geometrically with `document.elementsFromPoint`, which walks
past the `pointer-events:auto` handles.**

### 2.9 Rendered attributes — the drag contract

`renderSpreadsheetView` stamps, on a phase cell:

```
class="sheet-phase-cell" data-week data-pkey data-own data-lmin data-rmax data-a data-b data-nphases
```

⛔ **Two traps here that have each already cost a wrong diagnosis:**

1. For `kind === 'phase'`, **the entire attribute block including the class is conditional** on
   `cell.own !== undefined`. For `kind === 'phaseHiatus'`, the class
   `"sheet-hiatus-cell sheet-phase-cell"` is emitted **unconditionally** while the
   `data-own/lmin/rmax/a/b/nphases` set is conditional. **So `.sheet-phase-cell` is not proof the
   drag contract is present.** Test `Number.isFinite(+td.dataset.own)`. The existing single-cell
   dblclick survives this only by accident: `NaN` makes `!maxL && !maxR` true and it early-returns.
2. On a per-phase band, `data-week` is the **plain** week ISO and `data-pkey` is separate — to match
   the generic phase-cell drag contract. The stores (`hiatusTexts`, `hiatusColors`,
   `hiatusFontSize`, `cellSpans`) key that band as `"weekIso|phaseKey"`. `openNoteEditor`,
   `applyCellFitLive` and the cell-switch re-locate all rebuild the combined key from the two
   attributes. **New code must do the same.**

`data-lmin`/`data-rmax` are **flat slot indices within the block** (derived from `segStart` plus the
row's `emptyLeft`/`emptyRight` runs), in the same coordinate space as `data-own`. So
`maxL = own - lmin`, `maxR = rmax - own`.

### 2.10 Two structural facts that break naive implementations

- **One `<tr>` holds every year block side by side.** A geometric row/column rectangle can straddle
  two unrelated year blocks and two unrelated week ranges. **Resolve selection membership per cell
  from `data-week` + `data-pkey`, never from pixel row/column index ranges.** `rowHeights` is keyed
  by that shared row index, which is the same hazard in the row dimension.
- **Year blocks clip everything.** `slotMap`, `blockOccupancy` and `phaseRunBounds` are all
  block-local, so a range crossing 1 Jan is two independent swaps with two independent slot maps.
  Feature 2's unit is **per year block**, and it must **confine**, not straddle.

### 2.11 Event plumbing facts

- `render` does `tableEl.innerHTML = …` then `installGridResizers()` **in one synchronous task**.
  Nothing appended inside `#table-wrap` survives a render; nothing inside `.grid-resize-layer`
  survives twice over.
- `render` is called from **21 sites**, not just `update()`. A post-render hook cannot live in
  `update()`.
- A `MutationObserver` on `#table-wrap` fires **once per render**, as a microtask *after*
  `installGridResizers` has finished — so an observer-driven overlay is always drawn against fresh
  geometry and fresh handles.
- **`preventDefault()` on `pointerdown` over a grid `td` suppresses `mousedown`, `mouseup`, `click`
  AND `dblclick` entirely in Chromium.** It silently kills the note editor and dblclick-to-fill.
  Measured. Use `selectstart` instead, whose `preventDefault` leaves all four alive — and note
  **`selectstart`'s target is a TEXT NODE**, which has no `.closest`, so a naive guard never matches
  and the selection keeps happening. Hop to `parentElement` first.
- The `#table-wrap` click listener that opens the note/hiatus editor calls `e.stopPropagation()` for
  `td.sheet-note-cell, td.sheet-hiatus-cell`. **A new document bubble-phase click listener is
  therefore silently deaf to note cells and per-phase hiatus bands** — the failure that reads as
  "the gesture doesn't work on hiatus cells only".
- **The note editor commits on outside click via a document BUBBLE listener.** `render` then
  *discards* an editor whose `td` has gone, without committing. So any `stopPropagation()` from a
  document **capture** listener destroys uncommitted note/hiatus text. See §5.4.
- `captureScroll`/`restoreScroll` bracket `render`, and `restoreScroll` issues a `window.scrollBy`
  delta. **N renders in a batch means N anchor corrections and visible jitter.** One render per
  batch is correctness, not efficiency.
- **N per-cell operations are N undo steps today** (reproduced: two dblclick fills, one Undo
  reverted only one). `pushUndoSnapshot()` *before* mutating is a **flush**, not the step — it
  early-returns when nothing has changed. The step comes from `markDirty()` → `scheduleUndoPush()`'s
  500 ms debounce. The codebase's convention for a discrete action is `asOneUndoStep`:
  `pushUndoSnapshot(); fn(); pushUndoSnapshot();` — and its own comment says why (the typing-collapse
  debounce would otherwise fold consecutive actions together).

### 2.12 CSS facts

- **There is no `td.sheet-phase-cell` rule in `src/styles/legacy.css` at all.** Adding one would be
  a new frozen `.sheet-*` rule. Every highlight in this plan is therefore drawn on an **overlay**.
- The non-frozen CSS island is the `.grid-resize*` / `.grid-resize-layer` / `.span-preview` /
  `body.grid-resizing` run, sandwiched between frozen `.sheet-grid-wrap` and frozen `.sheet-scroll`,
  outside both named frozen blocks' braces (the `@media print` block closes before it). New rules go
  **there**, and none of them may match `.sheet-*`, `.mv-*` or `#print-root`. No `!important` — the
  Mantine layer fence reverses precedence for it.
- `.sheet-grid-wrap` is `position:relative; width:max-content`, inside `#sheet-scroll-container`
  which is `overflow:auto`. So an absolutely-positioned child scrolls with the grid in both axes and
  is clipped by the pane — **and can extend the pane's scroll extent if it is drawn outside the
  grid's box.**
- `touch-action` appears **nowhere** in `src/styles/legacy.css` or `src/legacy/app.js`.

### 2.13 Print / share safety

`#print-root` is rebuilt from `renderSpreadsheetView(currentSchedule)`, so anything appended after a
render **does not exist** in either print path. `buildSavedHtml`'s clone **empties `#table-wrap`**,
so an overlay hosted inside the grid needs **no** entry on the five-class strip list
(`.note-pop, .mv-note-pop, .phase-color-pop, .date-pop, .select-pop`). **This is the positive reason
to host inside `.sheet-grid-wrap` rather than at body level.** A body-level overlay would owe four
things instead: its own capture-phase scroll/resize re-placement, its own clip rect, a sixth strip
class, and direct-body-child placement or the print child combinators will not hide it.

---

## 3. Freeze verdict, per feature

### 3.1 Feature 1 — ships with NO frozen edit, and no sign-off

**Verdict: clean.** No frozen code is edited, and no frozen CSS rule is added.

Sanctioned patterns used, by name:

- **Pattern 2 — drive from outside, ASK the frozen code for the verdict.** Every `maxL`/`maxR`/
  `curL`/`curR` comes from the `data-own`/`lmin`/`rmax`/`a`/`b`/`nphases` attributes frozen
  `renderSpreadsheetView` stamped from frozen `computePhaseRowLayout`. All column boundaries come
  from **calling** frozen `spanHandleGeometry()` rather than re-walking the `<col>` widths, so there
  is no second source of truth for where a boundary is.
- **Pattern 3 — OBSERVE instead of editing.** A `MutationObserver` on `#table-wrap` rebuilds the
  overlay after every render. Observing mutates nothing.
- **Writing a state store frozen code reads** — `cellSpans`, which `applyCellSpanOverrides` already
  reads — is explicitly allowed.

**Nothing changes what a grid cell looks like or how much text fits in it.** With the per-row
contention fix in §5.5, a batch fill produces exactly the `cellSpans` values N separate
double-clicks produce, so the frozen writers see an input they could already be handed by hand.

Two non-frozen files are edited: one added line inside the `#table-wrap` click listener that opens
the note editor (§5.4), and the preview toolbar (explicitly fair game).

### 3.2 Feature 2 — NO frozen edit, but the appearance convention must be cleared

**Verdict: no frozen symbol is edited, and the feature still needs owner sign-off.** Say it exactly
that way; do not report it as "cleared".

What is true:

- `computeSchedule` and its `segCol` block are **genuinely absent** from `CLAUDE.md`'s frozen symbol
  list. Verified against the list itself: five bullets of symbols plus a CSS bullet, and
  `computeSchedule`, `computeYearBlocks`, `readState` and `update` appear in none of them.
- Every frozen symbol involved — `computeBlockLayout`, `phaseRunBounds`, `computePhaseRowLayout`,
  `applyCellSpanOverrides`, `sheetColumnWidths`, `renderSpreadsheetView`, `exportExcel`,
  `buildWaterfallPdf` — is only ever **called and read**.
- The month view and `exportMonthPdf` are provably unaffected (§2.2).

⛔ **What is also true, and must not be waved through:** `CLAUDE.md`'s first frozen bullet is
*"`#table-wrap` and everything inside it"*; the owner's 29 Aug 2026 standing convention freezes the
waterfall editor's **appearance**; and `CLAUDE.md` says outright that the three sanctioned patterns
**"do NOT license"** changing what a grid cell looks like. **A column swap changes which label
appears in which column inside `#table-wrap`.**

Feature 2 therefore rests **entirely** on the convention's *"unless given specific instructions from
the user"* escape. The owner's verbatim request is such an instruction — but:

> **STOP-AND-ASK, before any Feature 2 code.** Get sign-off in writing that **grid COLUMN ORDER may
> be user-overridable**, naming column order explicitly and distinguishing it from the sidebar
> phase-reorder debt. **Record it verbatim, with its date, in `HANDOFF.md`.** Do not let
> *"`computeSchedule` isn't on the frozen list"* stand alone as the justification — it is true and
> it is not sufficient.

**Acceptance measurement to offer with that request** (this is what `CLAUDE.md` asks for):

- `cd tests/harness && HARNESS_PAGE=/dist/index.html ./gate.sh` with **no swap in state** must move
  **nothing** — `sig`, `cols`, `gridWidthPt`, `rows`, `headers`, `hClip`, `vClip`, the waterfall PDF
  byte-compare and the Excel parts diff all identical to `tests/baselines/2026-08-29-stage-7`.
- Horizontally clipped cells: **0**, before and after a swap.
- With a swap applied: the `sig`, waterfall-PDF and Excel-parts diffs are **confined to the swapped
  weeks plus the collateral weeks the preview disclosed**, and `blockSlotMaps`,
  `blockMaxConcurrent`, `blockSimSlot` and `sheetColumnWidths(...).cols` are **byte-identical**.

### 3.3 One judgement call, stated openly

Appending an overlay `<div>` as a child of `.sheet-grid-wrap` is a DOM mutation inside
`#table-wrap`. It passes `CLAUDE.md`'s operative test — *"frozen is anything that changes what a
grid cell looks like or how much text fits in it"* — because it is `position:absolute` (out of
flow, contributes nothing to the wrap's `width:max-content`), `pointer-events:none` except for
declared hit targets, never touches a `td`, a `td` class, a `colSpan` or an inline style, and is
absent from every export. **It is also the shape frozen code already uses:** `beginSpanDrag` appends
`.span-preview` into that same subtree. Mention it when asking for the Feature 2 sign-off; do not
treat it as needing its own.

---

## 4. Adversarial findings — disposition table

Four adversarial passes produced 10 blockers, 16 distinct majors and 9 distinct minors. **All 10
blockers and all 16 majors are FIXED in this plan.** Nothing is silently dropped. Three items are
recorded as **accepted limitations** with owner questions attached.

### 4.1 Blockers — all fixed

| # | Defect | Disposition |
|---|---|---|
| B1 | Feature 1's dismiss rule clears the selection on the **first click of the double-click**, so the batch apply can never fire | **FIXED** §5.3: a bare click *inside* the live selection is a no-op; only a bare click outside dismisses. Plus §5.6 gives a toolbar button so the feature does not depend on dblclick at all. |
| B2 | `MutationObserver` with `subtree:true` writes into the subtree it observes → infinite microtask loop, tab hangs | **FIXED** §5.2: observe `{childList:true}` **only**. `render`'s `tableEl.innerHTML =` is a direct-child mutation so it still fires exactly once; writes into `.grid-sel-layer` (a descendant of `.sheet-grid-wrap`) become unobserved. A re-entrancy flag is *not* sufficient — records queued before the flag clears are still delivered. |
| B3 | Two competing designs declared **two** selection stores (`gridSel` Set vs `gridSelection` array) and **two** overlays at the same z-index in the same parent | **FIXED** §5.1: ONE store (`gridSel`, a Set of `"weekIso\|phaseKey"`), ONE layer (`.grid-sel-layer`), ONE redraw entry point. Feature 2 reads `gridSel`; it declares no selection state of its own. |
| B4 | Capture-phase `stopPropagation` (Feature 1) and the grip's `stopPropagation` (Feature 2) both kill the document bubble listener that commits an open note/hiatus editor; the next `render` then discards it → **typed text silently destroyed** | **FIXED** §5.4: never blanket-suppress a click in the grid. One added line inside the note-editor **opener** consumes a `suppressGridClick` flag *before* its own `stopPropagation`, leaving the commit listener and `closeAllPops` intact. |
| B5 | The `seat` model's reconciler assigns cols by **rank**, but `slotMap` is ordered by **first appearance**, not by col value — so a drag can move the phase in the **opposite** direction, with no error and no oracle failure | **FIXED** §6.2: the model is a **transposition of two cells' `col` values**. Exchanging cols exchanges slots through any bijection, so it is direction-agnostic. `seat` is dropped entirely. (Mapping seat→col through `blockSlotMaps` is impossible anyway: the reconciler runs inside `computeSchedule`, whose output `computeBlockLayout` consumes — that is circular.) |
| B6 | `seat` is an **absolute** index, so adding an unrelated phase to a swapped week silently reorders it (a third phase gets thrown to the far right) | **FIXED** same as B5 — a two-cell transposition leaves every other cell's `col` untouched. |
| B7 | Partner lookup used `own + d*colspan` (wrong neighbour for a left drag past a spanned cell) and did **not** require `partner.colspan === run.colspan`; measured, the swapped cells' `own`/`colspan` fail to exchange in **7.4%** of "eligible" swaps | **FIXED** §6.3: one partner rule in both directions — the segment satisfying `own + colspan === own0` (left) or `own === own0 + colspan0` (right) — **plus** a hard `partner.colspan === colspan0` test in every week, **plus** invariant **I3** as a hard reject. |
| B8 | The validation oracle checked only `blockSlotMaps`, `blockMaxConcurrent`, `blockSimSlot` — **all three provably invariant** under a within-week permutation, so it had no teeth — while the one genuinely permutation-dependent quantity, `sheetColumnWidths`' spanned-label top-up, was never checked | **FIXED** §6.5: the fingerprint **includes** `sheetColumnWidths(...).cols` and **I3** (own/colspan exchange). The three invariant checks are kept but demoted to labelled structural assertions. |
| B9 | The reconciler ran **ungated**: a Production↔Post swap accepted while Simultaneous Post was OFF becomes an `mc`-changing swap the moment SimPost is turned ON, changing the Excel column count, `printArea`, the `colWidths` key set and `gridWidthPt`, with no re-validation | **FIXED** §6.5: the gate runs from `update()` on **every** pass, not only at gesture time, so a swap that becomes illegal is rejected and **reported**. §6.4 additionally refuses the gesture up front. |
| B10 | `canSwap` re-fingerprinted *after* `applyColumnSwaps` had already reverted the bad block, so the post-call fingerprint equalled the pre-swap one, the re-diff found nothing, and the legality gate **always passed** | **FIXED** §6.4: `applyColSwapGate()` **returns** `{rejected, widened, reason, changed}`; `canSwap` reads that return value and additionally requires `changed` (or a lone-phase move, invisible via the leftward-absorb branch, is still offered). |

### 4.2 Majors — all fixed

| # | Defect | Disposition |
|---|---|---|
| M1 | Two selected cells in the **same week** both reaching into the **same** empty slot each get a full claim written; `applyCellSpanOverrides` grants it to whichever comes first and the loser's over-claim **stays in the store**, later resurrecting and moving a cell the user never touched. Destroys the "reachable by N dblclicks" safety argument | **FIXED** §5.5: resolve contention **per row, before writing**. Walk the row's selected cells left to right, clamping each one's `maxL`/`maxR` to the slots not already promised. Never write a claim the layout will not grant. |
| M2 | The batch dblclick resolved its target from `e.target`, so it is unreachable across **28.6%** of every cell (the handle bands) and **100%** of a hand-narrowed one — and in that band a dblclick performs the *opposite* single-cell action (`delete cellSpans[...]`) | **FIXED** §5.6: resolve with `hitCell()` (`document.elementsFromPoint`). Plus the toolbar button, which has no hit-test problem at all. |
| M3 | A stray press near a cell edge arms the marquee (the test was `far` **OR** "resolved to a different cell", including `null`), so a stationary double-click 1px from a boundary creates a selection instead of filling | **FIXED** §5.3: arm only when travel ≥ 10px **AND** the pointer has left the origin cell (with an unconditional arm at ≥ 24px). Do not paint marquee or chip until armed. |
| M4 | Purely geometric box intersection selects **colspan-2** rows when sweeping down one column, which then makes Feature 2's equal-colspan run test fail — the owner performs exactly the gesture they asked for and gets no grip and a wrong explanation | **FIXED** §5.3: test the cell's **own-slot column box** (from `spanHandleGeometry()`'s `colX` plus `data-own`), not the `td`'s full bounding box. §6.3: partition `gridSel` into **maximal eligible runs** and offer a move per run, reporting the ineligible remainder in the chip, rather than requiring the whole selection to be one run. |
| M5 | A **permanent** document `selectstart` suppressor scoped to `#table-wrap` removes all text selection inside the grid — you cannot drag-select a date or a note, and keyboard Shift+Arrow selection dies too. Contradicts Feature 1's own acceptance test | **FIXED** §5.3: the suppressor is added **inside** the gesture's `pointerdown`, scoped to `td.sheet-phase-cell`, and removed in the same `onUp`. `.hdr-line` (contenteditable header lines live inside `#table-wrap`), `[contenteditable]`, `input`, `textarea` excluded regardless. |
| M6 | Feature 2's **grip** was a full-run-height 11px purple rail on a column seam — visually identical to `.grid-resize.is-col`'s hover and `.is-span`'s `::after` rail (same swatch, same 3px rounded shape) 4px away, and it **covers the column boundary for every row of the run** (50–75% of it in the owner's screenshot). Click-to-swap also hijacked the documented double-click-to-autofit | **FIXED** §6.6: no rail. **One 21px circular knob per eligible direction**, centred vertically on the run, in a distinct hue, **drag-only** (12px threshold, no click-to-swap). 21px of one row instead of 11px of every row leaves the boundary grabbable. Toolbar buttons are the primary path. |
| M7 | Reverting a fingerprint violation reverted the **entire year block**, killing unrelated legal swaps in that block, silently and permanently, re-running on every keystroke, recoverable only by Reset All or hand-editing the `.sptcal` | **FIXED** §6.5: reject **per pair** (a pair revert is itself a within-week transposition, so pairs are independent), then re-diff once and confirm the survivors are clean, bounded to the pair count. **And make it observable** — a dismissible notice naming the block and the reason. |
| M8 | The fingerprint ran **twice per `update()`**, and `update()` is bound undebounced to the `input` event of every phase start/weeks field — four extra full per-week layout sweeps and two extra width models **per keystroke**, over up to `MAX_WEEKS` weeks | **FIXED** §6.5: the cheap reconciler lives inside `computeSchedule`; the **expensive gate runs once, from `update()` only**, behind a cache keyed on a structural signature. The gate is never inside `computeSchedule`, so `productionStartEndingBy`'s up-to-300-iteration backward search pays only the permutation. |
| M9 | Mirroring `cellSpans` (`{l,r} → {r,l}`) at commit time **permanently** rewrites a persisted store; when the swap later stops applying, the mirrored claim clamps to one column and the user's hand-set width is gone from the saved file with no error | **FIXED** §6.4: **never write `cellSpans` from the swap path.** Refuse the swap when either cell in any swapped week has a `cellSpans` entry with `l + r > 0`, and say so. §11 D4 offers the owner "swap and **drop** the width" as an alternative — a deleted entry falls back to the measured automatic span, which is visible and explicable; a mirrored one is a silent wrong number in a saved file. |
| M10 | Invariants **I1** (per-week multiset of kind/label/phaseKey), **I4** (`own` identical in unswapped weeks) and **I5** (`sum(colspan) === mc`) are **tautologies**. `own` is `slotMap.get(col)`; in an unswapped week `col` is unchanged and `slotMap` is invariant, so `own` cannot change — measured: **0 changes across 24,397 collateral diffs, 100% of which were colspan-only**. I4 was billed as the primary detector for the two hazards it detects neither of | **FIXED** §6.5: I4 replaced by a per-unswapped-week **colspan-sequence** diff with a magnitude threshold. The firstAppear re-sort is asserted **directly** by byte-comparing `blockSlotMaps` entries. I1 and I5 kept but explicitly labelled cheap structural sanity checks, so nobody reads five invariants as five layers of protection. |
| M11 | Collateral colspan change in unswapped weeks left **completely unbounded** — measured 25.3% of swaps, 5.4% widening an untouched row by ≥2 columns; worst reproduced case quadrupled a phase's width in two rows the user never touched | **FIXED (gated) + owner question** §6.5: hard reject if any unswapped week's max phase colspan changes by more than 1, or if the changed-unswapped-week count exceeds the swapped-week count. Report the number and delta. The owner's screenshot survives this gate — measured zero collateral. §11 D2. |
| M12 | Collateral was previewed at **gesture time only**, but it is a function of the schedule, so any later edit re-derives it with no preview and no explanation — the waterfall silently reflows after an unrelated Show Info edit | **FIXED (disclosure)** §6.5: the gate's `widened` set is surfaced from `update()` as a notice, keyed on a structural hash so it fires once per state change rather than per keystroke. The underlying reflow is inherent (§2.4) and is an **accepted limitation**. |
| M13 | The left-partner formula appeared as `own0 − 1` in one place and `own + colspan === own0` in another; for a spanned neighbour they disagree and the `own0 − 1` form silently never offers a left drag | **FIXED** §6.3: one definition, both directions, cross-referenced. |
| M14 | `swapPairsForWeek`'s trailing 3-cycle guard is **dead code** (the `claimed` set already prevents it firing), so a real 3-cycle is **half-applied** in Map iteration order rather than dropped as documented | **FIXED** §6.2: validate the whole week's `{key → with}` map **before** building pairs — if any phase is named by more than one other, or the relation is not a set of disjoint mutual 2-cycles, return `[]` for the week. Then the trailing loop is deleted. |
| M15 | No keyboard path to either feature, and interactive grips inside an `aria-hidden` container (a WCAG 4.1.2 focusable-but-hidden trap) | **FIXED (partially) + accepted limitation** §5.6/§6.6: decorative rects in an `aria-hidden` child; the knob a `role="button" tabindex="0"` with a real label, in a non-hidden sibling. Toolbar buttons give a full keyboard path once a selection exists, plus Enter/Space to expand and Alt+Arrow to move, guarded on `document.activeElement`. **Accepted:** keyboard *entry into the grid* would need `tabindex` on `td`s, which frozen `renderSpreadsheetView` emits — out of scope. |
| M16 | Both features undiscoverable by design; Feature 1's only signpost appears *after* a selection exists; Feature 2 is a two-deep discovery chain; neither usable on touch; under `prefers-reduced-motion` a completed swap produces no confirmation at all | **FIXED (partially) + accepted limitation** §5.6/§6.6: preview-toolbar buttons (the toolbar is fair game) fix discoverability, keyboard and pointer-budget in one change; a `body.grid-cell-hover{cursor:cell}` class driven by a throttled document `pointermove` gives a legal pre-gesture affordance without a frozen `td` rule; a Help-overlay entry documents the fast paths; under reduced motion the settle rects are never created and a static confirmation chip always shows. **Accepted:** the marquee is mouse/trackpad only — a `td`-level `touch-action` rule would be frozen CSS. `touch-action:none` is added to `.grid-resize` and the knob (non-frozen selectors) so the handle and knob drags survive on touch. |

### 4.3 Minors — all addressed

| Defect | Disposition |
|---|---|
| The count chip is drawn below the last row inside an unclipped `inset:0` layer, extending `.sheet-scroll`'s scroll extent (a scrollbar that appears and vanishes with the selection) | **FIXED** §5.2: `overflow:hidden` on the layer (every child is decorative) **and** clamp the chip into the layer box, flipping above the selection when there is no room below. |
| The commit path omitted the trailing `pushUndoSnapshot()`, so a batch within 500 ms of a keystroke collapses into one undo step with it | **FIXED** §5.5/§6.4: use the `asOneUndoStep` shape — `pushUndoSnapshot(); mutate; render(); pushUndoSnapshot(); markDirty();` |
| Bumping `SNAPSHOT_VERSION` 1→2 for an append-only addition nothing branches on | **FIXED** §7.3: **do not bump.** `snap.version` is read nowhere; the constant exists so a *future* migration gets a real boundary instead of sniffing for keys. Spending it here burns that signal and makes every saved file differ for no behavioural reason. Bump it in the same commit as the first `if(snap.version < N)` branch. |
| The mutual-agreement check accepts a **self-pointer** (`W\|A → {with:'A'}`), which one hand-edited `.sptcal` turns into a silent three-phase reorder — contradicting the claimed totality | **FIXED** §6.2: add `ov.with !== c.key` to the validity test. |
| `applyStateSnapshot` sets `customPhaseCounter` only `if(typeof snap.customPhaseCounter === 'number')`, so a snapshot lacking it (after a middle custom phase was deleted) can generate a **colliding** key — and an orphaned `week\|customN` override is then adopted by a brand-new phase. Both features rely on "keys are never reused" | **FIXED, separately** §7.5: one-line hardening — take the max of the saved counter and the highest numeric suffix in `customPhaseDefs`. **Pre-existing** and already affects `cellSpans`/`hiatusTexts`/`hiatusColors`; land it as its own commit with its own changelog line, not buried in a feature. |

### 4.4 Accepted limitations (recorded, not fixed)

1. **Collateral width change in unswapped weeks is inherent.** Bounded (§6.5) and disclosed, not
   eliminated. Eliminating it requires a frozen edit to `phaseRunBounds`/`freeForRun`. §11 D2.
2. **The marquee is mouse/trackpad only.** A `td`-level `touch-action` rule is frozen CSS. The
   toolbar buttons are the touch path.
3. **No keyboard entry *into* the grid.** `tabindex` on `td`s is frozen renderer output. Keyboard
   operation begins from the toolbar.

---

## 5. Feature 1 — batch cell expand

**Goal:** select several phase and/or per-phase-hiatus cells, then perform **one** action that
expands them all, instead of one dblclick or one edge-drag per cell.

**Store:** none. `cellSpans` already carries exactly the per-cell `{l, r, k}` a batch produces, and
`applyCellSpanOverrides` reads it one row at a time. `l`/`r` are own-slot-relative and `k` is the
row's own `nPhases`, both of which necessarily differ per row — so one entry per cell is not merely
acceptable, it is **required**. **Feature 1 introduces zero new save-format surface.**

Place the new code in a new `// ---------- Multi-cell span selection ----------` section
**immediately after the second `dblclick` handler** (the `.grid-resize` autofit one), so the whole
direct-manipulation family stays together and `beginSpanDrag`/`spanHandleGeometry` are already
declared.

### 5.1 Step 1 — selection state and shared readers

```js
let gridSel = new Set();        // "<weekIso>|<phaseKey>" -- SESSION UI, never captureSnapshot()
let gridSelAnchor = null;       // last cell touched, for shift-click range
let suppressGridClick = false;  // one-shot: "the click this gesture produces must not open an editor"

const SEL_KEY = td => td.dataset.week + '|' + td.dataset.pkey;

// A per-phase hiatus band carries .sheet-phase-cell UNCONDITIONALLY while its
// data-own/lmin/rmax/a/b/nphases set is emitted only when cell.own !== undefined. So the CLASS is
// not proof the drag contract is present -- test data-own. (The single-cell dblclick survives this
// only by accident: NaN makes `!maxL && !maxR` true and it early-returns.)
const hasSpanContract = td => Number.isFinite(+td.dataset.own);

function allPhaseTds(){
  return [...document.querySelectorAll('td.sheet-phase-cell')].filter(hasSpanContract);
}
function selCells(){ return allPhaseTds().filter(td => gridSel.has(SEL_KEY(td))); }

// The single-cell dblclick's own math, factored so the batch cannot drift from it.
function spanRoom(td){
  const own = +td.dataset.own;
  return { td, own, key: SEL_KEY(td),
           maxL: own - (+td.dataset.lmin), maxR: (+td.dataset.rmax) - own,
           curL: own - (+td.dataset.a),    curR: (+td.dataset.b) - own,
           k: +td.dataset.nphases || 1 };
}
const canExpand = r => !!(r.maxL || r.maxR || cellSpans[r.key] !== undefined);

// elementsFromPoint (PLURAL): the .grid-resize handles take pointer events (z 4-6) and cover 28.6%
// of a 77px cell -- 100% of a hand-narrowed one -- so elementFromPoint returns a handle for most of
// a cell's width. This needs no CSS change and no pointer-events state to restore.
function hitCell(x, y){
  for(const el of document.elementsFromPoint(x, y)){
    const td = el.closest && el.closest('td.sheet-phase-cell');
    if(td && hasSpanContract(td)) return td;
  }
  return null;
}

// The cell's OWN-SLOT box, in client coords, from frozen spanHandleGeometry()'s colX.
// Marquee membership tests THIS, not the td's bounding box -- otherwise sweeping down one column
// silently picks up every colspan-2 cell whose box straddles it.
function ownSlotBox(td){ /* colX[flatOwn] .. colX[flatOwn+1], td's top/bottom */ }
```

⛔ `gridSel`, `gridSelAnchor` and `suppressGridClick` are **session UI**, in the same class as
`autosaveNeedsFile` and `isDirty`. **They must not enter `captureSnapshot()`** — a highlight is not
calendar data, and capturing it would bake one user's selection into another user's file and add
phantom undo steps. They are module-scope variables, not id'd DOM controls, so
`collectFieldValues()` cannot sweep them and no `.tools-menu`-style class exclusion is needed.

### 5.2 Step 2 — the overlay layer and its observer

Host it as a **sibling of `.grid-resize-layer` inside `.sheet-grid-wrap`**. That inherits the grid's
coordinate space, scrolls with `#sheet-scroll-container` in both axes, is clipped by that pane so it
can never paint over the sidebar or header, is absent from both print paths, and needs no
`buildSavedHtml` strip entry (§2.13).

```js
function ensureSelLayer(){
  const wrap = document.querySelector('.sheet-grid-wrap');
  if(!wrap) return null;
  let layer = wrap.querySelector(':scope > .grid-sel-layer');
  if(layer) return layer;
  layer = document.createElement('div');
  layer.className = 'grid-sel-layer';
  wrap.appendChild(layer);       // after .grid-resize-layer; z-index 8 > .span-preview's 7
  return layer;
}
```

`redrawGridOverlay(marquee)` is the **single** repaint entry point. It calls `ensureSelLayer()`,
prunes `gridSel` against the live DOM, then paints — for Feature 1: one `.grid-sel-cell` rect per
selected cell (`.is-inert` where `canExpand` is false, **shown rather than dropped** so the count
never lies), the marquee rect while sweeping, and the count chip. Feature 2 later adds its knobs,
ghosts and collateral rects **into the same layer** with explicit internal stacking (rects 1, ghosts
2, knobs 3, chips 4). **Do not add a second layer.**

```js
// ⛔ childList ONLY, NO subtree. render()'s `tableEl.innerHTML =` is a DIRECT-CHILD mutation of
// #table-wrap, so this still fires exactly once per render -- while every write into
// .grid-sel-layer (a descendant of .sheet-grid-wrap) becomes unobserved.
// With subtree:true this observer would see its own paint, re-enter as a microtask, and hang the
// tab. A re-entrancy flag is NOT sufficient: records queued before the flag clears are still
// delivered, so you would also need takeRecords() after every paint.
// Leave the existing month-view note-editor observer on this same node alone -- it needs
// subtree:true and writes nothing inside.
new MutationObserver(()=>{
  if(viewMode !== 'sheet'){ gridSel.clear(); gridSelAnchor = null; return; }
  redrawGridOverlay(null);
}).observe(document.getElementById('table-wrap'), { childList: true });
```

⛔ **Also call `redrawGridOverlay` from every mutation of `gridSel`**, including the clear paths. A
bare click that empties the selection does not render, so the observer will not fire and Feature 2's
knobs would stay visible and clickable for a selection that no longer exists — and clicking a stale
knob would commit a move derived from a dead run.

The prune inside the redraw is the design's **single cleanup mechanism**:

```js
const live = new Set(allPhaseTds().map(SEL_KEY));
gridSel = new Set([...gridSel].filter(k => live.has(k)));
if(gridSelAnchor && !live.has(gridSelAnchor)) gridSelAnchor = null;
```

⚠️ **This is why Feature 1 needs no entry in `resetAll()`, the 'Reset Notes & Hiatus' branch,
`applyStateSnapshot()` or `shiftCalendar()`'s re-key** — every one of those paths ends in a render,
and a retired key drops out here. **Document that**, so a later session does not "complete" the
five-site checklist and reintroduce stale keys.

Add a debounced (one rAF) `window.resize` redraw: `--header-h` can change and move the scroll pane,
and `installGridResizers` has no `ResizeObserver` either.

### 5.3 Step 3 — the marquee sweep

Bind on **document, capture phase**, so it runs before the `#table-wrap` click listener that
`stopPropagation`s note and hiatus cells (§2.11).

```js
document.addEventListener('pointerdown', e=>{
  suppressGridClick = false;                       // any new press retires a stale suppression
  if(e.button !== 0 || viewMode !== 'sheet') return;
  if(e.target.closest && e.target.closest('.grid-resize')) return;   // handles own their band
  const td = hitCell(e.clientX, e.clientY);
  if(!td) return;

  // NO preventDefault here. Measured in Chromium, preventDefault on pointerdown suppresses
  // mousedown, mouseup, click AND dblclick outright -- it would silently kill the note editor and
  // the discoverable single-cell fill. Native text selection is suppressed via selectstart, and
  // ONLY for the life of this gesture, so the 9 contenteditable .hdr-line header fields (also
  // inside #table-wrap) and the note cells' text are never touched.
  // TRAP: selectstart's target is a TEXT NODE, which has no .closest -- a naive guard never
  // matches and the selection keeps happening.
  const killSel = ev=>{
    const n = ev.target && ev.target.nodeType === 3 ? ev.target.parentElement : ev.target;
    if(!n || !n.closest) return;
    if(n.closest('.hdr-line, [contenteditable], input, textarea')) return;
    if(n.closest('td.sheet-phase-cell')) ev.preventDefault();
  };
  document.addEventListener('selectstart', killSel, true);

  const x0 = e.clientX, y0 = e.clientY;
  const shiftKey = e.shiftKey, metaKey = e.metaKey || e.ctrlKey;
  const baseSel = (shiftKey || metaKey) ? new Set(gridSel) : new Set();
  let sweeping = false;

  const onMove = ev=>{
    if(!sweeping){
      // BOTH conditions, not either. The old `far || differentCell` test armed on a 1px drift
      // across a row boundary (rows are 20px), so a stationary double-click near an edge created a
      // selection instead of filling the cell. 10px is above Chromium's own 5px drag threshold and
      // above typical trackpad press drift.
      const dist = Math.hypot(ev.clientX - x0, ev.clientY - y0);
      if(dist < 10) return;
      if(dist < 24 && hitCell(ev.clientX, ev.clientY) === td) return;
      sweeping = true;
      document.body.classList.add('grid-selecting');
    }
    const rect = { l:Math.min(x0,ev.clientX), r:Math.max(x0,ev.clientX),
                   t:Math.min(y0,ev.clientY), b:Math.max(y0,ev.clientY) };
    gridSel = new Set(baseSel);
    // Membership is GEOMETRIC but identity is data-week + data-pkey -- never row/column index
    // ranges: one <tr> holds every year block side by side, so an index range can straddle two
    // unrelated blocks and two unrelated week ranges.
    // And the box tested is the cell's OWN-SLOT box, not the td's: a colspan-2 cell spans both
    // phase columns, so a td-box test silently selects every full-width row of a DIFFERENT phase
    // when sweeping down one column -- which then makes Feature 2's equal-colspan run test fail on
    // exactly the owner's own gesture.
    allPhaseTds().forEach(c=>{
      const b = ownSlotBox(c);
      if(b.right > rect.l && b.left < rect.r && b.bottom > rect.t && b.top < rect.b) gridSel.add(SEL_KEY(c));
    });
    gridSelAnchor = SEL_KEY(td);
    redrawGridOverlay(rect);
  };

  const onUp = ()=>{ /* remove listeners; remove body class; see below */ };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}, true);
```

**`onUp`, and the rule that makes the batch reachable at all:**

```js
if(sweeping){
  // A sweep that ends back on its start cell fires a click on that td, and the note-editor opener
  // would open over the fresh selection. (A sweep ACROSS cells fires click on the <tr>, where the
  // opener's closest() is null, so only this same-cell case needs the guard.)
  suppressGridClick = true;
  redrawGridOverlay(null);
  return;
}
if(shiftKey && gridSelAnchor){ /* extend range from anchor to td */ suppressGridClick = true; }
else if(metaKey){ /* toggle SEL_KEY(td) */ suppressGridClick = true; }
// ⛔ THE FIX FOR THE PRIMARY BLOCKER. A bare click INSIDE the live selection is a no-op.
// The old rule ("a bare click dismisses") cleared gridSel on the FIRST pointerup of the
// double-click, so the batch handler's `if(!gridSel.size) return` always bailed and the frozen
// single-cell handler filled exactly one cell. The batch apply was 100% unreachable.
else if(gridSel.size && !gridSel.has(SEL_KEY(td))){ gridSel.clear(); gridSelAnchor = null; }
redrawGridOverlay(null);
```

A press that resolves to **no** phase cell (`hitCell` returns `null`) never reaches this handler, so
add the same dismissal to a separate capture-phase `click` listener if "click anywhere to dismiss"
is wanted. `Escape` clears (plain document `keydown`, no `stopPropagation` — the existing
`closeAllPops` Escape handler is harmless alongside).

### 5.4 Step 4 — suppressing the editor **without** destroying typed text

⛔ **Do not use a blanket capture-phase `click` + `stopPropagation`.** The note editor commits on
outside click via a document **bubble** listener; `render` then *discards* an editor whose `td` has
gone, without committing. Reproduced: click a per-phase hiatus band, type a new name, Cmd-click a
phase cell → the commit is swallowed, the editor stays open → batch-fill → `render` → **the typed
name is gone**, no error, no undo entry. The same swallow also skips `closeAllPops`.

**The fix is one added line in the note-editor opener** — the `#table-wrap` click listener, which is
**not** on the frozen symbol list. Insert immediately after its
`const td = e.target.closest('td.sheet-note-cell, td.sheet-hiatus-cell'); if(!td) return;` and
**before** its own `e.stopPropagation()`:

```js
// A multi-cell selection gesture that ended on this cell suppresses only the EDITOR-OPENING
// behaviour. The click then continues to bubble, so the document outside-click listener still
// commits an editor that was already open, and closeAllPops still runs. Suppressing the click
// itself (capture-phase stopPropagation) silently destroys uncommitted note/hiatus text, because
// render() drops an orphaned editor without committing it.
if(suppressGridClick){ suppressGridClick = false; return; }
```

There is no alternative that touches nothing: the suppressing gestures (sweep released on its start
cell, Cmd-click or Shift-click a per-phase hiatus band) inherently produce a click on a
note/hiatus cell, and any `stopPropagation` high enough to stop the opener also stops the commit
listener above it. One line in a non-frozen listener is the smallest correct diff. **Record the
reasoning in `HANDOFF.md`.**

### 5.5 Step 5 — the batch apply

```js
// Intent is decided ONCE for the whole batch (fill, unless every fillable cell is already filled,
// in which case pull them all back). A per-cell toggle on a mixed selection scrambles it into half
// filled / half not.
// Fill semantics with differing room: each row reaches ITS OWN maximum, never a shared minimum --
// "expand the rows to fill across the column" means every selected row becomes as wide as its own
// row allows.
function batchFill(){
  let rows = selCells().map(spanRoom).filter(canExpand);
  if(!rows.length) return false;

  // ⛔ PER-ROW CONTENTION. Two selected cells in the SAME week can both reach into the SAME empty
  // slot: data-lmin/rmax are per-cell reach as of the CURRENT render, and batchFill reads them all
  // up front. Writing both full claims stores a value applyCellSpanOverrides will never grant --
  // it awards the slot to whichever comes first and the loser's over-claim STAYS in the store,
  // later resurrecting (e.g. when the winner's override is deleted by dblclick-autofit) and moving
  // a cell the user never touched. Sequentially this is unreachable: the second dblclick would
  // have read a fresh data-lmin.
  // So: group by row, walk left to right, and clamp each cell's reach to the slots not already
  // promised. This is what makes "any state a batch can reach is reachable by N manual
  // double-clicks" TRUE, which is the whole reason Feature 1 needs no save-format work.
  rows = resolveRowContention(rows);   // may write {l:0,r:0} where nothing is left

  const allFilled = rows.every(r => r.curL === r.maxL && r.curR === r.maxR);
  pushUndoSnapshot();                          // flush the pre-batch baseline
  rows.forEach(r=>{
    cellSpans[r.key] = allFilled ? { l:0, r:0, k:r.k } : { l:r.maxL, r:r.maxR, k:r.k };
  });
  render(currentSchedule);                     // ONE render -> ONE captureScroll/restoreScroll pair
  pushUndoSnapshot();                          // asOneUndoStep shape: commit the step atomically
  markDirty();
  return true;
}
```

**Undo proof.** `pushUndoSnapshot()` before mutating is a **flush**, not the step — it early-returns
when nothing has changed. The N `cellSpans` writes push nothing; `render` pushes nothing. The
**trailing** `pushUndoSnapshot()` commits the whole batch as exactly one entry, matching
`asOneUndoStep`. Relying on `markDirty()`'s 500 ms debounce alone is not enough: a keystroke within
that window folds into the same step, and one Cmd+Z then reverts both.

Where the contention resolver drops a cell from the batch, **say so in the chip**
(`"3 of 4 can expand — two share one free column"`). Never write a claim the layout will not grant.

**Belt-and-braces alternative** if `resolveRowContention` proves fiddly: after the single `render()`,
re-read each written key's fresh `data-a`/`data-b` and rewrite `cellSpans` to the span actually
granted, deleting the key where nothing was. Costs a second render; correctness is identical.

### 5.6 Step 6 — the apply gestures, and discoverability

**Primary: a preview-toolbar button.** The toolbar is explicitly fair game, and one `<button>` fixes
discoverability, keyboard access, touch and the 28.6% pointer-budget problem at once.

- **"Expand selected cells"** — enabled when `gridSel` holds ≥1 expandable cell; label flips to
  "Pull back selected cells" when they are all already filled. Calls `batchFill()`.
- It must be a real `<button>`, **not** an id'd `input`/`select`/`textarea` — otherwise
  `collectFieldValues()` sweeps it into every saved file and adds phantom undo steps. If a future
  control must be an input, exclude it by a **class** test, never an id (the documented reason
  `.tools-menu` is matched on the class).

**Secondary: double-click any selected cell.** Extends the one gesture the code itself calls *"the
only one of the two that is discoverable without knowing the handles are there"*.

```js
document.addEventListener('dblclick', e=>{
  if(viewMode !== 'sheet') return;
  // hitCell, NOT e.target.closest: the handles cover 28.6% of a 77px cell and ALL of a narrow one,
  // and in that band the frozen `.grid-resize` dblclick handler runs instead and performs the
  // OPPOSITE action (delete cellSpans -> autofit ONE cell).
  const td = hitCell(e.clientX, e.clientY);
  if(!td) return;
  if(!gridSel.size) return;                 // no selection: the existing single-cell handler runs
  if(!gridSel.has(SEL_KEY(td))){ gridSel.clear(); gridSelAnchor = null; redrawGridOverlay(null); return; }
  e.preventDefault();
  e.stopPropagation();                      // exactly one apply, not two
  batchFill();
}, true);
```

**Keyboard**, once a selection exists: `Enter`/`Space` = expand, `Escape` = clear. Bind on document
`keydown` and **bail when `document.activeElement` is an `INPUT`/`TEXTAREA`/contenteditable** — copy
the existing guard in the Cmd+Z/Cmd+S handler.

**Pre-gesture affordance without frozen CSS:** a throttled document `pointermove` resolves a phase
cell via `hitCell` and toggles `body.grid-cell-hover`; `body.grid-cell-hover{cursor:cell}` is not a
`.sheet-*` rule and is legal.

**Help overlay:** one entry naming the marquee, Shift/Cmd-click, the double-click apply and the
toolbar button. Both existing edge gestures are already documented as undiscoverable; do not add a
third undocumented one.

The selection **survives** a batch apply, so expand → pull back → adjust is one continuous
interaction (§11 D6).

### 5.7 Step 7 — optional: the batch edge drag

The owner's literal words are *"drag across to expand"*. The marquee sweep **is** a drag across; the
apply is then a button or a double-click. A **batch edge drag** — intercepting `.grid-resize.is-span`
in the capture phase when the handle belongs to a ≥2-cell selection and dragging one edge for the
whole selection with an N-row ghost preview — is the only part of this feature that reimplements a
frozen function's snap loop on top of frozen `spanHandleGeometry()`'s `colX`.

**Recommendation: defer to Phase 1b.** Ship the marquee + button + dblclick first, confirm the
gesture reads right, then add the drag if the owner still wants it. §11 D7.

If built: same per-row contention clamp; ghosts derived from the **clamped** claims so the preview
matches the outcome; ghost `x` from each row's **own** flat colgroup index (a selection may straddle
two year blocks, each with its own `data-base`); `body.grid-resizing` gains an extra
`grid-batch-span` class so the stale-overlay rule below does not hide our own drag.

### 5.8 Step 8 — CSS

Insert into the non-frozen island, after `.span-preview` and before `.sheet-scroll`. No `.sheet-*`,
`.mv-*` or `#print-root` selector. No `!important`.

```css
/* Multi-cell span selection. Drawn on an overlay rather than as a td state, because a
   td.sheet-phase-cell rule would be NEW frozen CSS -- there is no such rule today. */
.grid-sel-layer{ position:absolute; inset:0; pointer-events:none; z-index:8; overflow:hidden; }
.grid-sel-cell{ position:absolute; box-sizing:border-box; border:2px solid rgba(112,48,160,.9);
  background:rgba(112,48,160,.14); border-radius:2px; }
/* Swept, but both neighbour slots are occupied -- nothing to expand into. Shown rather than
   dropped so the chip's count never disagrees with what the user dragged over. */
.grid-sel-cell.is-inert{ border:2px dashed rgba(112,48,160,.35); background:none; }
.grid-sel-marquee{ position:absolute; border:1px solid rgba(112,48,160,.7);
  background:rgba(112,48,160,.07); }
.grid-sel-chip{ position:absolute; z-index:12; white-space:nowrap; pointer-events:none;
  font:11px/1.4 'Inter',system-ui,sans-serif; padding:2px 7px; border-radius:10px;
  background:rgba(112,48,160,.92); color:#fff; box-shadow:0 1px 4px rgba(0,0,0,.25); }
/* A column or row drag moves the grid live through frozen repositionColHandles /
   scheduleLiveUpdate, which know nothing about this layer -- so hide it rather than let it go
   stale, reusing the class the frozen code already adds and removes. Our own batch drag is
   excluded: it repaints its ghosts itself. */
body.grid-resizing:not(.grid-batch-span) .grid-sel-layer{ display:none; }
body.grid-selecting{ user-select:none; cursor:cell; }
body.grid-cell-hover{ cursor:cell; }
```

⛔ `overflow:hidden` on the layer is **not cosmetic**: without it the chip drawn below the last row
extends `.sheet-scroll`'s scroll extent, so a scrollbar appears and vanishes with the selection.
Also clamp the chip into the layer box (flip above the selection when there is no room below) so it
is never clipped away entirely.

Do **not** add a `td.sheet-phase-cell` hover or selected rule, and do not touch the four existing
frozen cell-state rules (`td.sheet-note-cell.editing`, `td.sheet-hiatus-cell.editing`,
`td.sheet-note-cell.has-note:hover`, `td.sheet-hiatus-cell:hover`).

### 5.9 Behaviour table — write these as comments at the guards that implement them

| Case | Behaviour | Why |
|---|---|---|
| Mixed phases in one selection | Allowed; it is the owner's screenshot case | `cellSpans` is per-cell and read one row at a time; cells never interact |
| Both neighbour slots occupied | Cell shows `.is-inert`, excluded from the batch, counted in the chip | `maxL = maxR = 0` |
| **All-phase** hiatus band | Structurally unselectable | Emitted with `sheet-hiatus-cell` only — no `sheet-phase-cell`, no `data-pkey`, no `data-own`. It has no column of its own to expand into; the marquee crosses it and it stays unhighlighted |
| Note / date / empty cells | Silently skipped; their text stays selectable | Not `.sheet-phase-cell`; the `selectstart` suppressor is scoped to `td.sheet-phase-cell` |
| Per-phase band **without** `data-own` | Excluded everywhere by `hasSpanContract` | Without it `+dataset.own` is `NaN` and every downstream number is `NaN` |
| Per-phase band **with** `data-own` | Fully first-class: selectable, fills, drags | It is also a note-editor click target; that collision is resolved by `suppressGridClick`, not by excluding it |
| Differing room row to row | Each row reaches its **own** max; a drag clamps the anchor's own-relative claim per row | Never a shared minimum or maximum |
| Selection straddling two year blocks | Allowed, no special case | Each cell's `lmin`/`rmax` already reflect its own block's slot map |
| Two selected cells in one row reaching the same empty slot | Contention resolved left-to-right before writing; losers clamped and reported | §5.5 |
| Selection survives a render | Yes, by key, pruned by the observer | §5.2 |

---

## 6. Feature 2 — grid column swap

> ⛔ **Blocked on §11 D1.** Do not start until the owner has signed off on column order in writing
> and it is recorded in `HANDOFF.md`.

### 6.1 The model, and which contested design won

Two designs were on the table.

| | Store | Value | Reconciler | Verdict |
|---|---|---|---|---|
| A | `gridColSwaps` | mutual `{with: partnerKey}` — a **transposition** | post-pass after `computeSchedule`, with a `baseCol` stash | **Value shape WINS** |
| B | `colOrder` | `{seat, with}` — a **seat permutation** | inside `computeSchedule` | **Placement WINS** |

**The value: transposition wins.** Two independent blockers killed seats.

1. `seat` was *defined* as "position left to right" but can only be *implemented* as rank-by-`col`
   — and **`slotMap` is not monotonic in `col`**, because it orders by first appearance in the
   block. Reproduced with the real functions: with `slotMap = {col1→slot0, col0→slot1}` (legal
   whenever `col0` is reused after a gap), storing "move me leftmost" renders the phase on the
   **right**. The drag moves the phase the opposite way, with no error, and every invariant the
   design checked still passes. Mapping seat→col through `blockSlotMaps` is not available: the
   reconciler runs inside `computeSchedule`, whose output `computeBlockLayout` consumes — circular.
2. `seat` is **absolute**, so adding a third phase to a swapped week re-interprets it. Traced:
   swap A↔B in week W, save, reopen, add phase E starting earlier than A. `segCol` gives E `col 0`
   and pushes A,B to 1,2; both stored seats still validate; A claims 1, B claims 0, and **E — which
   the user never touched, and which by `segCol`'s own start-order rule belongs leftmost — is thrown
   to the far right.** A transposition leaves E's `col` alone.

Exchanging two `col` **values** is direction-agnostic (it exchanges slots through any bijection) and
provably a within-week permutation of exactly two values, which is what §2.3's theorem needs.

**The placement: inside `computeSchedule` wins.** Design A's stated reason for a post-pass — that
`productionEndFor` and the Anchor-To solver call `computeSchedule` directly and must see the pure
schedule — is **false, and I verified it**: `productionEndFor` reads only `sch.segments`, and
`productionStartEndingBy` only calls that. **No solver reads `week.cells` or `.col`.** Placing the
reconciler inside `computeSchedule` therefore removes the need for `baseCol` entirely, and with it a
whole class of bug: if both a post-pass *and* an in-`computeSchedule` reconciler existed, `baseCol`
would record the already-permuted column as "automatic" and bake the swap in permanently, surviving
even after both stores were cleared.

⛔ **ONE store, ONE reconciler.** Ship `gridColSwaps` and the in-`computeSchedule` reconciler. Delete
the other half from any working notes. Record the choice in `HANDOFF.md` **before** writing code —
shipping both means one drag writes both stores, the permutation applies twice, and for an adjacent
transposition applying it twice is the identity: the user drags, the animation plays, and the grid
does not move.

### 6.2 Step 1 — the store and the reconciler

Declare beside `let cellSpans = {};`:

```js
// GRID COLUMN ORDER overrides -- the user dragging one phase's cells left/right to swap
// left-to-right position with the phase beside it (owner, Sep 2026).
// NOT the sidebar phase-reorder debt in HANDOFF.md: that changes customPhaseDefs ARRAY ORDER and
// PHASE_CHAIN. This changes nothing but which visual column a cell renders in, week by week.
//
// Keyed '<weekIso>|<phaseKey>' -- byte-identical in shape to cellSpans, so splitWeekKey() parses
// it and hiatusKeyStays is the correct shift predicate with no new rule. EXACTLY two key parts:
// shiftKeyedMap splits ONE '|', so a three-part key breaks hiatusKeyStays' suffix.slice(1).
//
// Written as MUTUAL pointers: a swap of A and B in week W stores BOTH 'W|A' -> {with:'B'} and
// 'W|B' -> {with:'A'}. A pair is honoured only when both directions resolve AND both phases have a
// cell in that week -- so a ripple shift that moves one phase and not the other breaks the pair and
// the swap cleanly EVAPORATES instead of half-applying.
//
// The value is an OBJECT, not a bare string, so a later version can add a field (e.g. a sequence
// number for chained transpositions) without a format break. There is no `seat` field and there
// must never be one -- see GRID-DIRECT-MANIPULATION-PLAN.md for why.
//
// Values are immutable: applyStateSnapshot's Object.assign is shallow (matching the cellSpans
// precedent), so always assign a fresh object, never mutate one in place.
let gridColSwaps = {};
```

**Why a phase KEY and not a slot index or a global col:** `col` is an opaque identity produced by
`segCol`'s free-column reuse and shifts whenever any phase's start date changes; a local slot index
is per-year-block and means a different column in each block. A phase key is stable under both, and
under renames (the label lives in a separate `name-<key>` field).

**Pair resolution, per week — validate before building:**

```js
// Resolve gridColSwaps into the disjoint transpositions that actually apply to one week.
// Returns [[cellA, cellB], ...]. Defensive on purpose: a store that has drifted (a phase deleted,
// a duration shortened, a half-moved pair after a ripple shift) yields fewer pairs or none, never
// a wrong one.
function swapPairsForWeek(weekIso, cells){
  const byKey = new Map();
  cells.forEach(c=>{ if(c.col !== undefined && c.key) byKey.set(c.key, c); });

  // Collect declared partners first, then validate the WHOLE relation before building any pair.
  // Validating pair-by-pair is what made an earlier draft's 3-cycle guard dead code: the
  // first-come `claimed` set already prevented it firing, so a real 3-cycle was HALF-applied in
  // Map iteration order rather than dropped.
  const want = new Map();
  byKey.forEach((c, key)=>{
    const ov = gridColSwaps[weekIso + '|' + key];
    if(!ov || typeof ov !== 'object') return;
    if(typeof ov.with !== 'string') return;
    if(ov.with === key) return;                 // self-pointer: one hand-edited .sptcal would
                                                // otherwise silently reorder three phases
    if(!byKey.has(ov.with)) return;             // partner absent this week -> theorem guard
    want.set(key, ov.with);
  });
  // Must be a set of disjoint mutual 2-cycles. Anything else -> no pairs for this week.
  const named = new Map();
  for(const [k, p] of want){ named.set(p, (named.get(p) || 0) + 1); }
  for(const [k, p] of want){
    if(want.get(p) !== k) return [];            // not mutual
    if(named.get(k) > 1 || named.get(p) > 1) return [];   // a phase named by more than one other
  }
  const pairs = [], done = new Set();
  for(const [k, p] of want){
    if(done.has(k) || done.has(p)) continue;
    pairs.push([byKey.get(k), byKey.get(p)]); done.add(k); done.add(p);
  }
  return pairs;
}
```

`type:'hiatus'` all-phase bands have no `key` and no `col`, so they can never enter a pair — correct:
they render full width and `blockOccupancy` skips them. A `phaseHiatus` band **does** carry `key`
and `col`, so it pairs like a phase cell — which is required, since it stands in for its phase that
week and marks occupancy under the phase's own key.

**The reconciler**, called at the end of `computeSchedule` after the `cells` are built and both
`col: segCol.get(ph)` writes have run:

```js
// Lay the user's column-order overrides over the automatic segCol assignment.
// Total: always yields a permutation, never throws, never drops or duplicates a cell, and is the
// IDENTITY when no pair applies. Preserves each week's col MULTISET exactly, which is the
// construction-level proof that frozen firstAppear / blockSlotMaps / phaseSlots / mc cannot move.
//
// Records what it applied on the schedule (NOT persisted, and the schedule is never serialised) so
// the gate outside can revert a pair by exchanging the same two cols back -- an exchange is its
// own inverse, so no baseCol stash is needed.
function applyColSwaps(weeks){
  const applied = [];
  if(!Object.keys(gridColSwaps).length) return applied;
  weeks.forEach((w, i)=>{
    const iso = isoOf(w.date);
    swapPairsForWeek(iso, w.cells).forEach(([a, b])=>{
      const t = a.col; a.col = b.col; b.col = t;
      applied.push({ weekIdx: i, weekIso: iso, a: a.key, b: b.key });
    });
  });
  return applied;
}
```

Store the return on the schedule: `schedule.appliedColSwaps = applyColSwaps(weeks)`. It is derived
and transient — nothing serialises the schedule (verified: zero `JSON.stringify` of
`currentSchedule`/`schedule`), no consumer enumerates cell keys, and `captureSnapshot()` never
touches it.

**Stale-override reconciliation — every case degrades, none throws, none swallows a cell:**

| Drift | Outcome |
|---|---|
| Phase deleted, or its duration shortened so it no longer runs that week | Its key is absent from the week's cells → the partner's `with` check fails → **both** ignored → identity |
| Ripple shift moved one phase and not the other | Each half lands where the other is absent → identity. **This is the whole point of mutual pointers** |
| Hand-edited self-pointer or non-mutual entry | Rejected by the validity test → identity |
| A 3-cycle or any non-2-cycle relation | Whole week returns `[]` → identity |
| A `phaseHiatus` band vs its phase | They never coexist in a week (the band carries the same `ph.key`), so `week\|phaseKey` addresses whichever is present and a band travels with its phase automatically |

⛔ **Entries are never DELETED by the reconciler, only ignored — and re-honoured if the schedule
comes back.** The precedent is explicit in `applyCellSpanOverrides`: *a stale override shrinks to
whatever is genuinely free rather than being dropped outright.* Deleting would let a temporary
duration typo permanently destroy the user's work. The store is bounded by weeks × phases and is
cleared by Reset All.

### 6.3 Step 2 — the draggable unit

```js
// Given a clicked cell and a direction, the contiguous run that can move as one rigid block, or
// null. Everything it needs is already stamped on the rendered <td> by frozen
// renderSpreadsheetView (data-week, data-pkey, data-own, colSpan) -- so it never re-derives a
// layout rule, and it is DOM-observable, which is what lets the harness assert it with no test hook.
function computeSwapRun(weekIso, phaseKey, dir /* -1 left, +1 right */){ ... }
```

1. Resolve the year block containing `weekIso`. **Confine the run to that block** — slot maps,
   occupancy and `phaseRunBounds` are all block-local, so a range crossing 1 Jan is two independent
   swaps with two independent slot maps.
2. Read the seed cell's `own0` and `span0`.
3. **Identify the partner — ONE rule, both directions.** For `dir = +1`, the segment whose
   `own === own0 + span0`. For `dir = -1`, the segment whose `own + colspan === own0`.
   ⛔ **Never `own0 - 1` and never `own0 - dir*span0`.** With a spanned neighbour, `own0 - 1` points
   at a slot covered by the neighbour's span but which is not its `own`, so the left drag is
   silently never offered; and `own0 - span0` (using the *seed's* width) can select a partner two
   slots away, jumping over the actually-adjacent phase. Reproduced: a 2-wide seed at slot 2 beside
   a 1-wide phase at slot 1 paired with the phase at slot 0, and the "swap" lost the seed a column,
   gave the partner nothing, and left an empty column behind.
4. Require `partner.colspan === span0` **and** `partner.kind` ∈ {phase, phaseHiatus} **and** the
   partner slot **occupied**, in **every** week of the run. Without the equal-colspan test a
   1-wide hiatus band beside a 2-wide phase is "eligible" and the swap **doubles the band's width
   and halves the phase's**.
5. Walk local weeks up and down from the seed while all hold: the same `phaseKey` has a
   phase-or-phaseHiatus segment; its `own === own0`; its `colspan === span0`; the partner in `dir`
   exists, has `colspan === span0`, and has the **same** phase key as the seed's partner.
6. **Stop** (do not skip) at: a week where the phase is absent; a week whose only cell is a
   `type:'hiatus'` all-phase band; a week where the partner changes identity or width. Stopping at
   the all-phase band matches `phaseRunBounds`, which already breaks there. Swapping both sides of a
   band is two gestures.
7. `whole = (the run covers every week in which this phase appears in this block)`. That is the
   owner's *"the entire phase should move as a block"* — a **reporting flag**, not a second code
   path. Phase 1 requires it (§6.8).

**A full-width cell (`colspan === mc`) has no partner slot and is refused** — which is exactly why
the owner's Prod Prep wks 1–2 stay put.

**A selection is partitioned into maximal eligible runs, not tested as one run.** `gridSel` may
legitimately contain cells of two phases and two colspans; requiring the whole selection to be one
run means the owner selects "the entire phase" and gets nothing. Offer a move per eligible run and
report the remainder in the chip (`"4 of 6 cells can move — Prod Prep wks 1–2 are full width"`).

### 6.4 Step 3 — legality and commit

```js
// Would this run move cleanly? Installs the candidate store, recomputes, gates, and ALWAYS
// restores. No render happens in between, so the transient mutation is unobservable.
function canSwap(run){
  const saved = gridColSwaps;
  try {
    gridColSwaps = Object.assign({}, saved);
    run.weeks.forEach(iso=>{
      gridColSwaps[iso + '|' + run.phaseKey]   = { with: run.partnerKey };
      gridColSwaps[iso + '|' + run.partnerKey] = { with: run.phaseKey };
    });
    const trial = computeSchedule(readState());
    // ⛔ READ THE GATE'S RETURN VALUE. An earlier draft called the apply pass and then
    // re-fingerprinted -- but the pass had ALREADY reverted the bad block, so the re-diff found
    // nothing and canSwap ALWAYS returned ok. The affordance was then offered for a swap the next
    // update() would silently revert, which is precisely the "drags and sees nothing" failure.
    const res = applyColSwapGate(trial);
    return { ok: !res.rejected.length && res.changed, reason: res.reason,
             widened: res.widened, collateral: res.collateral };
  } finally {
    gridColSwaps = saved;
  }
}
```

`res.changed` is not optional: a **lone** phase's column change is invisible (§2.5), so without it
the gesture is offered where nothing will visibly happen. Reason codes:
`'no-change' | 'geometry' | 'column-width' | 'collateral' | 'width-override' | 'simpost'`, so the
indicator layer can word the refusal.

⚠️ **`canSwap` runs on SELECTION (once per direction), never per `rAF` during a drag.** Cost is one
`computeSchedule` + one gate pass per candidate over a ≤53-week block. Fine on selection; ruinous in
a pointermove loop.

**Refuse before the gate where a hand-set width is in play:**

```js
// A hand-dragged cell width is own-slot-RELATIVE, so a fill made at slot 0 becomes a claim on
// slots 1..2 after moving to slot 1, and applyCellSpanOverrides clamps it to one column -- a
// silent loss of the user's work.
// DO NOT "fix" that by mirroring {l,r} -> {r,l} in the store. cellSpans is persisted, so the mirror
// is permanent: when the swap later stops applying (partner deleted, dates reverted), the mirrored
// claim clamps to one column and the fill is gone from the saved file with no error. Refuse and say
// so; §11 D4 offers the owner "swap and DROP the width" as the alternative, because a deleted entry
// falls back to the measured automatic span, which is visible and explicable.
if(run.weeks.some(iso => {
     const a = cellSpans[iso + '|' + run.phaseKey], b = cellSpans[iso + '|' + run.partnerKey];
     return (a && a.l + a.r > 0) || (b && b.l + b.r > 0);
   })) return { ok:false, reason:'width-override' };
```

**Commit:**

```js
function commitSwap(run){
  if(!canSwap(run).ok) return false;
  commitActiveNoteEditor && activeNoteEditor && commitActiveNoteEditor();  // never lose typed text
  pushUndoSnapshot();
  run.weeks.forEach(iso=>{
    gridColSwaps[iso + '|' + run.phaseKey]   = { with: run.partnerKey };
    gridColSwaps[iso + '|' + run.partnerKey] = { with: run.phaseKey };
    // A second swap of the same phase in the same week REPLACES the pair: clear any other entry in
    // this week whose `with` names either phase, so the store never carries a one-sided entry.
  });
  // A swap that REVERSES an existing one DELETES both entries rather than storing an identity, so
  // the store stays minimal and a saved file carries no no-ops.
  update();                      // recompute (the reconciler is inside computeSchedule) + render
  pushUndoSnapshot();            // asOneUndoStep: one step for the whole run, not one per week
  markDirty();
  return true;
}
```

`update()` rather than `render(currentSchedule)`: the reconciler lives inside `computeSchedule`, so
the schedule must be rebuilt. One `update()` = one `render()` = one `captureScroll`/`restoreScroll`
pair. **Never loop `render()` per week.**

### 6.5 Step 4 — the gate: what is actually checked, and what it does on failure

```js
// The observable shape of the grid, computed by CALLING the frozen layout pipeline rather than
// re-deriving any of its rules. Reading from the frozen surface is explicitly sanctioned; a second
// copy of the span rules would be a second source of truth free to drift.
function layoutFingerprint(schedule, blocks){
  const bl     = computeBlockLayout(schedule, blocks);        // FROZEN, read-only
  const widths = sheetColumnWidths(schedule, blocks, bl);     // FROZEN, read-only
  return blocks.map((b, bi)=>({
    slots: [...bl.blockSlotMaps[bi].entries()].sort((x,y)=>x[0]-y[0]).map(([c,s])=>c+'>'+s).join(','),
    mc: bl.blockMaxConcurrent[bi],
    simSlot: bl.blockSimSlot[bi],
    // ⛔ NOT OPTIONAL. sheetColumnWidths' spanned-label top-up sums labelMax over only the slots a
    // span COVERS, and labelMax is a per-slot MAXIMUM -- and a maximum is not additive. So a
    // within-week permutation CAN change every phase column's width in the block. Measured: 3.1%
    // of eligible swaps. Compare the CLAMPED `chars` values (clampChars already rounds to 0.01),
    // which is what the colgroup and both writers actually consume -- never raw floats.
    cols: widths[bi].cols.map(c => c.key + ':' + c.chars).join(','),
    weeks: Array.from({length: b.count}, (_, local)=>{
      const wk = schedule.weeks[b.startIdx + local];
      if(wk.cells.length && wk.cells[0].type === 'hiatus') return 'HIATUS';
      return computePhaseRowLayout(wk, bl.blockMaxConcurrent[bi], bl.blockSlotMaps[bi],
                                   bl.blockOccupancy[bi], local, bl.blockSimSlot[bi])
        .map(s => [s.kind, s.phaseKey || (s.cell && s.cell.key) || '',
                   s.own === undefined ? '-' : s.own, s.colspan].join('~')).join('|');
    })
  }));
}
```

It fingerprints the output of `computePhaseRowLayout`, which **ends in
`applyCellSpanOverrides`** — so hand-dragged widths are inside the fingerprint and any clipping they
suffer is caught rather than discovered by the user.

**The checks, honestly labelled.** Of the five invariants an earlier draft proposed, **three were
tautologies** and were sold as the primary detectors:

| Check | Status | What it actually does |
|---|---|---|
| **G1 SLOT MAP** — `slots` byte-identical | **Real, hard reject** | The *direct* assertion that `firstAppear` did not re-sort. This, not "unswapped `own` is identical", is where a whole-block re-order would show up |
| **G2 GEOMETRY** — `mc` and `simSlot` identical | **Real, hard reject** | Guards the Excel column count, `printArea`, the `y<year>:sN` key set, the PDF frame |
| **G3 WIDTH** — `cols` identical | **Real, own reject reason `'column-width'`** | §2.6. Do **not** fold this into `'geometry'`: refusals here are correct but need their own message (*"swapping these would change every column width in 2026"*), or an implementer will read them as a bug |
| **G4 SWAP** — in every swapped week, the pair's `own` **and** `colspan` are exchanged | **Real, hard reject — the main teeth** | Catches the 7.4% of "eligible" swaps where the exchange does not actually happen (e.g. one side gains a column at an empty run's expense) |
| **G5 COLLATERAL** — per **unswapped** week, the **colspan sequence** | **Real, magnitude-gated** | Replaces the tautological "unswapped `own` is identical" (`own` is `slotMap.get(col)`; in an unswapped week `col` is unchanged and `slotMap` is invariant, so `own` **cannot** change — measured 0 changes across 24,397 collateral diffs, 100% of which were colspan-only). **Reject if any unswapped week's max phase colspan changes by more than 1, or if the count of changed unswapped weeks exceeds the count of swapped weeks.** Otherwise record in `widened` and report |
| S1 CONTENT — per-week multiset of `{kind, phaseKey}` | **Structural sanity only** | Labels are position-independent and no cell can be dropped or duplicated (0 across ~350k fuzzed layouts). Keep it cheap and **label it as a sanity check**, so nobody reads five invariants as five layers of protection |
| S2 TOTALS — `sum(colspan) === mc` per week | **Structural sanity only** | Guaranteed by the span loop's accounting; never fired in fuzzing |

**On failure: reject per PAIR, never per block.**

```js
function applyColSwapGate(schedule){
  const blocks = computeYearBlocks(schedule.weeks);
  const after  = layoutFingerprint(schedule, blocks);
  // `before` = the same fingerprint with the store suspended. Cached; see the perf note below.
  const before = baselineFingerprint(schedule, blocks);
  let rejected = [], widened = [], reason = null;
  // A pair revert is itself a within-week transposition, so pairs are INDEPENDENT. Reverting the
  // whole BLOCK killed unrelated legal swaps in that block, silently and permanently, re-running on
  // every keystroke, recoverable only by Reset All or hand-editing the .sptcal.
  // Reject the worst offender, re-diff, repeat -- bounded by the number of applied pairs.
  ...
  return { rejected, widened, reason, changed, collateral };
}
```

**And make rejection observable.** An earlier draft reverted silently, so a stored swap could vanish
after an unrelated edit (add a phase → `mc` changes → reject) and silently reappear when that edit
was undone, while remaining in every saved file. Surface it: a dismissible strip or preview-toolbar
chip naming the block and the reason —
*"Column order for 2027 is paused: adding Casting changed the number of columns."* On a **load** pass
specifically, either prune the rejected keys (with `suppressDirty` still true, so it costs no undo
step) or raise the notice — a swap that has become inapplicable must be visible, not an invisible
permanent tax.

**Perf — where the gate runs, and where it must not.** ⛔ The **reconciler** is inside
`computeSchedule` (cheap: a per-week two-value exchange). The **gate** runs **once, from `update()`
only** — never inside `computeSchedule`, because `productionStartEndingBy` calls `computeSchedule` up
to 300 times in a backward search and would pay 300 gates. `update()` is itself bound **undebounced**
to the `input` event of every phase start/weeks field, so cache the gate on a cheap structural key —
`weeks.length` + the joined per-week col multisets + `Object.keys(gridColSwaps).length` + a
`colWidths` revision counter — and skip it on a hit. An earlier draft ran **two** full fingerprints
per keystroke (each = one `computeBlockLayout` **plus** one `sheetColumnWidths`, which itself calls
`computePhaseRowLayout` for every week of every block), i.e. four extra per-week layout sweeps and
two extra width models per character typed, over up to `MAX_WEEKS` weeks.

**Production + Simultaneous Post.** `blockSimSlot` reads Production's slot at its **first**
appearance and `break`s, then `+1`; the conflict scan can then widen the whole block. So refuse the
gesture outright where `run.phaseKey` or `run.partnerKey` is `'production'` **and** any week in the
block flags `simPost` (reason `'simpost'`), and refuse any move that would place a phase in
`simSlot` during a `simPost` week. **But the gesture-level refusal is not sufficient on its own**: a
Production↔Post swap accepted while SimPost is **off** (`blockSimSlot` is `-1`, so Production is an
ordinary phase) becomes an `mc`-changing swap the moment SimPost is turned **on**. G2 catches it
**because the gate runs on every `update()` pass**, not only at gesture time. That is the reason the
gate cannot be gesture-time-only.

### 6.6 Step 5 — the gesture and the indicators

**Two-step, not one: select a run, then move it.** The drag never starts on a `td`, so it cannot
compete with `.is-span`, `.is-col`, `.is-row`, click-to-edit-note, dblclick-to-fill or Feature 1's
marquee.

**Primary path — preview-toolbar buttons.** `Move left ◀` / `Move right ▶`, enabled when `gridSel`
contains an eligible run in that direction. This is the fix for discoverability, keyboard access and
touch, and it removes every hit-test question. Real `<button>`s, not id'd inputs.

**Fast path — one knob per eligible direction.** ⛔ **Not a rail on the column seam.** An earlier
draft drew an 11px full-run-height purple rail there, which is visually identical to
`.grid-resize.is-col`'s hover and to `.is-span`'s `::after` rail — **same swatch, same 3px rounded
shape, ~4px apart** — so a 4px pointer difference flipped between *resize one cell's width* and
*permute two phases across four weeks*; and it **covered the column boundary for every row of the
run** (50–75% of it in the owner's screenshot), for which the only escape was an undiscoverable
Escape key. Instead:

- **One 21px circular knob**, centred vertically on the run and horizontally on the seam, carrying a
  left/right chevron, in a hue **distinct from the purple rail vocabulary** (the app already uses a
  green and a black for other handle states). 21px of one row instead of 11px of every row leaves
  the column boundary grabbable for the rest of the run.
- **Drag-only.** 12px horizontal threshold. **No click-to-swap** — a single click on a column
  boundary must never permute the schedule, and the boundary's documented
  double-click-to-autofit must keep working.
- `role="button" tabindex="0"`, real `aria-label` (*"Swap Casting with Prod Prep for weeks 3–6"*), in
  a **non-`aria-hidden`** part of the layer. The decorative rects stay in an `aria-hidden` child.
- `touch-action:none` on the knob (and on `.grid-resize` while you are there) so the drag survives on
  touch.
- Bind `pointerdown` **on the knob**, delegated from the overlay layer — not on document. This
  sidesteps the `stopPropagation` problem entirely. **Do not `stopPropagation` the knob's click**:
  it already fails the note-editor opener's `closest()` test harmlessly, and stopping it would kill
  the outside-click commit (§5.4). Existing `.grid-resize` pointerdown self-guards on
  `closest('.grid-resize')`, so a knob never matches it — zero contention, no z-index games.
- Feature 1's marquee `pointerdown` must yield: `if(e.target.closest('.grid-sel-layer')) return;`
  after its existing `.grid-resize` guard.

**Hit-test priority, as an ordered total procedure** (add this to `UI-CONVENTIONS.md`, or the next
session will re-derive it wrongly):

1. The browser decides first, by z-index + `pointer-events`. Over a phase cell: knob (z 11,
   `pointer-events:auto`, exists **only** while a swap-eligible selection is live) > `.span-preview`
   (7, none) > `.is-span` (6) > `.is-col` (5) > `.is-row` (4) > the `td`. Everything else in the
   overlay is `pointer-events:none`.
2. Knob listeners are delegated from the overlay layer, never from document.
3. The existing document `.grid-resize` pointerdown is unchanged and self-guarding.
4. Feature 1's marquee yields to both (`.grid-resize` then `.grid-sel-layer`).
5. dblclick-to-fill is untouched; a knob is not `.sheet-phase-cell`.
6. The note/hiatus opener is untouched; a knob fails its `closest()`.

**Indicators, all on the overlay:**

- **Run outline:** ONE rect per run at the union of its cells' boxes — not per-cell outlines. A
  single block outline is the owner's mental model.
- **On knob hover:** the partner run gets a dashed rect; both lean into each other; the knob nudges.
- **During the drag (past 12px):** solid ghost at the run's **post**-move rects, dashed at the
  partner's, and **dotted amber `collateral` rects on every cell outside both runs whose layout
  differs in the trial** — the honest disclosure of §2.4. Do **not** rewrite `colSpan` on live cells
  during the drag; frozen `.span-preview`'s own comment gives the reason (*rewriting `colSpan` live
  reflows the whole table on every pointermove*). Paint rects only, and throttle the trial to one
  `rAF`, skipping it when the pointer has not crossed a new seam.
- **When a run is selected but NO direction is eligible:** draw no knob and show **one chip stating
  why** (*"Swap needs a phase in the column beside it, in every week of the selection."* /
  *"Production's column can't move while Simultaneous Post is on."* / *"Clear the hand-set width on
  Prod Prep wk 3 to swap."*). **This is the single most important piece of feedback in the
  feature** — the top UX risk is a drag that appears to do nothing.
- **Settle animation:** the frozen render replaces the table synchronously, so the real cells
  teleport. Draw two `settle` rects at the **pre**-move positions in each phase's own colour at ~35%
  alpha, set a `--dx` custom property to each one's horizontal delta, and animate them across with a
  3px arc in opposite vertical directions, fading at ~180 ms. Remove on `animationend` **and** on a
  400 ms safety timeout (the element can be detached mid-animation by another render). Then redraw
  the selection outline in its new position so a second move is immediately available.
- **After a settle, chips for the two cases that need narration:** collateral
  (*"N other weeks of Prod Prep changed width — its run is now split across two columns."*) and a
  hand-dragged column width (*"Casting is now under the column width you set for Prod Prep."*).
- `@media (prefers-reduced-motion: reduce)`: suppress the nudge, the lean and the settle rects
  entirely (**do not create them**), and **always** show a static confirmation chip
  (*"Swapped Casting ↔ Prod Prep (wks 3–6)"*) for ~4 s. The precedent is the `#help-overlay` open
  animation's own reduced-motion block. A completed move must never be silent.

**Keyboard:** `Alt+ArrowLeft` / `Alt+ArrowRight` move the selected run, guarded on
`document.activeElement`.

### 6.7 Step 6 — decided behaviours

- **3+ concurrent phases:** swap only with the **immediately adjacent** occupied cell in the drag
  direction, one transposition per phase per week, disjoint pairs only. A multi-column drag (chained
  transpositions) is **out of scope for v1**; `swapPairsForWeek` returns `[]` for any non-2-cycle
  relation, so an accidental chain is a safe no-op rather than a wrong render. The `{with}` object
  leaves room for a `seq` field later without a format break.
- **`segCol`'s start-order invariant is violated on purpose.** Overriding it *is* the feature.
  Nothing mechanical breaks: `col` is read at five sites, always as an opaque identity, never
  compared for order. Two consequences to state plainly: (i) the automatic order is re-derived from
  scratch on every recompute and the override re-applies on top — that layering is correct and is
  why the override is a store rather than a mutation of `segCol`; (ii) **do not encode the override
  into `segCol` itself** — it would fight the documented invariant and it would change
  `schedule.segments`, which the Anchor-To and Rebuild-From solvers read.
- **Per-phase hiatus bands inside a run** travel with their phase automatically (the override is
  keyed by phase key, and a band carries the same key). Their `hiatusTexts`/`hiatusColors`/
  `hiatusFontSize` keys are `weekIso|phaseKey` and are untouched by a column move, so renames,
  colours and sizes survive.
- **An all-phase hiatus week** holds one `{type:'hiatus'}` cell, no key, no col;
  `blockOccupancy` skips it and `phaseRunBounds` already breaks there, so the run walk **stops** at
  it. The band still renders full width. Swapping both sides is two gestures.
- **Hand-dragged column widths stay with the POSITION, not the phase** — recommended, and not a coin
  flip. `colWidths` keys are `y<year>:s<slot>`, and a **partial** swap puts one phase in two
  different columns in different weeks, so no single column-wide width can follow it; transposing the
  two entries would be right for the swapped weeks and wrong for the rest. With no hand-dragged
  widths nothing changes at all (all phase columns in a block share one `slotAuto`). §11 D3.

### 6.8 Step 7 — **Phase 1: the smallest genuinely useful increment**

Full partial-run swap is the high-risk half. **Phase 1 restricts the gesture to runs where at least
one side is a WHOLE run within the block** (`run.whole === true` for the seed or the partner).

Why that is the right cut, and why it still delivers the owner's screenshot:

- The owner's example **is** this case. Casting's entire run in the block is weeks 3–6, so
  "swap Casting's whole run with the four Prod Prep weeks beside it" is a whole-run swap on one side.
- **Collateral is bounded to the other side's split**, which in the screenshot is magnitude 1 and
  measured **zero** in the pre-state (wks 1–2 are already hand-filled). G5's magnitude gate keeps it
  ≤1 elsewhere.
- No third phase can be displaced (transposition), and no `mc` change is reachable (G2).
- ⚠️ **Phase 1 still needs G3.** Do **not** assume `mc === 2` makes widths safe: the spanned-label
  top-up breaks invariance at `mc = 2` too (§2.6 worked example is `mc = 2`), and the owner's own
  block contains spanned cells.

Phase 2, only if the owner asks: arbitrary partial runs, with the collateral preview and the
magnitude gate already built.

---

## 7. Save-format contract

`captureSnapshot()` is **the** compatibility contract and the **single** definition of state: the
save file, the shareable copy, the crash backup, undo **and** redo all read that one literal. So
adding one key there wires five consumers at once and there is no second literal to keep in sync.

### 7.1 Feature 1 — nothing to do

**Zero new save-format surface.** `cellSpans` is already in `captureSnapshot()`, already restored
unconditionally in `applyStateSnapshot()`, already cleared by `resetAll()`, already **deliberately
excluded** from the 'Reset Notes & Hiatus' branch as layout-not-notes, and already re-keyed by
`shiftCalendar()` via `shiftKeyedMap(cellSpans, days, hiatusKeyStays)`. A batch fill is N of the
writes that store already accepts — **and with §5.5's contention resolver, N writes the frozen
reader could already be handed by N manual double-clicks.** Nothing to migrate.

`gridSel` / `gridSelAnchor` / `suppressGridClick` **must not be added anywhere.** §5.2 explains why
they need no reset/shift/restore entry (the observer prune) — **document that, so nobody "completes"
the checklist later.**

### 7.2 Feature 2 — `gridColSwaps`, nine sites

| # | Site | What to do |
|---|---|---|
| 1 | Declaration, beside `let cellSpans = {};` | `let gridColSwaps = {};` with the §6.2 comment |
| 2 | `captureSnapshot()` literal | **Append** `gridColSwaps`, in the layout group next to `cellSpans`. Append only — never rename, remove or repurpose an existing key |
| 3 | `applyStateSnapshot()` | **UNCONDITIONAL** reassign in the documented shape: `gridColSwaps = (snap.gridColSwaps && typeof snap.gridColSwaps === 'object') ? Object.assign({}, snap.gridColSwaps) : {};` ⛔ **The `: {}` branch is the whole point.** `if(snap.x) x = snap.x` leaves the *previous* file's column order on this one |
| 4 | `resetAll()` | Add to `colWidths = {}; rowHeights = {}; cellSpans = {};`. Column order is **layout-class**. `newFile()` reuses `resetAll()`, so there is no second full-reset list |
| 5 | **'Reset Notes & Hiatus'** branch | ⛔ **DELIBERATELY NOT ADDED** — layout, not notes, matching the existing comment that those three stores are *"layout, not notes"*. **Say so in a comment**, so the omission reads as a decision |
| 6 | `shiftCalendar()` | `gridColSwaps = shiftKeyedMap(gridColSwaps, days, hiatusKeyStays);` immediately after the `cellSpans` line, sharing its comment. `hiatusKeyStays` is correct because the key is phase-owned; `isPinnedWeek` is **explicitly wrong** (that guard is about date-pinned notes). `splitWeekKey()` parses the composite key — **bypassing it is a shipped mid-shift `RangeError`**, because `parseDateUTC()` on a whole composite key returns a truthy Invalid Date rather than null. No `merge` fn: last-writer-yields matches `cellSpans`, and the mutual-pointer check drops any inconsistent survivor |
| 7 | `SNAPSHOT_VERSION` | ⛔ **Do NOT bump.** §7.3 |
| 8 | `buildSavedHtml()` strip list | **No change** — and assert why in a comment: the clone empties `#table-wrap`, so an overlay hosted inside the grid cannot travel into a shareable copy. This is the positive reason for that host choice |
| 9 | `collectFieldValues()` / `reflectFieldsToAttributes()` | **No change** — module-scope store, no DOM id. Any future id'd control must be a `<button>` or be excluded by a **class** test (never an id) |

Plus: the reconciler at the end of `computeSchedule` (§6.2), and the gate called once from
`update()` (§6.5).

### 7.3 Why `SNAPSHOT_VERSION` stays at 1

`snap.version` is read **nowhere** today. The constant's own comment says it exists *so a future
migration can ask "which app wrote this?" instead of sniffing for individual keys.* Spending the
bump on an append-only addition that needs no migration (absent key → `{}`) burns that signal: the
next feature that genuinely needs a boundary will find v2 already means two unrelated things and
will have to sniff for keys anyway — the exact failure the constant was created to avoid. It also
makes every saved file differ from every pre-bump file for no behavioural reason, which breaks
byte-diffing two saves as a debugging technique. **Bump it in the same commit as the first
`if(snap.version < N)` branch.**

### 7.4 Phase-key stability

Keys are `'custom' + (++customPhaseCounter)` and the counter is itself snapshotted, so a deleted key
never comes back and an orphaned `week|phaseKey` override is never adopted by a new phase. Both
features rely on this. **See §7.5 — it is not currently true in one path.**

### 7.5 Pre-existing hardening — land it separately

`applyStateSnapshot` sets `customPhaseCounter = 0`, adds one row per saved def, then overwrites the
counter **only** `if(typeof snap.customPhaseCounter === 'number')`. A snapshot whose
`customPhaseDefs` are `[custom1, custom3]` (custom2 deleted before the save) and which **lacks**
`customPhaseCounter` leaves the counter at 2, so the next `#add-phase-btn` click generates
`custom3` — **colliding**. A stale `W|custom3` override from the deleted phase is then adopted by
the brand-new phase, which appears pre-swapped or pre-filled.

```js
// After the rebuild loop:
customPhaseCounter = Math.max(snap.customPhaseCounter || 0,
  ...(snap.customPhaseDefs || []).map(cp => parseInt(String(cp.key).replace('custom',''), 10) || 0));
```

This is **pre-existing** and already affects `cellSpans`, `hiatusTexts` and `hiatusColors`. Land it
as its **own commit** with its own changelog line and its own fixture (the existing
`tests/fixtures/v1.0.0-saved.html` *does* carry `customPhaseCounter`, so this path is untested), not
buried inside a feature.

---

## 8. Sequencing and the smallest shippable increments

```
0.  customPhaseCounter hardening            (own commit, own changelog line, own fixture)
1.  F1-a  selection model + overlay + observer + CSS         <- no behaviour change yet
2.  F1-b  marquee sweep + Shift/Cmd + Escape + selectstart   <- selection is visible, does nothing
3.  F1-c  toolbar button + dblclick apply + contention       <- ⭐ SHIPPABLE. Feature 1 complete
4.  F1-d  Help entry, keyboard, hover cursor, chips          <- polish; ship with 3 if cheap
--- ship, ask the owner, wait ---
5.  [STOP-AND-ASK] column-order sign-off recorded in HANDOFF.md
6.  F2-a  gridColSwaps + reconciler + 9 save sites + harness leg   <- no gesture; drive from console
7.  F2-b  layoutFingerprint + the gate + per-pair reject + notice  <- proves the model is safe
8.  F2-c  computeSwapRun (WHOLE-run only) + canSwap + commitSwap
9.  F2-d  knob + toolbar buttons + hover/collateral/settle/chips   <- ⭐ SHIPPABLE. F2 Phase 1
--- ship, ask the owner, wait ---
10. F2-e  arbitrary partial runs                                  <- only if asked
11. F1-e  batch edge drag                                         <- only if asked
```

**Step 3 is the smallest shippable increment of Feature 1** and delivers the owner's whole request.
**Step 9 is the smallest shippable increment of Feature 2** and delivers the owner's screenshot.

⚠️ **Do not build steps 6–9 as one commit.** Step 6 with no gesture is drivable entirely from the
console and is where the invariance theorem gets proved empirically; step 7 is where the gate earns
its keep. Getting either wrong under a gesture is undiagnosable.

**Before step 6, prove the theorem empirically.** In the browser on `/dist/index.html`, hand-install
a `gridColSwaps` pair, recompute, and confirm `blockSlotMaps` entries, `blockMaxConcurrent` and
`blockSimSlot` are byte-identical pre/post for every block. **If any differ on a within-week
permutation, §2.3 is wrong and the whole design must be rethought before a line ships.**

---

## 9. Verification

### 9.1 The gate

```
cd tests/harness && HARNESS_PAGE=/dist/index.html ./gate.sh
```

⚠️ **`run.sh` defaults to `HARNESS_PAGE=/index.html` — the LEGACY deployed app.** Re-running a leg
standalone without that variable silently tests a different program, and it passes while the build
fails. `tests/harness/srv.js` needs explicit args:
`node srv.js 8765 <repoRoot> <repoRoot>/tests/harness/t`.

⚠️ **KNOWN AND EXPECTED: the `restore` leg FAILS in headless Chrome.** `indexedDB.open()` never
settles under `--virtual-time-budget`. It fails **identically on the untouched root `/index.html`**,
so it is environmental, **not** a regression. **Every other leg must stay green.** Do not "fix" it
and do not report it as caused by this work.

**With no selection made and no swap in state, both features are inert, so every baseline leg must
be byte-identical** to `tests/baselines/2026-08-29-stage-7`: `sig`, `cols`, `gridWidthPt`, `rows`,
`headers`, `hClip`, `vClip`, the waterfall PDF byte-compare (via `tests/harness/pdfcmp.py`, which
substitutes only the dotted date stamp), the Excel **parts** diff (⛔ **never** byte-compare the
`.xlsx` — ExcelJS stamps `docProps/core.xml`), and zero console errors. **Any diff here means the
new listeners or CSS leaked.** For Feature 2 this is the regression proof for the whole model half.

### 9.2 What the gate CANNOT prove

**Do not read a green gate as evidence either feature works.**

- Automatic phase-column widths are *near*-permutation-invariant, so a **correct** swap moves
  `gridWidthPt` and `cols` not at all — the gate goes green on a swap that is visually wrong, and red
  only on the `mc`/width failure modes.
- No test clicks `#add-phase-btn`; the base fixture has **no custom phases**, **no per-phase
  hiatus**, **empty `cellSpans`**, and exactly **one two-phase week per year block** — so it cannot
  express the owner's screenshot at all.
- `tests/fixtures/` has **no `.sptcal` fixture**, only the pre-v1.1.0 `v1.0.0-saved.html`, so the
  restore leg proves the legacy path and **not the format every save writes**.

### 9.3 New fixture and harness leg

Cut **`tests/fixtures/swap-4col.sptcal`** — which closes the `.sptcal` hole and supplies the
schedule in one move. Content: the owner's screenshot exactly — `prodPrep` 6 weeks; a **custom**
phase "Casting" starting 2 weeks later for 4 weeks (this exercises `#add-phase-btn`'s key generation
and the `customPhaseCounter` path, both current gate blind spots); `production` following full width;
one **per-phase hiatus** inside the overlap; and two `cellSpans` fills on prodPrep wks 1–2 so the
pre-state matches the screenshot.

**`tests/harness/t/batchspan.js`** (Feature 1), all DOM-observable, no engine hook:
(a) the pre-batch `gridSignature()`; (b) after driving the sweep + apply, **every selected row
reached its own maximum** and **no unselected row's signature changed**; (c) the same-week contention
case writes **no ungranted claim** — read `cellSpans` back and assert every entry equals the span the
DOM actually shows; (d) `clippedCells().h.length === 0`; (e) `colList()` unchanged;
(f) `captureSnapshot()` → JSON → `applyStateSnapshot()` round-trips to the same signature;
(g) **one** Undo restores the pre-batch signature exactly.

**`tests/harness/t/swap.js`** (Feature 2):
(a) the pre-swap `(data-week, data-pkey, data-own, colSpan)` map; (b) in swapped weeks `own` **and**
`colspan` are exchanged (**G4**); (c) in unswapped weeks the colspan sequence is identical **except**
where the collateral report named it, and no unswapped week's max colspan moved by more than 1
(**G5**); (d) `blockSlotMaps` / `blockMaxConcurrent` / `blockSimSlot` byte-identical (**G1/G2**);
(e) `colList()` byte-identical (**G3**); (f) `sum(colSpan) === mc` per row; (g)
`clippedCells().h.length === 0`; (h) snapshot round-trip; (i) shift ±1 week via the toolbar and
re-assert the swap survived **on the new weeks**; (j) a **ripple** shift that splits the pair reverts
those weeks to natural order and does **not** half-apply; (k) one Undo restores the pre-swap map
exactly; (l) both exports still produce a blob.

Add both as `gate.sh` legs against their own baselines.

### 9.4 Browser verification — the only proof of the gestures

No harness test clicks a knob or sweeps a marquee. Drive `/dist/index.html` with the
`Claude_Browser` tools.

**Feature 1 — non-regression, in this order:**

1. With **no** selection, double-click one phase cell → it fills; again → it un-fills. Exactly as
   today.
2. Double-click twice **in place** and confirm `gridSel.size` stayed 0 — the 10px/left-the-cell
   arming threshold must never let a stationary double-click become a sweep.
3. Double-click **1px above a row boundary** inside a phase cell and confirm the same. This is the
   drift case that the old `far || differentCell` test failed.
4. Double-click a cell **6px from its left edge** (inside the `.is-span` handle band) with a
   selection standing → the **batch** must apply, not the single-cell autofit. Then repeat with no
   selection → the frozen autofit must still run.
5. Narrow a column to its minimum and confirm the marquee can still be started somewhere on that
   row and the batch still applies.

**Feature 1 — behaviour:**

6. Reproduce the owner's screenshot. Sweep wks 1–2 plus the four two-phase rows, apply → each row
   expanded to **its own** width, the already-full rows untouched, and the two-phase rows shown
   `.is-inert` rather than silently vanishing from the count.
7. **ONE UNDO STEP:** sweep 4 expandable cells, apply, wait >500 ms, `Cmd+Z` **once** → all four
   revert together. `Cmd+Shift+Z` once → all four return. Then repeat and type a character into
   `weeks-post` **within** 500 ms of applying: one `Cmd+Z` must revert **only** the keystroke.
8. **NO SCROLL JUMP:** scroll so the selection is mid-pane, apply, confirm the pane's `scrollTop` and
   the window scroll are unchanged.
9. **CONTENTION:** build a row where two selected cells both reach the same empty slot. Apply, then
   inspect `cellSpans`: **no entry may claim a slot the DOM does not show it holding.** Then
   double-click the winner's span handle (autofit) and confirm the other cell **does not move**.
10. **HIATUS COLLISION:** add a per-phase hiatus inside the overlap. (a) single-click the band → the
    editor opens; (b) sweep across the band and release **on** it → the editor must **not** open and
    the selection stands; (c) **Cmd-click** the band → it joins the selection, editor does not open;
    (d) a band emitted **without** `data-own` is never selected.
11. ⛔ **THE TEXT-DESTRUCTION TEST.** Click a per-phase hiatus band, **type a new name**, then
    Cmd-click a phase cell. The rename **must be committed** (reopen the band and confirm). Then
    batch-apply and confirm the name is still there. This is the one failure that produces no error
    and no undo entry.
12. **TEXT SELECTION:** sweep across several cells → `getSelection().toString() === ''`. Then
    immediately single-click a note cell → the editor opens and the `td` has `editing`. Then confirm
    a note cell's text **is** still drag-selectable, and switch the header to Manual, click into a
    `.hdr-line`, and confirm its text **is** selectable and Shift+Arrow works.
13. **STALENESS:** with a selection standing, drag a column boundary → the overlay hides for the
    duration and reappears correctly positioned. Then run the batch edge drag (if built) and confirm
    it does **not** hide.
14. **BLOCK STRADDLE:** a schedule crossing 1 Jan; sweep across both blocks; apply; each block's rows
    expanded within their **own** block.
15. **SELF-HEALING PRUNE:** make a selection, then change a phase's start date in the sidebar (a
    render from `update()`, not from our code). The overlay redraws for surviving cells and drops the
    rest, no error. Repeat with Undo and with opening `tests/fixtures/v1.0.0-saved.html`.
16. **OBSERVER LIFECYCLE:** force renders from unrelated paths and assert **exactly one**
    `.grid-sel-layer` exists as a direct child of `.sheet-grid-wrap`, and that the observer callback
    count per render is **1** (no runaway re-entry from the layer's own paint).
17. **NO SCROLL EXTENSION:** select the bottom-right phase cell and confirm `.sheet-scroll`'s
    `scrollHeight`/`scrollWidth` did not grow.
18. **SAVE FORMAT:** after a batch, save a `.sptcal` and confirm the **only** difference from N
    manual double-clicks is nothing at all — no selection key anywhere in the JSON, and `cellSpans`
    holding exactly the same `{l,r,k}`. Then Export shareable copy **while a selection stands**, open
    the exported file, and confirm no overlay travelled with it.
19. **SHIFT SURVIVAL:** batch-expand 4 cells, Shift All +1 week, confirm the widths travelled with
    their phases.

**Feature 2:**

20. All six competing gestures still work with a run selected: `.is-span` edge drag on an
    **unselected** cell; `.is-col` drag **above and below** the knob; `.is-row` drag in the date
    column; **double-click a column boundary → autofit still fires, no swap**; dblclick-to-fill on a
    bare phase cell; click-to-rename on a per-phase hiatus band.
21. The owner's screenshot swap: swapped weeks read `Casting wk N | Prod Prep wk N+2` with `own`
    exchanged; wks 1–2 stay full width **in place**; Production stays full width; the `<colgroup>`
    `data-ckey` list **and every width** unchanged; `sum(colSpan) === mc` per row.
22. **G5 directly:** snapshot every `(data-week, data-pkey, data-own, colSpan)` triple before and
    after and diff. Every unswapped week's colspan change must appear in the collateral report, and
    none may exceed magnitude 1.
23. One Undo after a swap restores the full pre-swap map.
24. Save `.sptcal`, reload the page, load the file → the swap comes back. Export a shareable copy →
    the swap is there, no overlay serialised. Open `v1.0.0-saved.html` (no `gridColSwaps` key) →
    automatic column order and **no leftover swap from the previously open file** (the
    unconditional-restore rule).
25. Shift ±1 week → the swap lands on the new weeks. **Ripple** shift a cutoff that moves **one** of
    the two phases → the swap **evaporates**, does not half-apply.
26. **SIMPOST:** with SimPost **on**, no affordance on a Production cell and no move into the SimPost
    lane. Then the harder path: perform a Production↔Post swap with SimPost **off**, then turn
    SimPost **on**, and confirm the gate **rejects** it, **reports** it, and leaves
    `blockSimSlot`/`blockMaxConcurrent` unchanged.
27. **REJECTION IS VISIBLE:** with a legal swap in place, add a phase whose dates change the block's
    `mc`. The swap must pause **with a notice naming the block and the reason**, not silently vanish.
    Remove the phase → it returns.
28. Stale overrides never throw and never swallow: (a) delete the partner custom phase; (b) shorten a
    duration so the phase no longer runs the swapped weeks; (c) hand-edit a `.sptcal` to a
    self-pointer; (d) hand-edit one half so the pair no longer agrees; (e) hand-edit a 3-cycle. In
    all five: the grid renders, **every** cell is present, `read_console_messages({onlyErrors:true})`
    is empty, and the affected weeks fall back to natural order.
29. **EXPORTS AGREE WITH THE SCREEN:** with a swap in place, run `exportExcel` and the direct
    waterfall PDF; the merged ranges and PDF x-offsets show the swapped order, and the column count
    and page orientation are unchanged. They *should* follow for free — verify, don't assume; a
    disagreement means the reconciler is running somewhere other than inside `computeSchedule`.
30. **PRINT PATHS:** with a swap and a live selection, run the month PDF and the print-fallback
    waterfall PDF → no overlay artefact. And confirm `*{ print-color-adjust:exact !important }` is
    still present and **unlayered** — without it both PDFs print as an empty grid.
31. `prefers-reduced-motion`: emulate it → nudge, lean and settle rects all suppressed, the move
    still completes, the outline still moves, **and the static confirmation chip appears**.

### 9.5 Docs, in the same breath as the code

- **`HANDOFF.md`** — the owner's column-order sign-off **verbatim with its date**; the single store
  choice and why seats lost; the nine landing sites; the mutual-agreement rule; the Production/
  SimPost refusal and why the gesture-level refusal is not sufficient alone; the collateral
  behaviour as an accepted limitation; the widths-stay-with-the-column decision; **and the two
  general traps**: `.sheet-phase-cell` is emitted unconditionally on a per-phase hiatus band while
  its `data-*` set is not, and a capture-phase `stopPropagation` on document destroys uncommitted
  note text. Also record that Feature 1's selection needs **no** reset/shift/restore entry *because*
  the observer prunes, so nobody "completes" the checklist later.
- **`README.md`** — changelog entry at the top under the marker comment, newest first: what changed,
  why (quote the owner), what was verified. Note `SNAPSHOT_VERSION` was **deliberately not** bumped.
- **`UI-CONVENTIONS.md`** — the hit-test priority ladder (§6.6) into the direct-manipulation section;
  the new gate legs into the §10 acceptance list.
- **`python3 tools/check-refs.py`** after any edit to the root `index.html`. ⚠️ **It is blind to
  `src/legacy/app.js`**, so a clean run proves nothing about this work.
- ⛔ **Do not touch the root `index.html`.** Do not bump `APP_VERSION` / `version.json` unless the
  owner asks for a version cut — and if they do, **all three** (`index.html`, `src/legacy/app.js`,
  `version.json`) plus a tag plus a byte-identical `releases/` copy, in one commit.
- ⛔ **Never `git push` without being asked for that specific push.** `main` auto-deploys to a live
  public site. Ask with an interactive checkbox picker, separately for commit and for push.

---

## 10. Non-goals / out of scope

1. **Sidebar phase reorder** (`customPhaseDefs` array order, `PHASE_CHAIN`). Different feature,
   different save-format hazard, still unbuilt. §1.2.
2. **Chained / multi-column moves** in weeks with 3+ concurrent phases. Single-neighbour
   transpositions only. The store shape leaves room to add it without breaking saved files.
3. **Arbitrary partial-run swaps** — Phase 2, not Phase 1. §6.8.
4. **Any change to row heights, cell text, fonts, shrink-to-fit, or the exports' numbers.** The
   appearance freeze is unmoved by all of this.
5. **The month view.** Provably unaffected (it never reads `.col`), and nothing here should touch it.
6. **Mirroring or migrating `cellSpans` on a swap.** Refuse instead. §6.4, M9.
7. **Keyboard entry *into* the grid** (`tabindex` on `td`s is frozen renderer output) and **touch
   support for the marquee** (a `td`-level `touch-action` rule is frozen CSS). Both accepted
   limitations; the toolbar buttons are the accessible and touch path.
8. **Eliminating collateral width changes in unswapped weeks.** Inherent to
   `phaseRunBounds`/`freeForRun`; bounded and disclosed, not removed. §11 D2.
9. **A `SNAPSHOT_VERSION` bump.** §7.3.
10. **Restoring the harness `restore` leg.** Environmental. §9.1.

---

## 11. Owner decisions required

Genuine product questions. Implementation choices have already been made above and are not listed
here.

**D1 — COLUMN-ORDER SIGN-OFF. ⛔ BLOCKS ALL OF FEATURE 2.**
Making a phase's column vary per week changes which label appears in which grid column — i.e. what
is inside `#table-wrap` — which the 29 Aug 2026 standing convention freezes. Its only escape is
*"unless given specific instructions from the user"*. **Please confirm in writing that grid COLUMN
ORDER may be user-overridable.** This is **not** the sidebar phase-reorder debt. The acceptance
measurement offered with this request is in §3.2. Feature 1 does **not** need this.

**D2 — COLLATERAL: unswapped weeks can change layout. ✅ DECIDED 1 Sep 2026 — capped tolerance.**
A partial swap splits the phase's run, which can reflow weeks you did not touch (measured: 25.3% of
swaps change some unswapped week; 5.4% by ≥2 columns). It is the honest output of the existing
"a phase spans into an empty neighbour for its whole run" rule and **cannot** be prevented without a
frozen edit. **Owner's ruling: allow it, capped at magnitude 1** — an unswapped week may shift by at
most one column (allowed, previewed before commit, and reported in the chip afterwards); a shift of
two or more columns **refuses the swap with a named reason**. That is exactly what **G5 COLLATERAL**
in §6.5 implements; the ruling makes G5's threshold a decision of record rather than a default, so do
not "tidy" it into an unconditional pass or an unconditional reject.
The alternatives the owner weighed and declined: refuse any collateral outright (rejected as too
strict — it would block a legitimate class of swap), and allow it freely (rejected as too loose).
**Your screenshot itself produces zero collateral** (measured).

⚠️ **This ruling does NOT loosen G3 WIDTH, which stays a hard reject.** The two are different axes
and were decided separately: G5 is *one week's* colspan reflowing by a column, while a width change
(§2.6) moves **every column in the whole block**, moves `gridWidthPt`, moves every Excel column
width, and can flip the PDF between portrait and landscape. That is a categorically larger
disturbance than the owner accepted, it is only 3.1% of eligible swaps, and it is avoidable — see
the note in §2.6 on whole-run swaps. If the owner later wants width changes tolerated too, that is a
**separate** ruling and G3 is where it would be relaxed.

**D3 — HAND-DRAGGED COLUMN WIDTHS stay with the POSITION, not the phase.**
Recommended, because a partial swap puts one phase in two different columns in different weeks, so
no single column width can follow it. Consequence: if you have dragged one phase column narrower and
then swap, the other phase's labels sit under that narrower width (a chip says so). **With no
hand-dragged widths nothing changes at all.** Confirm?

**D4 — A SWAP IS REFUSED when a hand-set CELL width exists in the swapped weeks.**
Widths are stored relative to the phase's own column, so a fill that reached right becomes a claim on
an occupied column. **Refuse and say which cell to clear** (recommended) — or **swap anyway and DROP
that width override**? We will **not** transform the stored width: doing so is a permanent, silent
loss of your work the moment the swap stops applying.

**D5 — PRODUCTION + SIMULTANEOUS POST is refused outright**, in either role, in any year block
containing a SimPost week, because the SimPost lane is anchored to Production's *first* column in the
block and a mid-block change can widen the whole grid by one column. A hard refusal with an
explanatory chip — acceptable?

**D6 — BATCH EXPAND on a mixed selection: ALL-OR-NOTHING.**
Expand everything to each row's own maximum, unless every expandable cell is already fully expanded,
in which case pull them all back. A per-cell toggle scrambles a half-expanded selection into half
filled / half not. And the selection **survives** the apply, so expand → pull back → adjust is one
continuous interaction. Both recommended — confirm?

**D7 — SCOPE: is Feature 2 Phase 1 enough to ship?**
Phase 1 = a swap where at least one side is a phase's **whole** run within the year block. That is
exactly your screenshot. Arbitrary partial runs (e.g. swapping only weeks 4–5 out of a 6-week
overlap) would be Phase 2. Ship Phase 1 first?

**D8 — IS THE BATCH EDGE DRAG WANTED?**
Your words were *"drag across to expand"*. The marquee sweep **is** the drag across; the apply is
then a toolbar button or a double-click. A separate **batch edge drag** (grab one cell's edge, drag,
all selected rows follow with a live ghost) is the only part of Feature 1 that reimplements a frozen
function's snap loop. Build it in v1, or defer?

**D9 — NEW CHROME INSIDE THE GRID'S BOX.**
Both features draw an overlay **on top of** the grid: selection outlines, a small count chip
(*"4 cells · double-click to expand"*), the move knob, and a brief settle animation. None of it is in
a cell, none of it prints, none of it exports, and it all vanishes with the selection. But it **is**
new visible chrome inside `#table-wrap`'s box, and the appearance convention covers that box, so I
would rather you ruled than I assumed.

**D10 — NAMING.**
Confirm the user-facing name — *"swap columns"* / *"column order"* — so it is never conflated with
the sidebar phase reorder in the UI, the changelog or the docs. Shipping one **will** read as having
shipped the other.

---

## 12. Quick reference — the traps that have already cost a wrong diagnosis

1. `grep` on `src/legacy/app.js` returns **nothing** without `-a` (embedded base64 font data).
   Always `LC_ALL=C grep -ano`.
2. `run.sh` defaults to the **legacy** app. Always `HARNESS_PAGE=/dist/index.html`.
3. The harness `restore` leg fails **environmentally** in headless Chrome. Not a regression.
4. `.sheet-phase-cell` on a per-phase hiatus band is **unconditional**; its `data-own` set is not.
   Test `data-own`.
5. `data-week` on a per-phase band is the **plain** date; the store key is `week|phase`.
6. `preventDefault` on `pointerdown` over a `td` kills `click` **and** `dblclick`. Use `selectstart`.
7. `selectstart`'s target is a **text node** — no `.closest`. Hop to `parentElement`.
8. A document **bubble** click listener never sees note or per-phase-hiatus cells (the opener
   `stopPropagation`s them). Bind on `#table-wrap`, or on document with `capture:true`.
9. A document **capture** `stopPropagation` destroys uncommitted note/hiatus text. Gate the opener
   instead.
10. `MutationObserver` on `#table-wrap` with `subtree:true` + writing into that subtree = hang.
    `childList` only.
11. `pushUndoSnapshot()` before mutating is a **flush**, not the step. Use the `asOneUndoStep` shape.
12. N `render()` calls = N `window.scrollBy` corrections = visible jitter. One render per action.
13. The handles cover **28.6%** of a phase cell and **100%** of a narrow one. Resolve with
    `elementsFromPoint`.
14. One `<tr>` holds **every** year block. Never use pixel row/column index ranges for membership.
15. `sheetColumnWidths`' spanned-label top-up is **not** permutation-invariant. Measure widths;
    never reason about them.
16. `own` in an **unswapped** week can never change. An invariant that checks it is a tautology.
17. There is **no** `td.sheet-phase-cell` CSS rule. Adding one is a frozen edit. Draw on an overlay.
18. `if(snap.x) x = snap.x` leaves the **previous** file's values on this one. Restore
    unconditionally with a `: {}` else-branch.
19. `PHASE_COLOR_OPTIONS`' **array order** is part of the file format. Append only.
20. `fields.byId` is keyed by DOM element **id**, so ids are part of the file format.
