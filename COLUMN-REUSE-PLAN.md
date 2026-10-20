# COLUMN-REUSE-PLAN.md

**A phase may take over the column of a phase that has just finished, so a long multi-stage
calendar keeps a few steady lanes instead of drifting right.**

Written 20 Oct 2026 (owner rulings the same day, by picker; HANDOFF.md, "RULED, NOT YET PLANNED", ruling 1).
Read [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) → [`COLUMN-ORDER-PLAN.md`](COLUMN-ORDER-PLAN.md) first.
Branch `column-reuse`, worktree `.claude/worktrees/column-reuse`.

---

## 1. What the owner asked for

From a reference calendar the app could not lay out (kept out of the repo):

- **Automatic, with a per-phase override.** A phase takes the column of a phase that **ends the week it starts**.
- **Tie:** when two phases end that week, it takes the column of the phase it "starts after".
- **Otherwise** it takes the lowest free column, and failing that a new column on the right.
- **Opt-in per calendar, saved in the file.** Every existing calendar and export stays byte-identical.
- **Override from both** the phase row in the sidebar and a grid gesture.

## 2. Why today's rule cannot do it, and why swaps cannot either

Placement lives in `computeSchedule` (the `segCol` block). Segments are taken in start order, and each one must sit
to the RIGHT of every earlier phase still running when it starts. A freed column on the left is therefore never
reused while anything to its right is still going. Example: A runs Jan–Jun in column 0 and B starts in May in
column 1. Then C, which starts the day A ends, must go right of B, into column 2, although column 0 is free.

A year block's column count is the number of distinct `col` values in it (frozen `computeBlockLayout`). Both
swap tools preserve each week's `col` multiset (`applyColSwaps`, `applyStintSwaps`), so they reorder columns and
can never remove one. The only place to change the count is where `col` is assigned.

## 3. The rule, exactly

With the calendar's switch ON, the `segCol` block runs this instead (start order, ties by phase order, as today):

1. **Free columns** are those whose last occupant has ended by this segment's start (`colFreeAt <= start`).
   Today's "right of every running phase" floor (`minCol`) is NOT applied.
2. **Override.** If the phase has an override "same column as X", X is placed, and X's column is free at this
   start, take it.
3. **Handoff.** Otherwise, take a free column whose last occupant ended the week this segment starts: same Monday,
   or separated only by all-phase hiatus weeks (ruled Q5).
4. **Tie among handoffs:** the column of this phase's predecessor in `PHASE_CHAIN` (the phase its "↳ Start
   after" button names). If that doesn't settle it, the leftmost (ruled Q1).
5. **No handoff:** the lowest free column.
6. **Nothing free:** a new column on the right.
7. **Lane numbering** (ruled Q2): if Production is placed, renumber the columns so Production's column is 0 and
   the others keep their relative order. Frozen `computeBlockLayout` orders a year's columns by first
   appearance, then by `col` value. So this decides only which column goes left when two first appear in the
   same week, as at the top of a year. That is what puts the shoot's column on the left in later years.

Checked by hand against the reference: every column count and every left/right order matches, with no swaps.

⛔ **`col` stays an opaque identity.** It is read only inside frozen `computeBlockLayout` /
`computePhaseRowLayout` (verified by the column-swap work), plus the swap gate, which calls them. Both take it as
data, so **no frozen edit** is needed, and the switch OFF runs today's code path unchanged.

⚠️ **"Start after" is a one-shot button, not a stored link.** `prevChainSegment()` names the nearest scheduled
earlier phase in the fixed `PHASE_CHAIN`, which lists the six built-ins only. Custom phases have no predecessor,
so for them rule 4 falls back to the leftmost.

## 4. The per-phase override

- **Sidebar:** a "Column" select on each phase row, shown only while the switch is on. Options: Auto, Own column
  (ruled Q4: never takes a freed column, always opens a new one on the right), and "Same column as <phase>" for
  each phase that starts earlier.
- **Grid gesture** (ruled Q3): drag a block's swap knob onto a column that is free for the phase's whole run, and
  the phase moves in. The gesture stores "Same column as <the phase that last held that column>". Dropped onto a
  busy column, the knob swaps, as today. A free column that no earlier phase ever held has nobody to follow, so
  the drop is refused with a message on the chip, as refused swaps are.
