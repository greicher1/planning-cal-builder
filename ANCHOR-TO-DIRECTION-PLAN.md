# ANCHOR-TO-DIRECTION-PLAN.md: Anchor To, choose what moves

**Status: RULED (4 Nov 2026); layout C BUILT the same day on branch `shift-tool` (HANDOFF's entry has the as-built record).**
- **The owner chose layout C, one Shift tool (§6):** *"Ok im going to vote we go with C, one master shift tool"*.
- **R2(a):** it opens on All phases, By weeks every time, which is today's Shift All form.
- **The phase row shows only when it is needed (§6.2),** by the owner's picker.
- **What to build from:** §2, §3, §5 step 1 and §6. A and B (§1's two-row Anchor To, §1.1's Shift From) were not
  chosen. They stay here as the record.

Mockup:
[`mockups/anchor-to-direction.html`](mockups/anchor-to-direction.html), one tab per layout. Tracker card
`anchor-to-direction`.

- **The asks** (owner, 4 Nov 2026):
  - *"Does anchor to only move phases after the selected phase or also phases before?"*
  - then *"would it make sense to have a work forward and work backwards function for anchor to"*
  - then *"Yes, write it up"*.
  - then *"In theory, could shift from and anchor to be combined into one tool with multiple settings?"*
  - then *"Yes, add it"* (to add layout C to this plan and the mockup).
  - then, on a screenshot of C's What moves row, *"reword these options and move the phase selector to right below
    it"*. They became `All phases | From a phase | Up to a phase`, with C's phase picker directly under them (§6.2).
  - then *"What about All phases, Before a phase, and after a phase"*, then *"Phase and Previous, Phase and Before? Or
    come up with a few other wording ideas"*. Offered four, the owner picked `All phases | Phase & before | Phase &
    after` (§3).
  - then, on a screenshot of the phase / *starts on* row, *"Fix mockup a and b so the date selector is directly below
    this line"*.
  - then, on a screenshot of A's Anchor To, *"reorder as follows: Prop Prep - 4/19/27 starts on - (date selector on
    same line (expand the window horiztonally) then on the line below - All phases, phase and before, phase and
    after, THEN Go"* (§1). This replaces the ask before it.
  - (Before that reorder: *"Add similar functionality for shift from in the mockup"*. In A and B, Shift From gets
    `Phase & before | Phase & after` (§1.1).)
  - then *"Ok im going to vote we go with C, one master shift tool"*. By picker: R2(a), and the phase row shows only
    when it is needed.
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

One more choice in the Anchor To popover, **what moves**. In A and B the popover is wider (480 px, against 340 px
today and Rebuild From's 400 px) and has two rows (owner, 4 Nov 2026, quoted above):
- **Row 1 reads as a sentence:** `[Prod Prep — 4/19/27 ▾] [starts on ▾] [date]`.
- **Row 2 holds the choice, then Go:** `[All phases | Phase & before | Phase & after] [Go]`. In B the buttons are a
  dropdown.
- **The hint line sits under them.** With Whole schedule the choice hides, and Go stays at the end of row 2.
- It hangs from its button's right edge, as every tool popover does (`.tools-menu{right:0}`), so the wider panel
  grows to the left.

The three choices:

- **All phases.** Today's tool, and the default.
- **Phase & before:** the picked phase and everything before it. New.
- **Phase & after:** the picked phase and everything after it. Exactly Shift From's set, aimed at a date
  instead of a number of weeks.

The mockup draws three layouts (R1):
- **A, three buttons.** The look of Rebuild From's direction control (`.solve-dir`): `All phases | Phase & before |
  Phase & after`.
- **B, a dropdown** whose options name the phase: `Production and everything after it`.
- **C, one Shift tool.** Shift From and Anchor To are folded into Shift All's ▾, with the same three buttons plus "By
  weeks | To a date". See §6. Everything below in this section holds for C too.

### 1.1 Shift From gets the same choice (A and B)

Asked 4 Nov 2026: *"Add similar functionality for shift from in the mockup"*. C needs nothing here, because Shift From
is already inside its Shift tool.

- **Today's rows stay as they are**, the phase with the weeks and then Earlier / Later, and the choice goes under
  them, as in Anchor To.
- **Two options, not three: `Phase & before | Phase & after`.** All phases by weeks is Shift All, which already has
  its own button.
- **It opens on Phase & after**, today's Shift From (R2). The three legs that drive it today (`calrange`,
  `overrides`, `rowheight`) keep working unchanged.
- **B's version is a dropdown** naming the phase, as in its Anchor To.
- **The hint line and the result line are Anchor To's.** For example: "Production and the phases before it move.
  Post and Localization stay where they are."
- **Its help gains "before":** *"The phase you pick moves, with the phases before it or after it. The other phases
  stay put, so the gap beside it opens or closes. Earlier and Later are directions of travel, not which side
  moves."*
- **The engine is the same `before` bound (§2, §5 step 1),** so nothing new is needed. Phase & after is Shift From's
  call exactly as it is today.
- **What it gives you:** A and B now cover every combination §6.1 lists. All phases by weeks is Shift All, a phase
  and the ones before or after it by weeks is Shift From, and all three to a date are Anchor To. No button is
  retired. That changes R1's recommendation (§4).
- **The name stays Shift From.** With Phase & before it moves the other way. "Shift From Production" still reads
  well, and renaming a button people know is not proposed.

Either way:
- **A hint line under the choice names what stays put.** For example, "Post and Localization stay where they are."
  It reads nothing but the phase list. It is the one fact that tells the three apart before you press Go.
- **Whole schedule hides the choice.** The whole schedule has nothing before or after it, so only All phases makes
  sense.
- **The result line says what moved and what stayed.** For example: "Shifted 2 weeks earlier. Wrap 8/13/27.
  Production starts 5/24/27. Production and everything before it moved (5 phases). 2 stayed where they were."
  All phases keeps today's line word for word.
- **The help text** (the `InfoHint`) becomes: *"Moves phases so the one you pick lands on your date. Choose whether
  all phases move, or only that phase and the ones after it or before it. Gaps are kept; use Rebuild From to close
  them."* CLAUDE.md's rule still holds: nothing true of all four tools goes in it.

**A worked example (the mockup's synthetic calendar).** Delivery is fixed, and the shoot must start 2 weeks earlier.
- Pick Production, starts on 5/24/27, **Phase & before**.
- Writer's Room, Pre-Prep, Casting, Prod Prep and Production are pulled 2 weeks.
- Post and Localization stay, and a 2-week gap opens between the wrap and Post.
- With **All phases**, Post and Localization would be pulled too, and delivery would move.

---

## 2. Exactly what moves

| | All phases | Phase & after | Phase & before |
|---|---|---|---|
| **Phases** (and each one's own hiatus) | all | start on or after the picked phase's start week | start on or before the picked phase's start week |
| **Unlocked all-phase hiatuses** | all | start on or after that week | start on or before the picked phase's **last** week |
| **Notes, their colours, sizes, row heights, note styles** | all | on or after that week | on or before the picked phase's **last** week |
| **Band labels, colours, cell spans, column swaps** | follow their band or phase | follow their band or phase | follow their band or phase |
| **Calendar range dates** | both | each one on or after that week | each one on or before the picked phase's **last** week |
| **Production's day marks** | by shoot-day number | by shoot-day number | by shoot-day number |
| **Holidays, locked hiatuses, dated notes, day notes** | stay | stay | stay |

- **A band label on NO band** (typed on a band whose hiatus was later retyped) has no band to follow. Since 5 Nov 2026
  it goes by its week, as a note does: it moves with All phases and inside the move's weeks, and stays outside them. It
  used to move on every part move, onto a held band (PHASE-WEEK-ARROWS-PLAN.md §5b).
- **"Phase & after" is Shift From exactly.** The handler passes the cutoff Shift From passes, and the engine needs
  no change.
- ⚠️ **"Phase & before" needs two bounds, and the second one is the reason.**
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
- **The buttons read `All phases | Phase & before | Phase & after`**, the owner's pick (4 Nov 2026, from four
  options).
  - **How it got there.** First `Everything | This and after | This and before`. On *"reword these options"*, `All
    phases | From a phase | Up to a phase`. Then the owner asked *"What about All phases, Phase & before, and after a
    phase"*, then *"Phase and Previous, Phase and Before? Or come up with a few other wording ideas"*.
  - **"Phase & …" says the picked phase moves too.** That is the point of the pick. "Phase & before" could read as
    "the phases before it, not it", and the tool can't work that way: in To a date, the picked phase is the one
    that lands on the date. The hint line still says it every time ("Production and the phases before it move").
  - **Not "previous / next".** They read as ONE neighbouring phase, while the tool moves every phase on that side.
  - **Before comes first**, so the row reads in calendar order.
  - **"All phases", not "Everything":** holidays, locked hiatuses and dated notes never move, so "Everything"
    overstated it.
  - **It still avoids "earlier / later"**, which are C's travel buttons.
  - **"&" is already the app's style** on buttons (Reset Notes & Hiatus).
  - **Layout B's dropdown keeps phase-named options** ("Production and everything after it"), and its first option
    is All phases too.

---

## 4. Rulings needed

- **R1. Layout.** ✅ **Ruled (c), one Shift tool** (owner, 4 Nov 2026), against the recommendation of (a) below.
  - (a) **Three buttons in Anchor To**, `All phases | Phase & before | Phase & after`, and two in Shift From,
    `Phase & before | Phase & after` (§1.1).
    *(Recommended, revised 4 Nov 2026 once Shift From got the choice. A now does everything C does: a phase and the
    ones before or after it, by weeks or to a date. It does so without retiring a button the people on the live site
    already use, and every tool keeps the rows it has today. Its buttons are visible at once, and they match Rebuild
    From's direction control in the next popover.)*
  - (b) The same, as dropdowns that name the phase.
  - (c) **One Shift tool (§6).** Shift From and Anchor To fold into Shift All's ▾, and the toolbar keeps two tools.
    Its one remaining advantage over (a) is fewer buttons: two tools instead of four. It costs retiring two buttons
    and reworking seven legs (§6.3). It was the recommendation before §1.1 existed.
- **R2. What it starts on when the popover opens.** ✅ **Ruled (a)** (owner's picker, 4 Nov 2026).
  - (a) **Today's behaviour, every time.** Anchor To opens on All phases, Shift From on Phase & after, and C on All
    phases by weeks. *(Recommended: someone who never touches the choice gets exactly today's tools. It matches
    Rebuild From's ticks, which are forgotten between openings.)*
  - (b) The last choice, until the app is closed.
  - Neither is ever saved in a calendar: it is session UI inside `.tools-menu`, which `collectFieldValues()` skips.

Not proposed: changing Rebuild From or Close all gaps. Under A and B, Shift All is not changed either, and Shift From
only gains its choice (§1.1).

---

## 5. Build steps (after the rulings)

These are for A or B. C adds steps of its own (§6).

1. **Engine, `shiftCalendarDates`.**
   - An optional third argument, an options object, with `opts.before = {phaseIso, weekIso}`, passed through
     `shiftCalendar` (still inside `asShootDayMove`).
   - ⚠️ **Shared with `HIATUS-RIPPLE-PLAN.md`** (another session, 4 Nov 2026, on branch `hiatus-ripple`). It gives the
     same function a third argument too, `opts.except` (the hiatus being edited, held in place). Use ONE options
     object, `{except, before}`, never two positional arguments. Whichever plan builds second rebases onto the
     other's change to `shiftCalendarDates`.
   - `inRange` gains the week bound (`<= weekIso`). A new `phaseInRange` is used in step 1 only (`<= phaseIso`).
   - With no `before`, both are today's test, so every existing caller is untouched.
   - About 15 lines.
2. **The popover.**
   - `PreviewToolbar.jsx` regroups `#pop-anchor` into §1's two rows and widens it to 480 px (a `.tools-menu-anchor`
     width class, as Rebuild From has `.tools-menu-solve`). The date input moves up beside the edge select and Go
     moves down beside the choice. The ids stay, so the four legs that drive it are untouched.
   - It adds the control inside `#pop-anchor`. Buttons carry `data-move` and no id. A dropdown,
     under R1(b), may keep an id, since `.tools-menu` already excludes it from the save sweep.
   - The engine handler reads the choice, hides it on `ANCHOR_ALL`, resets it on open (R2), writes the hint line,
     and passes the cutoff ("after") or the two bounds ("before").
   - The result line uses `describeShift`'s `tail`, as Shift From's does. The help text is the one in §1.
   - **Shift From (§1.1):** the same control inside `#pop-ripple`, two buttons (`data-move`, no id) under
     Earlier / Later. `ripple()` passes the cutoff for Phase & after, as today, or the two bounds for Phase &
     before. It resets to Phase & after on open, and its help text is the one in §1.1.
