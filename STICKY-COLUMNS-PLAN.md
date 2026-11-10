# Sticky columns — a phase you move keeps its column (BUILT 6 Nov 2026 on branch `sticky-cols`, not committed — §8)

Owner, 6 Nov 2026, three screenshots of a test phase moved a week at a time around Production (right of it starting
7/26, LEFT starting 8/2, right at 8/9): *"I think whats still bothering me is this"* … *"its not just about production
i dont like how it does this for any phase"*. Then, by picker, of three options: **"Plan sticky columns"** (the other
two: reverse the same-week tie, or leave it). Tracker card `no-side-flip-when-nudged`. Builds on
[`FILL-INTENT-PLAN.md`](FILL-INTENT-PLAN.md) §8–9 and [`LAYOUT-RULES.md`](LAYOUT-RULES.md) §0. Built as §4–§7 say, with the
three refinements in §8.

## 0. Why the rules alone cannot fix it (measured)

The flip is rule 6's same-week tie (ruling R-C): when two phases start the same week and both could take a column
that has just come free, the shorter takes it. A week either side there is no tie — a week early the column is still
busy, a week late the other phase already has it — so the shorter phase lands on the other side only in the tie week.
Reproduced on a synthetic twin of the owner's calendar: right, left, right.

**Any fixed tie rule makes one of the two phases flip** when it is nudged through the tie week: today the shorter
(Test), reversed the longer (Production). Reversing the tie also costs one of the 15 pictured calendars (hand-12: a
3-week phase beside Post, the picture R-C was ruled from; 98.1% → 97.8%, 31 → 37 column misses). A rule that looks
only at dates cannot know which phase the user just moved, so it cannot keep both still. The layout has to remember.

## 1. The idea in one line

**A phase you move keeps the column it was in, whenever its new dates still fit there.** The rules place everything
else exactly as today. Like the fill wish and the swap's sides, it is stored on the phase, saved with the calendar,
undone by Undo and cleared by Reset Columns.

## 2. What is remembered, and why not a column number

`col` is an opaque number the placement hands out in start order; it shifts whenever any start date changes, so a
remembered number would land on a different column (the same trap COLUMN-ORDER-PLAN §6 and the swap stores avoid).
What IS stable is the relationship the hand move (`colFollow`, rule 10) already uses: **which phase's column this one
continued.** So each kept phase stores its predecessor in its column:

- `colKeep[phaseKey] = '<the phase whose column it took>'` — it continued that phase's column; or
- `colKeep[phaseKey] = ''` — it opened a column of its own (rule 5), and keeps one.

## 3. When a phase is kept (proposed ruling K1: only the phases you move)

After every committed `update()` on a stamped calendar, compare each phase's dates with the schedule before the edit.
**A phase whose start or end changed** — typed date, ▲ / ▼, Shift, Build Around, a length edit, a hiatus that moved it
— gets `colKeep` set to the relationship it had in the layout BEFORE the edit (if it was on the calendar then). The
layout is then recomputed with that memory. Phases that did not move are placed by the rules, as today.

⛔ **Never on a restore.** Load, New, undo / redo, crash recovery and a scenario tab switch REPLACE the calendar
rather than move a phase in it; compared with the previous `currentSchedule` (another calendar, or another tab) every
phase would look moved. `applyStateSnapshot()` raises a flag the next `update()` reads to skip the comparison, the
`stintSwapsNeedSides` / `simLaneNeedsMove` shape.

Why only the moved ones: if every phase were kept after every edit, the layout would freeze in whatever shape it had
while the calendar was being typed in, in typing order — Production placed before Prod Prep existed would keep a column
the rules would never give it. Keeping only what the user moved limits the memory to the phases they have handled,
which is also what they are watching.

## 4. Placement (`placeSegmentsByRules`, not frozen)

In start order, for each phase:

1. **A hand move** (`colFollow`) wins, as today.
2. **Kept** (`colKeep`): a predecessor that is placed and whose column is free at this phase's start → that column; `''`
   → a new column (rule 5). Silent: no row note. If it does not fit (the predecessor is still running, or is not on the
   calendar), fall through to the rules **and keep the entry**, so nudging back brings it home (the `colFollow` rule:
   "a choice that can't apply is kept, never deleted").
3. **The rules** (2–8 as built), with one addition, a **reservation**: a column is not offered to this phase if a
   later-starting kept phase remembers continuing that column's last occupant and this phase would still be in it
   when that one starts. Without it, rule 6 would hand Test's remembered column to Production in the tie week.

Production's rule 3 and the Sim Post lane (rule 8) follow Production wherever it lands, so a kept Production carries
its lane. Stint swaps (§8 of the fill plan) and per-week swaps apply on top, unchanged. Unstamped calendars ignore
`colKeep` entirely.

⛔ **Written only from `update()`.** `computeSchedule()` runs inside trials — the swap gate, `followRunFor`, the year
shapes, Production's backward search (up to 300 times) — so the placement READS `colKeep` and never writes it.
`update()` detects the moved phases, sets their entries from the previous `currentSchedule`, and recomputes once.

