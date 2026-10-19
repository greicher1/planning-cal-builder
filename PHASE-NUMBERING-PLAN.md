# PHASE-NUMBERING-PLAN.md

**Status: PLANNED 19 Oct 2026, not built.** Rulings R1 and R2 received from the owner the same day (§2), then Q2–Q4
by picker (§8), each as recommended. Q1 (the control's name and place) was not asked; its recommendation stands
unless the owner says otherwise.
**Written against:** `9d47784`.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) →
[`CUSTOM-PHASE-UNITS-PLAN.md`](CUSTOM-PHASE-UNITS-PLAN.md) §5–§8 → this file.

---

## 1. The request

> Owner, 19 Oct 2026: *"we need to be able to add phases that are a day or a couple of days that dont have "week x"
> after them by default. How can we reconcile this so you have either option? Should we consider having a seperate
> feature called adding an "Event" that can be a specific number of days or a single day and works differntly or
> should we keep everything as phases and just have some type of setting"*

---

## 2. Rulings received

| # | Question | ✅ Ruling (owner, 19 Oct 2026) |
|---|---|---|
| R1 | A separate "Event" feature, or keep these as phases with a setting? Decided by: should a one-day item take its own waterfall column, as any phase does? | **Keep them as phases.** A one-day item takes a waterfall column like any other phase |
| R2 | Which phases get the setting? | **Custom phases only**, not the six built-ins: *"this number weeks setting should only be for new custom phases not default ones"* |

⭐ **Why not an Event (the reasoning R1 accepted).** Since CUSTOM-PHASE-UNITS (16 Oct 2026), a custom phase can be set
to **Days** or **Dates**. A table read is Days = 1, and a two-day scout is Days = 2 or a Wed–Thu range. They already
count working days, skip union holidays, pause for hiatuses, and go through every mover via `setPhaseStart()`. The
day menu's "Add a phase here ▸ one day" item (MONTH-CONTEXT-MENU-PLAN step 1) already creates exactly this. An Event
would need its own row, save-file store, colour picker, handles, restore defaults and a branch in every mover. That is
the class of work where one missed path leaves an item behind when the schedule moves (audit M-4; the edited
auto-note fixed 19 Oct). The only thing wrong today is the **label**.

⚠️ **What R1 accepts, stated plainly.** A one-day phase occupies its column for that whole waterfall week row. If the
week already has three phases running, `maxConcurrent` grows and the waterfall and Excel gain a column for it. If that
ever becomes the complaint, it is a different feature (a note line, or month-view only like episode prep, which
CUSTOM-PHASE-UNITS §3 ruled against for phases), not this one.

---

## 3. What the labels say today

| Output | Text for a custom phase named *Table Read* | Built by | Frozen? |
|---|---|---|---|
| Waterfall, Excel, waterfall PDF | *Table Read wk 1* | `getAllPhaseDefs()` gives each custom def `template: n=>\`${name} wk ${n}\``; `computeSchedule()` writes `ph.template(num)` into the cell, and frozen `computePhaseRowLayout()` carries `c.label` to all three writers | ❌ Neither builder is frozen. The writers only draw the string |
| Month view, month PDF (written and print), the day menu's header | *Table Read Week 1* | `segPillLabel()` → `prodWeekLabel()`, which strips any trailing "wk N" from the name and appends "Week N". The direct writer parses frozen `renderMonthView`'s HTML, and `dayFacts()` names bars through `prodWeekLabel()` | ❌ Not frozen |

`ph.template` has exactly one reader (checked 19 Oct). Nothing else stores or parses a phase cell's text: there is no
per-cell override of a phase label, `cellSpans` / `colWidths` are keyed by phase key and week, and `{key.name}` in
the header tokens is the bare label. The two `wk\s*\d+` regexes (`prodWeekLabel()`, and frozen `renderMonthView`'s
phase-hiatus default "Name Hiatus") read the NAME, not the template, so neither changes.

---

## 4. The design

A checkbox on each **custom** phase row, beside Snap to Mon:

```
[■] Table Read                                    ×
Start date [ 10/07/2026 ]   By [ Days ▾ ]  [ 1 ]
[ ] Number weeks
1 working day · Wed 10/7
```

- **Off:** every output reads *Table Read*: waterfall, Excel, both PDFs, the month pill and the day menu. A phase
  spanning several week rows reads *Table Read* in each.
