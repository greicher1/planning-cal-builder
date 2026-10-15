# MONTH-VIEW-PLAN.md

**Status:** steps 1–6 SHIPPED (16–18 Sep 2026), plus the `dayOverrides` UI that turns step 6's marks
on; step 7 is ◐ PART-BUILT: every Production handle was built locally on 15 Oct 2026 (§6.7). The custom
phases' and built-ins' handles follow CUSTOM-PHASE-UNITS (rulings 8 and 7; 7 re-confirmed as 1c). **All four blocking
rulings received 16 Sep 2026** (§7). ⚠️ This header used to read *"plan only. No code written."*
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
| Drag **start** edge | change start; end fixed | ⛔ **wrong at day resolution, see §6.7.** Moving the start with the end held changes the LENGTH, so this is not `start-<key>` alone |
| Drag **end** edge | change duration; start fixed | ⛔ **wrong at day resolution, see §6.7.** `weeks-<key>` holds whole weeks, and Production's is written by Show Info, never typed |
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

⛔ **OVERRIDDEN FOR PRODUCTION by the owner, 15 Oct 2026 (§6.7, ruling 9):** *"you should be able to
drag either side of each episode/production week/block individually"*. Production gets a handle at
each episode or block boundary and at each week pill's own edges, not only its two outer edges.
✅ Confirmed as §6.7's rulings 9a–9c, and BUILT the same day (§6.7). The rule above still holds for
every other phase: there, a middle pill's edge is a week boundary and moves the phase.

### 6.3 ⛔ SUPERSEDED 18 Sep 2026 — the drag is DAY-GRANULAR, and it turns the toggle off

**What this section used to say**, and it shipped that way on 18 Sep: snap on → drag moves in whole
**weeks**; snap off → by the **day**. The reasoning was sound as far as it went — with snap on, a
one-day drag is undone by `computeSchedule`'s `mondayOf()` and the bar refuses to move.

⛔ **The owner rejected the week-stepping outright** (*"i want to drag day by day"*). The right
resolution is not to quantise the gesture to the constraint but to let the gesture **lift** it: a
snapped phase is Monday-only, so dragging one onto a Tuesday IS the instruction "this phase starts
on a Tuesday". The drag therefore sets `snap-<key>` to false when it lands off-Monday, visibly, and
moves by the day everywhere.

⭐ **One undo restores both**, because `start-<key>` and `snap-<key>` are both swept into the same
`fields.byId` snapshot — no extra bookkeeping, and no second store to keep in sync.

⚠️ **The general shape is worth keeping:** when a gesture collides with a stored constraint, the
choice is to refuse the gesture, quantise it, or change the constraint. Quantising looked like the
conservative option and produced a control that appeared broken.

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

### 6.6 ⛔ THE FROZEN EDITS ACTUALLY MADE, and how each met the gate

Four, not the two this plan anticipated. Recorded here because §6.5's approval was given against a
list, and the last two were not on it — each was approved on its own as it was found to be needed.

| Edit | Approved | How condition 1 was met |
|---|---|---|
| `data-ph` on month pills | 16 Sep 2026 | `monthprint` capture byte-identical once `data-ph` is stripped |
| `mv-day-half/off/on` classes on day cells | 16 Sep 2026 | adds a CLASS to an existing cell — no element, no lane, no text node, so row heights cannot move |
| `#table-wrap .mv-pill{pointer-events:auto; cursor:grab}` | **18 Sep 2026** | **scoped so it cannot match inside `#print-root`** — `#print-root` is not a DESCENDANT of `#table-wrap`. Neither property renders in any case |
| `#table-wrap .mv-daycell{cursor:pointer}` | **18 Sep 2026** | same — and `cursor` has no printed representation at all |

⚠️ **The third was not foreseen and §6.1 is wrong about it.** *"Body-drag needs no new frozen
markup — the pill itself is the target"* is true about markup and false about reachability: the
pill is inside `.mv-bars`, which is `pointer-events:none`. Build it first was still the right call;
the gesture just cost one more frozen line than the plan priced.