3. **A new leg, `anchorside`.** Each case runs on a synthetic calendar and checks the snapshot afterwards:
   - E1: All phases leaves today's result unchanged (the snapshot equals a run of today's code path).
   - A1: "after" equals Shift From by the same number of weeks.
   - B1: "before" moves the earlier phases, and the later ones keep their dates.
   - B2: a note in the picked phase's week 5 moves, and one in a later phase's week stays.
   - B3: an unlocked hiatus inside the picked phase moves, and a locked one stays.
   - B4: Production's half and off days keep their shoot-day numbers.
   - B5: a holiday and a dated note stay.
   - B6: "ends by" lands on or before the date.
   - U1: one Undo restores everything.
   - W1: Whole schedule hides the choice.
   - F1: Shift From on Phase & after equals today's Shift From. F2: Shift From on Phase & before by 2 weeks equals
     Anchor To's Phase & before to the date 2 weeks away.
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

---

## 6. Layout C: one Shift tool

Asked 4 Nov 2026: *"In theory, could shift from and anchor to be combined into one tool with multiple settings?"*, then
*"Yes, add it"*.

### 6.1 Why it can be one tool

Shift All's form, Shift From and Anchor To all end in the same call, `shiftCalendar(delta, cutoff)` (§0). They differ
in only two things:
- **Where the number of weeks comes from:** typed (Shift All, Shift From), or measured to a date (Anchor To).
- **Which phases move:** all of them (Shift All, Anchor To), or the picked one and the ones after it (Shift From).
  With §2, also the picked one and the ones before it.