- **On:** exactly today's text.
- **Shown in all three units** (Weeks, Days, Dates). So its label carries **no `pu-*` class**: those hide a control
  outside its unit. Its own class, not `.phase-snap-cb`, because `applyStateSnapshot()`'s built-in M-5 defaults
  select on that class.
- Title text: *"On: this phase's bars read "Name wk 1, wk 2…". Off: just "Name"."*

### 4.1 The code change (no frozen code)

1. **`addCustomPhaseRow()`:** the checkbox `<input type="checkbox" id="wknum-${key}" class="phase-wknum-cb" checked>`.
   Its `input` event reaches `update()` through the row's blanket `input` binding, which already covers a checkbox
   (Snap to Mon relies on it).
2. **`getAllPhaseDefs()`, custom branch:** read the box (`!el || el.checked` means numbered) and give the def
   `numbered`, with `template: numbered ? n=>\`${name} wk ${n}\` : ()=> name`. Segments are built by `Object.assign({}, p, …)`,
   so the flag reaches every segment with no `computeSchedule()` change.
3. **`prodWeekLabel()`:** `if(s.numbered === false) return name;` after the strip. Production, the built-ins and prep
   have no flag (`undefined`), so their text cannot move.
4. **The automatic flips**, §6.

---

## 5. Save format

- ⛔ **`wknum-<key>` becomes permanent** the first time a calendar is saved with it. `collectFieldValues()` sweeps it
  into `fields.byId` as `{checked}`.
  - ⚠️ **Why not `num-<key>`:** that prefix already means a count (`num-episodes`, `num-blocks`), and a reader of a
    saved file should not have to guess. `wknum-` was checked free on 19 Oct 2026.
- **Absent means numbered.** Every calendar saved before this, including any Days or Dates phase saved since 16 Oct,
  opens and prints exactly as it does now.
- ✅ **No explicit restore default is needed, unlike CUSTOM-PHASE-UNITS §7a.** `applyStateSnapshot()` builds custom
  rows fresh on every restore, and the fresh markup is `checked`. So a previous calendar's unticked box cannot leak
  into a file that lacks the id (the M-5 trap applies to static built-in rows only, and R2 excludes them). The id ends
  `-custom<n>`, so the restore's re-key regex renames it with the row.
- **`captureSnapshot()` does not change**, and **`SNAPSHOT_VERSION` stays 1.** An older build ignores the id and
  shows *Table Read wk 1*: the phase keeps its dates and colour and only gains the suffix. That is the safe kind of
  older-build degradation; refusing the file would not be.

---

## 6. What flips the box, and what must not

| Path | Effect on the box | Why |
|---|---|---|
| A new custom phase (+ Add phase) | On | It starts in Weeks; today's look |
| **The By select changed to Days or Dates** (`onCustomUnitChange()`) | **Off** | The owner's "by default": a short phase is unnumbered from the moment it is made short |
| The By select changed back to Weeks | On (Q2) | Weeks phases are numbered by default |
| **Day menu ▸ Add a phase here ▸ one day** (`addPhaseHere(ctx, 'day')`) | **Off** | ⚠️ It sets `unit.value = 'dates'` with no `change` event, so `onCustomUnitChange()` never runs. It must clear the box itself, inside its undo bracket |
| Day menu ▸ one week | On | Weeks, 1 |
| The month drag's Weeks → Dates switch (`installPhaseEdgeHandles`, ruling 8) | Untouched (Q3) | A drag changes dates; it should not rename the bar. It also sets the unit with no event, so leaving the box alone costs nothing |
| Shift All / From, Anchor To, Rebuild, Close all gaps, body-drag | Untouched | They move dates, never units |
| Load, undo, redo, restore | The saved value | `.checked` is set with no event, so no flip handler can run |

- **Each flip is one undo step with the unit change**, because `wknum-<key>` and `unit-<key>` land in the same
  `fields.byId` snapshot (the reason `snap-<key>` costs nothing, MONTH-VIEW-PLAN §6.3).
- The user can override any flip by ticking or unticking the box.

---

## 7. What does not change

- **Frozen code:** nothing. The writers draw `c.label` as they always have, and `cellTextFit` fits a shorter string.
  ⚠️ An unnumbered phase's automatic column width (`sheetColumnWidths`) can come out narrower, because it measures
  the label. That is the frozen width model doing its job on new text, for opted-out phases only.
- **The built-in phases (R2), Production** (labelled by week, episode or block, MONTH-PILL-LABEL-PLAN), **episode prep**
  (*Prep 202*), **Simultaneous Post**, and the phase-hiatus label *Name Hiatus*.