⚠️ **"`#print-root` is a SIBLING of `#table-wrap`" is the reason these rows give, and it is
FACTUALLY WRONG** — measured 18 Sep 2026. `#print-root` is a direct child of `<body>`; `#table-wrap`
is `body > .layout > main.preview-panel > #table-wrap`. Different subtrees. ⭐ **The conclusion is
unaffected and is stronger than the reason given**: all the scoping needs is that `#print-root` is
not *inside* `#table-wrap`, which it is not. Verified directly — `#print-root .mv-pill` and
`#print-root .mv-daycell` match 0 elements while `#table-wrap .mv-daycell` matches all 35. The
shorthand stopped being true when the Mantine layout wrapped the preview panel.

⚠️ **Condition 2 (`mvNoteLineCount()` row heights) is untouched by all four** — none of them
affects text measurement. Condition 3 is the open one: 86 inert `data-ph` attributes do travel into
`#print-root`, and whether that counts as an "affordance" is still an owner call. The pill's
`cursor`/`pointer-events` do NOT travel, by the scoping above.

✅ **CLOSED 18 Sep 2026 — this paragraph used to say the opposite.** It read: *"NONE OF THE THREE IS
EXERCISED BY A FIXTURE THAT USES IT … the marks are proven inert when unused and unproven when
used."* `tests/fixtures/dayoverrides.sptcal` now carries all four override kinds (`half`, `off`, `on`
over a weekend, `on` over a union holiday), a `snap-<key>` set **false** with a Wednesday phase start,
and a named hiatus. Restored through the inline `?state=` path it reproduces its calendar exactly —
wrap 10/27/26, *1 half · 1 off · 2 added*, all four marks rendering. §8's instruction at steps 1, 2
and 6 is finally followed.

⚠️ **Proven by hand, not by the gate.** No `gate.sh` leg loads that fixture yet, so a regression in
the marks would still pass a green gate. Wiring one in is the remaining half, and it pairs with the
`monthprint` baseline item.

### 6.7 ⛔ Where a day-granular EDGE is stored: for most phases, nowhere (15 Oct 2026, before any code)

Worked out before step 7 was coded, as its brief required. Read from `readState`, `computeSchedule`,
`refreshDerivedInfo` and `episodeDayMap` at `400ea6c`. **No code was written. Step 7 is held on the
three rulings below.**

§6.1's table priced the end edge as "✅ `weeks-<key>`" and the start edge as "✅ `start-<key>`".
Both are wrong at day resolution, for a reason the table did not show. **An edge drag holds the other
end still, so it changes the phase's LENGTH, by days.** Body-drag never touches the length, which is
why it needed only `start-<key>` (and `snap-<key>`, §6.3).

| Phase type | What is stored | How its end is computed | Start edge (end held) | End edge (start held) |
|---|---|---|---|---|
| **Weeks**: Writer's Rm, Pre Prep, Prod Prep, Post, Localization, and **every custom phase** (none has an `inputMode`) | `start-<key>`, `snap-<key>`, `weeks-<key>` (`parseInt`, so whole weeks) | `extendEndForHiatus()`: the start plus a whole number of weeks, plus any paused weeks | ⛔ **No representation.** One day later with the end held is a length of 7n−1 days | ⛔ **No representation.** The end is always the start plus whole weeks |
| **Production** | `start-production`, `snap-production`, `dayOverrides`. ⛔ **There is no typed count.** `refreshDerivedInfo()` WRITES `weeks-production` from Show Info: Σ episode days, or Σ block days in Blocks mode. The row is greyed until Show Info is complete. 50 of the 52 fixtures with a Production start have it complete, and the other two leave Production unscheduled | `simulateProductionSchedule()`: the day after the last shoot day | ◐ **Only by changing an episode's or block's day count** | ◐ Same |
| **Days** (custom; CUSTOM-PHASE-UNITS, not built) | `start-`, `days-<key>`: working days | its own day walk | ✅ `start-<key>`, with `days-<key>` re-counted so the last day stays | ✅ `days-<key>` |
| **Dates** (custom; CUSTOM-PHASE-UNITS, not built) | `start-`, `end-<key>`: inclusive | `end-<key>` plus one day | ✅ `start-<key>` | ✅ `end-<key>` |