## 5. State and the file

`colKeep` beside `colFollow`: a PERMANENT snapshot key, sorted, ABSENT while empty, so a calendar nobody has moved a
phase on saves byte for byte as before. Sanitized to known phase keys and string values; restored unconditionally;
cleared by New and by Reset Columns (`resetColumns()` and `columnEditsExist()` gain it); pruned when a custom phase is
removed. Undo restores it with everything else. An older build ignores the key and lays out by the rules.

## 6. Rulings (owner, 6 Nov 2026, by picker — all four as recommended)

**K1 only the phases you move · K2 the rules place it while it can't fit, and it returns · K3 kept wins over the rules
for that phase · K4 no marker.** The questions as asked:


- **K1. Which phases are kept?** Only the ones you move (§3, recommended), or every phase after any edit.
- **K2. A kept phase that can't fit** (moved into an overlap with its predecessor) goes where the rules put it, and
  returns to its column when nudged back (recommended), or forgets the column.
- **K3. Kept beats the rules for that phase.** A moved phase keeps its column even past rule 2's four-week gap and
  R-D's "right of everything running" — e.g. a phase moved five weeks later stays in the column it had. Recommended
  yes: that is the point. (The rules still decide every phase you haven't moved.)
- **K4. No marker.** Nothing on screen says a phase is kept (recommended: keep the app simple); Reset Columns clears
  every kept column with everything else.

## 7. Proof (when built)

- New leg `stickycols` on a synthetic twin of the owner's calendar (Prod Prep in the left column, Production and a
  10-week custom phase around 8/2): nudge the short phase 7/26 → 8/2 → 8/9 and back: never changes side; the same for
  Production; a move into an overlap goes where the rules say and comes back when nudged back; Reset Columns clears;
  Undo restores; Save / Load carries `colKeep`; a calendar with no moves saves no key.
- Re-expected where a leg moves a phase and asserts the rules' layout afterwards: `layoutrules` (layout-r2g's R2Gb/c
  type new dates — under K3 Test stays in Writers' column at five weeks), `layoutrules` r13g, `simpostdays`,
  `colreuse`, `swapholds`, `phasefill` F3, the swap section's legs that edit dates. Listed leg by leg before building.
- The 15 pictures: unchanged by construction (each is loaded fresh, no phase moved), re-scored to prove it.
- The full gate.

## 8. As built (6 Nov 2026)

Branch `sticky-cols` (worktree `.claude/worktrees/magical-ishizaka-a283e6`) = `follow-gap` 598bb44 + the `lab-gap`
worktree's uncommitted work + this. `src/legacy/app.js`: `colKeep`, `COL_KEEP_LANE`, `colKeepRestored`, `colKeepBase`
beside `colFollow`; step 10b in `placeSegmentsByRules`; `noteMovedPhases` / `rememberPlacements` called from `update()`.
Three things the plan did not say, each found while building:

1. **The baseline is per phase, not the previous schedule.** A date typed into a date box arrives digit by digit
   (`0002-08-04`, `0020-…`, `0203-…`, `2031-08-04`); the in-between years are an error schedule with no layout, so a
   comparison with the schedule just before missed the finished date. `colKeepBase` holds each phase's last PLACED dates
   and relationship, survives an update that places nothing, and is emptied by a restore. Leg case K10.
2. **In a same-week group a kept phase whose column is free goes first** (after a hand move that can apply). The
   reservation alone was not enough: with a free column further left, the unmoved phase placed first would take it
   (nothing running yet, so R-D allowed it) and land on the other side.
3. **The reservation also covers rule 6 (Post into the lane) and Production's lane**, not only rules 2–5. And the lane
   has its own value, `simPostLane`: Production's own column and the lane are both "Production's", and a Post that had
   continued the lane must not be sent to Production's column.

Also: an entry is written only while the phase has none (the first remembered column is the one it keeps — K2 needs
that, or the rules' column would overwrite it while it cannot fit); entries naming a removed custom phase are pruned
with it; both column caches (`_swapGateKey`, the knob's) carry `colKeep`. No frozen code changed.

**Proof.** Leg `stickycols` (fixture `sticky-cols`), 12/12, red on the build before at K1, K3, K6, K8. `layoutrules`
re-expected: `layout-r2g` R2Gc (a moved Test keeps Writers' column at five weeks) + new R2Gd (after Reset Columns the
rules put it right), `layout-r2h` R2Ha (a moved Prod Prep stays right all six weeks) + new R2Hb (the rules' own sweep,
Reset Columns after each step: one change, at 3/3). `colsreset` gained `colKeep`. Every other layout fixture, `phasefill`
(F3 unchanged), `swapholds`, `simpostdays`, `centrepullback`, `colswapcache`, `settingswin`, `hdrcontrols`, the swap legs
and `monthmap` green. The 15 pictures: 98.1%, 31 column misses, 0 width misses, unchanged. `npm run check` 40/40.
Full gate on the build (sha256 `5921990…`): 4,270 PASS / 2 FAIL, both load timing, both green alone (`pwagate`,
`scenariocompat` v1.2.0).

