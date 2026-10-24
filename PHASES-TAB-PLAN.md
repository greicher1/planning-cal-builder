# PHASES-TAB-PLAN.md: month-view-only phases, and a redesigned Phases tab

**Status: PLANNED, 23 Oct 2026. Building started the same day ("Start building"), on its own branch.** Part 1's rulings are in. Part 2's design is picked: **the A + D blend,
with Production's big Total shooting days readout kept** (R6, §3.4a). Only O2 is still open. Tracker cards
`mv-hide-phases` and `phases-tab-redesign`.

**Mockup:** [`mockups/phase-cards.html`](mockups/phase-cards.html). It is self-contained, so you can open it directly
or through the harness server at `/mockups/phase-cards.html`. It is drawn with the app's real Mantine 9.5.2, theme
and Inter. Its source is [`mockups/phase-cards/`](mockups/phase-cards/) (`PhaseCards.jsx`, `entry.jsx`,
`vite.config.mjs`, `assemble.mjs`), and the rebuild command is in `vite.config.mjs`.

---

## 0. Asked (owner, 23 Oct 2026, in order)

1. *"could it make sense to add a setting in the month view to be able to hide specific phases from the waterfall view"*
2. *"The setting should be a toggle option under each phase in the phase menu (toggle would be visible in both the
   waterfall and month view). 'Hide phase in waterfall' OR do you think there should be 2 toggles"*
3. *"the point of this is if you add a very specific phase to the month view (such as color grading week) you wouldn't
   want that to show on the waterfall calendar"*
4. *"would the toggle be visible whether you're in the month view or waterfall"*. Answer: yes. The Phases card is a
   sidebar tab, and `setViewMode()` never touches the sidebar.
5. *"yes plan it, but as part of this we need to overhaul the design of the phase UI. right now its pretty cluttered and
   ugly. give me a few design idea mockups (using mantinue) without changing functionality."*
6. *"also do it for all phase hiatuses"*. Read as: the All-phase hiatus card gets the same redesign. The per-phase
   hiatus block inside each phase card is already part of item 5. ⚠️ If the owner meant a Hide in waterfall toggle on
   all-phase hiatuses, that is a different feature: such a hiatus still pauses every phase, so hiding it would leave
   unexplained gaps in the waterfall. Confirm before building it.

⚠️ Item 1 was first read the other way round (hide from the MONTH view). Item 3 corrected it. Everything below is the
corrected reading.

## 1. Rulings

| # | Ruling | Source |
|---|---|---|
| R1 | The toggle hides a phase from the **waterfall**: the waterfall view, the Excel workbook and the waterfall PDF. The month view and both month PDFs keep it. | owner, item 3 |
| R2 | The toggle sits **on each phase's card** in the Phases tab, and it can be reached from either view. | owner, items 2 and 4 |
| R3 | It is **saved in the calendar**. | owner ("i agree with 2 and 3") |
| R4 | A hidden phase's **automatic notes** stay off the waterfall too. | owner, same |
| D1 | **One toggle**, "Hide in waterfall". No month-view toggle. The saved shape leaves room for one later (§2.3). | recommended; owner said "yes plan it" |
| D2 | **Every phase except Production.** Production drives shoot days, Sim Post and the principal-photography notes. Episodic Prep is month-only already, so it gets the tag but no toggle. | same |
| D3 | **Off by default**, including for a phase added from either right-click menu's Add 1-week phase here. | same |
| D4 | A **"Month view only" tag** in the card's header, visible while the card is folded. | same |
| R5 | **Direction A, Tidy card**, *"but please clean up/refine the production phase cuz its still messy with hiatus and sim post"*. The refined A is §3.4. | owner, by picker, 23 Oct 2026 |
| O2 | **OPEN: what happens to hand-set column settings when hiding a phase shifts the columns** (§2.5). Recommended: accept and document it. | owner |
| R6 | **The A + D blend**, *"lets go with A+D but i want to still have something like this for production (nice and big and clear)"*, pointing at today's TOTAL SHOOTING DAYS readout. §3.4a. Supersedes R5. | owner, 23 Oct 2026 |
| R8 | **The head:** a colour square left of the title opens the picker; the head is a lighter tint of that colour; the title has no box and fades on hover. Rejected first: a palette chip and an always-on name box (*"no now you made it ugly"*). §3.4a. | owner, 23 Oct 2026 |
| R9 | **The head's text is always black**, never the colour's own dark shade. §3.4a. | owner, 23 Oct 2026 |
| R10 | **The colour picker is swatches only**, with no heading. Today's pop already is. | owner, 23 Oct 2026 |
| R7 | **The blend's switches stand, Lock in place included.** That overrules UI-CONVENTIONS §5 (which keeps "Lock in place" a Checkbox because "a Switch implies an immediate effect") for these two cards. The owner was told this before picking. When it is built, update §5 to say so. | with R6 |

