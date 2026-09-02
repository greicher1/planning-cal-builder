# COLUMN-ORDER-PLAN.md

**A genuine column swap: two phases trade sides and neither changes shape. Plus one gesture that
decides between a whole-column swap and a per-week one from what you selected.**

Written 1 Sep 2026, at the owner's request, after using the shipped per-week swap.
Read [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) →
[`GRID-DIRECT-MANIPULATION-PLAN.md`](GRID-DIRECT-MANIPULATION-PLAN.md) first.

> ✅ **STATUS, 2 Sep 2026: steps 1–6 are BUILT, GATED and PUSHED (`2a75929`).** The store, the
> reconciler, the one authorised frozen line (E0), the "Swap Block" button (E2), the mode inference,
> the one-outline-per-run change (E3), the complete E1 (a swap exchanges with *every* overlapping
> stint in the neighbouring column and names them all), and §6 in full including items 6 and 7.
> What remains is **E4** (retire or keep the per-week swap) — to be decided after the owner has used
> both — and the ship itself. The sections below were written as a plan; the ✅ markers say what is
> now measured rather than argued.

---

## 0. Vocabulary — one concept, two names, on purpose

The thing this feature operates on is **a phase's weeks within ONE year block**. It needed a name
because it is the unit that *owns a column*: a phase does not have a column, and Production running
Nov 2026 → Mar 2027 has **two** of these, each with its own column, each independently swappable.

| term | means | owns |
|---|---|---|
| **phase** | Production, all of it, every year | a sidebar row, a `PHASES` entry |
| **stint** *(code, docs)* / **block** *(UI)* | Production's weeks in ONE year block | **a column** |
| **run** | contiguous weeks a stint holds one column | what `phaseRunBounds` returns |

⛔ **The UI word and the code word differ deliberately, and the reason is a collision.** The owner
chose **"block"** for the UI (1 Sep 2026) and it is the right user-facing word — nobody outside this
repo has ever heard of a "year block". But `block` **already means the year group** everywhere in the
engine: `computeYearBlocks`, `blockSlotMaps`, `blockOccupancy`, `blockMaxConcurrent`, `yearBlocks[bi]`
— 117 uses in `src/legacy/app.js` and 577 in the harness. A second meaning for the bare word would be
a landmine of exactly the kind `CLAUDE.md` warns about where it says *"'the grid' is the wrong word and
it has already caused a collision"*.

So: **user-facing strings say "block". Code and these docs say `stint`.** The precedent is established
and documented — this app says *Load…* in every user-facing string while the code says `open`,
`openRecentFile`, `OPEN_TYPES`. ⚠️ In code, a bare `block` continues to mean the YEAR block; never
reuse it for a stint.

A stint is **not strictly contiguous**: an all-phase hiatus week inside the block leaves the phase with
no cell there, so its weeks have a gap. That does not affect column order — which applies to the whole
year block regardless — but it means "select the whole stint" is a membership test, not a range.

---

## 1. What the owner asked for, and why the shipped feature is wrong for it

> *"I think I was just thinking it would look like a genuine swap, where the two blocks swap
> positions but look the same."*
>
> *"I think its better if its a genuine swap and then if the user wants the rows to expand the
> follow collumn, they can use the stretching feature to do that themselves manually but having it
> automatically do it like this is confusing and assumptive."*

**The owner is right, and this supersedes a position these docs have been defending.**

The shipped per-week swap reflows weeks the user did not select. Measured on the owner's own
Production/Casting calendar: swapping the 4 overlap weeks widened **16** other weeks from one column
to two. Everything built to manage that — the amber collateral preview, the count in the chip, the
G5 magnitude rule, the whole of owner decision D2 — exists only to explain a layout decision the app
made on the user's behalf. **And the app already has a one-click tool for it**: select the run, press
Expand. There is no reason for a swap to do it uninvited.

**Why the reflow happens** (frozen, and worth understanding before touching anything). A phase widens
into a neighbouring column only if that column is free for the phase's *whole* run — `freeForRun` over
`phaseRunBounds`. Before the swap, Production's run in the left column is all 20 weeks and Casting sits
in the right column inside it, so Production is held to one column throughout. A per-week swap **splits
that run in two**, each piece looks beside itself, finds the column free, and widens. The reflow is not
a side effect of the swap; it is the same rule applied to a run the swap shortened.

