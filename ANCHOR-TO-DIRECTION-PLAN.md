# ANCHOR-TO-DIRECTION-PLAN.md: Anchor To, choose what moves

**Status: PLAN + MOCKUP, NOTHING RULED, NO APP CODE (4 Nov 2026).** Mockup:
[`mockups/anchor-to-direction.html`](mockups/anchor-to-direction.html). Tracker card `anchor-to-direction`.

- **The asks** (owner, 4 Nov 2026):
  - *"Does anchor to only move phases after the selected phase or also phases before?"*
  - then *"would it make sense to have a work forward and work backwards function for anchor to"*
  - then *"Yes, write it up"*.
- **The short answer given in chat:** Anchor To moves everything today. It is Shift All aimed at a date. A choice of
  what moves makes sense, and the "backwards" half is the useful one: no tool today moves a phase and the phases
  before it while keeping the gaps. Call it something other than forward/backward (§3).
- The older card `anchor-to-earlier-phases` (30 Oct 2026) was the same question from the other side. The owner
  thought Anchor To left the earlier phases behind. It never did, and that was tested then (14 of 14 phases moved).

---

## 0. How it works today (read this first)

- **The popover** (`#pop-anchor`, `src/chrome/PreviewToolbar.jsx`, 340 px). Its controls:
  - A phase (`#tool-anchor-phase`, filled by `fillPhaseSelect`, Production preselected, plus **Whole schedule (all
    phases)**, `ANCHOR_ALL`).
  - An edge (`#tool-anchor-edge`: `start` = "starts on", `end` = "ends by").
  - A date and **Go**.
