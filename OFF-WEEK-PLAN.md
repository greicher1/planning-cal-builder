# OFF-WEEK-PLAN.md

**Status: PLANNED 19 Oct 2026, not built. No rulings yet** (§8).
**Written against:** `e86aa5e`. Every number in §2 was measured that day on a scratch build of `e86aa5e`
(`05169b7f…`, byte-identical to the live app), not read off the code.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) → [`MONTH-VIEW-PLAN.md`](MONTH-VIEW-PLAN.md)
(the `dayOverrides` model) → this file.

---

## 1. The request

> Owner, 19 Oct 2026: *"would it make sense that when a production day is set to off, those days should be
> considered hiatus periods?"*

The answer given, and not disputed: **not for single days.** An `off` day already does to the shoot what a hiatus
day does. `simulateProductionSchedule()` skips it, so the wrap moves out a day, and no other phase moves. Making each
one a hiatus would go wrong in four ways:

- **A hiatus is whole weeks**, Monday-snapped (`computeSchedule()`'s `hiatuses` and `phaseHiatusRanges`). So one off
  Wednesday would black out its whole week.
- **Production has exactly one hiatus of its own** (`phiatus-*-production`), so a second off day elsewhere has nowhere
  to go. An all-phase hiatus would pause Post and everything else for a day only the shoot is dark.
- **The episode grips write `off` marks** (`markOut()`), one per day a drag takes out. Every drag would leave
  hiatus rows behind.
- **An off day is one click to undo.** "Work this day" deliberately cannot punch through a hiatus.

**But there is one case where the idea is right: a week the shoot does not work at all.** Today it still prints as a
numbered Production week (§2). The owner's follow-up, the same day:

> *"Write up option 1 (a Production week with no shoot days reads and counts as a Production hiatus week) as a plan
> doc, including the month-view numbering question. Don't build it yet."*

So this plan has two parts that can ship separately. **Step A** is the off week (§3–§5). **Step B** is the month
view's week numbers (§6), which disagree with the waterfall's already, with or without step A.

---

## 2. What is true today (measured, 19 Oct 2026)

The calendar is `tests/fixtures/dayoverrides.sptcal` (80 shoot days from Mon 6/29/26, `us-general`, Summer Break as an
all-phase hiatus the week of 7/13), plus **Mon 3 – Fri 7 Aug 2026 marked off**. It was a scratch copy, not committed.
It was loaded through `?state=` on a private port.

| Week of | Shoot days | Waterfall (and so Excel, waterfall PDF) | Month view (and so both month PDFs, the day menu) |
|---|---|---|---|
| 7/6/26 | 4½ (Mon half, Tue off, Sat worked) | *Production wk 2* | *Production Week 2* |
| 7/13/26 | 0 (Summer Break) | *Summer Break*, full width | *Summer Break* band |
| 7/20/26 | 5 | *Production wk 3* | ⚠️ *Production Week 4* |
| 7/27/26 | 5 | *Production wk 4* | ⚠️ *Production Week 5* |
| **8/3/26** | **0 (all five off)** | ⛔ ***Production wk 5***, an ordinary green cell | no bar; five hatched `mv-day-off` cells |
| 8/10/26 | 5 | *Production wk 6* | ⚠️ *Production Week 7* |
| 11/2/26 | 2 (wrap 11/3) | *Production wk 18* | — |

Two separate facts, and neither is new:

1. ⛔ **A week with no shoot days is numbered.** `computeSchedule()`'s week loop runs `weekCounters[ph.key]++` for every
   week a segment overlaps that is not inside a hiatus. Production's segment runs from its start's Monday to the week
   of its last shoot day, so a dark week inside it gets a number and pushes every later week up by one.
2. ⚠️ **The month view counts calendar weeks, and the waterfall skips hiatus weeks.** `prodWeekLabel()` is
   `floor((mondayOf(date) − mondayOf(s.start)) / 7 days) + 1`. The week loop does not advance a phase's counter in an
   all-phase hiatus week or in the phase's own hiatus. **It is not Production-only:** across the default winter
   hiatus, the week of 1/4/27 reads *Post wk 8* in the waterfall and *Post Week 10* in the month view (same calendar).
   That hiatus sits inside every phase that runs through late December, so **most real calendars already show
   different week numbers in the two views.** No doc records this as a decision. A grep of the plans and HANDOFF for
   it found nothing.

The header's *"18-Week Production Span"* counts the off week, because it counts every week holding a cell keyed
`production` (`computeHeaderDefaults()`, audit L-11). It leaves out Summer Break, which is an all-phase band with no
key.

---

## 3. Step A: the off week

### 3.1 The definition

An **off week** is a Monday-keyed week row where all of these hold:

- Production's segment overlaps it;
- it is not inside an all-phase hiatus, and not inside Production's own hiatus (those already make their own bands);
- it comes **after** the week of the first shoot day (Q3: a leading empty week is left as it is);
- **no entry of `sim.shootDays` falls in it.**

The cause does not matter: off marks, union holidays, or both. A week with every weekday off but a Saturday worked
(`on`) is **not** an off week, because it has a shoot day. Nor is a week whose only shoot day is a half day. There is
no trailing case, because the segment ends with the week of the last shoot day, which always has one.

⭐ `sim.shootDays` is the one list of the days the camera rolls, read by the month view (`segCoversDate()`), the
sidebar's count and the grips. Reading it here means the waterfall cannot disagree with the month view about which
weeks are dark.

### 3.2 What it does

It makes **exactly the cell a Production-own-hiatus week makes**, and does not advance `weekCounters.production`:

```js
{type:'phaseHiatus', key:'production', col, weekIso, defaultLabel:'Production Hiatus',
 color:HIATUS_COLOR, textColor:HIATUS_TEXT, label:'Production Hiatus'}
```

(The label is `(ph.label || 'Phase') + ' Hiatus'`, the existing branch's own rule, so a renamed Production reads
*"Shoot Hiatus"*.)

⭐ **Why this shape: every consumer already handles it, so no frozen code changes.** `computePhaseRowLayout()` lays a
`phaseHiatus` cell out for `renderSpreadsheetView()`, `exportExcel()` and `buildWaterfallPdf()`, resolving
`hiatusTexts` / `hiatusColors` under `<week>|production`. The waterfall's note editor renames and recolours it, and
the span drag and column swaps treat it as a phase cell. The header counts it in the span. All of that has been in
place since 1 Sep 2026 for Production's own hiatus.

### 3.3 The code change (no frozen code)

1. **`computeSchedule()`, Production's branch**, after `simulateProductionSchedule()`: build `offWeeks`, a `Set` of
   week ISOs, by the §3.1 rule, in one helper, and put it on the segment (`segments.push(Object.assign({}, p, {…,
   offWeeks}))`). The same branch's `workedWeeks` loop skips them too, so `{production.weeks}` agrees with the grid,
   which that loop's own comment asks for.
2. **The week loop:** the own-hiatus branch's test becomes
   `(ownHi && …) || (ph.offWeeks && ph.offWeeks.has(isoOf(weekStart)))`.

That is the whole change. Neither site is frozen. The solvers (Rebuild From, Anchor To, Close all gaps,
`spanCulprit`) and the column-swap gate call `computeSchedule()` on trial states, so they see off weeks consistently,
with nothing to add.

### 3.4 What a user sees (the §2 calendar)

| Output | Today | After step A |
|---|---|---|
| Waterfall, Excel, waterfall PDF, week of 8/3 | *Production wk 5*, green | *Production Hiatus*, the red band, renameable per week |
| The weeks after it | *wk 6 … wk 18* | *wk 5 … wk 17* |
| Header *"N-Week Production Span"* | 18 (measured) | **18, unchanged:** a Production hiatus week stays in the span (audit L-11) |
| Header token `{production.weeks}` | 18 (read from `workedWeeks`, not measured) | 17 |
| Month view, both month PDFs, the day menu | — | **unchanged** (Q4) |
| Wrap date, shoot-day count, every date | — | **unchanged**: same simulation |
| Simultaneous Post | — | **unchanged**: `isSimPostWeek()` skips only all-phase hiatus weeks, as it does for an own hiatus |
| The notes column on that row | — | **unchanged**: a Production band covers its own column only |

⚠️ **A band is not a phase cell, and that shows in more than its text.** The frozen renderer gives a `phaseHiatus`
cell the note treatment: it can wrap, it takes a per-band size, its text colour follows its fill, and it carries the
"Click to rename or recolor this hiatus" tip. The automatic column width may also move, because the width model
measures the new text. That is the frozen model working on new text, as PHASE-NUMBERING-PLAN §7 put it. It is not an
edit to the model.

---

## 4. Save format

- **Nothing changes.** No new id, no snapshot key. `SNAPSHOT_VERSION` stays 1. The file holds only the off marks,
  as it does today, and the band is derived from them. So undo, redo, restore and the crash backup need nothing, and
  an older build opens the same file and shows *Production wk 5*.
- ⚠️ **A rename typed on an off-week band** goes into `hiatusTexts['<week>|production']`, a key shape own hiatuses
  already use. If the week stops being an off week, the text stays in the file and does nothing. It comes back if the
  week goes dark again.
- ⚠️ **On a move, the rename and the band can part.** `shiftCalendar()` carries `<week>|production` keys with
  Production by calendar days (`hiatusKeyStays`). The off marks travel by shoot-day number (`asShootDayMove()`,
  ruling R2). On a plain shift the two agree. Across a holiday or a hiatus they can land in different weeks: the
  rename then sits inert on a normal week, and the band shows its default label. This is rare (it needs a renamed off
  week AND a move across a non-working day), and nothing is lost. Recorded rather than solved.

---

## 5. Existing calendars

- **No fixture can hold an off week.** A scan of every `tests/fixtures/*.sptcal` (19 Oct 2026) found at most **one**
  `off` mark per calendar. Union holidays alone never empty a week: across all 15 generated `HOLIDAYS` lists the most
  weekdays in one week is **three** (LT, at Christmas), counted the same day. Custom holidays could, and they count as
  any other cause. So **every gate baseline should stay byte-identical** (§10).
- **A real user's calendar with a dark interior week changes the next time it opens**: that week's label, and the
  number on every week after it. That is the point of the change, but it is a change to saved calendars with no edit,
  which is what Q1 asks about.

---

## 6. Step B: the month view's week numbers

Fact 2 in §2 stands without step A. Step A widens it: on the §2 calendar, the week of 8/10 would read *wk 5* in the
waterfall and *Week 7* in the month view.

| Option | What it means | What moves |
|---|---|---|
| **(a) The month view numbers like the waterfall** ⭐ recommended | The week loop records each segment's number per week as it hands it out (`seg.weekNo[weekIso] = num`, beside `weekCounters[ph.key]++`). `prodWeekLabel()` reads it for `mondayOf(date)` and falls back to today's calendar count when there is none. One rule, in one place, read by both views | The month view, both month PDFs and the day menu's header, on every calendar where a phase runs through a hiatus, which is most of them (the default winter hiatus) |
| (b) Leave it | The two views keep disagreeing after every hiatus | Nothing |
| (c) The waterfall numbers like the month view | Count calendar weeks in the week loop | The waterfall, Excel and the waterfall PDF of nearly every calendar, and a phase's last number would stop being its worked weeks. Every frozen-output baseline would move |

Notes on (a):

- ⛔ **Do not count again in `prodWeekLabel()`.** A second copy of the week loop's rule (skip hiatus weeks, skip
  own-hiatus weeks, skip off weeks) is exactly the drift this project keeps paying for. Read the number the loop gave.