**Why a whole-column swap does not reflow.** If instead the two *columns* exchange for the whole year
block, Production's run in its new column is all 20 weeks again, and Casting still occupies the other
column during weeks 14–17 — inside that run. The same rule that holds it narrow today holds it narrow
after. Nothing changes shape.

### ✅ MEASURED 1 Sep 2026 — the premise holds, and no code was changed to prove it

The claim above was a reading of the frozen code, and it was the single thing the whole plan rested
on. It is now measured, on the deployed build, using **real data only** — because the target layout
can be produced naturally without any override at all:

Slot order follows **first appearance** of a column, so a short phase can be made to claim the
leftmost slot and push a long phase off it. Writer's Rm for 2 weeks from 1/5 takes col 0; Production
starting 1/12 overlaps it, so `segCol` pushes Production to col 1; a later phase takes a third.
Production therefore occupies **slot 1 for all 20 of its weeks**.

Result: `productionSlotsUsed: ["1"]`, `productionColspansUsed: ["1"]` — one slot, one colspan, across
every week. In the 17 weeks where Production runs completely alone with **slot 0 empty beside it**, it
stays one column wide and does **not** absorb that empty column:

```
1/12/26  Writer's Rm wk 2 | Production wk 1        <- the only week anything shares its row
1/19/26                   | Production wk 2        <- slot 0 EMPTY, Production still narrow at slot 1
2/09/26                   | Production wk 5        <- ditto, 4 weeks later
5/18/26                   | Production wk 19       <- ditto, at the far end of the run
```

So both halves are confirmed: a phase's slot is **per-block, not per-week** (it does not drift back
leftward over a long run), and the left-absorb branch **refuses** via `freeForRunSpan` while a
neighbour occupies that column anywhere inside the phase's run — which is exactly the condition a
whole-column swap preserves.

⚠️ **One honest gap in the measurement.** This scenario has three phase columns, not two, so
Production is blocked from spanning in *both* directions. The mechanism is the same either way
(`freeForRun(s, n)` does not care which side `n` is on) but the two-column case is not directly
measured. §6 item 4 is still required, and it is the one that measures it.

---

## 2. The gesture the owner proposed

> *"I'd like you to be able to command click and drag around a specific number of cells. A box is
> drawn around the edges of just the cells that you select so it is very clear. If you select EVERY
> SINGLE cell in a phase, it will do a full block level swap. If you select just a portion of the
> cells in a phase it will use the current swapping method."*

**This is a better gesture than either option offered, and the core instinct is right:** the outcome
should be derived from what you selected, not from a mode you have to remember or a modifier you have
to know. "Select the whole phase → move the whole phase" is a mapping that needs no teaching.

Three places where it needs a decision, because *"every cell in a phase"* and *"swap the columns"* are
not the same statement. None of these is a reason to reject the design; all three need a ruling.

### 2.1 ✅ It moves ONLY the stints you selected — E1 resolved, and the owner was right

This section previously argued that a whole-column swap must move **everything** in both columns, and
recommended disclosing that as an unavoidable surprise. The owner pushed back — *"there's gotta be a
way to just move the phase you selected and not the entire column"* — and they were right. The
argument was wrong, and re-reading `segCol` is what shows why.

**Why moving only the selected stints is right.** `segCol` lets a phase reuse a freed column **only
when that column sits to the right of every earlier phase still running** — its own comment says so,
and `minCol` is one past the highest currently-busy column. So a stint's neighbours are genuinely
local: a phase that occupies the column beside yours at some *other* time of the year is adjacent to
something else then, and has no business moving because you swapped yours.

⛔ **CORRECTION — an earlier draft of this section over-claimed, and the over-claim is dangerous.** It
said the column beside your stint holds *exactly one* other stint during your stint's life. That is
false. `minCol` only requires being right of phases still **running**, so a long phase holding column 0
keeps `minCol` at 1 indefinitely while *several* short phases take turns in column 1. Measured: with
Writer's Rm holding column 0 for 20 weeks, Post (wks 6–9) and Localization (wks 14–17) both land on
column 1, and both sit inside Writer's Rm's run.