⛔ **§6.3's way out does not apply here.** There, the drag collided with a TOGGLE (`snap-<key>`), so
the gesture could switch it off. A Weeks phase's length has no toggle to switch off: its unit is the
week. "Change the constraint" here means a new stored field per phase, which is a save-format
change. Step 7 was approved as a frozen DRAWING edit (ruling 1), not as a format change. That is why
this stops rather than quantising (§6.3: the owner rejected week-stepping outright).

**Facts any answer has to respect:**

- **Production moves in SHOOT days.** A step onto a weekend, a holiday, an `off` day or a hiatus day
  moves nothing, because no shoot day is gained or lost. ⛔ **The edge never marks a day `on`.** §4.4
  rejected the tool inventing an override the user never set.
- **Which episode is "at the edge" is decided by SHOOTING order** (`effectiveShootOrder()`), because
  `episodeDayMap()` deals the shoot days out in that order. The end edge belongs to the last
  episode shot, and the start edge to the first. Blocks use list order (`blockDefs`).
- **A changed episode count is already visible.** The Show Info note lists it under "Manually
  changed: Episode 210 → 9 days (default is 8)". Nothing extra is needed for it to be seen.
- **Half days:** the count is whole, but a shoot can deliver x.5. A wrap ON a half day whose
  predecessor already reaches a whole count cannot be reached by any whole count. The drag would
  land on the nearest shoot day it can reach.
- **An edge drag is NOT a mover in R2's sense.** The shoot days that stay shot keep their dates, so
  `dayOverrides` must stay on their dates. Wrapping it in `asShootDayMove()`, as body-drag is, would
  shift every mark by one shoot day when the start edge moves.

**The rulings needed.** Each recommendation comes first:

1. **Built-in Weeks phases** (Writer's Rm, Pre Prep, Prod Prep, Post, Localization):
   - **(a) Recommended: no edge handles. Body-drag only.** Their unit is a week. The owner's
     15 Oct request scoped day-level lengths to custom phases (*"I think just for custom phases"*),
     and CUSTOM-PHASE-UNITS §1 leaves built-ins untouched.
   - (b) Week-stepping edges. This is the quantising §6.3 rejected for body-drag, listed only
     because these phases' length really is weeks.
   - (c) Give the built-ins Dates mode too: five new permanent ids on static rows, against
     CUSTOM-PHASE-UNITS ruling 1. *(Two errors in this option as it was put to the owner, both
     corrected below the rulings table: the scope line is §1, not ruling 1, and the id count is ten,
     not five.)*
2. **Custom phases:**
   - **(a) Recommended: build after CUSTOM-PHASE-UNITS steps 1–4.** Dates and Days phases get both
     handles. Dragging a Weeks custom phase's edge switches it to Dates mode, visible in its
     Length select. That is §6.3's "change the constraint", and the Length select is a constraint
     the gesture can switch, as Snap to Mon is. One undo restores both, since `unit-`/`end-` are
     swept into the same `fields.byId` snapshot.
   - (b) After CUSTOM-PHASE-UNITS: handles on Days and Dates phases only, none on Weeks.
3. **Production:**
   - **(a) Recommended: an edge changes the day count of the episode (or block) at that edge,** by
     shoot days. It never invents an override, and it floors at 1 day. It stops there rather than
     spilling into the next episode.
   - (b) No edge handles on Production. Its length is set by the episode or block list.

#### ✅ The rulings received (owner, 15 Oct 2026, by picker, relayed by the step-7 parent session)

Only ruling 2 went as recommended. Numbered 7–9 in §7.

| # | Question | Ruling |
|---|---|---|
| 7 (§6.7 q1) | Built-in Weeks phases | **(c) "Add a Dates mode."** Writer's Rm, Pre Prep, Prod Prep, Post and Localization get real day-level edges. ⛔ **This reverses CUSTOM-PHASE-UNITS's scope for the built-ins and adds new permanent ids to the save format.** The picker said both, so the owner chose with them in view. Recorded in that plan |
| 8 (§6.7 q2) | Custom phases | **(a)** Build after CUSTOM-PHASE-UNITS steps 1–4. Days and Dates phases get both handles, and dragging a Weeks custom phase's edge switches it to Dates |
| 9 (§6.7 q3) | Production | **No listed option.** The owner typed: *"you should be able to drag either side of each episode/production week/block individually"*. ⏸ **The reading below goes back to the owner before any code** |

⚠️ **A misattribution in the same option text, also reported rather than fixed quietly.** It said
"against CUSTOM-PHASE-UNITS ruling 1", and the relay repeated it. That ruling is **"one schedule; the
waterfall shows these phases at week resolution"**. It is NOT reversed, and it governs a built-in in
Dates mode exactly as it governs a custom one. What ruling 7 reverses is the plan's scope line
beside it, from the owner's request: *"Built-in phases are untouched"* (CUSTOM-PHASE-UNITS §1).

⚠️ **A miscount in this section's own option text, reported here rather than quietly fixed.** Option
(c) of question 1 said *"five new permanent ids on static rows"*. It is five **phases**. Parity with
the custom phases' Dates mode is **two ids per phase** (`unit-<key>` and `end-<key>`), so ten ids in
all. Five is reachable only if the built-ins carry `end-<key>` alone, with blank meaning Weeks. That
choice is a save-format decision and goes back to the owner with ruling 9's reading.

⭐ **What can be built when.** Rulings 7 and 8 both wait on CUSTOM-PHASE-UNITS (its Dates mode is
what a drag writes). Ruling 9 does not: Production's handles can be built as soon as the reading
below is confirmed.

#### ✅ Ruling 9, Production: the reading below CONFIRMED (owner, 15 Oct 2026, one picker, relayed)

All four recommendations were accepted, worded as put:
- **9a:** episode boundaries (block boundaries in Blocks mode) AND each Production Week pill's own
  edges. A week edge sets a day override; the episode total is unchanged, so the wrap moves. Where
  the two coincide, the episode handle wins.
- **9b, push:** only the earlier episode changes length, later episodes slide, and the wrap moves.
  The first shoot day is the only left-side handle, and it changes episode 1 with the wrap held.
- **9c, screen only:** hover handles over Production. Both month PDFs are unchanged, with zero frozen
  edits.
- **9d (ruling 7's ids):** ten, `unit-<key>` + `end-<key>` per built-in phase, the same as custom
  phases. Switching back to Weeks keeps the end date. Recorded in CUSTOM-PHASE-UNITS §7a.

The reading as it was put to the owner, kept for the record:


**What the screen shows today**, which decides what a handle can attach to. Since ruling 8
(22 Sep 2026) there are **no episode pills**. Production draws one pill per week row, labelled
*Production Week N*, with the episodes (or blocks and episodes) being shot as grey text inside it
(`productionPillTag()`). **An episode boundary that falls mid-week has no visible edge at all.** It is
inside a pill. So "either side of each episode" needs a boundary the user can see before it can be
grabbed.

**The reading:**

1. **"episode/production week/block" names three handle kinds:**
   - **Episode boundaries** in Episodes mode, taken in SHOOTING order (`effectiveShootOrder()`).
   - **Block boundaries** in Blocks mode. Episodes inside a block are labels only and never reach a
     date (BLOCKS-PLAN), so in Blocks mode they get no handles.
   - **Each Production Week pill's own edges.** This is the owner's 16 Sep request (*"adjust the start
     and end of each week at a week by week level"*), which §4 answered with `dayOverrides` and a
     per-day click. As a drag, it maps onto that same store:
     - week's left edge Mon → Tue: Monday `off` ("week starts Tuesday", §4's table);
     - right edge Fri → Sat: Saturday `on` ("week runs into Saturday");
     - and the reverse.

     ⚠️ The episode list's total does not change, so **the wrap moves as a side effect:** an `off`
     day costs a day, and the shoot finishes one shoot day later. That is Production staying
     derivable (§4). Here the drag IS the user setting the override, which is not the "tool
     inventing one" that §4.4 rejected.
   - **Where a week edge is also an episode boundary, the episode handle wins.** One pixel cannot
     mean two things.
2. **"individually" means only the grabbed episode's length changes** (the *push* reading). Drag
   episode 203's right side one shoot day later: 203 gains a day, every later episode keeps its
   length and slides one shoot day later, and the wrap moves. The other reading is a *trade*: 203
   gains the day 204 loses, and the total and the wrap stay put. Push is the reading of
   "individually"; trade is what a fixed-budget shoot wants. **Owner's call.**
3. **A shared boundary belongs to the EARLIER episode.** It is 203's right side, so dragging it
   changes 203. The only left side that is not also someone's right side is the first episode's:
   that is Production's first shoot day. Dragging it changes episode 1's length with the wrap held
   (start moves, `snap-production` comes off on a non-Monday, as §6.3). The alternative is to let the
   pointer pick a side: the left half of the handle is 203's right side (later episodes slide), and
   the right half is 204's left side (earlier episodes, and the first shoot day, slide back while the
   wrap holds). That is symmetric, but it is two gestures 3 px apart.
4. **Steps are shoot days.** Weekend, holiday, `off` and hiatus days are stepped over, and a
   boundary never invents an `on` (§4.4). The exception is a week edge dragged onto a weekend, which
   IS the user marking it (item 1). The floor is 1 day per episode or block, and a drag stops there
   rather than spilling into the neighbour.
5. **The boundary handles are screen-only, so the month PDF does not change.** They are a body-level
   layer positioned over the pills, shown on hover over Production. That layer can never print:
   `body.printing-calendar > *:not(#print-root){display:none !important}` hides every direct child of
   `<body>`, and the direct writer parses `renderMonthView()`'s HTML string, not the DOM. **Zero frozen
   edits**, not even the cursor line below, because a handle element carries its own
   `cursor:ew-resize`. The alternative is to draw a divider in the pill at every boundary, on screen
   and in both month PDFs. That is a frozen edit that moves gates 10 and 13, and contact sheets go
   to the owner first (MONTH-PDF-WRITER ruling 4).

**Stated so they cannot be lost:**

- **None of these is a mover** (R2). The shoot days that stay shot keep their dates, so
  `dayOverrides` stay on their dates and no handle runs inside `asShootDayMove()`. A boundary drag
  only changes an episode or block count, and a week-edge drag only writes the override it names.
- **One undo per drag.** An episode's or block's day count is not a DOM field: `episodeDefs` and
  `blockDefs` are stores, and so is `dayOverrides`. ✅ All three are in `captureSnapshot()`'s literal
  (read 15 Oct 2026), with `episodeShootOrder`, so one snapshot holds any of these drags. Bank exactly
  one step with `cancelPendingUndoPush()` plus a trailing push, as body-drag does.
- ⛔ **A boundary drag must set `daysEdited: true`** on the episode or block it changes. The reconcile
  resets every episode WITHOUT that flag to the default (`if(!e.daysEdited) e.days =
  defaultEpisodeDays()`, and the same for blocks). Without the flag, the next change to Shooting Days
  per Episode would silently undo the drag. With it, the change also shows in the Show Info note's
  "Manually changed" list, which is how the user sees what the drag did.

#### ⚠️ Two sets of answers, both from the owner on 15 Oct 2026. They now disagree on question 1 only

After the relayed rulings 7–9, the owner also wrote to the step-7 session directly, four times
over: *"Accept the recommended rulings 1a, 2a and 3a in MONTH-VIEW-PLAN.md §6.7. Build Production's
edge handles now; the custom-phase handles follow CUSTOM-PHASE-UNITS."* That is the text of a button
in the FIRST question box, which was still on screen, so it is probably a stale click. Then ruling
9's reading was confirmed by picker (above).

| § 6.7 question | Relayed by picker | Typed to the step-7 session |
|---|---|---|
| 1, built-in Weeks phases | **(c) Dates mode**, then 9d (ten ids) | (a) no edge handles |
| 2, custom phases | (a) | (a): agreed |
| 3, Production | ruling 9, confirmed as 9a–9c | (a) the two outer edges. These are a SUBSET of 9a–9c, so there is no conflict about what to build |

**Production is built to 9a–9c.** Question 1 does not touch Production. It decides whether
CUSTOM-PHASE-UNITS gives the built-ins a Dates mode (§7a there).

✅ **RESOLVED 15 Oct 2026, owner's picker in the step-7 session: "Dates mode (1c)" stands.** The five
built-ins get Dates mode, with ten ids (9d), and with it day-level edge handles (ruling 7).

#### ✅ BUILT 15 Oct 2026: every Production handle of rulings 3a and 9a–9c. Zero frozen edits

`installProductionEdgeHandles()` in `src/legacy/app.js`, right after `installMonthPillDrag`. It was
built in two passes the same day: the two outer edges first, after the owner's direct "3a", then the
rest of ruling 9 once 9a–9c were confirmed.

**What a Production pill carries** (`specsFor()`), shown while the pointer rests on it:

| Handle | Where | A drag does |
|---|---|---|
| `start` | left edge of the pill holding the first shoot day | episode 1 (block 1) gains or loses days; the wrap is held; `start-production` moves, and Snap to Mon comes off on a non-Monday |
| `end` | right edge of the pill holding the wrap | the last episode (block) gains or loses days; the first shoot day is held |
| `bound` | the line after any other episode's (block's) last day: mid-pill, or the pill's right edge | that row gains or loses days; later rows keep theirs and slide; the wrap moves (9b, push) |
| `wkL` / `wkR` | a pill's own left / right edge, where none of the above is | day marks: a shoot day dragged out is marked `off`, a day dragged in is marked `on` or loses its `off`; the rows keep their lengths, so the wrap moves (9a) |

