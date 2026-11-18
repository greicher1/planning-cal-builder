# DOUBLE-UP-DAYS-PLAN.md

**Status: BUILT 17 Nov 2026 on branch `claude/double-up-days-037393` (§10), committed locally, not merged, not pushed.**
*(Was: "PLAN, 17 Nov 2026. Nothing built.")* Every ruling below was given by the owner on 17 Nov 2026, by picker or in
their own words. Tracker card: `double-up-days`.
**Read first:** [`CLAUDE.md`](CLAUDE.md) → [`HANDOFF.md`](HANDOFF.md) → [`EPISODE-PREP-PLAN.md`](EPISODE-PREP-PLAN.md)
(the Prep card and the prep segment are this feature's template) → [`HALF-SQUARE-BARS-PLAN.md`](HALF-SQUARE-BARS-PLAN.md)
(how a frozen month-view edit was approved, gated and built) → [`MANTINE-SEAM.md`](MANTINE-SEAM.md).
**The mockup to build to:** [`mockups/double-up-days-ui.html`](mockups/double-up-days-ui.html) (every UI piece, with the
"Defaults live in: The Double-ups card" switch, which is the ruling). The earlier mockups (`double-up-days-entry.html`,
`-look.html`, `-more-looks.html`, `-stacked.html`) are the history of how the owner got there; `-stacked.html` is the
fullest drag behaviour.

⛔ The executives' calendars and an outside write-up that informed this are real productions and are **not in the repo**.
Every fixture is synthetic.

---

## 1. The request

Executives (17 Nov 2026): **"10+1" means 10 first-unit days plus one double-up day**, when a second crew shoots one
episode while the first unit shoots another. Two crews, one day, so it is an **overlap**: it never makes Production
longer. It is NOT a half day: a half day is one crew splitting a day between two episodes ("cheek to cheek"), which
SPTCal already does with `.5` counts.

Why not `.5`: with 8 episodes at 10+1, typing 10.5 gives 84 calendar days instead of 80, shows 10.5 days per episode
instead of 11, and draws the bars meeting mid-day.

---

## 2. Rulings (all 17 Nov 2026)

| # | Ruling | Owner's words / pick |
|---|---|---|
| R1 | **Its own phase section, like Episodic Prep's:** a **Double-ups card** in the Phases tab, directly under Production, month view only. | "could we consider giving double up/tandem days their own phase section similar to how we did for block/episode prep"; then "The Double-ups card" |
| R2 | **The defaults live in that card**, not Show info: its name box is the default pill name (`Double-up`), and a **− / +** is the default count. Show info does not change. | picker "The Double-ups card (Recommended)" |
| R3 | ~~**Entry is a − / + box**, not typed "10+2".~~ ⛔ **Replaced by R19** (number boxes). | picker "Separate − / + box" |
| R4 | **Each episode (or block) can have its own count AND its own name**, overriding the defaults, in the card's list. | "just like how i can then go and individually change per episode for shooting days, i should be able to change/override per episode/block"; "allow me to change the name per episode/block so one could be tandem and one could be double up and one could be something else" |
| R5 | **The last episode or block has NO double-up by default**, but can be given one. Given one, it sits **beside its own last days** (under its shoot pill), not joined and not past wrap. | "it shouldn't have one by default (but can be added)"; picker "Beside its last days" |
| R6 | **The look:** a real pill like a phase bar. At the end of an episode or block it **comes out of the end of the shoot pill, on the same line, joined flush** (square corners where they meet, no gap). The next episode starts on the line below for the overlap days. | "i want the double up pill to come out of the end of the shoot pill, on the same line, and clear that theyre connected"; "I like the flush" |
| R7 | **Colour: a darker shade of whatever Production's colour is**, following it when Production is recoloured. | "darker version of whatever color you make the production phase" |
| R8 | **Movable by drag; a drag moves the whole pill.** | picker "The whole pill" |
| R9 | **Where it may be dropped:** another episode's or block's days, or **after wrap**. Never its own episode's days, never before the shoot starts. Its own default days are always allowed (that is "put back"). | "it shouldn't let you drag a double up day for 102 onto another part of 102"; "Yes, allow after wrap" |
| R10 | **A moved double-up moves with the shoot**: it is kept by shoot-day number, the way Production's day marks travel (Shift, a hiatus, a day-count change). | picker "Move with the shoot" |
| R11 | **Right-click a double-up pill:** `Rename…` (that episode's own name), `Put back on its default days` (only on a moved pill), `Remove double-up` (sets that episode's count to 0). | picker "Keep all three" |
| R12 | **Double-click a double-up pill opens the Double-ups card at that episode's row**, as every month bar opens its phase's card. | picker "Open its row" |
| R13 | **Not in the waterfall.** The waterfall, Excel and the waterfall PDF do not change. | picker "No" |
| R14 | **Prints in the month PDF**, exactly as on screen. | picker "Yes, like the screen" |
| R15 | **A half day and a double-up can go together**: with 9.5 + 1 the double-up starts on the first full day after the half-day switch. | picker "Yes, double-up starts next day" |
| R16 | **Frozen month-view edit APPROVED.** Acceptance gate: every calendar with no double-ups prints byte-identical month PDFs (gate 10, the print path, and gate 13, the written PDF), and the full `gate.sh` stays green. | picker "Approve" |
| R17 | **Production's days never change**: its length, shoot days, Day N numbers, prep, wrap and every main-unit date ignore double-ups. | the model, agreed throughout |
| R19 | **Number boxes, not − / +** (replaces R3): the default and each episode's or block's count are typed into boxes with "days" inside, like every other phase's (Episodic Prep's: blank uses the default, 0 is none, a typed number is the unit's own, in bold). And the card's two explanatory lines ("Every episode but the last, joined to the end of its shoot…" and "Bold = its own. The last episode starts with none…") are deleted. | "lets not do the plus and minus symbols lets do open text boxes like all other phases use"; "Delete: …" (both lines) |
| R20 | **No double-up during episode 1**: none may sit on ANY of the first episode's (or first block's) days, in shooting order. The earliest one can start is the next episode's first full day, where the first episode's own sits by default; a drag onto episode 1 snaps back with a one-line reason. A v1.17.0 file holding a move onto episode 1 opens with that double-up at its default, the saved move kept. ⭐ **Exception:** a show of ONE episode or block keeps its double-up on its own last days (R5). | "there also shouldnt be double up days at the beginning of the 1st episode"; picker "None during episode 1 (Recommended)" over "Just not its first day"; for one-episode shows, picker "Allow it there" (over "Right after wrap" and "No double-up at all") |
| R18 | **Where a shoot pill meets its joined double-up, ONE faint line**, not the two dark rings side by side the first build drew (~3 px of dark line). The shoot pill loses its ring on that side; the double-up's left edge is one 1 px line in its own ink at 40%; the top and bottom rims run straight across. Layout-neutral. Given after trying the built branch (`60883ac`); spec: [`mockups/double-up-join-line.html`](mockups/double-up-join-line.html), "Proposed: ONE thin line". | picker "A: one faint line" (asked: "can you make it a single fainter line that seperates the edge of the phase and the double up coming out of it") |

