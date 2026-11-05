# HIATUS-RIPPLE-PLAN.md — a hiatus change moves the phases after it

**Status (4 Nov 2026): BUILT on branch `hiatus-ripple`** (worktree `.claude/worktrees/hiatus-ripple`, from `origin/main`
at `ae4125f`), after the owner's *"Yes, build it"*. Not merged, not pushed. §10 is the as-built record: where it differs
from the plan above, §10 is right. Tracker card `hiatus-ripple`.

Read with: `shiftCalendar` / `shiftCalendarDates` in `src/legacy/app.js` (the Shift From tool, which this
reuses), [`HIATUS-DRAG-PLAN.md`](HIATUS-DRAG-PLAN.md) (the month-view drag and its Keep / Undo question), and
`CLAUDE.md` §"State model" on why a preference must never reach `captureSnapshot()`.

---

## 1. The ask, and what is true today

**Owner, 4 Nov 2026:** *"we need to figure out a way so that editing a hiatus (either all phase or per phase) can
automatically ripple the whole calendar to adjust all the phases. It should be very clear how to turn it on or off
or maybe even prompt you when you change a hiatus that its going to adjust all phases by that number of weeks to
correct it"*

What the code does today, measured:

- **A hiatus PAUSES the phases running through it, and nothing else.** `computeSchedule()`'s
  `extendEndForHiatus()` walks a phase week by week and counts only non-hiatus weeks, so a phase still delivers
  its full length and its end moves out. Production does the same day by day (`simulateProductionSchedule()`).
  An all-phase hiatus pauses every phase it overlaps; a phase's own hiatus (`phiatus-*-<key>`) pauses only that
  phase.
- **Phases have their own typed start dates and are not chained.** "↳ Start after previous phase" is a one-shot
  button, not a binding. So when a hiatus lengthens a phase, the phases after it keep their dates, and the
  lengthened phase now overlaps the next one. That overlap is what the owner wants corrected.
- **The correction already exists as a tool: Shift From.** `shiftCalendar(weeks, fromIso)` moves everything on
  or after a week by N weeks. The code already calls it a ripple (`#pop-ripple`, `tool-ripple-phase`). It moves
  phase starts (through `setPhaseStart()`, so Dates and Ends phases move correctly), their own hiatuses,
  unlocked all-phase hiatuses, the calendar range, and every week-keyed store (notes, note colours, row heights,
  band labels, colours, sizes, text styles, cell spans, column swaps). It holds holidays, locked hiatuses and
  dated notes in place, and carries Production's day marks by shoot-day number (`asShootDayMove()`, ruling R2).
  It is gated and has been live since v1.x.
- **The month-view hiatus drag already asks Keep / Undo on release** (`endDrag()`, HIATUS-DRAG-PLAN ruling 3),
  with persistence held until the answer.

So the feature is **Shift From, run automatically from the hiatus, by the weeks the hiatus changed**, with the
edited hiatus held where the user put it.

## 2. The owner's rulings (4 Nov 2026, by picker)

| # | Decision | Ruled |
|---|---|---|
| R1 | How it is controlled | **One on/off switch, on by default.** No question each time. *"On off switch … Ripple on should be on by default"*, then *"One switch in preferences that also shows up somewhere else more visible"* |
| R2 | Where the switch also shows | **The hiatus cards**: the top of the All-phase hiatus card, and each phase's Hiatus block. One switch shown in several places; flipping any copy flips them all |
| R3 | Saved where | **On this computer** (a preference in `sptcal.prefs`), never in the calendar file |
| R4 | A phase's OWN hiatus: what moves | **Every phase that starts on or after the hiatus's first week**, the same rule as an all-phase hiatus. Phases already running alongside it stay put |
| R5 | MOVING a hiatus (same length) | **The calendar follows.** A move counts as taking the hiatus out where it was and putting it back where it is now. The owner picked this after the worked example in §3.2 |

The R1 picker also offered "ask each time" and "always push, no setting"; both were declined. The R2 picker also
offered a toolbar chip by Shift From and an icon by each Weeks box; both were declined.

## 3. The rule

### 3.1 One sentence