- **"The episode handle wins" (9a), made exact.** A pill edge carries no week handle if it is the
  first shoot day, the wrap, an episode's last day (a `bound` sits there), or an episode's FIRST day.
  At an episode's first day, the boundary is the previous episode's right side (9b), so that edge
  has no handle at all.
- **Row handles step by shoot day** and never write a mark. The edge lands on the shoot day nearest
  the pointer, ties going to the smaller change, and each row floors at 1 day.
- **Week edges stay in their own row**, never before the first shoot day or past the wrap, and stop
  short of a hiatus day (`on` cannot override one). The marks are recomputed from the marks at
  mousedown on every step, so a drag that comes back restores them exactly, including a `half` it
  passed over.
  - A weekend or holiday that was shot only because of its own `on` goes back to unworked when
    dragged out. Any other day dragged out is marked `off`.
  - A holiday dragged in is marked `on`, which is working a union holiday. It is visible as the `on`
    tint (§4.2), and it is what 9a rules for a week edge.

**How:**

- **The handles are body-level chrome, not part of the grid.** `.phase-edge-handle` elements are
  pooled and laid inside the pill, 10 px wide, in the pill's own text colour. A week edge's handle
  is lighter and shorter (`.is-week`). Each one carries its own `cursor:ew-resize`, so **the
  `.mv-pill` cursor rule proposed below was not needed. No frozen rule, markup or function
  changed.** Tier 50 of UI-CONVENTIONS §6.
