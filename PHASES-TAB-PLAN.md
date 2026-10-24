# PHASES-TAB-PLAN.md: month-view-only phases, and a redesigned Phases tab

**Status: PLANNED, 23 Oct 2026. No code yet.** Part 1's rulings are in. For Part 2, the owner picked **A, Tidy card,
with Production refined** (R5, §3.4), then asked to see **a blend of A and D** (§3.4a). A or the blend is open (O4).
Tracker cards `mv-hide-phases` and `phases-tab-redesign`.

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
| O3 | **OPEN again if the blend is picked:** its switches, like D's, overrule UI-CONVENTIONS §5, which keeps "Lock in place" a Checkbox ("a Switch implies an immediate effect"). | owner |
| O4 | **OPEN: A (refined) or the A + D blend.** Asked right after R5: *"actually can i see a blend of A and D"*. | owner |

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

### 3.4 The picked design: A, refined (R5)

This is the left column of the mockup, marked Picked. B, C and D stay in the file, dimmed, as the record.

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

### 3.4a The A + D blend (asked after R5; O4)

The mockup's first column, marked New. It takes from D:
- the phase colour as the card's **head**, with the editable name, tags and × on one line and the dates under it in
  the phase's text colour;
- **label-left switch rows** for every yes/no (Snap to Monday, Number weeks, Hide in waterfall, Hiatus, Simultaneous
  Post, Lock in place).

It takes from A:
- Starts and Length side by side, with the unit on Length's label line, and "↳ Start after …" under them;
- the refined Production: Starts, then Snap to Monday, then SHOOTING ORDER with the total on its heading and the
  list boxed, then the Hiatus and Simultaneous Post rows;
- Episodic Prep's boxed PER EPISODE list.

An optional block (a hiatus, Sim Post) is a switch row that opens its fields underneath, indented and ruled in the
phase colour. A hiatus's name is a field inside that block. The All-phase hiatus card gets a red head with the name
and dates, Starts and Weeks side by side, then Lock in place and Number weeks as switch rows.

**Heights**, same content, 360 px sidebar (Phases card / All-phase hiatus card):

| | Phases card | All-phase hiatus |
|---|---:|---:|
| Blend | 2,138 px | 680 px |
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
2. **The restyle to whichever of A (§3.4) or the blend (§3.4a) the owner picks** (O4), built the way §3.2 says,
   moving the tick and tag into it, plus `phasesui`.
3. **One full gate** at the end.
4. **Changelog and HANDOFF**, then ask about commit, and separately about push.

All of it goes on one branch in its own worktree.
