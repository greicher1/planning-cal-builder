# AUTONOTE-FOLLOW-PLAN.md: an edited auto-note follows EVERY schedule change, not only drags and shifts

**Status: PLANNED AND RULED, NOT BUILT.** The owner approved all three recommendations by picker (§7). The build
waits for `autonote-grips` to be merged into `main` (§6). Written 19 Oct 2026 as the follow-up to branch
`autonote-grips` (`5e487d1`, `932badf`), which fixed the month-view drags. No frozen code. No save-format change.

---

## 1. The bug, measured

An auto-note the user has edited ("Start Principal Photography 6/29/26" plus a line of their own, or a note stored as
exactly the auto text) is **literal text** in `userNotes[week]`. Only two places rewrite it when the schedule moves:
`shiftCalendar` (R5, `rewriteMovedAutoNotes`) and, since `autonote-grips`, the three month drags
(`autoNoteBaseline` / `reapplyAutoNoteBaseline`). Every other way the schedule moves leaves the old date on screen, in
Excel and in both PDFs, because all four read `userNotes`.

**Reproduced with trusted CDP input** (mouse clicks on the date popover and the fields, real key events) on
`tests/fixtures/autonote-grips.sptcal`, against `autonote-grips`' own fix build (`20f129fb…`). So the drag fix does
not cover any of these. Script: `sidebarnotes.mjs` in this group's shared notes folder; private port 8791.

| Case | Sidebar edit | What the month view shows after it |
|---|---|---|
| S1 | Production start picked as Mon 7/6/26 in the date popover | **"Start Principal Photography 6/29/26"** + Table Read on 6/29, **and** the real "…7/6/26" on 7/6. The waterfall's 6/29 row still says 6/29/26 |
| S1t | The same date TYPED, 07/06/2026 | Identical to S1 |
| S2 | Last episode's days 8 → 9 | Wrap is 10/21/26. **"Principal Photography Wraps 10/20/26"** still on 10/20, and **nothing on 10/21**: the stored note hides that week's real auto text |
| S3 | Show Info episodes 10 → 12 | Wrap is 11/11/26. The stale "Wraps 10/20/26" on 10/20 **and** the real "Wraps 11/11/26". Two wraps |
| S4 | Custom holiday "Studio shutdown" on Mon 6/29/26 (after the Continue? dialog) | First shoot day is 6/30, wrap 10/21. **"Start Principal Photography 6/29/26"** still drawn under the holiday |

**Also affected, by reading (not driven):** Rebuild From (`workBackwardsFrom` / `workForwardsFrom` → `refreshAfterRestore`),
Close all gaps, "↳ Start after previous phase" (`autostartPhase`), the Region select, a holiday's Enable checkbox,
the bulk toggle, removing a custom holiday, Reset holidays, block days and Blocks mode, half days, Production's day
marks, hiatus rows (all-phase and per-phase), a phase's unit, end date or day count, and custom phases. Anything that
moves a milestone ends in `update()` and never in R5.

---

## 2. Why a simple hook would be wrong: `update()` sees the keystrokes

The obvious general fix is "in `update()`, rewrite each edited note from the PREVIOUS schedule to the new one". That
chains one `update()` to the next. It is wrong, because `update()` is bound **undebounced** to every field's `input`
event, and the user's real keystrokes pass through other dates on the way. Measured on the same build (every
`input` value the field reported):

- Typing **07/06/2026**: `2026-07-29`, `''`, `2026-07-06`, `0002-07-06`, `0020-07-06`, `0202-07-06`, `2026-07-06`.
  So 7/29 is a real, valid date the schedule was computed for, and three invalid years followed it.
- Retyping **06/30** over 06/29: `2026-06-29`, **`2026-06-03`**, `2026-06-30`.
- Typing **12** over 10 episodes: **`1`**, `12`.

Take the 06/30 retype. At 6/3 the shoot leaves the 6/29 week. A chained rewrite strips "Start Principal Photography
6/29/26" from that week's note and leaves "Table Read". At 6/30 the shoot comes back, but "Table Read" no longer
opens with any auto text, so nothing restores it. A stored note **replaces** its week's auto text
(`effectiveNoteText`), so the Start milestone would vanish from the calendar, the workbook and both PDFs.

So the drag fix's own rule has to hold here too (its "RECOMPUTED FROM THE PRESS ON EVERY STEP, never chained"). Every
rewrite starts from the note **as the user left it**, against the schedule it was written beside. Typed fields have no
press, so the original has to be remembered **per note**.