Those are two settings, not three tools:

| | **By weeks** | **To a date** |
|---|---|---|
| **All phases** | today's Shift All form (no phase to pick) | today's Anchor To |
| **Phase & before** | new | new (A and B's "Phase & before") |
| **Phase & after** | today's Shift From | new (A and B's "Phase & after") |

### 6.2 What it looks like

- **The toolbar:** `[← 1 wk | Shift ▾ | 1 wk →]  [Rebuild From ▾]`.
  - The Shift From and Anchor To buttons go.
  - The arrows stay as they are: one click, one week, everything. They are the most-used thing in the row and still
    sit outside any popover.
  - The middle reads **Shift** instead of "Shift All", because its form can now move part of the calendar.
- **The popover** (340 px, the width of the other tools; Shift All's is 280 px today), top to bottom:
  1. **What moves:** `All phases | Phase & before | Phase & after`.
  2. **The phase, directly under it** (owner, 4 Nov 2026), alone on its row, shown only when it matters. It is
     hidden for All phases by weeks, which is Shift All and needs none. For All phases to a date it is the phase that
     lands on the date, and the list also offers Whole schedule.
  3. **The hint line** naming what stays put (§1). It sits under the pair it describes.
  4. **How far:** `By weeks | To a date`.
  5. **By weeks:** `[2] wks  [Earlier] [Later]`. **To a date:** `[starts on ▾]  [date]  [Go]`. *Starts on / ends
     by* moved down beside the date so the phase row holds the phase alone.
  - ⚠️ One case makes a row appear ABOVE the control you clicked: All phases by weeks, then To a date. The phase row
    appears under What moves and pushes How far down by one row. Every other change adds or removes rows below
    the click. If that jump bothers you, the fix is to show the phase row for All phases by weeks too, with the
    picker disabled. ✅ **Ruled: keep it.** The row shows only when it is needed (owner's picker, 4 Nov 2026).
- **It opens on All phases, By weeks** (R2): exactly today's Shift All form. Someone who opens it, types 2 and
  presses Later gets what they got before.
- **The two choices never hide.** Only the phase row and the inputs under How far change.
- **Each action button reads What moves for itself.** Earlier and Later always shift by weeks, and Go always goes
  to the date. How far only chooses which of them is shown.
- **The result line** is the same as in §1. With All phases by weeks, it is today's Shift All line word for word.
- **The help text:** *"Moves phases by a number of weeks or to a date. Choose whether all phases move, or only one
  phase and the ones after it or before it. Gaps are kept; use Rebuild From to close them."*
- **What tells the two tools apart:** Shift keeps the gaps, and Rebuild From closes them. That one difference
  replaces CLAUDE.md's "two questions" for the toolbar.

### 6.3 What it costs

- ⚠️ **It has been tried once in another form.** PROJECT-CONTEXT §7a records an "Adjustment Tools" menu that hid all
  four tools behind one unlabelled click and grew to 562 px tall. It was removed, and "there is deliberately no
  container menu".
  - C is different. It is one form with two settings, not four forms stacked. Rebuild From keeps its own button, and
    the arrows keep their one click.
  - It must stay short all the same. Measured in the mockup (its own CSS, the app's sizes):
    - 233 px as it opens (All phases by weeks).
    - 283 px at its tallest before anything moves (a phase row and a two-line hint).
    - 333 px with a two-line result line under it.
    - For comparison, the mockup's copy of today's Anchor To is 129 px, and layout A's two-row Anchor To is 155 px.
      The old
      menu was 562 px.
- **People on the live site lose two buttons they know.** Someone looking for "put the shoot on a date" has to know
  it is under Shift ▸ To a date. The Shift button's tooltip can say so: *"Shift the calendar by a number of weeks or
  to a date"*.
- **Controls that show and hide** (the phase row, the inputs under How far). This is the main thing to judge in the
  mockup.
- **The docs.** CLAUDE.md's "Calendar adjustment tools" paragraph and PROJECT-CONTEXT §7a describe four tools and two
  questions. Both are rewritten.
- **The legs.** Seven drive these popovers today, plus one that has to be written:
  - `#pop-shift` / `tool-shift-*` (`builtindates`, `calrange`, `customunits`, `episodeprep`, `halfworked`,
    `overrides`, `snaptools`). They keep working unchanged if the form opens on All phases by weeks and keeps those
    ids.
  - `#pop-anchor` / `tool-anchor-*` (`builtindates`, `customunits`, `datepick`, `snaptools`). Keep the
    `tool-anchor-phase` / `-edge` / `-date` / `-go` ids on the merged controls. Only the step that opens the popover
    changes, from `#pop-anchor-btn` to `#pop-shift-btn`.
  - `#pop-ripple` / `tool-ripple-*` (`calrange`, `overrides`, `rowheight`). These retire. The three legs pick This and
    after plus a phase instead.
  - The new leg (§5 step 3) adds before-by-weeks and after-to-a-date cases.
  - Every id stays inside `.tools-menu`, so the save sweep still skips them, and no saved file changes.
- **The engine is the same as for A and B:** the before bound (§5 step 1), plus the three handlers merged into one
  that computes the delta from weeks or from a date. Nothing new in what moves.

### 6.4 Build steps for C (after the rulings)

1. §5 step 1, the engine's before bound, unchanged.
2. **`PreviewToolbar.jsx`:**
   - Shift From's and Anchor To's buttons and popovers go.
   - `#pop-shift` gets the form in §6.2 and widens to 340 px.
   - The middle button's label becomes Shift, and its title changes.
3. **`app.js`:**
   - One handler set: Earlier/Later reads the weeks, Go reads the date, and both read What moves and the phase.
   - The phase list (one select, `tool-anchor-phase`) offers Whole schedule only for All phases to a date.
   - The form resets on open (R2) and writes the hint line.
   - `POPS` and `refreshMenuFromCalendar` lose the two retired popovers.
4. The legs (§6.3), the new leg, and the neighbours in §5 step 3.
5. **Docs, in the same commit:**
   - CLAUDE.md's "Calendar adjustment tools" paragraph.
   - PROJECT-CONTEXT §7a: the toolbar sketch and the table, which becomes "Shift keeps the gaps, Rebuild From closes
     them".
   - The README changelog, which says which buttons went and where they went.
   - HANDOFF and the tracker card.
6. A full gate before any push (§5 step 5).

---

## 7. Tick the phases that move, with the three buttons as shortcuts

**RULED (owner, 5 Nov 2026): layout A** (*"ok lets go with A"*), T2 (a) by picker (a note moves when its week is inside a
ticked phase's run), T3 the landing phase pinned. **BUILT the same day on branch `shift-tool`** (HANDOFF's entry has
the as-built record). §7.1–7.4 below are the plan as written before the ruling.

Asked 5 Nov 2026, after the one Shift tool went live:
- *"would it make more sense(or be too cumbersome/ugly) if rather than all, before, and after, you just selected every
  phase you wanted it to effect kinda like how it works in rebuild from right now?"*
- then *"is there anyway to have both?"*
- then *"Yes, mock it up"*.

Mockup: [`mockups/shift-tick-phases.html`](mockups/shift-tick-phases.html), tabs A and B. Tracker card `shift-tick-phases`.

### 7.1 What it is

- **A list of the phases** sits under the phase row, in Rebuild From's look (`.solve-list` rows): a tick, the colour,
  the name, the date, and what happens to it.
  - By weeks it says **Moves** or **Stays**.
  - To a date it shows the new date and **Pushed / Pulled N wks**.
  - It replaces the hint line, because the rows say what stays.
- **The three buttons become shortcuts that fill in the ticks.**
  - All phases ticks every phase.
  - Phase & before and Phase & after tick the picked phase and every phase that STARTS before or after it. That is
    today's rule (§2), so a Writer's Room running into Pre-Prep stays unticked with Phase & after Pre-Prep.
  - Any tick can then be changed. A set that matches no shortcut leaves none of the three pressed.
  - Picking another phase re-ticks while a shortcut is pressed, and keeps your own set otherwise.
- **To a date pins the landing phase** (Rebuild From's `.is-pin` row): it has to move, so it has no tick to clear.
- **Whole schedule** (All phases, To a date) ticks every phase and locks them.
- **Nothing changes for someone who ignores it.** It opens on All phases, By weeks (R2(a)), and the ticks are
  forgotten when the box closes, as Rebuild From's are.
- **The engine is done.** `shiftCalendarDates`' `part = {phases, fromWeek, toWeek}` (live since 5 Nov 2026) already
  moves any set. The ticks would be its `phases`.

### 7.2 Rulings needed

- **T1. The list under All phases.**
  - (a) Folded behind one line, *"Every phase moves · Choose phases"*, opening by itself for Phase & before / after
    or on a click (tab A). *(Recommended: the box opens at 248 px, as today; the list adds about 30 px a phase, to
    about 430–470 px.)*
  - (b) Always shown (tab B).
- **T2. Which notes move for your own set.** A shortcut keeps today's window (§2). For a hand-picked set:
  - (a) a note moves when its week is inside a ticked phase's run, even a week an unticked phase shares.
    *(Recommended: the picked phases win, as they do today.)*
  - (b) only weeks no unticked phase runs in.
  - Unlocked all-phase hiatuses and the calendar range follow the same test.
  - The phase-linked notes plan (tracker card `notes-linked-to-phase`) would settle shared weeks properly.
- **T3. To a date: the landing phase always ticked and pinned.** *(Recommended: otherwise "Pre-Prep starts on 4/5"
  could leave Pre-Prep where it is.)*

### 7.3 Build sketch (after the rulings)

- `PreviewToolbar.jsx`: an empty list host and a count in `#pop-shift`. The engine fills them, as it fills Rebuild
  From's. The ticks carry `data-key` and no id, inside `.tools-menu`.
- `app.js`: `shiftPlan` gains a ticks set, which the shortcuts fill and the rows edit. The result line names the
  phases that stayed for your own set.
- The `anchorside` leg grows cases for a hand-picked set, the fold, the pin and T2's notes.

### 7.4 Four layouts, measured (owner, 5 Nov 2026: *"give me some other slight variations and really consider what is
the easiest and most intuitive way to build this menu so its easy to understand and use but still retains all
functionality"*)

The mockup's four tabs. All four keep every function: any set of phases, the three shortcuts, by weeks, to a date,
Whole schedule. They differ in three choices only:

| | Picks the phase | By weeks / To a date | The shortcuts | List under All phases | Opens at | Phase & after, 7 phases |
|---|---|---|---|---|---|---|
| **A** | the dropdown | a switch | three buttons | folded ("Choose phases…") | 232 px | 467 px |
| **B** | a pin on each row | a switch | three buttons | folded | 232 px | 439 px |
| **C** | the dropdown (always shown) | both rows, always | three buttons | folded | 282 px | 481 px |
| **D** | a pin on each row | both rows, always | small links in the list's header | always open | 413 px | 397 px |

- **A, buttons + dropdown + list + switch.** Every step is labelled, in order: what moves, which phase, the list,
  how far. The parts are Rebuild From's, in Rebuild From's order, so nothing is new to learn. Its only
  redundancy: the dropdown and the pinned row both name the phase.
- **B, the list picks the phase.** No dropdown. Every row has a pin at its right end; the pinned row is the one the
  shortcuts and the date work from. One control fewer, and the phase is named once. Costs: a row has two click
  targets (the tick, the pin), and Rebuild From would still pick with a dropdown unless changed the same way.
- **C, no switch.** The weeks row and the date row are both always there, each with its own buttons, so no row ever
  changes under you. Costs: one more row, and the dropdown must always show (the date row needs it), which goes
  against the live tool's ruling that the phase row shows only when needed.
- **D, one surface.** The list is always open, the shortcuts are small links in its header (`All phases · & before ·
  & after`), the pin picks the phase, both rows show. Fewest controls; nothing hidden. Costs: tallest the moment it
  opens (413 px against today's 232), and the shortcuts, the owner's chosen words, shrink to links.

**Recommendation: A.** ✅ Ruled A. Not the fewest controls, but every control is labelled, nothing is behind a gesture, and it
is Rebuild From's parts in Rebuild From's order. B is the one to pick for fewer controls, and then Rebuild From should
pick its phase the same way. C and D trade the owner's earlier rulings (a short opening, the phase row only when
needed, the three words as buttons) for fewer modes.

The fold under All phases (A, B, C) is one quiet link, *"Choose phases…"*, right-aligned under the buttons, so the box
opens as short as it does today (232 px against 248 in the first cut). With both rows (C, D) the landing phase is
pinned once the date row is the one touched last.

### 7.5 The phase beside the date (owner, 5 Nov 2026, evening: *"is this confusing?"*) — ✅ RULED, ✅ BUILT

On a screenshot of All phases + To a date: *"when you switch from 'by weeks' to 'to a date' you then have to move your
eyes back up to the phase selector box then move your eyes back down past the How far toggle and then understand that
it means 'Shoot' starts on **date selected**"*. Layout A's one weak case: the phase select does two jobs, the pivot
under Phase & before / after (where What moves is its home) and the landing phase under All phases to a date (where
it is the subject of the date row), and in the second it sat two sections above the row it belongs to.

**Ruled** (*"Mock it up first"*, then *"I like it but it doesn't need to say 'the phase you picked'"*;
[`mockups/shift-date-row.html`](mockups/shift-date-row.html), today vs proposed side by side, both live): the date
row carries its own subject.

- Under All phases, or the user's own ticks, To a date: the phase select sits directly under the How far buttons,
  above *starts on*. The phase row above the list is gone in this case.
- Under Phase & before / after, To a date: the pivot stays in What moves, and a line under How far repeats its
  option as text (*"Production — 6/29/26"*), with no tag after it (D2: its own line, not "inside the box", which
  runs out of room at 340 px, and not "not repeated").
- By weeks: unchanged.

**Built** the same evening: a second `<select>` (`[data-shift-subject]`, no id) that mirrors `#tool-anchor-phase`,
filled from it by `syncShiftForm` and written back into it on change, so every reader keeps asking the one select;
the phase row shows only as the pivot. `anchorside` 30/30 (W1 the rows, J1 the mirror end to end). HANDOFF has the
as-built record.