- **Go** (`tool-anchor-go`'s handler, `src/legacy/app.js`):
  - It measures the whole-week distance from the landmark to the date. "Starts on" uses `weeksBetweenMondays`.
    "Ends by" uses `weeksToFinishBy`, which floors, so the landmark lands on or before a deadline.
  - It then calls `shiftCalendar(delta)` **with no cutoff**, so everything moves.
- **Shift From** is the same call with a cutoff: `shiftCalendar(n, isoOf(mondayOf(phaseStartDate(key))))`. Only what
  is on or after the picked phase's start week moves.
- ⭐ **Every stay-or-go decision in the shift goes through ONE predicate**, `inRange(key)` in `shiftCalendarDates`. It
  decides each of these, in the function's own order:
  1. Phase starts, built-in and custom (a Dates phase's end goes with it through `setPhaseStart`). Each phase's own
     hiatus travels with it. The phases that stay are collected as `stayingPhases`.
  2. Unlocked all-phase hiatuses. The weeks of the bands that stay are collected as `stayingHiatusWeeks`.
  3. The calendar range's two dates (step 2b).
  4. The week-keyed stores, through `isPinnedWeek`: `userNotes`, `noteColors`, `noteFontSize`, `rowHeightsByWeek`
     and `textStyle.note`.
  5. The band- and phase-keyed stores, through `hiatusKeyStays`, which reads steps 1 and 2's sets: `hiatusTexts`,
     `hiatusColors`, `hiatusFontSize`, `hiatusNameSyncedKeys`, `textStyle.hiatus`, `textStyle.phase`,
     `mvTextStyle.band`, `cellSpans` and `gridColSwaps`. `textStyle.simpost` goes with Production.
  6. Production's day marks (`dayOverrides`) are not re-keyed. They travel by shoot-day number, because
     `shiftCalendar` wraps everything in `asShootDayMove()`.
- **Never moved by any shift:** holidays, locked all-phase hiatuses, notes carrying a date, and the month view's day
  notes.
- ⚠️ **Is the shift frozen? Not by CLAUDE.md's list, which is the one that rules.**
  - `shiftCalendar` / `shiftCalendarDates` are not on CLAUDE.md's symbol list.
  - MANTINE-SEAM.md §4.9 does name `shiftCalendar`, among "the schedule inputs" the Mantine work may not touch (it
    must not be rewritten as chrome).
  - Features have changed what it moves several times since, each ruled as an ordinary feature, not a frozen edit:
    the calendar range (`705a1d8`), text styles (`53e8dd9`, `d4d8d40`) and audit M-4's day marks (`e123aa5`).
  - This plan changes WHICH things a mover moves. It changes nothing a cell looks like and nothing a writer outputs.
    The owner should still know it touches the one path every mover shares (§5 step 5).
- **What no tool does today:** move a phase and the phases before it while keeping the gaps.
  - Rebuild From backwards moves that side, but rebuilds it end to end, closing the gaps.
  - Today it takes two steps: Shift All 2 weeks earlier, then Shift From the first later phase 2 weeks later.

---

## 1. What it would look like

One more choice in the Anchor To popover, **what moves**, under the phase:

- **Everything.** Today's tool, and the default.
- **Production and everything after it.** Exactly Shift From's set, aimed at a date instead of a number of weeks.
- **Production and everything before it.** New.

The mockup draws two layouts (R1):
- **A, three buttons.** The look of Rebuild From's direction control (`.solve-dir`): `Everything | This and after |
  This and before`.
- **B, a dropdown** whose options name the phase: `Production and everything after it`.

Either way:
- **A hint line under the choice names what stays put.** For example, "Post and Localization stay where they are."
  It reads nothing but the phase list. It is the one fact that tells the three apart before you press Go.
- **Whole schedule hides the choice.** The whole schedule has nothing before or after it, so only Everything makes
  sense.
- **The result line says what moved and what stayed.** For example: "Shifted 2 weeks earlier. Wrap 8/13/27.
  Production starts 5/24/27. Production and everything before it moved (5 phases). 2 stayed where they were."
  Everything keeps today's line word for word.
- **The help text** (the `InfoHint`) becomes: *"Moves phases so the one you pick lands on your date. Choose whether
  everything moves, or only that phase and the ones after it or before it. Gaps are kept; use Rebuild From to close
  them."* CLAUDE.md's rule still holds: nothing true of all four tools goes in it.

**A worked example (the mockup's synthetic calendar).** Delivery is fixed, and the shoot must start 2 weeks earlier.
- Pick Production, starts on 5/24/27, **This and before**.
- Writer's Room, Pre-Prep, Casting, Prod Prep and Production are pulled 2 weeks.
- Post and Localization stay, and a 2-week gap opens between the wrap and Post.
- With **Everything**, Post and Localization would be pulled too, and delivery would move.

---

## 2. Exactly what moves

| | Everything | This and after | This and before |
|---|---|---|---|
| **Phases** (and each one's own hiatus) | all | start on or after the picked phase's start week | start on or before the picked phase's start week |
| **Unlocked all-phase hiatuses** | all | start on or after that week | start on or before the picked phase's **last** week |
| **Notes, their colours, sizes, row heights, note styles** | all | on or after that week | on or before the picked phase's **last** week |
| **Band labels, colours, cell spans, column swaps** | follow their band or phase | follow their band or phase | follow their band or phase |
| **Calendar range dates** | both | each one on or after that week | each one on or before the picked phase's **last** week |
| **Production's day marks** | by shoot-day number | by shoot-day number | by shoot-day number |
| **Holidays, locked hiatuses, dated notes, day notes** | stay | stay | stay |

- **"This and after" is Shift From exactly.** The handler passes the cutoff Shift From passes, and the engine needs
  no change.
- ⚠️ **"This and before" needs two bounds, and the second one is the reason.**
  - Phases are judged by their **start**: on or before the picked phase's start week. This is the mirror of Shift
    From.
  - Everything week-keyed is judged against the picked phase's **last** week. The picked phase moves whole, so its
    own notes and any hiatus inside it must go with it.
  - With one bound at its start, a 12-week shoot would move and leave weeks 2 to 12 of its notes, and its Christmas
    hiatus, on the old dates. Shift From never meets this, because its bound is the picked phase's start and
    everything after that moves anyway.
  - The last week is `mondayOf` of the picked phase's last workday (`phaseLastWorkday`; for Production, the wrap).
    It is read **before** the shift.
- **The edge it shares with Shift From, mirrored.** A later phase that starts inside the picked phase (Post starting
  before the wrap, say) stays put. Its notes in the overlapping weeks move with the picked phase, because notes are
  keyed by week, not by phase. Shift From does the same thing in the other direction today: an earlier phase that
  runs into the picked phase stays, and its notes in those weeks move.
- **Overlaps and new gaps are not errors.** Moving part of the calendar can push the picked phase into a phase that
  stayed, or open a gap in front of one. The owner confirmed on 16 Sep 2026 that phases move independently and
  legitimately run concurrently (the comment on `installMonthPillDrag`). So no warning, the same as Shift From.

---

## 3. The words

- **Not "work forward / work backwards".** Rebuild From uses exactly those words, a popover away, for rebuilding a
  side with no gaps. Here the gaps are kept. The same words for the opposite effect would mix the two tools up.
- **Not "earlier / later".** Shift From's Earlier and Later buttons are directions of travel. Its help text says so
  ("Earlier and Later are directions of travel, not which side moves"). Using the same words for which side moves
  would collide.
- **"Before it / after it"** is what Shift From's help text already says ("The phase you pick and everything after
  it move").

---

## 4. Rulings needed

- **R1. Layout.**
  - (a) **Three buttons**, `Everything | This and after | This and before`. *(Recommended: all three are visible at
    once, it is one click, and it matches Rebuild From's direction control in the next popover.)*
  - (b) A dropdown naming the phase.
- **R2. What it starts on when the popover opens.**
  - (a) **Everything, every time.** *(Recommended: someone who never touches the choice gets exactly today's tool.
    It matches Rebuild From's ticks, which are forgotten between openings.)*
  - (b) The last choice, until the app is closed.
  - Neither is ever saved in a calendar: it is session UI inside `.tools-menu`, which `collectFieldValues()` skips.

Not proposed: changing Shift From, Shift All, Rebuild From or Close all gaps.

---

## 5. Build steps (after the rulings)

1. **Engine, `shiftCalendarDates`.**
   - An optional third argument, `before = {phaseIso, weekIso}`, passed through `shiftCalendar` (still inside
     `asShootDayMove`).
   - `inRange` gains the week bound (`<= weekIso`). A new `phaseInRange` is used in step 1 only (`<= phaseIso`).
   - With no `before`, both are today's test, so every existing caller is untouched.
   - About 15 lines.
2. **The popover.**
   - `PreviewToolbar.jsx` adds the control inside `#pop-anchor`. Buttons carry `data-move` and no id. A dropdown,
     under R1(b), may keep an id, since `.tools-menu` already excludes it from the save sweep.
   - The engine handler reads the choice, hides it on `ANCHOR_ALL`, resets it on open (R2), writes the hint line,
     and passes the cutoff ("after") or the two bounds ("before").
   - The result line uses `describeShift`'s `tail`, as Shift From's does. The help text is the one in §1.
3. **A new leg, `anchorside`.** Each case runs on a synthetic calendar and checks the snapshot afterwards:
   - E1: Everything leaves today's result unchanged (the snapshot equals a run of today's code path).
   - A1: "after" equals Shift From by the same number of weeks.
   - B1: "before" moves the earlier phases, and the later ones keep their dates.
   - B2: a note in the picked phase's week 5 moves, and one in a later phase's week stays.
   - B3: an unlocked hiatus inside the picked phase moves, and a locked one stays.
   - B4: Production's half and off days keep their shoot-day numbers.
   - B5: a holiday and a dated note stay.
   - B6: "ends by" lands on or before the date.
   - U1: one Undo restores everything.
   - W1: Whole schedule hides the choice.
   - S1: no new key in `fields.byId`.
   - Neighbours to re-run: `snaptools`, `builtindates`, `customunits`, `datepick`, `overrides`, `rebuildticks`.
4. **Docs, in the same commit as the code:**
   - PROJECT-CONTEXT §7a (the table: Anchor To sits in both columns now).
   - CLAUDE.md's "Calendar adjustment tools" paragraph.
   - A README changelog entry, HANDOFF, and the tracker card.
5. **The gate.** The shift is the one path every mover test runs through, so a full gate before any push. The
   frozen surface and the writers are untouched, so the baselines should hold unchanged.

**Save format:** nothing changes. The choice is never saved, no snapshot key is added, and no DOM id enters
`fields.byId`.
