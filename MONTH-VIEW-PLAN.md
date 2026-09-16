# MONTH-VIEW-PLAN.md

**Status:** plan only. No code written. **All four blocking rulings received 16 Sep 2026** (§7).
**Written:** 16 Sep 2026, against `4b0c3c5`.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) §2i/§2j →
[`MANTINE-SEAM.md`](MANTINE-SEAM.md) §5.2.

---

## 1. The model: one truth at day resolution, two views at their native resolutions

The owner's framing, and it is the right one:

> *"this is functionality that only is allowed in the month view. so you can have per-day control
> but only in the month view"*

⛔ **This is NOT link/unlink, and it must never become link/unlink.** There is ONE schedule. The
waterfall renders it at **week** resolution; the month view renders it at **day** resolution. They
can never disagree, because neither owns a schedule — they are two projections of the same object.

That distinction is the whole design. A link/unlink model would let the Excel export and the month
PDF claim different wrap dates, which is the exact bug class this project spent weeks killing (three
independent column-width systems; `computePhaseRowLayout()` made the single source). Do not
reintroduce it.

**What "month view only" therefore means:** day-level control is *edited* in the month view and
*visible* there. The waterfall shows the same phase occupying whole week rows, because a week row is
its unit. That is a resolution difference, not a disagreement.

---

## 2. ⭐ The finding that makes most of this cheap

**The month view is ALREADY a day-accurate renderer.** It only looks Monday-aligned because
`computeSchedule` snaps starts before the renderer ever sees them.

```js
// computeSchedule -- NOT frozen
const start = mondayOf(parsed);          // <- the snap, one line

// segCoversDate -- NOT frozen, already day-level
if(s.key === 'production') return s.shootDays.indexOf(isoOf(date)) !== -1;
return date >= s.start && date < s.end;

// pillRunsForWeek -- NOT frozen, walks i = 0..6 and asks segCoversDate per day
```

So a phase whose `start` is a Wednesday draws as a pill starting Wednesday **with no change to
`renderMonthView` at all**. Production is already fully day-accurate — it carries an exact
`shootDays` ISO array.

⚠️ **Verify this claim before building on it** (it is the load-bearing one): set a phase start to a
Wednesday in a scratch build, drop the `mondayOf()` call, and look at the month view. If the pill
starts Wednesday, the rest of this plan holds.

---

## 3. What is frozen, and what is not

`CLAUDE.md`'s freeze is a **symbol list**, not a vibe. Read it that way (it says so).

| Piece | Frozen? |
|---|---|
| `computeSchedule`, `simulateProductionSchedule`, `extendEndForHiatus`, `readState` | **No** — absent from the list |
| `segCoversDate`, `pillRunsForWeek` | **No** — absent from both `CLAUDE.md` and `MANTINE-SEAM.md` |
| `halfDays` store, save format, shift re-key | **No** |
| Sidebar controls, the `meta-<key>` hint line, popovers (body-level panels) | **No** |
| Waterfall drawing whatever weeks a segment covers | **No frozen EDIT** — the frozen renderers just draw what `schedule.weeks` gives them |
| **New markup inside `renderMonthView`** (drag handles, half-day shading) | ⛔ **YES** |
| `installGridResizers`, `beginSpanDrag`, `spanHandleGeometry` | ⛔ **YES** |

⛔ **`renderMonthView` is frozen because it IS the month PDF** — `exportMonthPdf` injects its output
into `#print-root` and prints that (`MANTINE-SEAM.md` §5.2). Not chrome. An export renderer.

**So exactly two things need an owner ruling: half-day shading, and drag handles.** Everything else
in this plan is unblocked.

---

## 4. Half days — SEMANTIC (owner ruled 16 Sep 2026)

> *"no i think half days do affect the actual total days"*

A half day counts **0.5** toward the shoot-day total, so the wrap date moves.

### 4.1 Storage

