# REBUILD-FROM-LENGTHS-PLAN.md: Rebuild From becomes Build Around, lengths in the box, both sides at once

**Status: ALL RULED, BUILT 5 Nov 2026 on branch `build-around`** (worktree `.claude/worktrees/build-around`, from
`main` at `cf75104`). HANDOFF's entry has the as-built record. Mockup:
[`mockups/rebuild-from-lengths.html`](mockups/rebuild-from-lengths.html): four tabs (Today, A, B, C) and three made-up
calendars. Tracker card `rebuild-from-lengths`.
- **R2: (a), R3: yes** (owner, 5 Nov 2026: *"Yes, build it"*, to "Take R2 and R3 as recommended and start building").
- **R1: B** (owner, 5 Nov 2026: *"I like B"*).
- **The name: Build Around** (owner, 5 Nov 2026: *"what would be a more descriptive name other than rebuild from"*,
  then by picker from Build Around, Line Up, Back to Back and Chain Phases). §2 D9 has the words that follow from it.
  Below, "Rebuild From" means the tool as it is today.
- **R4: Production's length can't be changed in Build Around** (owner, 5 Nov 2026: *"id say production should be the
  one phase you aren't allow you to edit/change duration from the build around menu"*). It shows Show info's shoot
  days, read-only; the setup line first mocked (Season, episodes × days in the box) is gone. D1 and §4 have the
  details.

- **The asks** (owner, 5 Nov 2026):
  - *"based on the data from the calendar seeds, do you actually think "Rebuild from" is even a useful feature? I'm not
    convinced it is because I beleive its relatively uncommon for users to want to build calendars where phases are
    just chained back to back - usually they overlap in some ways"*
  - then, on the answer (§0), *"plan it but keep writers room, just maybe have it unchecked by default? Also similar to
    how we did with the the shift tool, i want you to really think hard about the optimal way to build the menu. How
    its laid out, what the buttons say/do. What if you could enter number of weeks within the menu? Cuz right now
    thats the holdup that makes the feature less useful if you haven't entered number of weeks yet. Thoughts? make
    mockups"*
- **Already decided:**
  - **Writer's Rm stays in Rebuild From, unticked by default** (owner, 5 Nov 2026). A tick puts it back, rebuilt like
    any other phase.
  - **Close all gaps goes** (proposed with §0's findings; the owner said *"plan it"*). §2, D8.
- The earlier history: the owner asked once before whether to remove Rebuild From (29 Oct 2026) and kept it, then got
  the tick list (30 Oct 2026, `mockups/rebuild-from-ticks.html`, tracker card `rebuild-from-rethink`).

---

## 0. What the owner's calendars say

Measured on the layout study's 15 seeds (`~/SPTCal Layout Study/scrubbed/specs.json`, outside the repo), every handoff
between built-in phases, with all-phase hiatuses counted as pauses (`extendEndForHiatus`'s rule):

| Handoff | Back to back | Overlap | Gap |
|---|---|---|---|
| Writer's Rm → the next phase | 0 | **15** | 0 |
| Pre-Prep → Prod Prep | 13 | 0 | 0 |
| Prod Prep → Production | 15 | 0 | 0 |
| Production → Post | 14 | 1 | 0 |
| Post → Localization | 4 | 0 | 0 |

- **The chain after the room is back to back: 46 of 47 handoffs.** The one overlap is a two-season calendar, where one
  season's Post starts while the shoot carries on into the next.
- **The room overlaps every time**, by 3 to 45 weeks (median 11).
- **The other overlaps are custom phases running alongside**: a Wrap that starts the Monday Post does (five seeds), a
  previous season's Post. Rebuild From already leaves custom phases unticked.
- **No seed has a gap anywhere.**

So "back to back" is how these calendars are built, except for the room, and the room is where today's tool goes
wrong:
- **Rebuild From ticks the room by default.** On seed hand-16, untouched, pinned at Production's own date, every row
  reads "No change" except the room, which it would pull 11 weeks earlier (checked in the built app, 5 Nov 2026).
- **Close all gaps chains every phase after the one before it,** so it starts Pre-Prep when the room ends. On hand-16
  it pushed Pre-Prep, Prod Prep, Production and Post 11 weeks later each, on a calendar with no gaps (checked in the
  built app). It would move the shoot 3 to 45 weeks on every seed, and it has nothing to close on any of them.

**Why keep Rebuild From at all, when Shift's Phase & after covers a back-to-back calendar?** Two jobs Shift can't do:
it gives undated phases dates from their lengths ("the shoot starts 6/14, when does Prod Prep start?"), and it lines
Post up with the real wrap when holidays or an episode change move the shoot by days rather than whole weeks.

---

## 1. How it works today

The popover `#pop-solve` (`src/chrome/PreviewToolbar.jsx`, 400 px; the engine's `renderSolve` / `runSolve`):

- `[phase ▾] starts [date]`. The dropdown (`tool-solve-phase`, filled from `solvablePhases()`) offers **only phases
  that already have a length** (`phaseHasSpan`).
- `[← Work backwards | Work forwards →]` picks the side.
- The list of that side's phases: a tick, the colour, the name, the start it would get, Pushed / Pulled / New /
  No change / Stays. A phase with no length is a disabled row reading **No length**: *"Give it a length first, and
  Rebuild can place it."*
- Starting ticks (`solveTicked`): every built-in phase with a length, **Writer's Rm included**; no custom phase.
- `Rebuild N phases`, then a divider and **Close all gaps between phases** (`closeAllGaps`, which ignores the ticks).

**The holdup the owner named:** a length has to be typed in the sidebar before a phase can be placed. On a new
calendar it is worse than that: nothing has a length, so the dropdown reads *"No phases scheduled yet"* and the box
can do nothing at all (measured in the build, 5 Nov 2026). And building a calendar around the shoot takes two runs,
Work backwards and then Work forwards, with the pinned date typed twice.

---

## 2. The design, decision by decision

**D1. Lengths in the list.** Every row gets a **Length** column: a small box and its unit (`[ 9] wks`; `[15] days` for
a Days custom phase). Type a number and the row's date and Pushed / Pulled update at once. An empty box is drawn
dashed in amber, so the rows that need a length are the ones that stand out. A column heading row (`PHASE · LENGTH ·
STARTS`) says the boxes are lengths.
- **Typing a length into a row that had none ticks it.** You are clearly placing that phase.
- **The pinned phase has a length box too.** The phases after it start where it ends, so its length matters.
- A **Dates** custom phase shows its length read-only (it is set by its two dates), titled *"Set by its dates"*.
- **Production's length is read-only here (R4, ruled).** It is the one phase whose length the box can't change. Its
  cell shows Show info's shoot days as plain text (`75 days`, titled *"From Show info: 15 episodes × 5 days. Change it
  in Show info."*). Its START is placed like any other phase's; only its length is out of reach.
  - **With Show info incomplete** the cell reads **Not set** in amber, and one line under the list says where to
    go: *"Production's length comes from Show info. Set its episodes and shooting days there, and the phases after it
    can be placed."* The phases after it read **Can't place**. The phases before it still build, because they only
    need Production's start.
  - Pinned by its end (`ends by`) with no length, the button reads **`Production needs Show info`**, disabled.

**D2. Typed lengths are staged, like everything else in the box (R2).** Nothing changes until you press the Build button; then
the lengths and the new dates are written together, as **one undo step**.
Close the box without pressing it and the typed lengths are forgotten, as the date and the ticks are today. The
button says what it will do: `Build 4 phases`, or `Save 2 lengths` when only lengths changed. The result line names
the lengths it saved. **Every typed length is saved on Build, including one for a phase that can't be placed yet** (a
Post typed while Production has no length): the next Build places it.

**D3. One list, both sides (layout B).** All phases in the order they run (`phaseSequence`), with the pinned phase
in its place. The phases before it are rebuilt backwards from its start and the phases after it forwards from its end,
**in one run**. Building a new calendar around the shoot is one press instead of two.
- **`← Before · Both · After →` replace Work backwards / Work forwards,** as shortcuts that fill in the ticks, the way
  Shift's three buttons do (ruled for Shift on 5 Nov 2026). Before ticks the default set on the before side, After on
  the after side, Both on both. Change a tick by hand and none of the three is pressed.
- **It opens on Both.** Today's default is backwards, kept for the session. On a calendar that is already lined up,
  Both shows "No change" down the whole list, which is itself useful: it says the calendar is back to back.

**D4. The first row reads as a sentence:** `[Production ▾] [starts ▾] [6/14/2027]`. The dropdown names the phase
alone; its date is in the date box and in the list. **Every phase can be pinned**, with or without a length or a
date (`solvablePhases` becomes `phaseSequence`). Production is still preselected: the shoot is what a calendar is
usually built around.

**D5. `ends by` (R3, layouts B and C).** The same `starts / ends by` choice as Shift's date row. "Post ends by
3/3/28" pins Post's END to a delivery date and rebuilds around it. Today's tool can only pin a start. The solvers for
it already exist, because the backward pass uses them for every phase it places: `startForWeeksEndingAt` (a Weeks
phase), `productionStartEndingBy` (the shoot, searched on the real scheduler), `customStartEndingBy` (Days and Dates).

**D6. Starting ticks:** every built-in phase that has a length, **except Writer's Rm** (owner); never a custom phase
(as today). Localization's rule (*"unticked by default unless someone entered a number of weeks or a starting
date"*, 30 Oct 2026) still holds: a phase with no length cannot be ticked until one is typed.

**D7. The button.** Full width, at the bottom, as today. It reads `Build 3 phases`, `Pick a date`, `Tick a phase to
build`, `Give Post a length` (ends by, with no length), `Production needs Show info` (the same, for the shoot), or **`No changes`**, disabled,
when every ticked phase would land where it already is. (First written "Already back to back — nothing would move";
the owner called it clunky, 5 Nov 2026. Every row already says "No change", so the button only sums it up.)

**D8. Close all gaps is removed.** §0: it was wrong on every one of the owner's calendars, and B does its job safely:
pin the first phase at its own date and press After. The hint line goes too (Shift dropped its own when the list
arrived): the rows already say what moves and what stays, and the (i) says the rest.

**D9. The words (the name ruled: Build Around).**
- **The toolbar button: `Build Around ▾`**, titled *"Pin one phase to a date and build the others around it"*. Twelve
  characters, as "Rebuild From" is, so the preview toolbar wraps no sooner than it does today.
- **The box's heading: Build around a phase** (today "Rebuild from a date"); its `aria-label` the same.
- **The (i):** *"Pin one phase to a date and build the others around it, end to end, from their lengths. Phases with
  no dates yet get them. Type a length right in the list. Unticked phases stay where they are. Nothing changes until
  you press Build. Use Shift to move phases and keep the spacing between them."*
- **The list's caption: Phases to build.** A tick's `aria-label`: *"Build Pre-Prep"*.
- **The button:** `Build 3 phases`, `Pick a date`, `Tick a phase to build`, `Nothing to build`, `Give Post a length`,
  `Save 2 lengths`, and **`No changes`** (disabled).
- **A row:** Pushed / Pulled N wks, New, No change, Stays, Not dated, **No length** (amber, titled *"Type a length to
  place it."*), **Can't place** (titled *"Production's length is set in Show info. Set it there, and the phases after it can be
  placed."*). Production's own cell: `75 days`, or **Not set** (amber), read-only.
- **The result:** *"Production starts 6/14/27. 3 phases built around it, 4 lengths saved. Post starts 9/27/27."* plus
  the day-marks note `takeShootDayMoveNote()` adds today.
- **Shift's (i)** ends *"Gaps are kept; use Build Around to close them."* (today *"use Rebuild From"*).
- ⛔ **The ids do not rename** (the same rule as Load / `data-action="open"`): `pop-solve-btn`, `#pop-solve`,
  `tool-solve-*`, `solve*` in the engine. Only what a user reads changes. New code may keep saying solve or rebuild.

---

## 3. The layouts (the mockup's tabs)

All three keep every function. The box stays 400 px wide. Heights are measured in the mockup (its own CSS, the app's
sizes), as each one opens:

| | Picks the phase | Sides | `ends by` | In progress | New calendar |
|---|---|---|---|---|---|
| **Today** | dropdown, phases with a length only | one at a time | no | 413 px | 320 px (and does nothing) |
| **A** | dropdown, every phase | one at a time (Work backwards / forwards) | no | 380 px | 380 px |
| **B** ⭐ | dropdown, every phase | both, with Before · Both · After | yes | 435 px | 404 px |
| **C** | a pin on each row | both, with links in the list's header | yes | 390 px | 359 px |

While Production has no length, the line that says so adds about 50 px.

- **A, today's layout plus lengths.** The smallest change: D1, D2, D4's every-phase dropdown, D6, D8. It keeps the
  direction, so a new calendar is still two runs, and the pinned date is typed twice.
- **B, one list, both sides (recommended).** Every step labelled, in order: the sentence, the side, the list, the
  button. It is Shift's shape (a sentence row, three shortcut buttons, the tick list) so the two tools read alike,
  and it is the only layout where building around the shoot is one run with every shortcut a labelled button.
- **C, the list is the form.** No dropdown: a pin at the end of each row picks the phase, and the pinned row carries
  its own `starts / ends by [date]` line. One control fewer, the phase named once. Costs: two click targets on every
  row (the tick, the pin), a seventh column that squeezes the names, the shortcuts shrink to links, and it is unlike
  Shift, which picks its phase with a dropdown (ruled 5 Nov 2026: A).

**Recommendation: B.** ✅ Ruled B.

---

## 4. Rulings needed

- **R1. The layout:** A, B or C. ✅ **B** (owner, 5 Nov 2026). **The name:** ✅ **Build Around** (owner's picker).
- **R2. When a typed length is saved:**
  - (a) when Build is pressed, with the dates, as one undo step; forgotten if the box closes first. *(Recommended,
    and what the mockup does.)*
  - (b) as you type, exactly as typing it in the sidebar would (its own undo step; the phase grows behind the box).
  - **Why (a):**
    - Everything else in the box is a preview until the button: the date, the side, the ticks. A length that saved
      itself would be the one control that changes the calendar while you are still trying numbers.
    - Trying numbers is a real use. "What if Prod Prep were 11 weeks?" With (b), Prod Prep is 11 the moment you
      type it. Close the box and it stays 11, running two weeks into the shoot, unless you remember to undo.
    - One undo. With (a), the lengths and the dates are one step. With (b), every length is its own step, so taking
      back one build is several presses and can leave stray lengths behind.
    - The cost: lengths typed and then abandoned are gone. The button reads `Save 2 lengths` when only lengths
      changed, so keeping them without moving anything is always one click.
- **R3. `ends by`** in the first row (B, C): pin a phase by its end, such as a delivery date.
  - **Why yes (recommended):**
    - Schedules are often fixed at the far end: a delivery or an air date. Today no tool can pin an end, so
      "Post delivers 3/1" means working out Post's start by hand.
    - Shift's date row already has `starts on / ends by`; the two tools should not differ on this.
    - It is cheap: the backward pass already finds "the latest start that ends by a date" for every phase it places,
      Production included (D5).
    - The cost: one small dropdown that opens on `starts`, so anyone who ignores it gets today's behaviour.
- **R4. Production's length in the box.** ✅ **Ruled (owner, 5 Nov 2026): read-only.** Production is the one phase
  whose length Build Around can't change; it shows Show info's shoot days, and Show info is where they change.
  - Recommended before the ruling was a setup line in the box (Season, episodes × days), so that a new calendar could
    be built entirely from the box. Ruled out: the shoot's length is the most consequential number in the calendar
    and has one home.
  - What it means for R2: with Production unset, a user who has typed lengths does not lose them by going to Show
    info. The phases before the shoot still build, so `Build 2 phases` saves every typed length, Post's included
    (D2: lengths are saved on Build even for a phase that can't be placed yet). After Show info is filled in, Post
    is placed from its saved length on the next Build.

---

## 5. Exactly what Build Around writes

- **The lengths typed in the box**, into the phase's own sidebar field (`weeks-<key>`; `days-<key>` for a Days
  custom phase), through the same path typing there takes, so every listener that follows a length (the phase
  card's readouts, the autostart button's label, Ends) runs as it does today.
- **Never Production's length, nor any Show info field** (R4). Production's start is written like any other.
- **The start dates**, through `setPhaseStart` (the one writer), as today: the pinned phase, then each ticked phase.
- **All of it inside one `asOneUndoStep`**, and the dates inside one `asShootDayMove` binding, so Production's day
  marks travel by shoot-day number (audit M-4) and Post chains off the wrap they produce.
- **Nothing new in a saved file.** The ticks, the side and the staged lengths are the box's own and are forgotten when
  it closes. The length boxes and the shortcut buttons carry **no id**, and they sit inside
  `.tools-menu` besides, so `collectFieldValues()` never sweeps them.

---

## 6. Build steps (after the rulings; B assumed)

1. **Engine, `src/legacy/app.js` (not frozen: the tool is not on CLAUDE.md's list):**
   - `solveTicked`: `PHASE_CHAIN` minus `writersRoom`.
   - `solvablePhases` → every phase in `phaseSequence()`.
   - A both-sides run: `rebuildBackwards` then `rebuildForwards` from the same pin, inside one `asShootDayMove`
     (both are movers already; nested, they defer to the outer binding, as `closeAllGaps` relied on).
   - `trialRebuild` runs the same pair, and puts back the length fields as well as the start and end
     fields it puts back today, so the preview can apply staged lengths and leave no trace.
   - `ends by`: compute the pin's start with the matching solver (D5), then run the pair from it.
   - Remove `closeAllGaps` and its handler.
2. **Panel, `src/chrome/PreviewToolbar.jsx`:** the button's label and title, the heading, the (i) and Shift's (i)
   (D9); the sentence row gains the edge select; the side buttons become `← Before · Both · After →` (keep the ids
   `tool-solve-back` / `tool-solve-fwd` on Before and After so the legs that click them still pick one side); the hint
   and `#tool-close-gaps` go; the list stays engine-drawn.
3. **`renderSolve`:** the column heading row, the length cells, Production's read-only cell and its Show info line, the staged
   values, the new button labels and result line (D9's words).
4. **Legs.** `rebuildticks` (19 checks) learns the room's new default and Both, and matches the button's text
   (`'Rebuild 3 phases'`), so those checks change to `Build`. `snaptools`, `builtindates`,
   `customunits`, `datepick` and `overrides` drive `tool-solve-*`: re-run each, and move `overrides`' Close all gaps
   cases onto Build Around, After. A new leg, `rebuildlengths`: a typed length previews and is written only on Build,
   one undo restores every field, a new calendar built in one run, `ends by` for a Weeks phase and the shoot, the
   Production's cell read-only (no input, and no Show info field changes on Build), the Show info line and Can't
   place while it has no length, and no id'd control in the box.
5. **Docs, in the same commit:** CLAUDE.md's "Calendar adjustment tools" paragraph (the tool's name and description,
   and "Shift keeps the gaps, Build Around closes them"), PROJECT-CONTEXT §7a (the tools table; the note that called
   Close all gaps redundant but kept), UI-CONVENTIONS wherever it names the button, the README changelog (which says
   Rebuild From is now Build Around, so a user who knows the old name finds it), HANDOFF, the tracker card.
6. A full gate before any push.

**Left alone:** Pre-Prep's own "Start after previous phase" button also chains after the room, wrong on every seed
with a Pre-Prep, but it is one click on purpose and it names the phase it chains from. Shift is unchanged.

## 7. Shift's look and feel, and the overlap rule (owner, 9–10 Nov 2026) — ✅ RULED, ✅ BUILT

After the Shift box became the list first (ANCHOR-TO-DIRECTION-PLAN.md §7.6), the owner: *"now we need to try to make
Build Around match the same UI look and feel as the shift tool. Make a list of everything we could change"*, then
*"give me a mockup"* ([`mockups/build-around-like-shift.html`](mockups/build-around-like-shift.html): Shift, the
proposal and today's box, live on one made-up calendar), then *"Yes, build it"* and, after trying the working build,
*"Yes, finish it"*.

**What changed in the box** (the list's items 1 to 12):

1. A header strip in the list (a select-all box and the count) in place of the column header.
2. "Phases" as the caption; the count reads "N of M build".
3. A click on a row no longer flips its tick: it **pins** that phase. The box ticks.
4. A drag ticks or clears a run; the pin and rows with no length are passed over.
5. The pinned row wears Shift's outline.
6. No hover titles on rows.
7. The hint opens upward and never flips.
8. "starts on"; the title reads "Build Around".
9. The pin's dropdown follows a row click (and shows the phase's date, as Shift's does).
10. The pin's row sits under the list: "Pin to a date", the phase above "starts on".
11. `Prior to X` / `After X` under the list, in place of the `← Before · Both · After →` switch above it.

**Rulings:**

- **R14, no Both button** (*"we can get rid of the both button because you can just select all with the top
  checkbox"*). Flagged at the time: the top box ticks every phase that can be built, which is more than Both ticked.
  The box still opens on both sides.
- **R13, which phases start unticked.** The owner on the old rule (Writer's Rm and custom phases always out): *"wait
  why wouldnt writers room and custom phases be included"*, *"its just confusing if you click prior to pre prep and
  then writers room isn't selected"*, asked for an honest view, then: *"but writers room doesnt always overlap the
  next phases, only sometimes"*. That last fact decided it: a rule by kind is wrong whenever the room does not
  overlap. **Ruled (*"Yes, mock that up"*, *"Yes, build it"*): a phase is left unticked only when it runs alongside
  the phase it would be built against, and a line under the buttons names it.** It applies to how the box opens and to
  Prior / After.
- **R15, width**: not ruled; left at 400 px (at 340 the longer phase names are cut).

**Decisions made in building it** (each told to the owner before *"Yes, finish it"*):

- **"Alongside" is five shared days or more** (`SOLVE_ALONGSIDE_DAYS`), a full working week. A phase working two days
  into the next one's first week, or a wrap the day after Post starts, is how dates fall. So a ONE-WEEK overlap
  counts: on `buildFixture()` Localization (3/1/27) starts in Post's last week (the Christmas hiatus pauses Post to
  Fri 3/5/27) and is left out.
- **Each phase is judged against the last phase taken into the chain**, walking outward from the pin. So a Casting
  beside Pre Prep does not make the Writer's Room before it "overlap": the room is judged against Pre Prep.
- **A custom phase with no date yet still starts unticked**: nothing on the calendar says where it belongs.
- **Ticking never moves the pin** (in Shift the outline follows every tick): the pin sets the date and the preview.
- **The line lists only phases still at the tick the rule gave them**; one the user has ticked, cleared or dragged
  over is their own choice.
- **The pin is kept between openings**, as before; the ticks, the side and typed lengths are forgotten.

HANDOFF has the as-built record. Legs: `buildaround` (36 cases), `rebuildticks` (20), `buildalongside` (8).

