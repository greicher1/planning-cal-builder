# MONTH-TEXT-STYLE-PLAN.md

**The text style bar, extended to the month view.** Owner, 27 Oct 2026: *"What would it take to allow styling any text
in the month view calendar with the styling menu"*. Today the bar styles only the month header's lines in the month
view (TEXT-STYLE-BAR-PLAN.md D4). This plan lets it style the month's bars, bands, notes, month name and weekday row,
on screen and in both month PDFs.

**Four rulings made, by picker, 27 Oct 2026 (§1). The three decisions this plan raised are ruled too (§2), and the two
frozen edits, M1 and M2, are SIGNED OFF with the gate in §6 (owner's picker, 27 Oct 2026).** No code yet.

**The short version.** Most of the work is outside the frozen code: the store, the month highlight, the click rule,
and teaching the month PDF writer to draw a style. The frozen renderer needs two edits. **M1** appends each styled
text's style to the inline style it already writes. With nothing styled it writes exactly today's markup, so gates 10
and 13 stay byte-identical, and the print rollback picks the styles up for free (it prints that markup). **M2** changes
the notes' tooltip from "click to edit" to "double-click to edit", which R1 makes necessary. Tooltips are in the
print document, so M2 needs gate 10's baselines re-cut, with a diff that shows only those tooltips changed. Every style
keeps its text's line box, so **no style changes the height of a bar, a band, the month bar or the weekday row.** The
one thing a style can move is a note's LINE COUNT, the same way typing more text does (§3.4).

## 1. The owner's rulings

All four recorded verbatim from the picker, 27 Oct 2026.

- **R1 · Click: "Click picks, double-click edits (Recommended)".** The waterfall's D5, in the month view. A single click
  on a month note picks it for the bar. A double-click, Enter, or typing opens its editor. Dragging a note still moves
  it.
- **R2 · Shared?: "Separate per view (Recommended)".** A month style never changes the waterfall, and a waterfall style
  never shows in the month. This holds for a waterfall note shown in the month too, even though the two share their
  text. So the month has its own store (§4) and never reads `textStyle`.
- **R3 · Size: "Only sizes that fit (Recommended)".** Bars up to about 12 px, notes 10 px or smaller. The calendar
  never changes shape, and month PDFs print at the same scale. Bigger text stays with the `month-bar-size` request.
- **R4 · Which text: "Bars and bands", "Notes", "Month name and weekday row".** Day numbers were left out, and the owner
  confirmed it in chat: *"actually no dont let the day number be editable"*. So day numbers and the "Day N" shoot-day
  numbers are never stylable. That also removes the frozen CSS edit "Day N" would have needed (it is a `::after`, which
  cannot take an inline style).

## 2. Decisions this plan raised (all three ruled, owner's picker, 27 Oct 2026)

### N1 · A phase bar's ring when its text colour changes

✅ **RULED, in the owner's own words (neither offered option): *"maybe disable recoloring phase bar text"*.** Read as:
**a bar's text cannot be recoloured.** That covers every bar drawn as a pill (a phase's, an episode's, Simultaneous
Post's), because all three draw their ring in their text colour. Hiatus bands, notes, the month name and the weekday
row keep the colour control. ("maybe": the owner may revisit it. The save format would not change if they do: a colour
would simply start being accepted for bars.)

So the bar's text colour control is greyed while every picked text is a bar; with a mix picked, it colours only the
texts that take colour. The sanitizer drops a colour on a bar's style, so a hand-edited file cannot get round it. M1
writes no ring, and the writer reads no `border-color`: a bar's ring and ink are exactly today's.

What the owner was offered:
- **The ring keeps the phase's own ink (was recommended).** M1 would have written `border-color` and the inset shadow
  in the pill's own ink whenever its text colour was styled, and the writer would have painted the ring from it.
- **The ring follows the text colour.** A recoloured label would recolour the bar's outline.

### N2 · Whose style is "Prep wk 2"'s when Prep moves

✅ **RULED: "Follows Prep wk 2 (Recommended)".**

- **It follows the phase week (recommended).** A phase bar's style is keyed by the phase and its own week number
  (`prep@2`), so it stays on "Prep wk 2" through every mover (Shift All, Shift From, Anchor To, Rebuild From, the bar
  drag, the edge drags) with no re-key code in any of them. Lengthening the start of a phase renumbers its weeks, and the
  style stays on the second week, as the label does.
- **It stays on the calendar week.** Keyed `week|phase` as the waterfall's phase styles are, and moved only by the shift
  tools, as the waterfall's are. The month's own drags (bar drag, edge drags) would leave it behind on a week the phase
  has left.

### N3 · The grey block and episode text inside Production's bars

✅ **RULED: "Keeps its own look (Recommended)".**

- **It keeps its own look (recommended).** The grey `.mv-pill-block` text keeps its 9 px, its 500 weight and its grey. It
  slants with an italic bar, because CSS passes italic down to it, and the writer does the same. Styling a bar styles its
  label.
- **It follows the bar's style.** Its colour and weight would change with the label's. That needs the span styled too,
  which means a second inline style inside the bar and a writer change for the tag.

## 3. Settled by this plan unless the owner says otherwise

### 3.1 What can be picked, and how each text is named

| Text | Picked by | Key (what the style belongs to) | Moves with |
|---|---|---|---|
| A phase's bar | a click on it | `<phase key>@<its week number>` (N2) | its phase week, everywhere |
| An episode's bar | a click on it | the episode's id | the episode (every bar of it, if it crosses a week) |
| Simultaneous Post's bar | a click on it | its week number, the N its label shows | Production |
| An all-phase hiatus band | a click on it | its week, the `hiatusTexts` key | wherever `hiatusTexts` is re-keyed |
| A phase's own hiatus band | a click on it | `week\|phase`, the `hiatusTexts` key | the same |
| A month note | a click on it | ON the note itself (`fmt` on its `dayNotes` entry) | the note: drag, shift, paste |
| A waterfall note shown in the month | a click on it | the line's text without its date, `mvWfNotePlace`'s key | the line, as its place does |
| The month name | a click on it | `month`, one style for the whole calendar | — |
| The weekday row | a click on any weekday | `dow`, one style for all seven, every page | — |

- **An episode's bars share one style.** An episode's days move with holidays and day marks, so a week key would drift
  onto a different episode. The episode is the stable thing.
- **A month note carries its own style.** Its index in the day's list changes when a note before it is deleted or moved,
  so an index key would land on the wrong note. On the entry, the style travels with every existing move for free.
- **A waterfall note's month style is keyed as its month PLACE already is,** and the note editor carries it across a text
  edit the way it carries the place. It is a separate map from `mvWfNotePlace`, never a field in it: an entry there
  counts as a note place, and a calendar holding any note place lays out its untouched notes by `mvReferenceAnchors()`,
  so a style stored there could move notes nobody touched.
- **The month name and the weekday row repeat on every page,** so each takes one style for the calendar (R4's
  description). ⚠️ The month name lives in `.mv-monthbar`. If `month-nav-in-toolbar` or `month-view-modern-look` later
  hides that bar on screen, there is nothing left to click, and this text needs a new way to be picked.

### 3.2 The highlight

- **Gestures:** click picks one text; ⌘-click or Shift-click adds or removes one; ⌘A (while something is picked) picks
  every stylable text in the month on screen; Escape clears. **No sweep:** every press-and-move in the month view already
  means something (move a note, move a phase, drag an edge or a hiatus), so a sweep would collide with all of them.
- **Where a click lands.** Bars and bands are click-through (`.mv-bars{pointer-events:none}`), and the body-level layers
  laid over bands (`installHiatusDrag`) and pill edges (`installPhaseEdgeHandles` and its siblings) take the press. So
  the pick is found BY POINT, against the bars' rects, as `installHiatusDrag` finds a band and `dayContextAt` finds a day.
  It hooks into each existing gesture's "a press that did not move" branch. Every press that moves is the drag it is
  today.
- **R1 in the month view:** a click on a note picks it and no longer opens the editor. A double-click, Enter (when the
  active pick is a note) or typing opens it, and a typed character is ADDED at the end, never replacing the text. ⌘ and
  Ctrl shortcuts are untouched. The "+" that adds a note stays one click: it is not text. The notes' tooltips change from
  "click to edit" to "double-click to edit" (M2, §6), and Help says it too.
- **Drawn as body-level chrome**, the `.hiatus-drag-layer` precedent: fixed-position outlines over each picked text's
  box, nothing inside `#table-wrap`, no `.mv-*` rule, and nothing the print path can reach. Re-placed after every
  re-render (the `#table-wrap` MutationObserver, sanctioned pattern 3), on `#table-wrap`'s scroll (the month's own scroll
  box since 26 Oct 2026), and on zoom and resize.