- **Positions:**
  - A mid-pill line is taken from the BAR layer's grid: `(width − padding) / 7`, which is not the
    day cells' `width / 7` (`.mv-bars` pads 3 px a side).
  - The handle is clipped to the scrolling panel, so a pill half scrolled out never paints one over
    the toolbar.
- **Dates come from `cellDate()`**, which moved to module scope from `installDayOverrideUI`, so both
  features read one cross-checked mapping. This matters because a month page often opens mid-shoot,
  and then the first Production pill on the page is not the shoot's first day.
- **Row handles ask the real scheduler.** On press, `probeShootDays()` runs
  `computeSchedule(readState())` once over a window wider than the page, the way
  `productionEndFor()` does, then puts everything back with nothing rendered:
  - the dragged row is padded by 80 days;
  - `start` walks from 70 days earlier with snap off.

  `solveCount()` then reads the new edge off that list:
  - `end`: the first index whose running total reaches the request (the §4.4 over-deliver rule).
  - `start`: the latest shoot day from which the walk reaches the request ON the held wrap. A count
    that a half day makes unreachable is skipped, never approximated.
  - `bound`: entry `s + c − 1` of the list, by ENTRIES as `episodeDayMap()` slices them, whatever the
    halves do.
- **A guard against a wrong date.** After every row step, the held end and the landed edge are
  re-read from the real schedule. If either is wrong, the step is put back and the gesture goes
  inert. It has never fired; it exists because a silent wrong date in someone's plan is the failure
  to refuse.