**Consequence, and it is a live hazard rather than a curiosity.** Exchanging your stint with *one* of
those two puts your stint in a column the other still occupies — two cells claiming one column in the
same week, frozen `bySlot[]` keeping only one, and the other's weeks **silently gone from the grid and
from both exports**. Measured with the guard removed: a 20-week phase rendered **16 weeks**. No error.

`applyStintSwaps` therefore **validates every pair before mutating any of them** and refuses one that
would lose a cell — the same "a drifted store yields no change, never a wrong one" rule the rest of the
file follows. Gate leg: `stintcollide`.

✅ **E1 is now COMPLETE (2 Sep 2026).** "Move only the stints you selected" stands, and the
multi-occupant case is handled rather than refused: the gesture (`stintRunFor`) **closes the set** —
the other column's occupants over your stint's weeks join, then your column's occupants over *their*
weeks, until nothing new joins — and every member is named in the knob's label, in the chip before
commit, and in the confirmation after. segCol's rule bounds the walk at two steps (a lower column
cannot be re-entered while a higher one is busy) but the code does not lean on that. The store's
`with` relation is read as a **graph** (`stintSwapGroupsForBlock`): one connected component is one
exchange, its members must sit in exactly two columns, every member trades one for the other; a
mutual pair is the two-member case, so nothing written before reads differently. Refusal survives
only for drift — a stint added into one of the two columns after the swap was stored — and for a
hand-edited one-sided entry. Gate legs: `stintgroup`, `stintmulti` (both sides of the seam),
`stintoneside`, and `stintcollide` unchanged.

**How it is expressed — and why it needs both halves.** The override is a **stint-level mutual
transposition** (§5), and it lands in two places, only one of which is frozen:

1. **`computeSchedule` (not frozen) exchanges the two stints' `col` VALUES**, for every week of each
   stint. This is per-segment, so it moves exactly the two stints named and nothing else — the same
   mutation the shipped per-week reconciler already performs, just over a stint instead of a week.
2. **The frozen hook (§4) pins the slot order**, so that the exchange is actually visible.

⛔ **Step 2 is not optional and step 1 alone does nothing.** `blockSlotMaps` re-derives slot order from
**first appearance**, so after exchanging Production's and Casting's col values, Production still
appears in week 1 and its new col is *still* sorted into slot 0 — the phase does not move at all. This
is precisely the trap the store's comment describes when it forbids a `seat` field, and it is why the
per-week swap had to be a within-week pair exchange. **The hook's job is therefore to make slot order
IMMUNE to the exchange, not to reorder anything**: use the order the block would have had *before* the
override, and the col exchange then shows through.

Cheaply done: the reconciler already walks every block to apply the override, so it records that
block's pre-exchange order on the schedule — the way it already records `appliedColSwaps` — and the
hook reads it. No baseline recompute inside frozen code.

**Worked example, the four-phase case this section used to call unfixable.** Production (col 0, wks
1–20) and Z (col 0, wks 30+); Casting (col 1, wks 14–17) and Post (col 1, wks 30–33). Swap
Production ↔ Casting:

| | before | col exchange | + pinned order | result |
|---|---|---|---|---|
| Production | col 0 → slot 0 | col 1 | col 1 → slot 1 | **moved right** ✔ |
| Casting | col 1 → slot 1 | col 0 | col 0 → slot 0 | **moved left** ✔ |
| Z | col 0 → slot 0 | col 0 | col 0 → slot 0 | **unmoved** ✔ |
| Post | col 1 → slot 1 | col 1 | col 1 → slot 1 | **unmoved** ✔ |

Two stints move, two stay. `mc` is unchanged at 2. Neither untouched stint collides with its
new neighbour, because the exchange preserves each column's occupancy multiset over time.

✅ **MEASURED** — `stintswap` drives exactly this four-phase shape with both columns shared and
confirms every row of the table: the two named stints trade places, Localization and Post do not move,
`mc` stays 2, no cell is lost, and nothing changes shape. ⚠️ Note the fixture's two column-sharers are
separated by a whole-schedule gap; the harder shape, where the sharers both sit *inside* the swapped
stint's run, is the collision case above and is currently refused rather than handled.

### 2.2 ✅ SOLVED by the owner — the "Move Block" affordance