- ⛔ **Keys are resolved from outside.** The renderer is NOT asked to tag bars with their keys: a new attribute on every
  bar would change every printed month document and break gate 10. The resolver works from each bar's row (its Sunday),
  columns, `data-ph`, `data-note-*` and the schedule, as `installHiatusDrag`'s `identify()` does, and an ambiguous bar
  gets nothing.
- **Session UI:** the month's picks are a set of their own beside `textSel` (never saved, never an undo step). Switching
  views clears the month's picks.
- **The right-click menus gain nothing** (owner rule, 23 Oct 2026: only items a cell actually needs).

### 3.3 The bar

- In the month view the bar gets a fourth target, `'month'`, beside `'grid'`, `'hdr'` and `'side'`. The header's lines
  keep `'hdr'` exactly as now.
- **Controls:** size, B, I, text colour, alignment, clear, as for grid text. No highlight control: a note's fill and a
  band's colour stay where they are set today. **Text colour is greyed while only bars are picked (N1).**
- **Bold** is the header's rule, `mvlLineStyle`'s: on = 700, off = 400, unset = the text's own weight (bars 600, notes
  500, month name and weekday row 700). So an unstyled bar shows B lit. All four Inter weights are embedded already.
- **Sizes offered** (R3; each list is confirmed by step 1's measurement before it is fixed): bars and bands 6–12 (or
  6–11 if 12 cuts a glyph on screen), notes 6–10, the month name up to 17, the weekday row up to 11. A pick that mixes
  kinds is offered the sizes every picked text allows.
