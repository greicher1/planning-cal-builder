# FILL-INTENT-PLAN.md — a phase fills its free space (the double-click stores the wish, not the width)

Owner, 6 Nov 2026. After the rule 13 discussion (a hand-widened cell behaves "weirdly" once the schedule moves under
it): *"so theres no way to automate the fix in the background?"* → the proposal below → *"Yes, build it"*.

## 0. The idea in one line

A double-click no longer writes a width on one cell. It marks the PHASE with a wish: *fills the empty columns beside
it* (a one-wide cell was double-clicked) or *keeps to its own column* (a wide cell was). The layout applies that fresh
on every redraw, so nothing stored can go stale: a filling phase narrows the week another phase moves in beside it,
widens again the week it leaves, follows a shift and a length change. Double-click the cell's edge handle to let the
layout decide again. A drag to an exact width is still a per-cell override (rare), because there is no wish behind it
the app could re-derive.

*(The second wish, "keeps to its column", was added while building: the owner's 5 Nov 2026 double-click-to-unexpand
(`centrepullback`) had to survive, and "the visible opposite of what you see" is one gesture to explain.)*

## 1. State

- `phaseFill`: `{ [phaseKey]: true | false }` (fills / keeps to its column; absent = automatic), module scope beside
  `phaseHidden`. Read only through `phaseFillOn(key)` / `phaseFillOff(key)`; written only through `setPhaseFill`.
- ⛔ CALENDAR DATA, a PERMANENT snapshot key `phaseFill`, written only while non-empty, keys sorted. A calendar that
  never uses it saves byte for byte as before; an older build ignores the key and draws the automatic layout.
- `sanitizeSnapshot`: known phase keys (built-ins and this file's custom phases), value `true`; anything else dropped
  and counted. `applyStateSnapshot`: restored UNCONDITIONALLY (`{}` when absent). `newFile`: cleared. A removed custom
  phase is pruned. Phase-keyed, so the shift tools and the arrows have nothing to re-key.
- Turning it ON for a phase deletes that phase's `cellSpans` entries: they said the same thing the old way, and a stale
  `{l:0,r:0}` would narrow a cell the wish wants wide. Turning it OFF restores nothing (drag again). One undo step.

## 2. The gesture (stamped calendars only)

- Double-click a phase cell: the visible opposite of what it sees — a cell wider than its own column → the phase keeps
  to its column (`false`); a one-wide cell → the phase fills (`true`). Double-click the cell's edge handle → the wish
  goes (automatic), as it already dropped a per-cell width. On an UNSTAMPED calendar the double-click keeps its old
  meaning (a per-cell fill), so a legacy file behaves exactly as it always has — its layout is frozen by the stamp rule.
- The batch (drag a run of cells, double-click / Enter): the distinct phases of the selection, bands included; every
  highlighted cell wide → all keep to their columns, else all fill. The chip above the highlight reads *"Double click to
  pull back cells"* / *"fill free space"* and shows whenever the highlight holds a phase cell (the wish is
  forward-looking: a cell with no room this week may have room next month).
- Help: the two double-click sentences and the batch paragraph say the phase, not the cell; the drag paragraph stays.

## 3. The widths (⛔ frozen edit LR5 in `computePhaseRowLayout`, stamped only)