Turned down on the way (do not reintroduce): a dashed pill in a row of its own (look A), a hatched stretch of the
episode's bar (look B), split / slanted / darker-days / chip / note / label-only looks (C–H), and an arrow join.

---

## 3. How it fits: Prep is the template

Checked by reading on 17 Nov 2026 (re-check at build time, symbols not line numbers):

- **Prep is a segment appended after the schedule is built.** `appendEpisodePrep(schedule, state, hiatuses)` pushes
  `{key: PREP_KEY ('episodePrep'), …, start: prod.start, preps, prep: true}` onto `schedule.segments`. The waterfall,
  Excel and the waterfall PDF read `schedule.weeks`, never `segments`, so they cannot draw it (that is R13 for free).
  `prepRunsForWeek()` splits its pills per unit; frozen `renderMonthView` lays them with `takeLane()`.
- **Its `start` is a lane anchor**, not its first day (`prod.start`), so it stacks UNDER the shoot. Read EPISODE-PREP-PLAN
  §13.1 before choosing the double-up segment's `start`.
- **The per-unit values live on the defs**: `episodeDefs[].prepDays` / `blockDefs[].prepDays`, written only when set
  (`hasPrepOverride`), and `applyStateSnapshot()` restores defs **field by field**, so a new per-def field must be added
  to those maps explicitly or every load and undo drops it (EPISODE-PREP-PLAN §4, constraint 3).
- **The card**: `buildPrepRow()` / `refreshPrepUI()` (swatch, name box `#prep-name`, default `#prep-days`, the list
  `#prep-rows` with id-less `.prep-unit-row` boxes). It sits directly ABOVE Production; Double-ups sits directly BELOW it.
- **The month-view drag ignores a segment with no `start-<key>` field**, so double-ups need their own drag (new code).