- **No control has an id**, as for the bar today (`collectFieldValues`).

### 3.4 How a style keeps the calendar's shape (R3)

- **Every style keeps its text's line box.** A styled size is written with the line height the text already has: 15 px
  for a bar (its 10 px × 1.5, and the box the print path gives it, which the writer copies), 13 px per note line, 25.5 px
  for the month name, 16.5 px for the weekday row. So no bar, band, month bar or weekday row changes height, on screen,
  in the print rollback, or in the written PDF.
- **A note can change its line count.** A note is measured in its own weight and size (`mvNoteLineCount` on screen,
  `mvlNoteLines` in the writer, both given the note's style). A smaller note can need fewer lines; a bold note can need
  one more, as a longer note does, up to the existing three-line limit. The alternative, measuring at the old style, cuts
  a bold note's last line: the waterfall's F4 problem. One-day custom bars that wrap (`mvPillLineCount`,
  `mvlPillLines`) follow the same rule.
- **So a month never prints smaller because of a style,** except where a bold note took one more line, exactly as if its
  text had grown.

### 3.5 Everything else

- **Undo:** one step per press; a colour well dragged is one step, as for the waterfall.
- **Resets:** New clears every month style. Reset notes clears month note styles and waterfall-note month styles, as it
  clears the notes' colours. Reset hiatus bands clears band styles. Removing a custom phase prunes its bars' and bands'
  styles; removing an episode prunes its style (as `mvPhaseOrder` is pruned).
- **The waterfall, Excel and the waterfall PDF are untouched by any month style** (R2). The month `.ics` export (planned)
  carries no styles.

## 4. The save format

- **One new key, `mvTextStyles`, ABSENT while nothing is styled**, so every calendar without a month style saves byte
  for byte as before:
  `{ phase: {"prep@2": fmt}, episode: {"ep7": fmt}, simpost: {"3": fmt}, band: {"2026-11-02": fmt, "2026-11-02|prep": fmt}, wfnote: {"<line text>": fmt}, frame: {"month": fmt, "dow": fmt} }`.
  A separate key rather than new kinds in `textStyles`, because R2 keeps the views apart: the waterfall's highlight,
  resets, shift re-key and writers all iterate `TEXT_STYLE_KINDS`, and none of them may ever meet a month style.
- **A month note's style is `fmt` on its own `dayNotes` entry**, written only when set.
- **`fmt` is the header's shape** `{size, bold, italic, color, align}` without highlight, checked like
  `cleanHeaderFormatEntry` with each kind's size list (§3.3). `phase`, `episode` and `simpost` take no `color` (N1).
  The sanitizer drops a bad entry, or a bar's colour, and counts it.
  `wfnote` keys use `mvWfNotePlace`'s key rule; every other key `SNAP_KEY`.
- `captureSnapshot` writes both; `applyStateSnapshot` restores `mvTextStyles` **unconditionally** (absent = no styles);
  `newFile` / the resets clear it (§3.5).
- **Shift re-key:** only the band styles move, and they move wherever `hiatusTexts` moves: the shift tools
  (`shiftCalendar`) and the hiatus drag (`installHiatusDrag`'s `rekey()`). Phase, episode and Sim Post keys need no
  re-key (§3.1, N2); a note's travels with it.
- **Older builds:** an unknown top-level key is ignored on load, and an older build's next Save drops it. `fmt` on a day
  note passes through their sanitizer untouched (it copies a note entry whole). So no `SNAPSHOT_VERSION` bump, for the
  `'onhalf'` reason; checked by opening the step-6 fixture in `releases/v1.8.0.html`.
- **New permanent keys:** `mvTextStyles` and its six kind names, and `fmt` on a day note. They go in CLAUDE.md's state
  table when they ship.
- No new id anywhere: gate 5's `fields.byId` count stays where it is.

## 5. What the month PDF writer needs (not frozen; gate 13 is byte for byte)

`exportMonthPdfDirect` and its `mvl*` helpers are new code the owner has not ruled on freezing, so these are not frozen
edits. But gate 13 compares every written month PDF byte for byte, and each change below must be inert with no style.

- **W1 · Read the style.** `mvlParseItem` reads `font-weight`, `font-style`, `font-size` and `text-align` from a
  bar's inline style, as it already reads `background` and `color` (a band's or a note's styled colour arrives as the
  `color` it already reads). `mvlParseMonth` reads the month name's and the weekday headings' style attributes.
- **W2 · Draw it.** `mvlPaintBar` takes the weight, size, slant, ink and alignment per bar instead of `MVL_PAINT.bar`'s
  and `.note`'s fixed ones. A pill's ring is untouched (N1). The line box stays `MVL_PAINT`'s (§3.4),
  so `mvlBarHeight` and `mvlLaneTracks` are untouched. `mvlLineStyle`, the header's reader, already maps a format to
  weight, slant and ink, and is the shape to reuse.
- **W3 · Wrap in the note's own style.** `mvlNoteLines` and `mvlPillLines` measure with the note's or bar's weight and
  size.
- **W4 · The month bar and the weekday row.** `mvlPaintMonth` draws their text with the frame styles, in the line boxes
  `MVL_PAINT.monthBar` and `.dowRow` already give them.
- **W5 · Fonts.** Every weight a style can ask for (400, 500, 600, 700) is already embedded and decoded on first use.
  Step 5 confirms the subsetter collects glyphs per weight actually used, and `mvlUnprintable` names any character a
  styled weight lacks.

## 6. The frozen edits (signed off)

✅ **SIGNED OFF, owner's picker, 27 Oct 2026: "Yes, M1 and M2 as planned (Recommended)"**, with the acceptance gate
below.

### M1 · `renderMonthView`: append each styled text's style

- **What changes:**
  - Each bar's inline style gets its text's style appended, through ONE helper outside the frozen code
    (`mvTextCss(kind, key)`), which returns `''` when the text has no style. Sites: phase bars, episode bars,
    Simultaneous Post, both kinds of hiatus band, both kinds of note. Appended after the bar's own `background` and
    `color`, after the half-day layers, so nothing it writes can reset them. A pill's style never carries a colour (N1),
    so its text and ring stay in the phase's ink.
  - `.mv-monthyear` and each `.mv-dow` get a `style` attribute **only when styled**.
  - The two line counters get the text's style as an extra argument: `mvNoteLineCount(text, boxW, fmt)` and
    `mvPillLanes(...)`. With no style they measure exactly as today (and their caches key on the style).
- **What does not change:** no new element, no new class, no new attribute on an unstyled text, no CSS. The print
  rollback (`exportMonthPdf`) is not edited: it prints this markup, and no print rule sets these texts' font (checked:
  `#print-root .mv-bar` sets only `align-self`).
