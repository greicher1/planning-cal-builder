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

✅ **VERIFIED 16 Sep 2026, and it holds.** With `prePrep` starting Wed 8 Jul 2026 and snap off, the
month-view pill renders at `grid-column: 4 / 7` against day headers `Sun Mon Tue Wed Thu Fri Sat` —
column 4 is Wednesday. **Zero changes to `renderMonthView`.** The rest of this plan rests on this and
the foundation is sound.

---

## 3. What is frozen, and what is not

`CLAUDE.md`'s freeze is a **symbol list**, not a vibe. Read it that way (it says so).

| Piece | Frozen? |
|---|---|
| `computeSchedule`, `simulateProductionSchedule`, `extendEndForHiatus`, `readState` | **No** — absent from the list |
| `segCoversDate`, `pillRunsForWeek` | **No** — absent from both `CLAUDE.md` and `MANTINE-SEAM.md` |
| `dayOverrides` store, save format, shift re-key | **No** |
| Sidebar controls, the `meta-<key>` hint line, popovers (body-level panels) | **No** |
| Waterfall drawing whatever weeks a segment covers | **No frozen EDIT** — the frozen renderers just draw what `schedule.weeks` gives them |
| **New markup inside `renderMonthView`** (drag handles, `half`/`off`/`on` marks) | ⛔ **YES** |
| `installGridResizers`, `beginSpanDrag`, `spanHandleGeometry` | ⛔ **YES** |

⛔ **`renderMonthView` is frozen because it IS the month PDF** — `exportMonthPdf` injects its output
into `#print-root` and prints that (`MANTINE-SEAM.md` §5.2). Not chrome. An export renderer.

**So exactly two things touch frozen code: the day-override marks, and the drag handles.** Both are
✅ approved against §6.5's gate. Everything else in this plan was never blocked.

---

## 4. `dayOverrides` — per-day control of the shoot (supersedes "half days only")

> Owner, 16 Sep 2026, on per-week Production control: *"you should be able to move weeks, and adjust
> the start and end of each week at a week by week level, not just the entire phase"*

⭐ **This is ONE map, not a restructure.** The literal reading — give every week its own start date —
would turn Production from `{start, days}` into a list of independently-dated blocks, rippling
through the simulation, episode slicing, week numbering, the save format and the shift tools.
Not needed. What a week-by-week change actually means on a shoot is a **per-day decision about which
days are shot**, and that is a map:

```js
dayOverrides = { '2026-07-15': 'half' | 'off' | 'on' }
```

| Override | Meaning |
|---|---|
| `half` | the day counts **0.5** toward the shoot-day total |
| `off` | not shot, though it would normally be a working day |
| `on` | shot, though it would normally be skipped — a Saturday, or a holiday being worked |

**What that buys, with no change to Production's shape:**

| Owner wants | Overrides |
|---|---|
| Week starts Tuesday | Mon → `off` |
| Week runs into Saturday | Sat → `on` |
| Four-day week | one day → `off` |
| Work through a holiday | that day → `on` |
| Half day | → `half` |

⛔ **Production must stay DERIVABLE from its inputs.** `start + count + holidays + hiatuses +
dayOverrides` → `shootDays[]`. That is what makes the two views incapable of disagreeing (§1). Do
not store a computed extent.

### 4.1 Storage

`dayOverrides = {}` keyed by ISO date. Added to `captureSnapshot()` **and** `applyStateSnapshot()`
**and** the resets — all three, or it silently fails to survive a save (`CLAUDE.md`, State model).
⛔ Restore unconditionally: `snap.dayOverrides ? {...snap.dayOverrides} : {}`, never
`if(snap.x) x = snap.x`.
⚠️ **Absent must mean "no overrides"**, so every calendar saved before this ships keeps its dates.

### 4.2 Math

`simulateProductionSchedule` consults the map as it walks: `off` skips the day, `on` forces it in
even if weekend/holiday, `half` contributes 0.5 instead of 1. Not frozen — it is absent from
`CLAUDE.md`'s frozen symbol list, which covers rendering, geometry, text fitting, direct
manipulation and exports.

⚠️ **`on` is the one that can surprise.** It overrides a *union holiday*, which is the thing the
whole holiday dataset exists to protect. It must be a deliberate per-day act and should be visibly
distinct in the month view, not a silent state.

### 4.3 ⛔ `dayOverrides` SHIFTS. It is the first day-keyed store that does.

`shiftCalendar` carries this warning:

```js
// ⚠️ Do NOT "complete the checklist" by adding a shiftKeyedMap call here.
// dayNotes / dayNoteColors / mvExtraLanes are day-addressed month-view content and stay put.
```