- **One undo per drag:**
  - a leading `pushUndoSnapshot()`;
  - `cancelPendingUndoPush()` after every `update()`;
  - a trailing push only if something changed.

  A row back at its starting count gets back its EXACT `days`, `daysEdited`, start and Snap to Mon
  (MONTH-9's rule). `daysEdited` is set on any other count, or the reconcile would reset the row.
- **The shield.** A full-window `.phase-edge-shield` owns the pointer during a drag. Escape puts the
  edge back. The shareable copy strips both classes (`buildSavedHtml`).
- **Proof:** `pilldrag.mjs` E0–E13, trusted CDP input, with every press where `elementsFromPoint`
  has the handle topmost. It holds every kind of handle, a holiday and a weekend stepped over,
  out-and-back gestures, one undo per drag, Blocks mode at both kinds of row handle, and print media.
  19/19 with D0–D4.
- **§6.5's gate, met with no frozen edit to justify:**
  - **The build:** `cdf602c1…`, 15 Oct 2026. Full gate 1,292 PASS, 0 FAIL.
  - **Condition 1, the month PDF:** gate 10's nine print documents are identical, and gate 13's
    nineteen written PDFs are byte-identical.
  - **Condition 2, `mvNoteLineCount()` heights:** unchanged, which the identical print documents
    carry.
  - **Condition 3, no affordance in `#print-root`:** E7, plus the body-level placement.
  - **Condition 4, gates 1–5:** unchanged (0 clipped cells, 62 field ids).

**Implementation shape, whichever is ruled.** It needs zero frozen MARKUP:

- **The edge zone is computed from pill geometry** inside the existing `mousedown` handler: a band a
  few px wide at the pill's left or right edge, capped at a quarter of a one-day pill.
- **That pill edge must be the phase's real edge**, checked by date. The pill's day columns come from
  `.mv-daycell` geometry, with the date taken from the cell the way `cellDate()` does, cross-checked
  against the rendered day number. This matters because a month page can open mid-phase, so the
  first pill ON THE PAGE is often not the phase's first pill.
- ~~**The one frozen-category line** is the hover cursor:
  `body.mv-edge-hot #table-wrap .mv-pill{cursor:ew-resize}`.~~ ✅ **Not needed, and not added:** the
  handles became body-level elements with their own cursor (see "BUILT" above).
- **Reachability:** `pilldrag.mjs` must assert that `elementsFromPoint` at the zone has the pill
  topmost, and drive the drag with trusted CDP input (§8 step 5's rule).


## 7. ✅ Rulings received (16 Sep 2026)

| # | Question | Ruling |
|---|---|---|
| 1 | Frozen edit to `renderMonthView` | **Approved — both** day-override marks and drag handles, against §6.5's gate |
| 2 | Half-day remainder | **Over-deliver**; never under-deliver (§4.4) |
| 3 | Non-Monday starts | **Per-phase snap toggle**, default on (§5) |
| 4 | Waterfall vs month view | **Same wrap date**; waterfall rounds its displayed COUNT up (§4.5) |
| 5 | Do phases move independently when dragged? | **Yes** — no dependency graph; the Adjustments menu owns relationship-preserving moves (§6.1) |
| 6 | Per-week Production control | **`dayOverrides`**, not per-week start dates — Production stays derivable (§4) |
| 7 | *(15 Oct 2026)* Edges on built-in Weeks phases | **Add a Dates mode** to the five built-ins, reversing CUSTOM-PHASE-UNITS's "built-ins untouched" scope (its §1). Its ruling 1, one schedule, still holds (§6.7) |
| 8 | *(15 Oct 2026)* Edges on custom phases | **After CUSTOM-PHASE-UNITS steps 1–4**: Days and Dates get both handles, and a Weeks edge drag switches the phase to Dates (§6.7) |
| 9 | *(15 Oct 2026)* Edges on Production | *"drag either side of each episode/production week/block individually"*. ✅ **§6.7's reading confirmed** (9a–9c): episode/block boundaries push, week edges set day marks, screen-only handles. 9d: the built-ins' Dates mode takes ten ids |

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
5. ~~**Body-drag** (§6.1)~~ — ✅ **SHIPPED 18 Sep 2026, after two defects that both hid behind the
   same thing: it was verified by dispatching events at the pill NODE.**
   ⛔ **It could not be clicked at all.** `.mv-bars` sets `pointer-events:none` so the bar layer does
   not swallow clicks meant for the day cells, and `.mv-pill` inherits it — a real press landed on
   the `.mv-daycell` underneath. `elementFromPoint()` at the pill's exact centre returned
   `mv-daycell`; the pill was absent from `elementsFromPoint()`. **This falsifies §6.1's claim that
   body-drag "needs no new frozen markup"** — it needs no new *markup*, but it does need a frozen
   CSS opt-in, which nobody costed. Fixed with `#table-wrap .mv-pill{pointer-events:auto;
   cursor:grab}` (owner-approved 18 Sep 2026), scoped so it cannot reach `#print-root`.
   ⛔ **And one drag was two undo steps** — `update()` re-arms the 500 ms undo debounce on every
   increment, so a pause mid-drag banked an intermediate date. Fixed with `cancelPendingUndoPush()`
   plus leading/trailing pushes; no frozen code. Leg `monthdragundo`.
   ⭐ **THE RULE THIS LEAVES BEHIND, worth more than either fix:** assert
   `document.elementsFromPoint(cx, cy)` **contains** the element before claiming an affordance
   works. A dispatched event proves the handler; only hit-testing proves the user can reach it.
6. ~~⛔ *Frozen work begins.* Day-override marks in the month cell, against §6.5's gate.~~ —
   ✅ **SHIPPED 16 Sep 2026** as `mv-day-half/off/on` classes on the existing day cell: no element,
   no lane, no text node, so §6.5 condition 2 cannot move. ⭐ **And the UI THAT SETS THEM shipped
   18 Sep 2026**, which this plan never gave a step number because §4 assumed the store was the hard
   part. It is not frozen at all — `.mv-bars` is `pointer-events:none` and `.mv-daycell` is `auto`,
   so a delegated click on `#table-wrap` reaches the day. Full record in `HANDOFF.md`'s START HERE
   block. ⚠️ The reachable area is the **day-number band**, not the cell: the `+` note affordances
   fill every free lane and sit on top at the centre of **35 of 35** cells.
7. ⛔ Start/end handles (§6.2), against the same gate. ⏸ **HELD 15 Oct 2026 on §6.7's three
   rulings.** For every phase type built today, a day-granular edge has no stored representation:
   Weeks phases are whole weeks, and Production's length is the episode or block list. No code was
   written. ✅ **Rulings 7–9 received the same day.** 7 and 8 wait on CUSTOM-PHASE-UNITS.
   ✅ **Production's handles BUILT 15 Oct 2026** (§6.7 "BUILT"): the outer edges (3a), every
   episode or block end, and every week's edges (9a–9c). Zero frozen edits. ⏸ **Still to come:** the
   custom phases' handles (ruling 8, after CUSTOM-PHASE-UNITS) and the built-ins' (ruling 7, which the
   owner re-confirmed as 1c the same day).

⚠️ **Cut a `.sptcal` fixture at steps 1, 2 and 6.** The save format moves in each, and
`tests/fixtures/` is how the restore path is proven. `HANDOFF.md` §2j has the
byte-identical-reproduction check to reuse for any data change.