The problem this section originally described: selecting *every* cell of a 20-week stint means dragging
20 rows through a pane that scrolls, and missing one cell silently selects the **other** mode — the
per-week one, which reflows. No feedback, and the penalty for a one-cell miss is exactly the outcome
the owner called confusing.

**The owner's answer removes the problem rather than mitigating it** (1 Sep 2026):

> *"Rather than having to select each and every cell in a block, there should be a button in the top
> right corner of the first week of the block (so first week per year) that when you hover over that
> year, a button pops up that says "Move Block" then the entire block is selected and the blue arrow
> can pop up to do a full swap with a block next to it."*

One click sets `gridSel` to every cell of the stint, so the exact-match rule becomes trivially
satisfiable and cannot be missed by a pixel. Everything downstream is already built: the selection
outline, the count chip, the knob, the verdict, the settle. **This is the single most valuable idea in
the design** — it is what makes whole-column the *easy* path and per-week the deliberate one.

✅ **BUILT 2 Sep 2026** — `drawStintButton` on `.grid-swap-layer`, gate leg `stintbtn`. All five
below are implemented as written; one addition: it is not offered on touch (no hover), where the
toolbar buttons still work.

Five things it needs to get right, all of them mechanical rather than contested:

- **It lives on the OVERLAY, never inside the `<td>`.** A control injected into a grid cell would be
  new frozen content — the freeze covers what a cell looks like. `.grid-swap-layer` already sits at
  `z-index:8` above the resize handles with `pointer-events` on its children only, and `tdBox()`
  already yields a cell's box, so the top-right corner is `wrapLeft + wrapWidth, wrapTop`. No frozen
  change, and it inherits the layer's clipping and its `body.grid-resizing` hide rule for free.
- ⚠️ **Hover must be over the WHOLE stint, not just its first week.** A button that appears only while
  the pointer is on one specific cell is undiscoverable. Show it while the pointer is over **any** cell
  of the stint — which is also the plain reading of *"when you hover over that year"*.
- ⛔ **The travel path must not kill the button.** Hover week 15, the button appears 14 rows up: the
  user moves toward it and the affordance vanishes out from under them. This is the classic broken
  hover target. The rule has to be *visible while the pointer is over any cell of this stint **or** the
  button itself* — and because the button sits at the top of the stint's own column, every row crossed
  on the way is still one of its cells. No grace timer needed; just do not scope the hover to one cell.
- ⚠️ **Clamp it into view.** If the stint's first week is scrolled above the sticky header the button is
  invisible and unreachable, and hovering appears to do nothing — the same failure the knob already
  guards against. Anchor it to the **topmost visible** cell of the stint instead, the way the knob and
  both chips are already clamped below the header's live bottom edge.
- **Do not offer it where nothing can move.** A block with one phase column has nothing to swap with;
  the button should not appear at all rather than appear and refuse.

**The chip still states the resolved mode before commit** — *"all 20 weeks of Production — swaps the
whole column"* vs *"17 of 20 weeks — swaps those weeks only, and 16 weeks will re-flow"*. That was the
half of the original mitigation worth keeping, and it is cheap: `whole` and `partnerWhole` are computed
today.

⛔ **Still do NOT snap a near-complete selection up to the whole stint.** "You selected 19 of 20 so I
assumed 20" is precisely the assumptive behaviour being removed. With the button there, nobody needs it.

✅ **The label is "Swap Block"** (owner, 1 Sep 2026). The owner's first instinct was *"Move Block"*;
the reason it changed is their own earlier ruling (D10) that the UI must never say **move** for a
column change, because the three controls a few pixels away — *← 1 wk*, *Shift All*, *1 wk →* — move
the calendar in **time**. *Swap Block* names the outcome, matches the toolbar's existing
*◀ Swap / Swap ▶*, and cannot be read as a shift in time. ⛔ Do not "improve" it back to *Move*.

### 2.3 One outline cannot honestly wrap a ragged selection

The owner asked for *"a box drawn around the edges of just the cells that you select"* — clearer than
today's per-cell rectangles, and right for the normal case. But a selection need not be a rectangle:
⌘-click builds arbitrary sets, and a marquee dragged down one column **skips** any all-phase hiatus
week in its path (the run walk stops at those, and so does `phaseRunBounds`). A single bounding box
would then enclose cells that are not selected — worse than per-cell boxes, because it would be
claiming something false.