`halfDays = {}` keyed by ISO date. Added to `captureSnapshot()` **and** `applyStateSnapshot()` **and**
the resets — all three, or it silently fails to survive a save (`CLAUDE.md`, State model).
⛔ Restore unconditionally: `snap.halfDays ? {...snap.halfDays} : {}`, never `if(snap.x) x = snap.x`.

### 4.2 Math

`simulateProductionSchedule` counts `halfDays[iso] ? 0.5 : 1` per working day and accumulates until
`count >= shootDaysRequested`. Not frozen.

### 4.3 ⛔ Half days SHIFT. They are the first day-keyed store that does.

`shiftCalendar` carries this warning:

```js
// ⚠️ Do NOT "complete the checklist" by adding a shiftKeyedMap call here.
// dayNotes / dayNoteColors / mvExtraLanes are day-addressed month-view content and stay put.
```

That rule is correct for notes — *"wrap party booked"* belongs to a **date**. A half day belongs to a
**shoot day**. Move the production a week and the half day must travel with it, or the tool has
silently changed which day is half. **`halfDays` therefore DOES get a `shiftKeyedMap` call, and that
comment must be amended to say why it is the exception** — otherwise a future session will read the
warning and "fix" it.

### 4.4 ✅ RULED: the remainder over-delivers

> Owner, 16 Sep 2026: **"Over-deliver — wrap at 60.5"**

Keep walking until the count reaches **or passes** the target. The last day stays a full day and the
production delivers up to half a day more than requested. ⚠️ **Never under-deliver** — that is the
property this rule buys, and it is why the alternative (auto-marking the final day as a half) was
rejected: the tool would be inventing a half day the user never set.

⚠️ **Say this in a comment at the accumulation site.** A shoot reporting 60.5 days against a
requested 60 reads as an off-by-something to anyone who has not seen this ruling.

### 4.5 ✅ RULED: both views show the SAME wrap; the waterfall rounds its COUNT up

> Owner, 16 Sep 2026: **"the waterfall counts half days as full days ... it rounds up to the
> nearest full number of days"**, and, on whether the two views can disagree about the wrap:
> **"Same wrap — both say 20 Jul"**.

⛔ **These two statements together mean: the wrap DATE is identical in both views and both exports.
Only the displayed day COUNT differs.** The waterfall deals in whole days, so where it shows a
number it rounds **up** — a schedule delivering 60.5 reads as **61** there, while the month view
shows the real 60.5. The date is the same date.

⛔ **Do not implement this as a second calculation.** There is one schedule. The waterfall applies
`Math.ceil()` to a *displayed number*; it must never re-run the simulation with halves counted as
1.0, because that produces a genuinely different wrap date and puts the Excel export and the month
PDF in disagreement — explicitly rejected above.

**Worked example, to test against:** Production = 10 shoot days from Mon 6 Jul 2026. Wed 8th and Thu
9th marked half. Both views wrap **Mon 20 Jul**. Month view reads 10 days (2 of them half); the
waterfall reads 10. Where a fractional total arises, the waterfall rounds up and the month view does
not.

---

## 5. Per-phase start day (owner request, 16 Sep 2026)

> *"right now start dates of phases snap to the closest monday. thats fine as the default, but i
> want you to have the option to change that start date to a different day for each phase"*

### ✅ RULED: a per-phase snap TOGGLE, default on

> Owner, 16 Sep 2026: **"Per-phase snap toggle"** — snap stays on by default, so nothing changes for
> an existing calendar until someone turns it off.

⛔ **This adds a per-phase DOM field, and that makes it SAVE FORMAT.** `collectFieldValues()` sweeps
every `input[id]` / `select[id]` / `textarea[id]` in the document, so the toggle is captured into
`fields.byId` automatically — which is correct, it IS calendar data. But its id pattern (`snap-<key>`,
matching `start-<key>` / `weeks-<key>`) is then **permanent**, exactly like the phase-field ids
already are. Pick the name once.
⚠️ **Absent must mean SNAPPED**, so every calendar saved before this ships keeps its current dates.
Same rule `SHEET_GRIDLINES` follows: absent = today's behaviour.