---

## 2. Part 1: Hide in waterfall

### 2.1 What a user gets

- A **Hide in waterfall** tick on every phase card except Production (D2).
- When it is ticked:
  - the phase is gone from the waterfall, the workbook and the waterfall PDF. No empty column is left, and no extra
    year block either;
  - it still draws in the month view and both month PDFs;
  - its start, length, hiatus, colour and name all keep working, and the shift tools still move it;
  - the card shows **Month view only** (D4).
- Nothing else moves. "Start after previous phase" is a one-shot button, not a live link, so no other phase's dates
  depend on the hidden one.

### 2.2 How: the engine, with no frozen edit

**This mechanism already exists, and Episodic Prep uses it.**
- The waterfall, `exportExcel` and `buildWaterfallPdf` read `schedule.weeks`. The month view draws `schedule.segments`.
- `appendEpisodePrep()` adds prep segments AFTER the week loop. That is why prep is month-only and the waterfall
  outputs are byte-identical with prep on or off. Its comment says so.

So in `computeSchedule()` (not frozen), split `segments` once they are built: `wfSegments` holds the phases not hidden.
Feed `wfSegments`, not `segments`, to every waterfall-only step:
- the week loop (cells, `maxConcurrent`);
- column placement: the classic `segCol` pass, and `placeSegmentsReusingColumns()` with column reuse on;
- `naturalStarts` / `naturalEnds` and the full-year padding, so a hidden phase in January can't add a year block;
- `relevantHiatuses`, so an all-phase hiatus that overlaps only a hidden phase doesn't stretch the waterfall's range.

`schedule.segments` keeps every phase, so the month view, `monthCoreRange` and the Compare window
(`scenarioFacts`) see the hidden phase as before.