**What Prep's route cannot do, so it needs the approved frozen edit (R16):**
1. **The flush join on Production's lane (R6).** Frozen lane order puts Production's runs first, so the next episode's
   run would take the top lane on the overlap days and the double-up would drop below it. R6 needs the opposite: the
   double-up continues the ending episode's lane, and the next episode takes the lane below for those days only.
2. **Square corners where the two pills meet** (as HALF-SQUARE-BARS-PLAN did for half days).
3. **Something on the pill that names its unit** (e.g. `data-du="<unit id>"`, screen only if the writer does not need it),
   so the drag, right-click and double-click know whose double-up it is.

Keep every frozen edit **inert on a calendar with no double-ups**: that is what R16's gate measures.

---

## 4. The model

- Each unit (episode in shooting order, or block) has a double-up count `du`: its own value if set, else the card's
  default, **except the last unit, whose default is 0** (R5).
- **Default days:** the `du` shoot days **after the unit's last main-unit day** (the next unit's first days). With a
  half day (R15) they start on the first FULL day after the switch day. The last unit's (when given one): its own last
  `du` days.
- **Moved:** stored per unit as a shoot-day number (its first day), or as working days after wrap when dropped there
  (R9, R10). Never as a calendar date.
- **Lowering a unit's count** below a moved pill's length just shortens it; setting 0 deletes its moved position too.
- **Production's segment, `shootDays`, `productionUnits()`, Day N and prep are untouched (R17).** The double-up segment
  is derived from them.

---

## 5. The Double-ups card (R1–R5, R7)

As in the mockup:
- **Head:** caret, swatch (the derived darker Production colour; R7 says it follows Production, so decide at build time
  whether the swatch opens a picker at all, and if so what "follow Production" looks like there; ask if unsure), the
  name box (`Double-up` by default; this is the default pill name), the "Month view only" tag, and a summary line
  (`7 double-ups · 7 days · 101–107`, or "None yet").
- **Body:** `Default double-ups [− 1 +] days`, a one-line note, then the list (`Episodes` / `Blocks`): each unit's tag,
  its own name box (placeholder = the default name; bold when its own), its own − / + (bold when its own; the last
  unit shows `–` until given one).