> **A hiatus change takes the old hiatus out and puts the new one in.** Taking it out pulls every phase that
> starts on or after its first week back by its length. Putting it in pushes every phase that starts on or after
> its (new) first week later by its length. The hiatus being edited never moves itself.

Written as code: for an edit from `old = (s0, w0)` to `new = (s1, w1)` (either may be absent):

1. **Out** (only if `old` was in force): `shiftCalendarDates(-w0, s0, {except})`.
2. **In** (only if `new` is in force): `shiftCalendarDates(+w1, s1, {except})`.

Both run inside ONE `asShootDayMove()` bracket, so Production's day marks move once, by shoot day. When `s0 ==
s1` (a length change), the two steps collapse to ONE shift of `w1 - w0` from `s0`. That is the same result and
re-keys every store once instead of twice.

| Edit | old → new | What runs |
|---|---|---|
| Weeks 2 → 3 | (s, 2) → (s, 3) | one shift, +1 wk from s |
| Weeks 3 → 2 | (s, 3) → (s, 2) | one shift, −1 wk from s ("Pulled") |
| Added (start typed, or "Add hiatus here") | none → (s, 2) | +2 from s |
| Removed (×, "Remove hiatus…", the phase's Hiatus switch off, Weeks cleared) | (s, 2) → none | −2 from s |
| A phase's own Hiatus switched on, with a start | none → (s, w) | +w from s |
| Moved, typed date or month drag | (s0, w) → (s1, w) | −w from s0, then +w from s1 |
| First-week grip dragged a week earlier | (s, 2) → (s−1, 3) | −2 from s, then +3 from s−1 |

"Is in force" is `readState()`'s own test: a valid start and weeks > 0, and for a phase's own hiatus its switch
on. So a Weeks box left blank is a removal, as it is for the schedule.

### 3.2 Worked examples (weeks, no holidays, so the arithmetic is plain)

Prep is weeks 1–8. The shoot is 12 weeks from week 9. Post starts in week 15, alongside the shoot.

**A. Adding a 2-week all-phase break in weeks 7–8.** Prep is paused and now ends in week 10. The shoot (starts
week 9, on or after week 7) is pushed to week 11 and wraps week 22. Post is pushed to week 17. The gap
between Prep and the shoot is unchanged.

**B. Lengthening that break to 3 weeks.** One shift, +1 from week 7: Prep ends week 11, the shoot runs
12–23, Post starts week 18.

**C. Dragging the 2-week break from weeks 7–8 into weeks 15–16** (the example the owner ruled R5 on):

```
Before: break in late Prep, shoot pushed
         1   5    10   15   20   25   (week)
  Prep   ██████▒▒██
  Shoot            ████████████   wrap wk 22

After the drag to weeks 15-16:
  Prep   ████████
  Shoot          ██████▒▒██████   wrap wk 22