`fillsFree(k)` = stamped, not Single Column (rule 17 holds), and the phase in slot k wishes to fill; `keepsNarrow(k)` =
stamped and it wishes to keep to its column (then it takes nothing, is given nothing by R-E, and rule 21 leaves it).
For a filling phase:
- the rightward walk takes every empty slot to its right this week, stopping only at a cell or this week's marker:
  no rest-of-run test (13), no even share (12), no lane reservation (15's pre-shoot rule — the wish is explicit);
- the empty run to its left is taken whole (the left-extend branch, bands included), same terms;
- rule 21's post-pass skips it (it already has everything free), R-E is unchanged, `applyCellSpanOverrides` still lays
  a per-cell drag over it (an exact width wins for that cell, rule 19).
Unstamped: `fillsFree` is false and every line is what it was.

## 4. Proof

Fixture `fill-intent.sptcal` (synthetic, stamped, no Sim Post): Writers 14 wks alone, Pre-Prep 6 wks with Production
arriving in its sixth week, Post after — Pre-Prep is one wide for all six weeks under rule 13. Leg `phasefill`:
F1 the automatic layout; F2 double-click → Pre-Prep two wide for five weeks, one beside Production, the saved file
carries `phaseFill: {prePrep: true}` and no new field id; F3 Production moved two weeks earlier → Pre-Prep narrows
there on its own; F4 undo / redo one step each, double-click again → off; F5 `?layout=legacy` (the unstamped path):
the double-click still writes a per-cell width and `phaseFill` stays empty; F6 Load a file with the key → applied;
New → cleared. Then the stamped-path legs, the 15-calendar re-score (unchanged: no seed carries the key) and the
full gate.

## 5. Left for later

- **The hover prompt** (owner, in a forked session, 6 Nov 2026; tracker card `blank-space-expand-prompt`): on hover, a
  dashed outline around a blank space beside a phase with a chip *"Expand?"* that sets that phase's fill wish; and the
  reverse, an outline around the columns a filled cell took with *"Pull back?"* that clears the wish — or, for an exact
  drag, that one cell's override, *"Pull back this week?"*. Overlay layer only, no frozen edit, the same `phaseFill`
  flag as the double-click. The owner: *"can you remind me about building it after the intent based thing is done"* —
  so it is raised, by picker, once this build has landed.
- A mark on a cell carrying a per-cell drag, and a row note when such a width is held back, still earn their place for
  the exact-width case (the rest of tracker card `hand-width-visible-and-explained`). Not in this build.

## 6. Reset Columns (owner, 6 Nov 2026: *"will there be a way to reset back to default algorithm?"* → *"Add it"*)

One button in the app header, beside Reset Notes (`#tb-cols-reset-btn`, `Header.jsx`), Waterfall view only. One click,
one undo step: `resetColumns()` empties every column choice — `phaseFill`, `cellSpans`, `colWidths` and `colWidthsAlt`
(the Date and Notes columns too, both layouts), `gridColSwaps`, `gridStintSwaps`, `colFollow`. It keeps dates, notes,
row heights, typed headings and their styles, hidden Notes columns, Single Column Mode and the layout stamp (an
unstamped calendar keeps its old layout; "Update layout" stays the strip's job). Greyed (`data-disabled`, so the
tooltip still shows) while every column is already automatic; `columnEditsExist()` is pushed with the notes reset's
view from the `#table-wrap` observer, and the click re-checks. Header fit, measured in the Waterfall view (its widest
state): labelled it needs 128 px and overflowed the header by 25 px at 1121 px and 11 px at 1201 px, because the
status text keeps an inline 78 px minimum; so it runs icon-only at 1280 px and below (`btn-collapse-early`, legacy.css
step 2a). Swept 961–1440 px after: no overflow, the header one row (63 px), the least spare room 64 px. Leg
`colsreset` (R0–R6, E0).

## 7. What else could carry a wish (owner, 6 Nov 2026: *"what else should this intent based algorithm apply to?
Perhaps it applies to column swapping as well?"*)

Every column choice, by what it is stored against — the question is which ones go wrong when the calendar changes:

| Choice | Stored against | When the calendar changes |
|---|---|---|
| Fill / pull back (this build) | the phase | follows it |
| Moved by hand into a free column (`colFollow`) | the phase | follows it; kept when it can't apply, with a row note and Reset |
| Block swap (`gridStintSwaps`) | the two phases, in one year | survives length changes; dropped quietly when they stop sharing the year; stays with the year on a shift into the next (owner ruling E5, deliberate) |
| Part-column swap, the amber one (`gridColSwaps`) | the two phases, week by week | moved by the shift tools, but a lengthened overlap's new weeks are not swapped |
| Exact cell width, dragged (`cellSpans`) | one week of one phase | stays on that week (rare, deliberate) |
| Column width dragged on the header row (`colWidths`) | **a column position** in a year (`y2026:s1`) | nothing moves it when a date edit or a new phase changes which phase sits there, so it lands on another phase |
| Typed column heading, its split and style (`headerRowLabels`, `headerRowSplits`, `textStyle.heading`) | **a column position** in a year | the same: the heading stays over the position, whoever moves in |
| Text style on phase cells (`textStyle.phase`) | one week of one phase | moved by the shift tools; a lengthened phase's new weeks come out unstyled |

So column swapping is mostly intent-shaped already: both swaps and the hand move name phases, never columns. The
biggest gap left is the two POSITION-keyed choices — header-row widths and typed headings — which are the same
"behaves weirdly after I change the calendar" problem the fill wish solved. Their wish form: "Post's column is 18
wide", "the heading over Post reads 'Post / VFX'", applied wherever that phase's column is. The open question is a
column that holds two phases in a year (column reuse): which phase owns its width and heading. Second, a "style the
whole phase" wish for text styles; third, turning the part-column swap into a pair wish, which would also reverse
ruling E5. None of these is built; each is the owner's call.

## 8. A swap holds when one of its phases moves (owner, 6 Nov 2026: *"so if you swap a collumn then move one of those collumn up, it should maintain the position its in."*)

**Measured on the fill-intent build** (Pre-Prep 3/17 ×6 and Prod Prep 4/7 ×14 sharing three weeks, swapped so Prod Prep
sits left): typing an earlier date or clicking Prod Prep's ▲ kept the swap for three weeks; on the fourth click, the
week Prod Prep starts before Pre-Prep, the swap undid itself. Writers' Room ↔ Pre-Prep held through every move,
because neither overtook the other's start. **Why:** a block swap was stored as an EXCHANGE of the two columns'
contents (`gridStintSwaps['<year>|<key>'] = {with}`). Once the moved phase starts first, the layout already puts it on
the left, and the exchange moves it back to the right.

**As built (branch `swap-holds`, from `fill-intent`).** The entry also says which side the phase took:
`{with, left: true | false}` (PERMANENT, only booleans; the sanitizer drops anything else). The gesture writes it
(`stintStoreAfter`: the movers go to the side `dir` points at). `applyStintSwaps` reads a group whose every member has
a side as an ORDER: it exchanges only when the block's own left-to-right column order (`before`, the order it pins)
has the group the other way round; a group already in order is left alone and is not `applied`, so the gesture reads
it as a fresh swap, never a swap back. A group with no sides, or mixed ones, is exchanged as before. ⛔ Not a seat: it
names a side of one pair in one year, read against that block's order, so the first-appearance trap the store's
comment warns about does not apply.

**Old files.** A swap saved before this has no sides. `applyStateSnapshot` raises `stintSwapsNeedSides`, and
`refreshAfterRestore` writes each EXCHANGED group's sides down from the exchange this file's layout makes
(`recordStintSwapSides`, reading `aLeft` on each applied group), so the calendar opens exactly as it did and from then
on holds. A group not applied at load keeps its entries as they were. An older build ignores `left` and exchanges.

**Unchanged on purpose:** ruling E5 (a block pushed into the next year gets that year's natural order); the per-week
(amber) swap, which still moves with the shift tools week by week.

**Proof.** Fixture `swap-holds.sptcal` (fixtures.mjs, with `extra` for the side-less swap; `node
tools/layout-study/fixtures.mjs swap-holds` writes only it). Leg `swapholds` H1–H7 + E0: 8/8 on this build; on the
fill-intent build 3/8, red at H2 (no sides) and H3 (Prod Prep back on the right at 3/10). The gate's whole swap section
(colswap, colswapgate, colswapmove, colswapmid, colswapstale, stintswap, stintnoreflow, stintcollide, stintgroup,
stintoneside, stintbtn, stintmulti, stintexport, stintchain, stintreshape): 115 checks, 0 failing.