- **Can't be honoured** (X still running at this start, X unscheduled, or another phase took the column first):
  placement falls back to Auto, and the row says why (ruled Q6). The stored choice is kept, never deleted, as stale
  swaps are, so it applies again once it fits and a temporary typo cannot destroy it.

## 5. Save format

- `colReuse` (boolean) in `captureSnapshot()`. Absent means off, today's layout.
- `colFollow` (`{ phaseKey: otherPhaseKey | 'own' }`) in `captureSnapshot()`. Absent means `{}`.
- Both restored unconditionally in `applyStateSnapshot()`, reset by New, part of undo.
- Keyed by phase key, as the swap stores are: stable under renames and date edits.
- A file from this build opened in an older build loses only the reuse, which an older build can't draw anyway.
  No `SNAPSHOT_VERSION` bump.
- The switch and the select are controls whose values live in these stores, not in `fields.byId`. Each gets its
  own id and is excluded from `collectFieldValues()` the way `.tools-menu` is, so nothing is saved twice.

## 6. What else reads columns, and what happens to it

| Reader | Effect with reuse on |
|---|---|
| Frozen `computeBlockLayout` / `computePhaseRowLayout` | Fewer slots per year; spans and the even split follow as today |
| Simultaneous Post lane (Production's slot + 1) | Unchanged rule; the frozen code already widens a year when the lane is taken |
| `gridStintSwaps` / `gridColSwaps` | Applied after placement, keyed by phase; the swap gate refuses any that no longer fit, and they are kept |
| `colWidths` (`y<year>:s<slot>`) | Ruled Q7: turning the switch on or off clears the hand-dragged widths of every year whose column set changes, in the same undo step as the switch. Other years keep theirs |
| `cellSpans` | Already re-checks the phase count per row and shrinks a stale claim |
| Month view, both month PDFs | Don't read `col`; unchanged |
| Shift tools, Rebuild, Close all gaps | Move dates only. Columns re-derive on the next `update()`, and overrides travel by phase key |
| Single Column Mode | Independent: one block, same placement |

## 7. Tests

- **Fixtures**, synthetic, made-up dates and names, with three overlap patterns in one calendar: a
  same-week handoff, a two-way tie broken by the chain, and a lane freed while something to its right still runs.
  A second fixture covers a custom-phase tie and an override that can't be honoured.
- **Leg `colreuse`**, using the table reader that `customunits` and `phasenum` use:
  - columns per year and the phase in each column, switch off vs on;
  - override honoured, then refused with its message;
  - save → load round trip;
  - undo of the switch;
  - Excel's columns and the waterfall PDF's text runs agree with the screen.
  - It must be red on the pre-change build.
- **Inertness:** the full gate with the switch off. Waterfall PDF and every Excel part byte-identical, 0 clipped,
  `fields.byId` count unchanged.

## 8. Steps

1. Engine: the rule (§3) behind `colReuse`, plus `colFollow`. Save, restore, undo, and Q7's width clearing.
2. Sidebar: the switch, in a card of its own in the Settings tab (ruled Q8); the Settings-window session re-homes
   it. Then the Column select with its can't-honour message.
3. Grid gesture: drag the knob into a free column (§4).
4. Fixtures, leg, full gate, changelog, HANDOFF.

## 9. Rulings (owner, 20 Oct 2026, by picker)

- **Q1** When the chain doesn't settle a tie (custom phases): **the leftmost.**
- **Q2** **Production's column goes left** when two columns first appear in the same week of a year.
- **Q3** **Drag into a free column**, through the existing swap knob.
- **Q4** **Yes**, the select offers "Own column".
- **Q5** **Yes**, a handoff counts across all-phase hiatus weeks.
- **Q6** A can't-be-honoured override falls back to **Auto with a note on the row**; the choice is kept.
- **Q7** Turning the switch on or off **clears hand-dragged widths in the years whose columns change**, one undo.
- **Q8** The switch goes in **the Settings tab now**; the Settings-window session moves it.

⚠️ Correction recorded with Q1: ruling 1's "the one it starts after" was put to the owner as "the existing link on
the phase row". There is no stored link: "↳ Start after" is a one-shot button over the built-ins' fixed
`PHASE_CHAIN`. The reference calendar's tie is between built-ins, so it resolves as the owner intended.