**Recommended: one outline per contiguous run within the selection.** Exactly one box for the normal
drag, an honest box per piece otherwise, and the count in the chip already says how many cells. A
union outline (marching squares) is the only fully general answer and is not worth the code.
**Owner decision E3.** ✅ **BUILT 2 Sep 2026** in `redrawGridOverlay`: a run also breaks where the
rendered width changes, so a two-column cell gets its own rectangle and every outline is a true
rectangle of selected cells. A mixed run keeps a solid outline and marks its no-room cells inside it.

---

## 3. What this does to the shipped feature

**The partial mode becomes F2-e**, the thing D7 explicitly reserved. Today the run is derived from the
*seed* cell and always extends to the maximal contiguous stretch — the selection does not constrain it.
Under the owner's rule, a partial selection must swap **exactly the cells selected**, which is
selection-defines-range. That is a behaviour change to a shipped gesture, and it re-admits the
zig-zag column the owner dislikes — but now only when explicitly selected, which is the right place
for it. **Owner decision E4: is the partial mode wanted at all**, or does the whole-column swap replace
it outright? Retiring it would delete the collateral preview, the magnitude gate and the D2 tolerance
question along with it, which is a large simplification.

**What does NOT change:** the store's mutual-pointer model, the reconciler's position inside
`computeSchedule`, the gate, the knob, the toolbar buttons, the settle animation, the save-format
discipline. This is a second store and a second mode, not a rewrite.

---

## 4. The frozen edit — the exact seam, and why it is two lines

Slot order is assigned in **one** place, inside `computeBlockLayout`:

```js
const sortedSlots = Array.from(firstAppear.keys()).sort((a,bv)=>{
  const fa = firstAppear.get(a), fb = firstAppear.get(bv);
  return (fa - fb) || (a - bv);
});
const map = new Map();
sortedSlots.forEach((slot, localIdx) => map.set(slot, localIdx));   // <- the seam
```

⚠️ **The hook's purpose is to PRESERVE the order, not to reorder.** It sounds backwards and it is the
key to the whole design (§2.1): the move itself is a `col`-value exchange done in non-frozen
`computeSchedule`, and this seam exists only to stop `blockSlotMaps` re-deriving the order from first
appearance and cancelling it out. Read it as *"pin the order the block already had"*.

The edit is to ask a **non-frozen** helper for the order instead of using the derived one:

```js
applyColOrderOverride(sortedSlots, yearBlocks[bi], schedule)      // non-frozen, lives outside
  .forEach((slot, localIdx) => map.set(slot, localIdx));
```

With nothing stored the helper returns its input unchanged, so the output is **identical**, not merely
equivalent. Every rule of the layout, every width, every span decision is untouched.

**Why it cannot be done outside the freeze at all** — this is the part that forces the ask, and it is
worth stating because the per-week swap *did* avoid it. Slot order is a pure function of **which column
appears first in the block**. Production appears in week 1, so whatever `col` value it carries appears
first and takes slot 0. Exchanging Production's and Casting's `col` values globally changes nothing:
the sort is on appearance order, with the raw `col` only as a tiebreaker. There is no assignment of
`col` values that puts a phase appearing in week 1 anywhere but slot 0. ⛔ **Do not spend another
session trying** — this is exactly the trap the store's own comment describes when it forbids a `seat`
field.

**Blast radius: four callers, and that is the whole point.** `renderSpreadsheetView` (screen + the
print-fallback waterfall PDF), `exportExcel`, `buildWaterfallPdf`, and `layoutFingerprint` (the gate).
One decision, four consumers, no way for them to disagree — the same property that makes the per-week
swap safe.

**Two things a reorder moves that a per-week swap does not**, both of which the gate already measures:

- **The Simultaneous Post lane.** `blockSimSlot` is Production's slot **+1**. Reordering columns moves
  Production's slot, so it moves the SimPost lane and can widen the block. Owner decision D5 already
  refuses any Production swap in a block containing a SimPost week; the same refusal applies here and
  is the reason it exists.
- **Hand-dragged column widths.** `colWidths` is keyed `y<year>:s<slot>`, so a width stays with the
  **position**, not the phase — owner decision D3, already ruled, and now actually load-bearing rather
  than theoretical. With no hand-dragged widths nothing changes at all.

---