- **Why it is safe:** with no month style set, every helper returns `''` and every counter takes its old path, so the
  markup is today's byte for byte. Calendars saved before this have no `mvTextStyles` and no `fmt`, so they are all in
  that case.

### M2 · `renderMonthView`: the notes' tooltip says "double-click to edit" (follows from R1)

- **What changes:** the two note tooltips, "… — click to edit (also updates the Waterfall)" and "… — click to edit
  (month view only)", become "… — double-click to edit (…)". Nothing else.
- ⚠️ **Why it is a separate edit:** a tooltip is a `title` attribute in the markup the print rollback prints, and
  gate 10's baselines hold that markup (checked: every case's `.html` carries the "click to edit" titles, 4 to 17 per
  case). So M2 changes gate 10's documents on every calendar with a note, styled or not, where M1 changes none. Gate 13
  is untouched: the writer never draws a tooltip.
- **The alternative** is to leave the tooltips saying "click to edit" while a click picks, which misleads. (Rewriting
  them from outside after each render would touch only the screen copy, but no sanctioned pattern covers changing the
  frozen renderer's output in place.)

### The acceptance gate (the measurement M1, M2 and W1–W5 are judged by)

0. **M2's re-cut.** Gate 10's baselines re-cut on the owner's sign-off, with a diff against the old ones showing ONLY
   note `title` attributes changed, and every case's fit table and sheet count identical. Done first and alone, so the
   later steps are measured against the re-cut baselines.

1. **Unstyled, nothing moves.** On every existing fixture: gate 10's printed month documents byte-identical to the
   re-cut baselines (item 0), gate 13's written month PDFs byte-identical to theirs; the full gate green.
2. **Styled, the calendar keeps its shape.** On a synthetic fixture minted by its own Save, with every stylable kind
   styled at once (largest offered size, bold, italic, a colour, centre and right):
   - on screen and in the print document, every week row the same height as the same calendar unstyled, except rows
     where a note's line count changed (each such note named, and only bold ones expected);
   - **0 clipped glyphs** at the largest offered sizes: each styled text's ink inside its bar's padding box;
   - the written PDF: every month at the same shrink factor as unstyled (same exceptions); `monthemit` agreeing with
     the print path on the styled fixture; `/F` tags for each weight used, the italic slant and each colour present;
   - every pill's text and ring still its phase's ink, and a colour on a bar's style dropped by the sanitizer (N1).
3. **The waterfall unaffected** (R2): the waterfall PDF and every Excel part byte-identical between the styled fixture
   and the same calendar with its month styles cleared.

## 7. Found while planning: the hiatus drag leaves a band's WATERFALL style behind

`installHiatusDrag`'s `rekey()` carries a band's look to its new weeks (ruling 4 of HIATUS-DRAG-PLAN, 19 Oct 2026, as
the code's comment states it: the band's look comes with it): `hiatusTexts`, `hiatusNameSyncedKeys`, `hiatusColors`,
`hiatusFontSize`. It does not
carry `textStyle.hiatus`, which arrived two days later with the text style bar. So a band styled bold in the waterfall
and then dragged in the month view arrives unstyled, and its old weeks keep the style. `shiftCalendar` does carry it.
Read from the code, not reproduced. The fix is one more map in `rekey()`'s list and `setMaps()`, not frozen code. Step 0
does it, because month band styles must ride in the same list, and it can ship on its own first.

## 8. Proof

- **New leg `mvtextstyle`:**
  - the bar's month target; picks by click, ⌘-click, Shift-click, ⌘A and Escape, on a bar, a band, a month note, a
    waterfall note, the month name and a weekday;
  - R1: a click on a note picks without opening; double-click, Enter and typing open it ("x" added at the end);
    ⌘-shortcuts untouched; a drag still moves the note to another day, carrying its style;
  - the bar drag, the edge drags and the hiatus drag still work, and the hiatus drag carries both views' band styles;
  - each kind styled and shown on screen; one undo step per press; Save and Load; the file opens in
    `releases/v1.8.0.html`; bad entries dropped and counted;
  - a shift carries "Prep wk 2"'s style with Prep (N2) and a band's with its band; Reset notes and New clear; removing a
    custom phase or an episode prunes;
  - no new id (`fields.byId` count unchanged); the outlines absent from a shareable copy and from both month PDFs;
  - the gate in §6.
- **Mutants, each expected red:** the writer ignoring a style; a style's line height not held (a row grows); a note
  measured at the old style (its last line cut); a colour accepted or drawn on a bar (N1); a style
  written as an empty object; restore only when the key is present; a click opening a note; typing replacing a note's
  text; a month style showing in the waterfall; an id on a bar control; the hiatus drag dropping a band style.
- The full gate, then the owner's picker to merge, and a separate one to push.

## 9. Steps

0. §7's fix: the hiatus drag carries `textStyle.hiatus`. Small, separate, can ship first.
1. **M2** (signed off), with gate 10's re-cut (§6, item 0).
2. **Measure** (read-only probe, the TEXT-STYLE-BAR §4.1 shape): the largest bar, band, note, month-name and weekday
   size whose glyphs fit their held line box on screen, in the print document and in the written PDF. Fixes §3.3's lists.
3. The store and the save format (§4), the sanitizer, resets and pruning. Nothing drawn yet.
4. The month highlight and R1's click rule (§3.2), and the bar's `'month'` target (§3.3).
5. **M1** (signed off), with §6's numbers shown to the owner.
6. W1–W5.
7. The leg, the mutants, the full gate.

**Size: L, about 2–3 sessions.** The highlight (step 4) is most of it, as it was for the waterfall: in the month view a
press on a note, a bar, a bar's edge or a band already starts a drag, and every one of them must keep working.

## 10. Related requests

- **`note-styles`** (gap-report item 20): its bold and coloured text are this plan. Its "boxed or plain" half is the No
  fill note, already built (MONTH-NOTES-PLAN §2); its "three-line limit that can grow" is not in this plan.
- **`month-bar-size`:** bigger bars. If it lands, it lifts R3's caps for bars; this plan's save format does not change.
- **`month-view-modern-look`, `month-nav-in-toolbar`:** see §3.1's warning about the month name.
- **`month-calendar-export-ics`:** an `.ics` has no styles to carry.