- `prodWeekLabel()` serves every phase, not just Production: the custom phases (Days and Dates included) and the
  grey text of a Week-labelled Production bar (MONTH-PILL-LABEL-PLAN ruling 8). Prep has its own label
  (`prepPillLabel()`) and is not affected.
- A hiatus week draws no bar, so it never asks for a number. A worked Sunday's `mondayOf()` is its own week's Monday,
  the same row the waterfall files it under.
- ⛔ **It changes the month PDF of existing calendars**, so the month-PDF writer's ruling 4 applies: the owner reviews
  `monthbase.py sheets` contact sheets **before** any commit, and gates 10 and 13 are re-cut only on that sign-off.
  The diff should be limited to *Week N* strings (`monthcmp.py ab`), and anything else is a regression.

Step B does not depend on step A, and A does not depend on B. **Build them as two changes with two gates** (Q6), so
the waterfall change and the month change are each signed off on their own outputs.

---

## 7. What does not change

- **Frozen code:** nothing, in either step.
- **Single off days, half days, worked weekends and holidays:** exactly as today, in every view.
- **The day menu:** an off week is not a hiatus to it. Its days still offer Full day, and "Work this day" is not
  greyed. Marking one day back on is the undo, and the week returns by itself.
- **Every date:** the wrap, Start Principal Photography, every other phase. Off weeks are derived from the dates and
  never feed them.