**Automatic notes (R4).** Both views read `notesByIdx` through `autoNotesForView(list, view)`. That function is not
frozen; the month view calls it with `'month'`.
- Tag a phase's notes with the phase key. Today the only hideable phase with an auto-note is Writer's Room ("Writer's
  Room Opens"); principal start and wrap are Production's.
- `autoNotesForView` then drops a hidden phase's notes when `view === 'sheet'`.
- ⚠️ **Check before building** that every waterfall consumer passes `'sheet'`: frozen `renderSpreadsheetView`,
  `exportExcel`, `buildWaterfallPdf` and `weekAutoTexts`. Reading their calls is allowed; the freeze forbids editing
  them, not reading them. If one reads `notesByIdx` raw, filter `notesByIdx` per view in `computeSchedule()` instead.

**Holidays.** `phaseHolidays` stays computed over ALL segments, for three reasons: the Settings holiday list must
still offer a holiday inside a hidden phase, the month view still needs its note, and holiday notes are off in the
waterfall by default. Recorded so nobody "fixes" it.

### 2.3 State and save format

- **New snapshot key `phaseHidden`:** `{ <phase key>: { sheet: true } }`.
  - It is shaped like `holidayView` (`{sheet, month}`), so a later month-view toggle is `month: true` in the same
    key, with no second key to add (D1).
  - Written only while a phase is hidden, so a calendar that never hides one carries an ABSENT key and saves byte
    for byte as before.
  - ⛔ PERMANENT from the first file saved with it.
- `applyStateSnapshot()` restores it unconditionally (`snap.phaseHidden ? {...} : {}`). The sanitizer keeps only
  known phase keys and `sheet: true`, and never `production`.
- Resets: `resetAll()` (New) clears it. Removing a custom phase prunes its entry, as `mvPhaseOrder` does.
- No week re-key: it holds no dates.
- It is in `captureSnapshot()`, so a tick is one undo step.
- The tick has **NO id**, so it never enters `fields.byId`. Its own key is the store, in the shape of the per-phase
  hiatus's "Number weeks". Class `phase-hidewf-cb`. Its listener is delegated on `#phase-rows` and
  `#custom-phase-rows`, so a rebuilt custom row needs no re-binding (§3.2). `reflectPhaseHidden()` runs from
  `refreshAfterRestore()`.
- The tag goes inside `.custom-phase-header`, because the fold rule hides everything else.

### 2.4 Scenarios

`phaseHidden` is part of a tab's snapshot, so each scenario has its own. The Compare window reads
`schedule.segments`, so it keeps listing a hidden phase. That is correct: Compare is about dates, not about the
waterfall.

### 2.5 O2: column-keyed settings can land on a neighbour

Hand-dragged widths (`colWidths`), typed headings (`headerRowLabels`, `headerRowSplits`) and heading text styles are
keyed by width-model column position (`y2026:s0`). `gridColSwaps` and `cellSpans` are keyed by phase and week, and
drop defensively.

So hiding a phase that had a column to itself in some year can shift the columns to its right one slot left, and a
heading or width typed for slot `s2` then sits on what is now the phase in `s2`.

| Option | What it means |
|---|---|
| (a) accept and document | Hiding is rare and deliberate, and the user fixes the heading. No code. |
| (b) remap the keys on toggle | It touches four stores and the undo story, and is exactly the kind of drift fix that breeds bugs. |
| (c) keep the column empty | It defeats R1. |

**Recommended: (a).** The leg asserts that a stale key is harmless.

### 2.6 Gate

- **Full gate, identical to every baseline.** No fixture hides a phase, so every frozen output must be byte-identical.
- **New leg `hidewf`** (fixture `hidewf.sptcal`: a custom "Colour Grading" phase, Dates, ticked). It asserts:
  - the phase is absent from the waterfall DOM, the workbook's sheet XML, and the waterfall PDF's text;
  - it is present in the month view and the written month PDF;
  - `maxConcurrent` drops, so no empty column;
  - a hidden phase alone in a later year adds no year block;
  - its auto-note is absent from the waterfall and present in the month;
  - the tick survives save, Load, undo and redo;
  - removing the phase prunes the key;
  - a file with no key is unchanged;
  - the key is absent when nothing is hidden;
  - Production has no tick;
  - the tag stays visible while the card is folded.
- `npm run check`, plus the CSP leg (no new resource).

---

## 3. Part 2: the Phases tab redesign

### 3.1 Scope, and what "without changing functionality" binds

This covers the **Phases card**: every row kind (the five built-in Weeks phases, Production, Episodic Prep, custom
phases), the per-phase hiatus block and Sim Post. It also covers the **All-phase hiatus card** (item 6). All of it is
chrome: no grid cell, export or saved value changes.

Every control stays, with its id, class, default and behaviour. The inventory (23 Oct, a read-only survey of
`buildPhaseRows`, `buildPrepRow`, `addCustomPhaseRow`, `phaseHiatusBlockHtml`, `byUnitHtml` and `addHiatusRow`)
lists them. These are the binding points:

- **Permanent ids** (in `fields.byId`, so part of the file format):
  - each phase: `name-`, `start-`, `unit-`, `weeks-`, `end-`, `snap-`;
  - custom phases also: `days-` and `wknum-`;
  - hiatus: `phiatus-en-`, `phiatus-name-`, `phiatus-start-`, `phiatus-weeks-`;
  - Production: `weeks-production` (hidden), `simpost-enabled`, `simpost-offset`, `simpost-count`;
  - Prep: `prep-name`, `prep-days`.
  - ⛔ The episode, block and prep-unit boxes, the hiatus "Number weeks", the fold caret, and every all-phase hiatus
    control carry NO id, and must not gain one.
- **`checked` in the markup** is the back-compatibility default for `snap-` and `wknum-`. Never move it into JS.
- **Each `.pu-*` box keeps its own `<label>`.** The unit CSS hides that label, and `[data-whole-err]` hangs off it.
- **The swatch stays a direct child** of `.phase-row` with id `swatch-<key>` (the fold reads the key off it). The rows
  stay direct children of `#phase-rows` / `#custom-phase-rows`.
- **The fold** is `.phase-row.is-collapsed > :not(.swatch):not(.custom-phase-header){display:none !important}`.
  Anything that must show while folded goes in the header.
- **`#meta-<key>` is written by frozen `render()`, by id.** Moving the element is fine. Its text shapes are read
  elsewhere (the half-day observer's regex on "N shoot days"), so never rewrite them.
- **Classes that reset and restore find controls by:** `.phase-snap-cb`, `.phase-unit`, `.phase-end`, `.phase-days`,
  `.phiatus-*`, `.hiatus-*`.
- **Listeners.** Built-in and Prep rows are bound ONCE at init, mostly by id. A custom row is bound inside
  `addCustomPhaseRow` and rebuilt on restore (re-keyed by `-customN` id suffix). So the generators may change their
  markup, but nothing may rebuild a built-in row after init.
- ⚠️ **`fields.byId` is built in DOCUMENT order.** Moving an id'd control past another reorders the keys in saved
  files. That is harmless to Load, but every saved file's bytes change, so keep the id'd controls in their present
  relative order where the design allows.
- **CSS traps:**
  - no `font-size` on `.remove-custom-phase` or anything more specific (it brings back "××");
  - `.phase-snap` / `.phase-wknum` must out-specify `.phase-fields label`;
  - the `.ep-panel + .phase-hiatus + .simpost-panel` sibling order;
  - `.ep-panel-warn` stays `display:block`;
  - leave `.phase-blocked` dimming alone (UI-CONVENTIONS §3b).

### 3.2 How: restyle the engine's cards, don't port them to React

The mockup's components map one to one onto what the engine already renders:

| Mantine in the mockup | In the app |
|---|---|
| `TextInput type="date"` | the native date input it already is (§2c: every date stays native) |
| `NumberInput` | `input[type=number]` |
| `NativeSelect` | `select` (§8.2) |
| `Checkbox` | the existing `appearance:none` checkbox |
| `Badge` | a span with Badge's tokens |
| `Accordion` / `Collapse` | the existing fold (`collapsedPhaseKeys`), restyled |
| `Switch` (D only) | a CSS-drawn native checkbox, never a React `Switch` (§8.9) |

legacy.css already gives the engine's plain inputs Mantine's look. A React port would buy nothing visible and would
walk into §8.1–8.9 (generated ids swept into saved files, controlled inputs ignoring restore). So the work is:

- the generators' markup, re-arranged under the rules in §3.1;
- the card CSS (~450 lines in legacy.css: 690–718, 1064–1147, 1330–1424, 1951–2004, 3310–3460, 3523–3599 as of
  23 Oct; grep the selectors, the numbers drift), rewritten on the theme's tokens.

### 3.3 The four directions (O1)

All four show the same six phases and three all-phase hiatuses. Heights are measured in the mockup: a 360 px
sidebar, every card open, B with one row open.

| | Direction | Phases card | All-phase hiatus | Extra engine work beyond CSS + markup |
|---|---|---:|---:|---|
| A | **Tidy card.** Today's card cleaned up: a colour edge, length and unit as one field with the unit on the label line, the ticks on one line, the hiatus in its own tinted box. | 2,018 px | 588 px | none |
| B | **Summary rows.** One line per phase (colour, name, dates, tags); click to edit underneath. | 615 px | 289 px | the range must show in the folded header (move `#meta-` / `#unitmeta-` into it, or mirror them); folded becomes the resting state, still session UI (decide: all folded on load, or remember) |
| C | **Compact + options.** Two lines per phase (name; start and length). Snap, Number weeks, Hide in waterfall, Start after, hiatus and Sim Post sit behind a sliders button with a dot when one is changed. | 1,368 px | 494 px | a second, per-card session fold for the drawer; the "changed" dot computed from the controls |
| D | **Settings list.** Label left, control right, switches for yes/no, the phase colour as the card's head. | 2,211 px | 760 px | label-left rows; switches drawn on native checkboxes; O3 |

Most of A's and D's height is Production's and Prep's episode lists, the same in every option. B is the only one
that shows the whole plan without scrolling (UI-CONVENTIONS §3d: the tab already scrolls twice its own height).

### 3.4 A, refined (R5; superseded by the blend, R6)

The owner's first pick, kept in the mockup's second column, dimmed. The blend (§3.4a) takes its fields, Production
and Prep from here, so this section still describes those parts.

**Every card**
- **Colour:** a 5 px left edge in the phase colour replaces today's 8 px top bar. A 14 px swatch beside the name is
  the click target for the colour picker.
- **Header:** the caret, the swatch, the editable name, then the tags (Month view only), then × on a custom phase.
- **Meta line:** the range sits directly under the name, small and grey (`#meta-` / `#unitmeta-`).
- **Fields:** Starts and Length side by side. The unit select sits on Length's label line ("Length · Weeks ▾"; with
  Dates it reads "Ends · Dates ▾"), so the field takes the full column and an end date is never squeezed.
  "↳ Start after …" sits under the pair.
- **Ticks:** Snap to Mon, Number weeks (custom only) and Hide in waterfall on ONE line, wrapping only when the sidebar
  is narrow.
- **Every optional block is the same OPTION BOX:** a bordered box whose first line is its tick and title. Off, it is
  that one line. On, it tints `gray-0` and shows its fields underneath. A phase's hiatus is one, its name editable on
  the box's line.

**Production, the part the owner called messy, top to bottom**
1. **Starts**, with Snap to Mon on the same line, and "↳ Start after …" under it.
2. **SHOOTING ORDER**, a small caps heading with the total on its right ("30 days · 6 episodes"). This replaces the
   separate grey "Total shooting days" block. The episode list sits boxed under it. The total's empty state ("Set by
   Show Info") and the two notes (`#prod-ov-note`, `#prod-hol-note`) take that heading's right side and the line
   under it.
3. **Two option boxes, matching:**
   - Production Hiatus;
   - Simultaneous Post. Its body reads "Starts [2] weeks into Production", then the tick "Number these weeks and
     continue Post's count".
   - Off, each box is one line. Today the Sim Post rows stay visible and only dim when off; the box hides them
     instead, since they do nothing while off. They keep their values.

**Episodic Prep takes the same shape:** the range on the meta line, Default prep, then a boxed PER EPISODE list
whose heading carries the rule "Blank = default · 0 = none". This replaces today's caption sentence and hint; the
Month view only tag says what the caption said. ⚠️ `.prep-caption` is display-only text with no id, so retiring it
is a copy change, not a functional one. Keep the "Month view and its PDF only" fact in the tag's `title`.

**The All-phase hiatus card:** one card per period, with a red edge (`HIATUS_COLOR`) and the editable name with × on
the first line. Under it come the range, Starts and Weeks side by side, then Lock in place and Number weeks on one
line.

**Copy changes, all meaning-preserving:**

| Today | A |
|---|---|
| "Start date" | "Starts" |
| "By [Weeks]" | "Length · Weeks ▾" |
| "Total shooting days" | the SHOOTING ORDER heading's "N days · M episodes" |
| "calendar weeks after Production begins" | "weeks into Production" |
| "Number these weeks & continue Post's count" | "… and …" |

⚠️ Change no text the engine or a leg reads: the `#meta-` shapes, the autostart label written by frozen `render()`,
and any label a leg finds by text. `grep` `tests/harness/t` for each string before changing it.

### 3.4a THE PICKED DESIGN: the A + D blend (R6)

This is the mockup's first column, marked Picked. A, D, B and C come after it, dimmed, as the record. It takes from D:
- the phase colour as the card's **head**, with the editable name, tags and × on one line and the dates under it in
  the phase's text colour;
- **label-left switch rows** for every yes/no (Snap to Monday, Number weeks, Hide in waterfall, Hiatus, Simultaneous
  Post, Lock in place).

It takes from A:
- Starts and Length side by side, with the unit on Length's label line, and "↳ Start after …" under them;
- the refined Production, with today's readout kept (R6): Starts, then Snap to Monday, then the **TOTAL SHOOTING
  DAYS box**, then the Hiatus and Simultaneous Post rows;
- Episodic Prep's boxed PER EPISODE list.

An optional block (a hiatus, Sim Post) is a switch row that opens its fields underneath, indented and ruled in the
phase colour. A hiatus's name is a field inside that block. The All-phase hiatus card gets a red head with the name
and dates, Starts and Weeks side by side, then Lock in place and Number weeks as switch rows.

**The head (R8, owner, 23 Oct 2026).** The owner first asked *"how will you change the color of the phase and will
there be a box or indentation around the name ... so its more clear its editable"*. A palette chip and an always-on
name box were tried, and rejected (*"no now you made it ugly"*). The ruling:

> *"when you hover over the title of the phase it should fade slightly to show you its editable. then for changing
> the color, to the left of the title should be the same little color square shown in the picture. then the
> background color should be a slightly lighter version of the color you pick (the color in the little square)."*

- **Order:** the caret, then the colour square, then the title (with any tag on the title's line), then × on a
  custom phase. The dates sit under the title.
- **The colour square** is A's swatch: 14–16 px, radius 3, a faint inset edge, in the TRUE phase colour. It is the
  colour button. It opens today's 14-colour picker (`openPhaseColorPop`), anchored to it, with the current colour
  ringed in navy. The picker is the swatches alone, with no heading or other text (R10, owner: *"it doesnt need to
  say 'Colour' or any text when you click a color square- just show the colors on their own"*). Today's pop is
  already that.
- **The head's background is the picked colour lightened:** 60% colour, 40% white (`tint()` in the mockup). So the
  square stays the true colour against its lighter band.
- **The head's text is always black** (R9, owner: *"can we make the text in the colored header portion always black
  instead of these off version of the colors"*). That covers the title, the dates, the caret and ×, all in the chrome's
  black (`--mantine-color-black`, #1E1D1B), with the dates at 75%. It matches the waterfall, which draws phase text
  black on any fill (`GRID_TEXT_COLOR`).
- **The title has NO box.** Hovering fades it to 60% opacity. While typing it shows today's focus: a white field
  with the navy edge (`.phase-name-input:focus`, unchanged).
- **The all-phase hiatus** has no square, because its colour can't be changed (always `HIATUS_COLOR`). Its band is
  that red lightened the same way, with the same black text.
- **Engine work:**
  - The square IS `#swatch-<key>`, which keeps its id, its click handler and its place as the row's first child (the
    fold reads the key off it). It moves from the 8 px top bar to the head's left, 16 px, and the existing pop
    already anchors to it.
  - The head's tint needs the colour in CSS. So every place that writes the swatch's inline background
    (`setPhaseColor`, restore, reset; grep the `swatch-` writes) also writes `--phase-color` on the row, through one
    helper. The text is always black (R9), so no ink variable is needed. The head reads `color-mix(in srgb, var(--phase-color) 60%, white)`. Chrome supports it;
    Chrome and Edge are the targets.
  - The title fade is CSS on `.phase-name-input:hover:not(:focus)`.
  - No new state, no id, no saved key.

**Production's TOTAL SHOOTING DAYS box (R6).** It is today's `.prod-total-readout`, unchanged:
- a white box with a `gray-3` border and radius `lg`;
- the label "TOTAL SHOOTING DAYS" in xxs caps (700, .05em, `gray-6`);
- the value at 26 px, weight 700, with "days" in `sm` `gray-6`;
- the episode (or block) count as the primary-light pill on the right.

The only change is that the **shooting order now sits in the same box**, under a hairline. The total is that list's
sum, and two stacked boxes read heavier than one. Its heading is "SHOOTING ORDER", with a short "drag ⠿" on the right.
Today's `.ep-hint` sentence moves into that hint's tooltip. The rest of the box:
- the empty state ("Set by Show Info", dashed) is unchanged;
- `#prod-ov-note` and `#prod-hol-note` sit under the readout, above the hairline;
- Blocks mode puts its block rows where the episode rows are.

**At the narrowest sidebar (280 px; checked in the mockup):**
- a tag drops under the name rather than squeeze it;
- the dates under the name may take two lines;
- the × stays top right;
- a date beside a weeks count gives the count 64 px and the date the rest;
- nothing is cut off.

**Heights**, same content, 360 px sidebar (Phases card / All-phase hiatus card):

| | Phases card | All-phase hiatus |
|---|---:|---:|
| Blend | 2,205 px | 680 px |
| A refined | 2,027 px | 588 px |
| D | 2,211 px | 760 px |

**Extra engine work beyond A:**
- the head is the existing `.swatch` grown into a band behind the header, not a new element, because the fold and
  the colour pop both key off `#swatch-<key>`;
- the switches are CSS on the existing native checkboxes (§3.2), never a React `Switch` (§8.9);
- the hiatus name moves from the toggle's line into its block. `#phiatus-name-<key>` and `#phiatus-en-<key>` keep
  their ids and their document order.

### 3.5 Gate for Part 2

- **Full gate.**
- **A new leg `phasesui`:**
  - before vs after, the set of id'd controls in both cards and their values must be identical: same ids, same
    `fields.byId` for every fixture loaded;
  - each control still drives `update()`;
  - fold and unfold still hold through undo and redo;
  - a custom row rebuilt by undo keeps its look.
- **Screenshots** of each row kind for the owner, at the sidebar's narrowest (280 px) and widest (440 px).

---

## 4. Order of work

1. **Part 1's engine and save format** (§2.2–2.3), with the tick and tag placed simply, plus `hidewf`. This doesn't
   wait on O1.
2. **The restyle to the blend** (§3.4a, R6), built the way §3.2 says, moving the tick and tag into it, plus
   `phasesui`. Update UI-CONVENTIONS §5 for R7.
3. **One full gate** at the end.
4. **Changelog and HANDOFF**, then ask about commit, and separately about push.

All of it goes on one branch in its own worktree.