```

- Out, −2 from week 7: Prep is no longer paused and ends week 8 again. The shoot goes back to week 9, and Post
  back to week 15.
- In, +2 from week 15: the shoot is running, so the break pauses it and it wraps week 22. Post starts in week 15,
  on or after the break, so it is pushed to week 17.
- The 2-week break costs 2 weeks, once. Without R5 the shoot would keep its old push AND be paused again. It
  would wrap week 24, with weeks 9–10 empty.

**D. A phase's own hiatus (R4).** Prep gets its own 2-week hiatus in weeks 7–8. Prep is paused and ends week 10.
The shoot (starts week 9, on or after week 7) moves to week 11. A phase that started before week 7 and runs
alongside Prep, Writers' Room say, stays put and is not paused.

### 3.3 Edge rules (my calls, from the code; none changes R1–R5)

- **The edited hiatus never moves itself.** Its own row (all-phase) or its own `phiatus-start-<key>` (a phase's)
  is held, and its weeks count as "staying" for the band-label stores, as a locked row's do. `shiftCalendarDates`
  gains an `except` option for this. It has no such option today, and without one the edited hiatus, which
  starts exactly on the cutoff, would be moved by its own ripple.
- **The phase that owns a phase hiatus never moves by that hiatus's ripple.** It is paused instead, which is the
  point. It is held even when it starts on or after the hiatus's first week.
- **A phase that STARTS INSIDE the edited hiatus is first treated as starting the week the hiatus ends**,
  because that is where its work really begins (the walk skips the hiatus weeks). Its start box is rewritten to
  that Monday before step 1. Without this, removing a hiatus would pull such a phase too far. Example: a break
  in weeks 10–11 and a phase typed to start in week 11 (it really starts week 12). Removing the break would land
  it in week 9, three weeks earlier than it really started; with this rule it lands in week 10, the break's two. It applies to an all-phase hiatus (every
  phase) and to the owning phase of a phase hiatus. It does not apply to Ends phases, whose start is solved from
  their end.
- **Everything Shift From holds, a ripple holds:** holidays, locked all-phase hiatuses, notes carrying a date,
  the month view's day notes. **Everything it moves, a ripple moves:** unlocked hiatuses after the cutoff, the
  calendar range's dates, notes and every week-keyed store. Holidays stay put, so Production's wrap can move by
  a different amount than the hiatus changed. The readout names the new wrap, as Shift All's does.
- **Ends phases** move by their end, through `setPhaseStart()`, exactly as Shift From moves them. An Ends phase
  that CONTAINS the hiatus is not moved (its start is before the cutoff): it keeps its end and the pause pulls
  its start earlier, which is what Ends means.
- **The episode Prep row** (`PREP_KEY`) is derived from the shoot and follows it. It needs nothing of its own.
- **`MAX_SHIFT_WEEKS`** (520) caps each step. A step over it is refused with a line, and nothing moves.

## 4. When a ripple runs, and when it never does

⛔ **A ripple is started by a named USER EDIT, never by watching fields change.** Load, undo, redo, New, a
scenario switch, crash recovery, a shareable copy booting, Reset, and every mover (Shift All / From, Anchor To,
Rebuild From, Close all gaps, Start after previous) all write hiatus fields. A field observer would ripple on
each of them. So each edit path below calls one entry point, `rippleAfterHiatusEdit(before, after)`, and nothing
else does.

⛔ **Never per keystroke.** A date box fires `input` for each digit of a year (2, 20, 202, 2027), and a Weeks
spinner fires on every click. The before state is taken when an edit to that hiatus begins. The ripple runs
when the edit SETTLES, measured against that before state, so 2 → 3 → 4 on the spinner is one push of +2.

| Edit path | Settles when |
|---|---|
| All-phase row: Starts, Weeks | focus leaves the row (not into its own `.date-pop`), or Enter |
| All-phase row: × | at once (after its existing confirm, `removeHiatusRow`) |
| "+ Add hiatus period" | the new row has no start, so nothing until a start is typed and settles |
| A phase's Hiatus switch (`phiatus-en-<key>`) | at once, if it has a start |
| A phase's Starts, Weeks | focus leaves the block, or Enter |
| Waterfall / month menu: Add hiatus here, Remove hiatus…, the phase-hiatus items (`addHiatusHere`, `removeHiatusHere`, `setPhaseHiatusHere`, `removePhaseHiatusHere`) | at once |
| Month-view drag: move, first week, last week | on release, BEFORE the Keep / Undo question (§6) |
| Name, colour, Lock in place, Number weeks | never: no date changes |

With the switch off, every path behaves exactly as it does today. That is a test (§8).

## 5. The switch (R1–R3)

- **One preference**, `prefs.hiatusRipple`, in `sptcal.prefs` (`loadPrefs` / `savePrefs`). Absent = ON (R1), and
  it is written only as `false`. ⛔ Never in `captureSnapshot()`: it is how this person edits, not calendar data,
  and it must not travel inside a file someone else opens (CLAUDE.md, preferences).
- **Shown in three kinds of place, all the same switch** (R2):
  1. **Settings ▸ Preferences**, inside a `.prefs-card`. It applies to both views, so it is not a Waterfall or a
     Month view setting: placed with the cards' other edit behaviours (exact spot shown to the owner in the
     build's screenshot).
  2. **The top of the All-phase hiatus card**, above the rows (`#hiatus-list`'s card in `src/index.html`, which
     already hosts React portals for its hint and its reset button).
  3. **Each phase's Hiatus block**, under Starts / Weeks, beside Number weeks (`phaseHiatusBlockHtml`).