- **Shown only while the month view is open**, hidden (never cleared) in the waterfall, like Prep.
- ⛔ **No `id` on any per-unit control** (UI-CONVENTIONS §8). Decide whether the default count and name are id'd fields
  (they enter `fields.byId`, permanent, and gate 5 moves: Prep did this and re-cut gate 5 on the owner's sign-off) or
  id-less with their own snapshot keys (gate 5 does not move). **Recommended: id-less.** Either way the choice is
  permanent from the first save.

---

## 6. The month view (R6, R8–R12, R14)

- **Joined:** the shoot pill's end and the double-up pill's start share one line with square corners where they meet.
  The next episode sits on the line below for the overlap days only, and is back on its usual line the next week.
- **Loose** (moved, or the last unit's): its own pill in the first free lane on its days.
- **Label:** `<its name> <episode number>` ("Tandem 102"), or `<name> Block 1`. The joined pill shows its label even
  when it is one day wide (it is a full-height pill).
- **Drag (R8, R9):** whole pill; while dragging, days it cannot take grey out (screen only), the drop outline is red
  over a refused day and a refused drop snaps back with a one-line reason. Dropping on its default days puts it back.
- **Right-click (R11)** and **double-click (R12)** on the pill; keep the menu lean (owner rule): exactly those items.
- **The month PDF (R14):** the direct writer parses `renderMonthView`'s HTML (`buildMonthLayout` → `mvlParseItem`).
  Make sure the pill's colour, corners and lane come through; the print-path rollback (`exportMonthPdf`) is the DOM, so
  it follows the screen.

---

## 7. Save format (⛔ permanent from the first save)

- Per unit, on `episodeDefs[]` / `blockDefs[]`: its own count and its own name, **written only when set**, restored
  field by field in `applyStateSnapshot()` (absent = follow the default), sanitized in `sanitizeSnapshot()`.
- The card's default count and name, and the moved positions: one top-level key, **absent while nothing is set**, so
  every calendar without double-ups saves byte for byte as before.
- No `SNAPSHOT_VERSION` bump (an older build ignores the keys and shows no double-ups, which is safe).
- Every new key goes in **both** `captureSnapshot()` and `applyStateSnapshot()`, the New / reset paths, and the undo
  stack (which is `captureSnapshot()`). `lastEditedCanon()` already sorts keys.
- Moved positions are by shoot-day number, so `shiftCalendarDates` must NOT re-key them (they travel by themselves, as
  `phaseNotes` do). Check `asShootDayMove()` / `beginShootDayMove()` / `endNudgeBurst()` for anything that rebuilds
  shoot-day keyed state.

---

## 8. Steps

1. **Engine:** the per-unit counts and names, the defaults, the moved positions; `appendDoubleUps()` after
   `appendEpisodePrep()` building the segment and its runs. Save, restore, sanitize, New. No drawing yet. Leg: a
   calendar with double-ups round-trips through Save / Load / Undo; one without saves byte-identical.
2. **The card** (Prep's pattern), month view only, live with the engine.
3. **The month view: the approved frozen edit** (join, corners, the unit marker). Gate 10 and gate 13 first, on the
   untouched baselines, before anything else is believed.
4. **Interaction:** drag with the drop rules, right-click menu, Rename popover, double-click to the row.
5. **The month PDF** check on a calendar with double-ups (joined, loose, last unit, Blocks, a half day).
6. **Legs** (`tests/harness/t/`, registered in `gate.sh`): the engine round-trip; R5 (last unit none, then beside);
   R9 (own days refused, another episode allowed, after wrap allowed, before the shoot refused); R10 (Shift by a week and
   a moved double-up keeps its shoot day); R15 (9.5 + 1); Blocks; the card's bold / reset behaviour; the PDF.
7. **Full gate**, alone (two gates at once stall each other). Then README changelog, HANDOFF, tracker card. Ask before
   any commit to `main` or push (CLAUDE.md).

---

## 9. Still open (small; decide at build time or ask)

- Whether the card's swatch opens a colour picker (R7 says follow Production).
- Whether the summary line also shows in Production's card (the mockup does not).
- Id'd or id-less defaults (§5; recommended id-less).

---

## 10. ✅ As built (17 Nov 2026, branch `claude/double-up-days-037393`)

Steps 1-7 in one session. Everything is in `src/legacy/app.js`, `src/styles/legacy.css` and the harness; no React file
changed.

### 10.1 The engine (step 1)
- State: `doubleUpDays`, `doubleUpName`, `doubleUpMoved` beside Prep's, and `doubleUpDays` / `doubleUpName` on each
  episode or block. Helpers `duCountOf`, `hasDuDays`, `hasDuName`, `cleanDuName` (one line, 40 characters),
  `duMovedOf`, `duSnapshot`, `restoreDoubleUps`.
- `readState()` carries `doubleUps: readDoubleUpConfig()`; `appendDoubleUps()` runs right after `appendEpisodePrep()`
  (cheap exit first). The SLOT LINE is §4's: shoot days, then working days after wrap (`isUnitWorkDay`, no own hiatus).
  The segment's `start` is Production's (prep's lane anchor); its real bounds are `firstDay` / `lastDay`.
- `scheduleLastDay`, `landmarkDate` (Anchor To), the key facts' weeks, the hiatus drag's "also changes when … ends"
  line and the phase map skip the segment; `dayFacts` names each double-up on a day as its pill does.
- Save / restore / sanitize / New / the "Removed …" warning, as §7 says. A hostile value is counted and dropped.

### 10.2 The card (step 2)
`buildDoubleUpRow()` (under Production in `buildPhaseRows`) and `refreshDoubleUpUI()` (from `update()`), Prep's
rebuild-only-when-the-rows-change rule. CSS in `legacy.css` beside Prep's (`.du-*`), and
`body:not(:has(#view-month-btn.active)) #du-row{display:none}`.

### 10.3 The frozen edit DU1 and the writer (steps 3, 5)
As §3 asked, plus one lane rule §3 named ("the next episode takes the lane below"): see CLAUDE.md's eighth exception.
`mvJoinDoubleUps()` (not frozen) puts each joined double-up's runs among Production's, right after its own unit's, and
marks `duLine`, `joinL` / `joinR` and the next unit's run `duBelow`. The writer: `mvlDuJoins`, `mvlPackLanes`
(`duLine` / `duBelow`), the painter's `sq` corners in `mvlPageOps`' `path()`.

### 10.3a R18, one faint line at the join (17 Nov 2026, after the first build)
- **Screen and print path** (`mvDuJoinCss`, which frozen edit DU1 appends): `joinR` (the shoot pill) is `border-right:0;
  padding-right:9px` (8 + the 1 px border it gives up, so neither box nor text moves) and the ring's half pixel on its
  other three sides (`box-shadow:inset 0 .5px 0 currentColor, inset 0 -.5px 0 currentColor, inset .5px 0 0
  currentColor`); `joinL` (the double-up) is `border-left:0; padding-left:9px` and `box-shadow:inset 1px 0 0
  color-mix(in srgb, currentColor 40%, transparent), …` the other three half pixels.
  ⛔ The divider is a shadow, never a border: a faint or transparent border met the dark top and bottom borders on a
  diagonal at each corner and left a 1 px stripe (the owner saw two lines with notches).
- **The writer:** `mvlDuJoins` checks all six declarations of a side to the character (any other mix throws); the ring
  has no band on the `sq` side, so the top and bottom rims run straight across (`mvlPageOps`); and a joined double-up
  gets one 1 px fill on its left edge inside the top and bottom borders, its ink at 40% over its fill
  (`mvlMix(ink, 0.4, fill)`: #7B9968 on the default green), painted after the ring as the first CSS shadow is on top.
- Checked at 600 dpi on `doubleups.sptcal`'s March: Chrome's print of the page and the written PDF draw the same single
  line. Gates 10 and 13 re-run after it.

### 10.3b R19, number boxes (17 Nov 2026, after trying the build)
`duBoxHtml()` draws Prep's `.num-suffix` box (no id) for the default (`.du-default-in`, in a `.phase-fields` label like
"Default prep") and each unit (`.du-unit-days`); `duTyped()` reads one (a whole number, capped at 99). `refreshDoubleUpUI`
writes them back in place, never into the focused box, and leaves a box that already READS as the stored count (so "2.5"
keeps its ring). Both boxes are in `PREP_FIELDS` (whole days). The two explanatory lines are gone from the card; the
mockup `double-up-days-ui.html` still shows the − / + and the lines, and is superseded on both.

### 10.3c R20, nothing during episode 1 (17 Nov 2026, after v1.17.0)
`appendDoubleUps` works out `minSlot`, the first slot after the first unit's last day (0 on a show of one unit, the
owner's exception), and stores it on the segment. A moved position below it is drawn at its default with the key kept
(only a v1.17.0 file can hold one); the last unit's default never reaches below it. `duDropVerdict` refuses a drop below
it (`why: 'first'`, "Double-up 104 can’t go on the first episode’s days: it has no double-ups."), after the "own days"
test, whose reason is the more specific for the first episode's own double-up; the drag greys those days. Leg
`doubleups` RESTORE R20 (5 checks: refused with its reason, greyed while dragging, the next episode's first day allowed,
a v1.17.0-style file, the one-episode exception).

### 10.4 Interaction (step 4)
- **Drag** (`installDoubleUpDrag`): mouse events, as every month drag; the whole pill in slots; `duSlotLine()` maps a
  day to a slot (a working day before the shoot is a negative slot, so it can be refused); `duDropVerdict()` is R9;
  `setDoubleUpAt()` the one writer (one undo step). Body-level `.du-drop-box`es grey the days it can never take and
  outline the target (red when refused); `mvDragGhost` is the moving copy; a refusal is a `.du-toast` line.
- **Right-click** is the day menu's own (`dayContextAt` → `ctx.du`, `duSections`), headed by the pill's name and length.
- **Rename…** is a small body-level `.du-rename-pop` (Enter / Done saves, "Use “Double-up”" clears, Esc cancels).
- **Double-click** is the day menu's dblclick → `showDoubleUpRow()`, which flashes the card and the row.
- `buildSavedHtml()` strips `.du-drop-box`, `.du-toast`, `.du-rename-pop`.

### 10.5 Decisions of mine the plan left open (cheap to change)
- §9: the swatch opens **no picker** (R7, "follows Production"); the summary line is **not** in Production's card;
  the defaults are **id-less** with their own snapshot key (gate 5 unmoved).
- ~~The − / + runs 0..9 (the mockup's). A unit's count equal to its default is not kept as its own.~~ Since R19 the
  counts are number boxes, 0..99 (`DU_MAX`), whole days ("Whole days only" rings a fraction, as on Prep's boxes), and a
  typed number is the unit's own even when it equals the default (Prep's rule). Only R11's Remove still clears the last
  unit's own count rather than storing 0 (its default is 0).
- Labelled by Production Week (one bar per week, no unit bars), every double-up is drawn LOOSE: there is no unit bar to
  join.
- A double-up that does not touch its unit's bar (a half day before it, R15, or a holiday between) keeps the line but
  not the square corners: corners are squared only where the two actually meet.
- A moved double-up is a loose pill in the first free lane after prep (§6), which can be the main line where nothing
  else is.
- A drop on a day with no slot (a weekend or holiday inside the shoot, a day marked Off) has no target: nothing happens.
- Double-up pills take no month text style (not in the plan), and have no reorder grip.