---

## 3. Recommended: one hook in `update()`, with a per-note memory

### 3.1 What it holds

`autoNoteMemory`, session-only like the drags' `notesBase`. It is never in `captureSnapshot()` and has no DOM id, so
it is not state (CLAUDE.md "Not state, deliberately"). Per week key:

- `orig`: the note's value (JSON) when it was last set by anything **other than** this hook;
- `base`: a reference to the schedule that was on screen then;
- `written`: the value (JSON) this hook last left in `userNotes[key]`.

Plus `lastGoodSchedule`: the last schedule `update()` computed with no `error` and at least one week.

### 3.2 What runs, once per `update()`

Straight after `currentSchedule = computeSchedule(state)`, **before** `maybeRunColSwapGate`, `syncRowHeights` and
`render`, so everything downstream draws the corrected notes. That costs no extra render, unlike the drags'
`reapplyAutoNoteBaseline`, which re-renders.

1. **Off** while `suppressDirty`, `applyingUndoRedo` or `noteFollowHold` (§3.4) is set.
2. **Off** while the new schedule is invalid (`error`, e.g. `'invalid-year'`, or no weeks). Notes and memory are left
   as they are, so `0002-07-06` and friends change nothing.
3. For each key in `userNotes` ∪ memory:
   - **The value changed under the hook** (no entry, or the current JSON ≠ `written`)? Re-remember it:
     `orig` = the current value, `base` = `lastGoodSchedule`. The note editor commits with `render()` + `markDirty()`,
     not `update()`, so this is how a fresh edit is picked up, and against the schedule the user was looking at. With
     no `lastGoodSchedule` yet, skip the key this round. With the value gone, drop the entry.
   - **Then rewrite from the original**: `next = followAutoText(orig, weekAutoTexts(base, key), weekAutoTexts(currentSchedule, key))`.
     Write `next`, or delete the key when it is plain auto again, and record `written`.
4. At the end of **every** `update()`, suppressed ones included, set `lastGoodSchedule = currentSchedule` if it is
   valid. ⛔ The suppressed updates matter. After a Load, the loaded calendar's own schedule must be the base for its
   notes, never the previous calendar's.

`followAutoText(value, stale, fresh)` is the per-note body of today's `rewriteMovedAutoNotes`, extracted as a pure
function: whole lines only, the sheet/month tie rule, `''` left cleared, `{notes:[…]}` skipped, plain auto when only
auto text is left. `rewriteMovedAutoNotes` calls it, so the shift tools behave byte for byte as they do now.

⭐ **The stale text is computed at rewrite time from the remembered schedule**, not stored as text. Both sides then
see the same holiday visibility. A holiday-visibility checkbox only repaints (`render`, no `update`), and with this it
can never rewrite a note later. Only a schedule change does.

Undo is one step, notes and fields together: the hook runs inside the same `update()` whose `markDirty()` schedules
the push.

### 3.3 The paths where the previous schedule belongs to ANOTHER calendar