## 5. The store, and the save-format contract

A block-level **transposition**, keyed by year and phase key, reusing the shape already proven:

```js
gridColOrder['2026|casting']    = { with: 'production' }
gridColOrder['2026|production'] = { with: 'casting' }
```

- ⛔ **Keyed by phase KEY, never by `col` or by slot index.** `col` is documented as unstable — it is
  an opaque identity from `segCol`'s free-column reuse and **shifts whenever any start date changes** —
  so a stored column order would silently mean something different after an unrelated edit. A slot
  index means a different column in each year block. A phase key is stable under both, and under
  renames (the label lives in a separate `name-<key>` field).
- **Mutual pointers, validated as a whole** before any pair is built, exactly as `swapPairsForWeek`
  does: a self-pointer, a one-sided entry, a phase named by two others, or anything that is not a set
  of disjoint 2-cycles yields **no** reorder for that block rather than a wrong one.
- **A phase that names the column, identifies the column.** Where a column hosts several phases, any
  one of them addresses it (§2.1 E1).
- **Nine save sites**, the same list `gridColSwaps` walked: `captureSnapshot`, `applyStateSnapshot`
  (reassigned, never merged — `snap.x ? {...snap.x} : {}`), `resetAll`, the undo stack, the crash
  backup, `buildSavedHtml`, `shiftCalendar`'s re-key, the notes-reset branch (**deliberately excluded**,
  like `gridColSwaps` — column order is layout, not notes), and the harness fixture.
- ⚠️ **`shiftCalendar` does NOT re-key this store.** `gridColSwaps` is week-keyed so it must travel;
  `gridColOrder` is year-keyed, and a shift that crosses 1 January would need the order to move to a
  different year — or to be dropped. **Owner decision E5.** Recommended: **drop it for a block that no
  longer exists** and keep it for one that still does, because a phase pushed into a new year block has
  no established order there.
- **No `SNAPSHOT_VERSION` bump.** An absent key means "no order", which is the correct default for
  every file ever written. Same reasoning as `gridColSwaps`.

---

## 6. Acceptance gate — the measurement offered with the frozen edit

Nothing ships until all of this passes. The first three are what make a frozen edit defensible: they
prove the change is **inert** until used.

1. **With no order stored, `dist/index.html` produces a byte-identical waterfall PDF and byte-identical
   Excel parts** against `tests/baselines/2026-08-29-stage-7/`. The gate already does exactly this
   compare, so a regression cannot hide. This is the whole safety argument for touching
   `computeBlockLayout`: the override is provably a no-op when absent.
2. **0 horizontally clipped cells**, and `gridWidthPt` unchanged, on the baseline calendar.
3. **`prove-col-permutation.mjs` still passes** on the verbatim `computeBlockLayout` source. If the
   edit changes the fuzzer's slicing, update the slice, not the theorem.
4. ⭐ **A new harness leg proving the owner's case, which is the point of the feature:** Production
   20 weeks, a 4-week phase overlapping weeks 14–17. After a whole-column swap, **every cell of both
   phases keeps its `colspan`** and only its slot changes. **Zero** weeks reflow. That is the assertion
   that distinguishes this feature from the shipped one, and it is the claim §1 flagged as unmeasured.
5. ✅ **A leg proving the mode inference** (`stintbtn`): selecting every cell resolves to the column
   swap, selecting a subset resolves to the per-week one, and the chip says which **before** commit.
6. ✅ **A leg proving the store survives a restore** and re-applies, driven by a real `.sptcal` fixture
   (every `stint*` leg loads its `.sptcal` through the inline saved-state path, which converges on the
   same `applyStateSnapshot` the picker uses) — plus `stintoneside`, proving a hand-edited one-sided
   entry yields no reorder rather than a wrong one. ⚠️ Not proven: the *picker* path itself, which
   stalls on IndexedDB in headless Chrome like the `restore` leg.
7. ✅ **Excel and the waterfall PDF re-exported and compared to the screen** (`stintexport`), by reading
   the files back — ExcelJS for the workbook, an inflated content stream for the PDF: the swapped order
   appears in both exactly as on screen, and every screen column width appears in the PDF at the page's
   fit scale (0.9). ⚠️ The month PDF is a browser print and is not read back; it renders the month
   view, which does not carry column order. The "owner's calendar" is the `stintswap-shared` fixture
   shape, not a file of the owner's — none is in the repo.