- ⛔ **The two sidebar copies carry NO id.** They sit outside `.prefs-card`, and `collectFieldValues()` sweeps
  every `input[id]`, so an id there would bake the preference into every saved calendar and add phantom undo
  steps. The zoom control is the precedent. Class plus a delegated listener, painted from `prefs` by a
  `reflectHiatusRippleSwitches()` after each render, the way `reflectPhaseHiatusSwatches()` is.
- **Label:** "Ripple Hiatus Periods" in Settings and on the All-phase hiatus card, "Ripple Hiatus" in a phase's
  Hiatus block (owner, 4 Nov 2026, replacing the first build's "Push later phases when a hiatus changes"). Its "i" gets three plain sentences (the owner's
  simple-for-anyone rule): what moves, what stays (locked hiatuses, holidays, dated notes), and that ⌘Z takes a
  push back.
- **Per scenario tab:** one switch for the app; a ripple acts only on the tab on screen.

## 6. What the user sees after a ripple

- **A result line under the hiatus that was edited** (in its card), in the owner's Pushed / Pulled wording:
  *"Pushed 4 phases 1 wk later · Wrap Fri 6/4/27 · 1 locked hiatus held"*. It reuses `describeShift()`'s parts
  (locked hiatuses, wrap, notes landing on a hiatus band, `takeShootDayMoveNote()`). It clears on the next edit.
  No ripple means no line.
- **⌘Z takes back the push and keeps the hiatus edit**: the edit and its push are TWO undo steps, banked the way
  `asOneUndoStep()` banks a tool. So one ⌘Z is "not this time", and a second takes back the hiatus edit too. ⚠️
  My call, not a ruling: the other choice is one step for both. Raise it with the owner in the build's first
  screenshot.