- **The month view in step A** (Q4), and the waterfall in step B.

---

## 8. Questions for the owner

| # | Question | Recommendation |
|---|---|---|
| Q1 | A saved calendar that already has a dark week inside the shoot changes when it next opens: that week's label, and the numbers of the weeks after it. Accept that, with no setting to turn it off? | **Yes.** The old text names a production week that did not happen. A setting would be one more id in every file to keep the wrong text |
| Q2 | The band reads *Production Hiatus* (the same text, colour and renaming as Production's own hiatus)? | **Yes.** Different text (*"No shoot days"*) or a colour of its own is also possible with no frozen edit, since both are data on the cell. But it would be a third kind of band to learn |
| Q3 | A dark week **before** the first shoot day (the whole first week marked off, or a start typed on a Friday holiday): leave it as *Production wk 1* as today, or make it an off week too? | **Leave it.** A hiatus before anything has shot reads as a pause in something not started. The honest fix is "Production starts at its first shoot day's week", which moves the segment and its column, so it is a separate change |
| Q4 | Step A leaves the month view alone: the week shows five hatched days and no bar. Or draw a *Production Hiatus* band there too? | **Leave it.** The hatching already says it, and the month band code (inside frozen `renderMonthView`) reads the segment's one own-hiatus range, so drawing off weeks would be a frozen edit |
| Q5 | Step B: (a) the month view numbers like the waterfall, (b) leave it, or (c) the waterfall numbers like the month view? | **(a)**, §6 |
| Q6 | Build A and B as two changes, each with its own gate and sign-off? | **Yes**, §6 |

---

## 9. Steps

Build in its own worktree off `main`: several sessions edit the main checkout at once. ⚠️ **Two neighbours touch the
same code:** PHASE-NUMBERING-PLAN (planned) adds a `numbered === false` early return to `prodWeekLabel()`, which is
step B's site. The unmerged `day-menu-step3` branch names bars in the day menu through `dayFacts()` → `prodWeekLabel()`.
Whichever lands second rebases and re-runs `mvmenu` and `pilllabel`.

**Step A**

1. **Fixture first:** `tests/fixtures/offweek.sptcal`, synthetic (made-up dates, no real show's shape), saved by the
   BUILT app after step 2. It needs:
   - an interior week with all five weekdays off;
   - an interior week dark from four offs plus a union holiday (a mixed cause);
   - an interior week with five offs but its Saturday worked (`on`), which is NOT an off week;
   - an all-phase hiatus earlier in the shoot (so the count skips both kinds);
   - Production's own hiatus elsewhere;
   - the whole first week off (the Q3 case).

   Record it in `tests/fixtures/README.md`.
2. **The predicate and the two code sites** (§3.3).
3. **The leg, then the full gate** (§10).
4. **Docs:** README changelog entry, HANDOFF, and a pointer from MONTH-VIEW-PLAN's `dayOverrides` section to here.

**Step B** (after Q5)

5. `seg.weekNo` in the week loop; `prodWeekLabel()` reads it.
6. Leg cases, the full gate, the owner's contact sheets, then a re-cut of gates 10 and 13 on sign-off (§10).

---

## 10. The gate

**Step A**

- **Gates 1–5, 10 and 13 unchanged, with no re-cut.** No fixture holds an off week (§5), so any output that moves is
  a regression. ⛔ **If one moves, stop and report. Do not re-cut.**
- Gate 5 stays at 74 ids: there is no new id.
- **New leg `offweek`, on `offweek.sptcal`, asserting:**
  - the waterfall text of every case week, and that the count skips the hiatus, the own hiatus and the off weeks
    alike;
  - the same text in the exported workbook and in the waterfall PDF;
  - the header's span and `{production.weeks}` (§3.4);
  - the wrap date, the shoot-day count and the month view's markup identical to the pre-change build;
  - one day menu ▸ Full day on an off week's day brings back the numbered week, and one undo returns the band;
  - a rename on the band survives a save round trip, and Shift All by one week carries band and rename together;
  - the Saturday-worked week and the Q3 week stay numbered.
- **Prove red:** the text cases fail on the pre-change build (the in-place method, HANDOFF 19 Oct "Learned" 3), on a
  private `HARNESS_PORT`.
- `pilldrag` and `overrides` write `off` marks by gesture. They are in the gate already. If one of their drags empties
  a week, the waterfall now shows a band. Neither asserts waterfall text (check, do not assume).

**Step B**

- **Gates 1–4 unchanged**: the waterfall, Excel and the waterfall PDF never call `prodWeekLabel()`.
- **Gates 10 and 13 expected to move, in *Week N* strings only.** Contact sheets to the owner first; re-cut on
  sign-off, recorded in each baseline's README.
- **Leg cases:** on `dayoverrides.sptcal`, the week after Summer Break reads *Production Week 3* in the month view, as
  the waterfall's *wk 3*. Post across the winter hiatus matches. The day menu's header matches. A phase with no hiatus
  reads exactly as before.