| Path | How it reaches `update()` | Excluded by |
|---|---|---|
| **Load** (picker, recents, double-click launch, the conflict dialog's "load newer") | `openRecentFile` → `applyStateSnapshotAtomically` → `refreshAfterRestore`, with `suppressDirty = true` throughout | Hook off (suppressDirty). **Memory and `lastGoodSchedule` cleared at the top of `applyStateSnapshot`**, the one funnel every restore uses |
| **Failed Load rollback** | `applyStateSnapshotAtomically` re-applies the previous state, then `refreshAfterRestore`, still suppressed | The same two |
| **Backup recovery** | `restoreSavedState` → `applyStateSnapshotAtomically` → `refreshAfterRestore`, suppressed | The same two |
| **Undo / redo** | `applySnapshotJSON` sets `applyingUndoRedo` and `suppressDirty`, then `applyStateSnapshot` → `refreshAfterRestore` | The same two (both flags) |
| **Boot, and a shareable copy opening itself** | `suppressDirty` starts `true` and is released only after the boot `refreshAfterRestore()` | The same two |
| **New** | `newFile` → `resetAll()` (its last line is `update()`), suppressed | Hook off. `resetAll` clears `userNotes`, so clear the memory beside it |
| **Shift All / Shift From / Anchor To** | `shiftCalendarDates` re-keys the notes, then `refreshAfterRestore()` **NOT suppressed**, then its own R5 rewrite | ⛔ `noteFollowHold` for the shift's duration, and the memory cleared after it (the keys moved). Without the hold, the hook would read re-keyed notes against the pre-shift schedule before R5 had run |

**Why not `monthCursorRecheck`.** Load, recovery and New arm it, undo/redo does not. It is disarmed only once a
schedule HAS a month range, and after New that can be several real edits later. It answers "which month to show",
not "whose notes are these".

**Why not "skip `refreshAfterRestore()`".** Rebuild From and the shift call it as a refresh after a user's own move.
Skipping it would leave Rebuild From broken.

**Reset Waterfall Notes** (`resetWaterfallNotes`) empties `userNotes` with a `render()`. The memory then mismatches
and drops itself. Clear it there anyway, for legibility.

### 3.4 The month drags: one mechanism, not two

The hook runs inside every drag step's `update()`, so it does what `autoNoteBaseline` / `reapplyAutoNoteBaseline` do,
with the same results. Each step is recomputed from the original, so out-and-back, Escape and a guard's put-back
restore the notes exactly. Keeping both would let them disagree. Example: a sidebar edit trims a note to "Table Read"
(memory holds the original), then a drag brings the start back. The hook restores the Start line, and the drag's
reapply, which runs after it, puts back its press copy "Table Read" and wins.

**Proposal: make the two drag functions inert by declaration** (`autoNoteBaseline()` returns `null`, which
`reapplyAutoNoteBaseline` already treats as nothing to do). The call sites in `installProductionEdgeHandles`,
`installPhaseEdgeHandles` and `installMonthPillDrag` are untouched, so this cannot collide with the episode-grip work
there (`04a1f18`). Remove the dead calls in a later tidy-up. `pilldrag` E15–E19 and D5, and `phaseedge` F13, are the
proof that nothing changed for the drags.

### 3.5 What it does NOT change (R5's rules, unchanged)

- **The user's own lines stay on their week**; only the auto part follows. S1 after the fix: "Table Read" stays on 6/29,
  "Start Principal Photography 7/6/26" is drawn on 7/6, and "6/29/26" appears nowhere. This is D5's rule for body-drag (§7 Q2).
- A note that does not open with its week's auto text **in whole lines** is never touched, e.g. "Start Principal
  Photography 6/29/26 (tentative)". It still states the old date. A known limit, as for R5.
- Month-view day notes (`dayNotes`) stay on their dates.
- **Nothing is rewritten on Load.** A file saved with a stale note opens exactly as saved (no repair-on-load).
- The memory is session-only and is cleared at every snapshot apply, undo/redo included (the safe direction). So a
  note already trimmed to the user's line forgets its auto part across Save + reopen, or across an undo. Moving the
  milestone back after that behaves as today. It is narrow, and it fails toward today's behaviour, never toward a
  wrong date.
- No new snapshot key, no DOM id, `SNAPSHOT_VERSION` unchanged, no frozen function touched. `update()`,
  `applyStateSnapshot`, `resetAll`, `resetWaterfallNotes`, `shiftCalendarDates`, `rewriteMovedAutoNotes` and
  `weekAutoTexts` are all outside the freeze list. ⛔ If building shows otherwise, stop and ask.

---

## 4. The alternative: a call in each handler (not recommended)

Each entry point would need the drags' press/release pair. A typed field needs a focus → blur gesture, because the
keystrokes in §2 pass through other dates. Steppers, selects, checkboxes, buttons and the confirm dialogs each need
their own. Counted from §1's list, that is **25+ entry points**: every phase's start, length, unit, end, days and
snap; episode and block rows (days, count, add, remove, mode); Show Info; sim-post; hiatus rows; per-phase hiatuses;
the Region; five holiday actions; day marks; Rebuild From; Close all gaps; autostart; custom phases. And every future
control must remember to call it.

⛔ **That is exactly how this bug happened.** R5 was a per-mover call, and every mover built after it (all three month
drags, Rebuild From, Close all gaps, autostart) shipped without it. Its one advantage is a smaller change per handler.
Missing one costs a silent false date in an export.

---

## 5. Cases and the gate

**New leg `tests/harness/autonotefollow.mjs`**, `pilldrag`-style: trusted CDP input, its own `HARNESS_PORT`, fresh page
per case, the recovery prompt declined. Fixtures: `autonote-grips.sptcal`, plus a new **synthetic**
`autonote-stale.sptcal` (the same calendar starting 7/6/26 but still carrying "Start Principal Photography
6/29/26\nTable Read" on 6/29). Red = fails on the pre-fix build.

| Case | Input | Expected after the fix | Red before? |
|---|---|---|---|
| N1 | Production start picked as 7/6 in the date popover | "Start Principal Photography 7/6/26" on 7/6, Table Read on 6/29, no "6/29/26" anywhere; the waterfall's 6/29 cell = "Table Read" | red |
| N2 | The same date typed, 07/06/2026 (passes 7/29 and years 0002/0020/0202) | Identical to N1 | red |
| N3 | Snap to Mon off, then 06/30 typed over 06/29 (passes **6/3**) | "Start Principal Photography 6/30/26\nTable Read". ⭐ The chained-hook guard: a chained build ends with "Table Read" alone and no Start | red (and red on a chained build) |
| N4 | Last episode's days 8 → 9 | The wrap note is plain auto again: "Principal Photography Wraps 10/21/26" on 10/21, nothing on 10/20 | red |
| N5 | Show Info episodes 10 → 12 (passes **1**) | One wrap, on 11/11; nothing on 10/20 | red |
| N6 | Custom holiday on Mon 6/29, Continue | "Start Principal Photography 6/30/26"; the wrap note reads 10/21 | red |
| N7 | Rebuild From that moves Production | The Start note follows | red |
| N8 | After N1: one Ctrl+Z, then Ctrl+Shift+Z | Undo restores the date **and** the notes exactly; redo restores N1's notes | red |
| N9 | Load guard: `autonote-stale.sptcal` Loaded over `autonote-grips` through the real Load menu item (`showOpenFilePicker` stubbed, as `t/lib.js`'s picker helper does), then one unrelated edit | Its 6/29 note is exactly as saved, both after the Load and after the edit | guard (green before and after) |
| N10 | Recovery guard: edit, wait for the 3 s backup, reload onto another fixture, accept Recover | The recovered notes are exactly the edited calendar's | guard |
| N11 | Holiday-visibility guard: hide Independence Day in the month view, then a sidebar edit that moves nothing | No note text changes | guard |
| N12 | Shift guard: Shift All +1 wk | Exactly today's R5 result (the `autonote` leg's expectations) | guard |

**The gate:**

1. N1–N8 red on the pre-fix build and green after. To build the pre-fix copy in place, follow HANDOFF's 19 Oct
   "Learned 3" (`dist-prefix/`, private port).
2. Unchanged legs: `pilldrag` 26/26, `phaseedge` 14/14, `autonote` (R5 shift), `monthnotes`, `restore`, the undo
   legs, `npm run check`.
3. Full `cd tests/harness && ./gate.sh`, serialized behind any other session's gate: **0 FAIL**. Gate 10's print
   documents identical, and **gate 13's twenty written month PDFs byte-identical**: no baseline holds an edited
   auto-note, so the hook must be a no-op there. The waterfall PDF and every Excel part identical, `fields.byId`'s id
   count unchanged, 0 clipped cells.
4. If any baseline does move, stop. That means a gate calendar holds an edited auto-note the hook rewrote, and the
   owner rules on the re-cut.

---

## 6. Where to build

In its own worktree, off `main` **after** `autonote-grips` is merged into it. That merge was waiting on the episode-grip
work, which is now `04a1f18`, live. If the owner wants this built before that merge, branch `autonote-follow` off
`932badf` and merge both together. Expected conflicts: none in the drag installers (§3.4 leaves their call sites
alone). `update()` and `applyStateSnapshot` are not in `04a1f18`'s diff; verify at the merge. README changelog and
HANDOFF entry land with the build commit, per CLAUDE.md.

---

## 7. Owner questions (asked by picker, 19 Oct 2026)

- **Q1, approach:** the general hook (§3, recommended) or a call in each handler (§4)?
- **Q2, the user's own lines:** stay on their week while only the auto part follows (recommended; the drags' rule),
  or travel with the milestone? Travelling would be new behaviour that neither R5 nor the drags have.
- **Q3:** go-ahead to build, with §5 as the acceptance gate?

*Answers (owner's picker, 19 Oct 2026):*

- **Q1: the general hook.** "One hook in update() (Recommended)", chosen with the 06/30-over-06/29 preview in view.
- **Q2: they stay on their week.** "Stay on their week (Recommended)": only the auto part follows, the drags' rule.
- **Q3: build after the merge.** "Build after the merge (Recommended)": in its own worktree off `main`, once
  `autonote-grips` is merged into it. Local commits only; nothing pushed.

The status line at the top still reads PLANNED, NOT BUILT until that build lands.