- **The month-view drag** applies the ripple on release, then asks its existing question. The question gains one
  sentence, e.g. *"It also pushed Post and Localization 2 weeks later."* **Undo** puts back the whole pre-drag
  state, push included (the snapshot banked at the press, rather than `writeTo()`'s hiatus-only restore). **Keep**
  banks the same two steps as every other path. Persistence stays held until the answer, as now.

## 7. What does NOT change

- **No frozen code.** `computeSchedule`, `render`, the writers and the width model are untouched. A ripple only
  rewrites date fields and keyed stores, exactly as Shift From does, and the exports read the result.
  `shiftCalendarDates` is not on the frozen list; it gains the `except` option.
- **No save-format change.** No new snapshot key, no new id in `fields.byId` (gate 5's set is unchanged), and no
  new store. A file saved after a ripple is an ordinary file with moved dates.
- **Every saved calendar opens and prints exactly as before.** A ripple happens only on an edit.

## 8. Proof

- **New leg `hiatusripple`**, in `gate.sh`. Cases:
  - the four §3.2 examples, with exact dates;
  - shorten, remove by ×, remove by clearing Weeks, a phase's switch on/off, the menu's Add / Remove hiatus here;
  - the month-view drag: move, both grips, Keep, Undo (restoring the push too);
  - a phase starting inside the hiatus (§3.3), and the owning phase held;
  - a locked hiatus after the cutoff held, an unlocked one moved, a dated note held, an undated note moved, Production's
    day marks by shoot day, the calendar range moved;
  - spinner 2 → 3 → 4 then blur = ONE push of +2; a year typed digit by digit = one push, never a 2000-week fling;
  - load, undo, redo, New, a scenario switch and every mover never ripple;
  - the switch: off reproduces today's state byte for byte (`undoStateJSON()` equal to the pre-change build's after the
    same edits); the three copies flip together; the pref survives a reload; it is absent from a saved file;
    `fields.byId` has the same ids;
  - ⌘Z once = push gone, edit kept; twice = both gone;
  - the readout's wording.

  Red on the pre-change build. Mutants, each red on its own cases: no `except` (the hiatus moves itself); no
  inside-start rule; per keystroke; a field observer (load ripples); one step for R5 (a move pushes but never pulls);
  the switch with an id (gate 5 grows).
- ⚠️ **Existing legs that edit a hiatus through the UI** (hiatussidebar, hiatuscolour, phiatusnum, hiatusfold,
  offweek, mvmenu, hiatus drag …) were written for today's behaviour. `tests/harness/t/lib.js` sets
  `hiatusRipple: false` in `sptcal.prefs` at boot, as it already answers the Export PDF dialog at its defaults, so
  they keep testing what they test. `hiatusripple` turns it on explicitly. The gate's fixtures load through
  `?state=`, which never ripples.
- **Full gate** before the push: nothing frozen moves, so gates 1–13 must be byte-identical. `npm run check`;
  `check-refs.py`. Browser pane, real mouse and keyboard, for §3.2 C and a spinner edit.

## 9. Build order

1. `shiftCalendarDates(weeks, fromIso, opts)` with `opts.except` (a row element or a phase key) and the held
   weeks. Shift From's own calls are unchanged.
2. `rippleAfterHiatusEdit(before, after)`: §3.1's two steps, §3.3's inside-start rule and held owner, one
   `asShootDayMove()`, two undo steps, the result line.
3. The settle tracking per row and block (before-state at the first edit, ripple on focus-out or Enter), and the
   at-once paths (×, the phase switch, the four menu items).
4. The month-view drag: ripple before the question, the question's sentence, Undo restoring the press snapshot.
5. The preference and its three copies (Settings, the All-phase card's top, each phase's Hiatus block), the "i"
   text, and `src/index.html`'s help.
6. `hiatusripple`, lib.js's default off, the mutants, the full gate.
7. README changelog entry, HANDOFF, UI-CONVENTIONS (the switch's places), the tracker card.

## 10. As built (4 Nov 2026)

Everything in §3-§9 was built as planned, with these differences:

- **The readout** says `Pushed 1 wk: Production, Post · Wrap 6/12/26` (one group per distance, in Pushed / Pulled
  wording; the wrap only when Production moved). ⚠️ **No "N locked hiatuses held"**, which §6 proposed: New's four
  winter breaks are locked and after almost every cutoff, so it would show on every push. When no phase starts after
  the hiatus, the line says `No phase starts after it to push` (its later notes and unlocked hiatuses still moved).
- **What settles an edit** (§4): focus leaving the hiatus's two DATE boxes, not the whole row. Starts to Weeks of the
  same hiatus keeps the edit open; Tab from Weeks lands on Lock in place, and that settles it. An unreadable date (a
  year mid-typing) never settles; the edit waits for a readable one.
- **The one-shot paths** go through `rippleAround(h, fn)`, which first settles any edit still pending on that hiatus.
  A phase's own hiatus on a phase with no start date pushes nothing (it delays nothing).
- **The month-view drag:** the push runs on release, before the question, and the question ends with
  `Ripple Hiatus Periods is on: <the readout>.` (`Ripple Hiatus is on:` for a phase's own hiatus). Its "also changes when … ends" sentence leaves out the phases the push
  named. Undo applies the snapshot banked at the press (`applySnapshotJSON`), so the push goes too; Keep banks the
  drag and the push as two steps (`bankStepAt`).
- **The Settings copy** is its own card, `HiatusPrefsCard` ("Hiatus", the pause icon), between Automatic notes and App,
  in both views.
- **Harness:** `t/lib.js` stores the switch OFF before the app boots, and `hiatusdrag.mjs` does the same by a CDP init
  script, so every existing leg tests the pause alone. `t/prefs.js` clears the store at its top, because "nothing stored
  at boot" is its premise. `settingswin` W13 lists the new card.
- **Proof:** `hiatusripple.mjs` (trusted CDP input, fixture `hiatusripple.sptcal`, synthetic), 15/15. Red on `origin/main`
  (every case that ran) and on six mutants, each red on its own cases: no `except` (R1, R2, R4, R5, R11); no inside-start
  rule (R7); settle per keystroke (R1, R3, R4, R8); moves not followed (R4, R11); an id on the card's switch (R0); one
  undo step (R5). Also green on the branch: settingswin 21/21, phasesui 8/8, wfmenu 39/39, mvmenu 81/81,
  hiatussidebar 16/16, hiatusdrag 14/14, `npm run check` 40/40. The browser pane, real mouse and keys: Break 2 -> 3 weeks,
  Tab, Production 3/16 -> 3/23 with the line under the Break; the three switches drawn.