---

## 7. Owner decisions

| | Decision | Recommendation |
|---|---|---|
| **E0** | ✅ **AUTHORISED, GATED (owner, 1 Sep 2026).** The two-line edit to `computeBlockLayout` may be made, on the strength of §6 — and **only** on it: if any item in §6 fails, it does not ship. Recorded in `HANDOFF.md`. | — closed |
| **E1** | ✅ **RESOLVED AND BUILT (2 Sep 2026).** "Move only the stints you selected" stands; the owner was right and the earlier "wholesale" recommendation was wrong. The neighbouring column CAN host several stints inside yours (exchanging with one of them loses cells — measured, 4 weeks), so the gesture exchanges with **every** overlapping stint in that column and names them all, before and after the commit. The store reads `with` as a graph; a mutual pair is the two-member case. | — closed |
| **E2** | ✅ **DECIDED AND BUILT.** The owner's hover button solves the selection problem (§2.2), and the label is **"Swap Block"** — not "Move", per their own D10 ruling. Gate leg `stintbtn`. | — closed |
| **E3** | ✅ **DECIDED AND BUILT:** one outline **per contiguous run** in the selection, not one bounding box. A ⌘-click set or a marquee that skipped a hiatus week would otherwise get a box enclosing cells that are not selected. | — closed |
| **E4** | ⏸ **DEFERRED by agreement** — is the per-week partial swap wanted at all once stint-level exists? Keeping it means keeping the collateral preview and the magnitude gate; retiring it deletes both. Decide after using both. **The only open decision.** | Decide after using both |
| **E5** | ✅ **DECIDED:** keep the order for a year block that still exists; **drop** it for one that no longer does. A stint arriving in a new year gets that year's natural order until swapped there. | — closed |

---

## 8. Sequencing

```
1. ✅ the no-reflow claim is MEASURED (section 1), on real data, with no code change.
1b. ✅ MEASURED -- section 2.1's table holds. `stintswap` (both columns shared: the two named
   stints trade places, Localization and Post do NOT move, mc unchanged, no cell lost) and
   `stintnoreflow` (zero cells change shape where the per-week swap widens two).
2. [STOP-AND-ASK] E0 recorded in HANDOFF.md, with E1-E3 answered.
3. ✅ DONE -- the store, the reconciler, the non-frozen order helper, the save sites.  <- no gesture
4. ✅ DONE -- the 2-line frozen edit, and §6 items 1-5 pass. Inertness PROVEN: with nothing
   stored the waterfall PDF and every Excel part are byte-identical to the baseline.
   ⏭ §6 item 6 (a .sptcal restore fixture + a one-sided-entry leg) and item 7 (re-export the
   owner's own calendar and compare to screen) are still outstanding.
4b. ✅ DONE -- E1 complete: the group model in the reconciler, the closure in the gesture,
   every member named. Legs stintgroup, stintmulti, stintoneside.
5. ✅ DONE -- the "Swap Block" hover button (section 2.2) -- overlay only, no frozen change.
6. ✅ DONE -- mode inference + the chip that states it + the outline change.      <- ⭐ SHIPPABLE
   §6 items 6-7 done too (stintoneside, stintexport). Gate: all stint legs pass; the only
   failure is the known `restore` IndexedDB stall.
--- ship, ask, wait ---
7. E4: retire or keep the per-week swap.
7b. ✅ FIXED 2 Sep 2026 -- the first real-use defect. A block swap in a year that ALREADY carried
   one was refused as a collision, because applyStintSwaps validated each group against every
   other phase's NATURAL column rather than validating the whole set together. Gate leg
   `stintchain`, on the owner's own calendar. See HANDOFF's table.
8. ⚠️ Known limitation to raise with the owner: a block already swapped with one column cannot be
   swapped with a THIRD (refused as 'chained', stated in the chip). The store holds disjoint
   2-cycles and a 3-cycle is not one of them; the per-week store shares the limit. Lifting it
   means a permutation store ({takes:<key>}), a separate decision.
```

**Step 1 was done before anything else**, and that ordering is the point: the premise was one
unmeasured code reading that the entire plan depended on, and it cost a single console session to
settle. It could equally have killed the plan.