Correct for notes — *"wrap party booked"* belongs to a **date**. An override belongs to a **shoot
day**. Move the production a week and the overrides must travel, or the tool has silently changed
which days are half or off. **`dayOverrides` therefore DOES get a `shiftKeyedMap` call, and that
comment must be amended to say why it is the exception** — otherwise a future session reads the
warning and "fixes" it back.

### 4.4 ✅ RULED: the half-day remainder over-delivers

> Owner, 16 Sep 2026: **"Over-deliver — wrap at 60.5"**

Keep walking until the count reaches **or passes** the target. The last day stays a full day and the
production delivers up to half a day more than requested. ⚠️ **Never under-deliver** — that is the
property this buys, and why auto-marking the final day as a half was rejected: the tool would be
inventing an override the user never set.

⚠️ **Say this in a comment at the accumulation site.** 60.5 against a requested 60 reads as an
off-by-something to anyone who has not seen this ruling.

### 4.5 ✅ RULED: both views show the SAME wrap; the waterfall rounds its COUNT up

> Owner: **"the waterfall counts half days as full days ... rounds up to the nearest full number of
> days"**, and on whether the views may disagree: **"Same wrap — both say 20 Jul"**.

⛔ **Together these mean the wrap DATE is identical in both views and both exports. Only the
displayed day COUNT differs.** The waterfall deals in whole days, so it `Math.ceil()`s a *displayed
number* — 60.5 reads as 61 there, 60.5 in the month view. Same date.

⛔ **Never implement this as a second calculation.** Re-running the simulation with halves counted as
1.0 produces a genuinely different wrap and puts the Excel export and the month PDF in
disagreement — explicitly rejected.

**Worked example to test against:** Production = 10 shoot days from Mon 6 Jul 2026, Wed 8th and Thu
9th marked `half`. Both views wrap **Mon 20 Jul**.

### 4.6 ⚠️ What the waterfall cannot show, and it is inherent

A week worked Tue–Sat renders identically to Mon–Fri. The waterfall's atom is a week; it can say
"this week has Production" but not "these days within it". Same trade already accepted for half
days. If that becomes unacceptable, the answer is not a divergent waterfall — it is week-level
annotation, and that is a separate ruling.

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

## 6. Drag to adjust — ✅ APPROVED, against the §6 gate

> Owner, 16 Sep 2026: **"Approve both, against that gate"**, then: **"You should either be able to
> drag the start or end of a phase one day at a time in either direction"**, and on whole-phase
> moves: confirmed they move **independently** of neighbouring phases.

### 6.1 Three gestures, and body-drag is the CHEAPEST

| Gesture | Means | Model support |
|---|---|---|
| Drag **body** | move the whole phase; duration unchanged | ✅ `start-<key> += n` — one stored field, **no new markup** |
| Drag **start** edge | change start; end fixed | ✅ `start-<key>`, needs a handle element |
| Drag **end** edge | change duration; start fixed | ✅ `weeks-<key>`, needs a handle element |
| Drag a **middle** portion | insert/remove a mid-phase gap | ⛔ **Not in scope** — see §6.4 |

⭐ **Body-drag needs no new frozen markup** — the pill itself is the target — so it is strictly less
frozen-surface work than the edge handles. Build it first: it exercises the whole drag plumbing
(hit detection, live preview, commit on release) before a single handle element exists.

**Phases move independently.** There is no dependency graph; each phase owns its `start-<key>`.
Dragging Production later leaves Post where it is, which may open a gap or an overlap. ⚠️ **That is
not an error** — phases legitimately run concurrently, which is what `maxConcurrent` is for, and it
is already reachable today by typing a date. Relationship-preserving moves are what the Adjustments
menu (Shift All / Shift From / Anchor To / Rebuild From) is for. Drag moves one thing.

### 6.2 ⛔ A phase is MANY pills, so most pill edges are NOT phase edges

`pillRunsForWeek()` returns one pill per contiguous run **per week**, so a 6-week phase is ~6
separate pills down the month grid. Only the first pill's left edge is the real start and only the
last pill's right edge is the real end. Every other edge is a **week boundary**.

| Pill | Left edge | Body | Right edge |
|---|---|---|---|
| First | start handle | move phase | move phase |
| Middle | move phase | move phase | move phase |
| Last | move phase | move phase | end handle |

**Two handles per phase, ever.** Getting this wrong makes dragging a middle pill's "edge" do
something arbitrary.

### 6.3 ⚠️ The snap toggle governs the drag INCREMENT

With snap ON, dragging one day snaps straight back to Monday and the feature looks broken. So:

- **snap on** → drag moves in whole **weeks**
- **snap off** → drag moves by the **day**

That makes the §5 toggle mean something visible, keeps snapped calendars behaving exactly as they do
now, and means nobody drags a bar and watches it refuse to move.

### 6.4 Mid-phase drag is OUT of scope, deliberately

"Drag week 4 out by 4 days" has **no representation**: Production's extent is derived, and the only
mid-phase gap mechanism is a per-phase hiatus, which is week-granular (`{start, weeks}`,
`mondayOf()`-snapped). Within Production, `dayOverrides` (§4) covers it — mark the days `off`. For
other phases it would need day-granular hiatuses, which is a separate save-format change and is not
planned here.

### 6.5 ⛔ The gate — and the stop condition

1. Month PDF diffed against a pre-change export — **only** the intended new elements differ.
2. `mvNoteLineCount()` row heights unchanged (it measures against Inter; heights feed the print).
3. **Zero drag affordances present in `#print-root` output.** Handles live in the same markup
   `exportMonthPdf` injects and prints — get this wrong and every month PDF grows grab handles.
4. Gates 1–5 unchanged.

⛔ **If the gate fails, STOP and report. Do not re-cut the baseline** — the one move
`tests/baselines/2026-08-29-stage-7/README.md` calls indistinguishable from absorbing a regression.


## 7. ✅ Rulings received (16 Sep 2026)

| # | Question | Ruling |
|---|---|---|
| 1 | Frozen edit to `renderMonthView` | **Approved — both** day-override marks and drag handles, against §6.5's gate |
| 2 | Half-day remainder | **Over-deliver**; never under-deliver (§4.4) |
| 3 | Non-Monday starts | **Per-phase snap toggle**, default on (§5) |
| 4 | Waterfall vs month view | **Same wrap date**; waterfall rounds its displayed COUNT up (§4.5) |
| 5 | Do phases move independently when dragged? | **Yes** — no dependency graph; the Adjustments menu owns relationship-preserving moves (§6.1) |
| 6 | Per-week Production control | **`dayOverrides`**, not per-week start dates — Production stays derivable (§4) |

⏸ **Still unanswered:** whether any remaining *"adjustments"* the owner has in mind also move dates.
Ask before scoping beyond §4–§6.


## 8. Suggested order

Steps 1–4 touch no frozen code and can ship before anything is drawn.

1. ~~**Per-phase snap toggle** (§5)~~ — ✅ **SHIPPED 16 Sep 2026.** §2's claim verified by
   measurement. Gate 5 re-cut 53 → 59 (six `snap-<key>` ids); `v1.0.0-saved.html` restores with an
   identical grid signature and every toggle reading `"1"`. Two traps found in the doing: the frozen
   `meta-<key>` hint **self-corrects** (its guard compares typed-vs-resolved, not "is it a Monday"),
   and built-in phase rows **bind inputs by id** so a new control is inert there until bound
   explicitly.
2. ~~**`dayOverrides`: store, save format, shift re-key**~~ — ✅ **SHIPPED 17 Sep 2026.** Round trip
   proven lossless (including an unknown value) out of the crash backup; shift proven +7 on every
   key. ⚠️ A bug was introduced and fixed here: `hiatusKeyStays` was the wrong shift predicate.
3. ~~**The math** (§4.2)~~ — ✅ **SHIPPED 17 Sep 2026.** All four behaviours measured against
   hand-traced predictions; the over-deliver ruling needed no new code (the loop condition already
   implemented it once `count` went fractional). ⏸ **Two judgment calls await confirmation:** `on`
   does not override a hiatus, and half days in `shootDays` make `episodeSpans()` boundaries drift.
4. ~~**The waterfall's rounded count** (§4.5)~~ — ✅ **SHIPPED 17 Sep 2026** as a sibling line:
   `2 half · 1 off · 1 added — 11 days on the floor for 10 of 10`. ⚠️ §4.5 was WRONG that the
   `meta-<key>` hint is "chrome, not frozen" — the ELEMENT is chrome, the CODE that writes it is
   frozen `render()`. Filled from `update()` after `render()` returns instead. No frozen edit.
5. **Body-drag** (§6.1) — needs no new markup, exercises the whole drag plumbing.
6. ⛔ *Frozen work begins.* Day-override marks in the month cell, against §6.5's gate.
7. ⛔ Start/end handles (§6.2), against the same gate.

⚠️ **Cut a `.sptcal` fixture at steps 1, 2 and 6.** The save format moves in each, and
`tests/fixtures/` is how the restore path is proven. `HANDOFF.md` §2j has the
byte-identical-reproduction check to reuse for any data change.