- Parameterise `mondayOf(parsed)` in `computeSchedule` on that toggle — not frozen.
- The month view then shows the true start immediately (§2).
- The waterfall still renders week rows. A phase starting Wednesday occupies that whole week row.
  **That is correct at week resolution, not a bug** — but it is worth a label so it does not read as
  one. `snapNote()` already exists and says *"Snapped to Mon …"*; it becomes the place to say
  *"starts Wed"* instead.

⚠️ **Durations get a decision too.** Start Wednesday + 6 weeks = ends on a Tuesday, which makes the
phase span 7 week-rows in the waterfall rather than 6. Expected, and the frozen renderers handle it
without edits — but the sidebar's week count will look off by one against the bar. Say it in the
hint line.

⚠️ **Week-keyed state is unaffected.** `userNotes`, `noteColors`, `cellSpans`, `gridColSwaps`,
`rowHeights` are keyed by the week's Monday and stay that way — a note belongs to a grid cell, and a
grid cell is a week. The save format does not move. ✅ Confirmed by reading the stores, not assumed.

---

## 6. Drag to adjust phases — ✅ APPROVED, against the §6 gate

> *"you should be able to individually drag and adjust phases (like click/drag the bars to change
> start and end dates of each and any phase of any type"*

> Owner, 16 Sep 2026: **"Approve both, against that gate"** — half-day shading AND drag handles.

Drag handles on month-view pills are **new interactive markup inside `renderMonthView`**, which is
the month PDF's document. The frozen edit is approved; the gate below is the condition.
⛔ **If the gate fails, STOP and report. Do not re-cut the baseline to make it pass** — that is the
one move `tests/baselines/2026-08-29-stage-7/README.md` says is indistinguishable from absorbing a
regression.

⚠️ **And the handles must not print.** Whatever is added for dragging has to be invisible in
`#print-root`, or every month PDF grows grab handles. That is the specific risk the gate must cover.

**Proposed gate (not yet ruled):**
1. Month PDF diffed against a pre-change export — **only** the intended new elements differ.
2. `mvNoteLineCount()` row heights unchanged (it measures against Inter; heights feed the print).
3. Zero drag affordances present in `#print-root` output.
4. Gates 1–5 unchanged.

---

## 7. ✅ Rulings received (16 Sep 2026) — and the one question left

| # | Question | Ruling |
|---|---|---|
| 1 | Frozen edit to `renderMonthView` | **Approved — both** shading and drag handles, against §6's gate |
| 2 | Half-day remainder | **Over-deliver**; never under-deliver (§4.4) |
| 3 | Non-Monday starts | **Per-phase snap toggle**, default on (§5) |
| 4 | Waterfall vs month view | **Same wrap date**; waterfall rounds its displayed COUNT up (§4.5) |

⏸ **Still unanswered:** do any of the *"other adjustments"* the owner mentioned also move dates? Ask
before scoping anything beyond half days, per-phase starts and drag.

---

## 8. Suggested order

Everything in steps 1–3 is unblocked and can ship before any ruling.

1. **Per-phase start day.** Smallest, and it proves §2's claim. Sidebar control + drop the snap +
   update `snapNote()`. Month view goes day-accurate for free.
2. **Half-day store, math, save format, shift re-key.** No display yet — prove the wrap moves
   correctly with a harness leg before anything is drawn.
3. **The waterfall hint line** (§4.5), so the moved wrap is explicable.
4. ⛔ *Ruling gate* — half-day shading and drag handles.
5. Half-day display in the month cell.
6. Drag to adjust.

⚠️ **Cut a `.sptcal` fixture at each of steps 1, 2 and 5.** The save format moves in every one of
them, and `tests/fixtures/` is how the restore path is proven. `HANDOFF.md` §2j has the
byte-identical-reproduction check to reuse for any data change.