- **Week counting.** `weekCounters` still advances; only the text drops the number. Ticking the box back on shows the
  same numbers as before.
- **Header tokens:** `{key.name}`, `{key.open}`, `{key.close}`, `{key.weeks}` are unchanged.

---

## 8. Questions for the owner

| # | Question | Ruling |
|---|---|---|
| Q1 | Name and place: "Number weeks", under the By box, shown in all three units? | ⏳ **Not asked.** Recommended: yes. A Weeks phase may want it off too, e.g. a three-week "Location Lock" |
| Q2 | Switching back to Weeks: turn numbering back **on**, or leave it as it is? | ✅ **Turn it on** (owner, 19 Oct 2026, picker). Weeks is numbered by default. The accepted cost: someone who unticked it on a Weeks phase, tried Days, and came back must untick it again |
| Q3 | The month drag's Weeks → Dates switch: leave numbering alone? | ✅ **Leave it alone** (owner, 19 Oct 2026, picker). A three-week phase dragged one day shorter keeps its week numbers |
| Q4 | Days or Dates phases saved 16–19 Oct open numbered (§5). Acceptable, or should those open unnumbered? | ✅ **Open numbered** (owner, 19 Oct 2026, picker). "Absent means unnumbered for Days and Dates" would change saved calendars' text with no edit, which is what the save rules exist to prevent. Unticking is one click |

---

## 9. Steps

Build in its own worktree off `main`: several sessions edit the main checkout at once (HANDOFF, 19 Oct "Learned").
⚠️ Branch `day-menu-step3` (unmerged) adds a phase section that strips "wk N" from a bar's NAME with
`prodWeekLabel()`'s regex. It reads the name, not the label, so it is unaffected, but whichever lands second
re-runs `mvmenu`.

1. **Fixture first:** `tests/fixtures/phasenumbering.sptcal`, synthetic (made-up dates, no real show's shape), saved
   by the BUILT app after step 2. It needs a Days-1 phase off, a Dates phase running Thu–Mon across two week rows
   (off), a Weeks phase off, and a Weeks phase on. Recorded in `tests/fixtures/README.md`.
2. **The checkbox, the def flag and the two label sites** (§4.1).
3. **The flips** (§6): `onCustomUnitChange()` and `addPhaseHere()`.
4. **The leg, then the full gate** (§10).
5. **Docs:** README changelog entry, HANDOFF, and CUSTOM-PHASE-UNITS-PLAN §5 gets a pointer here.

---

## 10. The gate

- **Every existing baseline unchanged, with no re-cut:** gates 1–5, 10 and 13. No existing calendar has the id, so
  any output that moves is a regression. ⛔ **If one moves, stop and report. Do not re-cut.**
- **Gate 5 stays at 74 ids:** `v1.0.0-saved.html` has no custom phases. Legs that load a fixture WITH custom phases
  (`customunits`, `carry-rich`, `custom-nondense`, `stintswap-chained`, `stintswap-reshape`, checked 19 Oct) see one
  more id per custom phase. No leg was found counting `fields.byId` keys (grep, 19 Oct), but check any that fails before assuming.
- **New leg `phasenum`, on `phasenumbering.sptcal`, asserting:**
  - the waterfall cell text of each phase in each row (*Scout* in both of its rows);
  - the Excel cell text, from the workbook the leg exports;
  - the month pill text, and the written month PDF's text for the same days;
  - the day menu's header on an unnumbered phase's day;
  - ticking the box is one undo step, and one undo puts the text back;
  - By → Days unticks it, and one undo restores both the unit and the box;
  - Day menu ▸ one day gives an unticked phase; ▸ one week a ticked one;
  - an edge drag that switches a Weeks phase to Dates leaves the box as it was (Q3);
  - a restore round trip keeps each box, and `customunits.sptcal` (no `wknum-` ids) opens with every phase numbered;
  - after loading `phasenumbering` then `customunits`, nothing stays unticked (the M-5 shape, proven not just argued);
  - the checkbox is reachable by `document.elementsFromPoint()` at its centre.
- **Prove red:** the leg's text checks fail on the pre-change build (the in-place method, HANDOFF 19 Oct "Learned" 3),
  on a private `HARNESS_PORT`.
- **The new fixture's month PDF goes to the owner** as `monthbase.py sheets` contact sheets before any commit, per the
  month-PDF writer's ruling 4 for a deliberate change to the month PDF.
